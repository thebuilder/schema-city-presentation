// Shared by the storm (index.html) and the rotunda (rotunda.html), so both
// scenes draw the same animal.
// Tyrant rig: a procedurally drawn pixel-art T-rex.
// The body is modelled as signed-distance shapes on a small skeleton, then
// rasterised with hard edges, lit per part, dithered and outlined, so every
// frame reads as hand-placed pixels.
const TrexRig = (() => {
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const mix = (a, b, t) => a + (b - a) * t;
  const sst = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  const DW = 150, DH = 92, GY = 88;          // design canvas and ground line
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const PAL = {
    outline: '#07100b',
    green: ['#10231a', '#1d3b27', '#2c5634', '#3f7444', '#5a9559'],
    far: ['#0a1811', '#132a1c', '#1d3d26', '#2a5231', '#3a6b40'],
    belly: ['#4f402b', '#8f7952', '#bba273', '#d8c595'],
    tongue: '#9a3a45', tongueHi: '#c66470',
    teeth: '#ece4cf', eye: '#ffc85a', pupil: '#140c05', claw: '#d9ccb0'
  };
  const C = {};
  for (const k in PAL) C[k] = Array.isArray(PAL[k]) ? PAL[k].map(hex) : hex(PAL[k]);
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
  const bay = (x, y) => BAY[(y & 3) * 4 + (x & 3)];

  // ---------- geometry helpers ----------
  const rot = (x, y, a) => { const c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; };
  const xf = (o, a, x, y) => { const r = rot(x, y, a); return [o[0] + r[0], o[1] + r[1]]; };
  const inv = (o, a, px, py) => rot(px - o[0], py - o[1], -a);
  function smin(a, b, k) { const h = clamp(.5 + .5 * (b - a) / k, 0, 1); return mix(b, a, h) - k * h * (1 - h); }
  // tapered capsule: [distance, position along 0..1, signed side (+ = right of travel, normalised by radius)]
  function seg(px, py, A, B, ra, rb) {
    const bx = B[0] - A[0], by = B[1] - A[1], ax = px - A[0], ay = py - A[1];
    const L2 = bx * bx + by * by || 1e-6, h = clamp((ax * bx + ay * by) / L2, 0, 1);
    const r = mix(ra, rb, h);
    return [Math.hypot(ax - bx * h, ay - by * h) - r, h, (bx * ay - by * ax) / Math.sqrt(L2) / r];
  }
  function ell(lx, ly, cx, cy, rx, ry) { const x = (lx - cx) / rx, y = (ly - cy) / ry; return [(Math.hypot(x, y) - 1) * Math.min(rx, ry), (ly - cy) / ry]; }
  function sdPoly(px, py, V) {
    let d = (px - V[0][0]) ** 2 + (py - V[0][1]) ** 2, s = 1;
    for (let i = 0, j = V.length - 1; i < V.length; j = i, i++) {
      const ex = V[j][0] - V[i][0], ey = V[j][1] - V[i][1], wx = px - V[i][0], wy = py - V[i][1];
      const h = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1), bx = wx - ex * h, by = wy - ey * h;
      d = Math.min(d, bx * bx + by * by);
      const c1 = py >= V[i][1], c2 = py < V[j][1], c3 = ex * wy > ey * wx;
      if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
    }
    return s * Math.sqrt(d);
  }

  const HS = 1.12; // head scale: a big skull leaves room for a readable open mouth
  // head-local: x toward the snout, y down; origin where the neck meets the skull
  const SKULL = [[-5, -3], [-2, -6.5], [4, -8.2], [7.5, -8.8], [11, -7.8], [17, -6.4], [22, -4.8], [25.5, -2.4], [25.8, 1.2], [23.5, 3.4], [12, 3.7], [3, 3.9], [-2, 4.3], [-6, 1.5]];
  // jaw-local: origin at the hinge
  const JAW = [[-4, -.4], [23.5, -.3], [24.6, .9], [22, 2.6], [12, 3.8], [2, 5.4], [-4, 4]];

  // ---------- skeleton ----------
  function build(p) {
    const hip = [67, 46 + p.hipY], pitch = p.pitch;
    const T = (x, y) => xf(hip, pitch, x, y);
    const chest = { cx: 19, cy: 3 - .35 * p.breath, rx: 17 + .3 * p.breath, ry: 13.5 + .75 * p.breath };
    const N0 = T(27, -3), N1 = [N0[0] + 14 * Math.cos(p.neckA), N0[1] + 14 * Math.sin(p.neckA)];
    const headO = N1, headA = p.headA;
    const Hd = (x, y) => xf(headO, headA, x * HS, y * HS);
    const hinge = Hd(-1, 3.6), jawA = headA + p.jawA;
    const Jw = (x, y) => xf(hinge, jawA, x * HS, y * HS);

    const T0 = T(-9, -3), tail = [], TL = 55, slope = .04 - (pitch + .1) * .9;
    for (let i = 0; i <= 10; i++) {
      const s = i / 10;
      tail.push([T0[0] - s * TL, T0[1] + s * TL * slope + 1.8 * Math.sin(s * Math.PI) - 7 * s * s * s + 2.4 * s * s * p.sway, 11.2 * Math.pow(1 - s, .95) + .7]);
    }

    const legs = [['far', -2, 4, -9], ['near', 3, 5, 6]].map(([side, hx, hy, fx]) => {
      const HJ = T(hx, hy), F = [67 + fx, GY - 2.3];
      const A = [F[0] - 4.1, F[1] - 10.2], l1 = 17, l2 = 18;
      let dx = A[0] - HJ[0], dy = A[1] - HJ[1], d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + .01, l1 + l2 - .01);
      const base = Math.atan2(dy, dx), ang = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
      const k1 = [HJ[0] + l1 * Math.cos(base + ang), HJ[1] + l1 * Math.sin(base + ang)];
      const k2 = [HJ[0] + l1 * Math.cos(base - ang), HJ[1] + l1 * Math.sin(base - ang)];
      const K = k1[0] > k2[0] ? k1 : k2;
      return { HJ, K, A, F, toe: [F[0] + 7.5, F[1] + .4], heel: [F[0] - 2.6, F[1] + .6] };
    });

    const arms = [['far', 25.5, 7, -.15], ['near', 28, 8.5, 0]].map(([side, sx, sy, off]) => {
      const S = T(sx, sy), ua = 1.2 + p.armA + off, fa = ua - 1.2 - p.armA * .6;
      const E = [S[0] + 8 * Math.cos(ua), S[1] + 8 * Math.sin(ua)];
      const Hd = [E[0] + 6.5 * Math.cos(fa), E[1] + 6.5 * Math.sin(fa)];
      const F1 = [Hd[0] + 3 * Math.cos(fa + .35), Hd[1] + 3 * Math.sin(fa + .35)];
      const F2 = [Hd[0] + 2.6 * Math.cos(fa + 1.05), Hd[1] + 2.6 * Math.sin(fa + 1.05)];
      const at = (P, t) => [Hd[0] + (P[0] - Hd[0]) * t, Hd[1] + (P[1] - Hd[1]) * t];
      return { S, E, Hd, F1, F2, Cl: at(F1, .85), Cl2: at(F2, .85) };
    });

    const mouth = [Hd(1, 2.6), Hd(24, 3.3), Jw(23.5, .6), Jw(3, 1.2)];
    return { p, hip, pitch, chest, N0, N1, headO, headA, hinge, jawA, tail, legs, arms, mouth, Hd, Jw };
  }

  // ---------- part groups: each returns [d, side, spine, kind] ----------
  function gBody(r, px, py) {
    const [lx, ly] = inv(r.hip, r.pitch, px, py);
    const [d1, v1] = ell(lx, ly, 0, 0, 13, 12);
    let best = d1, bv = v1, bs = 58 + lx, kind = 0;
    const c = r.chest, [d2, v2] = ell(lx, ly, c.cx, c.cy, c.rx, c.ry);
    let d = smin(d1, d2, 6);
    if (d2 < best) { best = d2; bv = v2; bs = 58 + lx; kind = 1; }
    for (let i = 0; i < 10; i++) {
      const a = r.tail[i], b = r.tail[i + 1], [dt, h, vv] = seg(px, py, a, b, a[2], b[2]);
      d = smin(d, dt, 3);
      if (dt < best) { best = dt; bv = -vv; bs = (10 - i - h) * 6; kind = 2; }
    }
    const [dn, hn, vn] = seg(px, py, r.N0, r.N1, 8.5, 6.5);
    d = smin(d, dn, 4);
    if (dn < best) { bv = vn; bs = 88 + hn * 14; kind = 3; }
    return [d, bv, bs, kind];
  }
  function gHead(r, px, py) { let [lx, ly] = inv(r.headO, r.headA, px, py); lx /= HS; ly /= HS; return [(sdPoly(lx, ly, SKULL) - .6) * HS, (ly + 2) / 7, lx, 4]; }
  function gJaw(r, px, py) { let [jx, jy] = inv(r.hinge, r.jawA, px, py); jx /= HS; jy /= HS; return [(sdPoly(jx, jy, JAW) - .5) * HS, (jy - 2.4) / 3, jx, 5]; }
  function gMouth(r, px, py) {
    const jx = inv(r.hinge, r.jawA, px, py)[0] / HS, [A, B, Cc, D] = r.mouth;
    const line = (P, Q) => Math.abs((Q[0] - P[0]) * (py - P[1]) - (Q[1] - P[1]) * (px - P[0])) / Math.hypot(Q[0] - P[0], Q[1] - P[1]);
    const du = line(A, B), dl = line(D, Cc), f = du / (du + dl + 1e-6);
    const top = .6 + .9 * ((jx - 12) / 12) ** 2;   // a rounded mound that stops short of the tip
    return [Math.max(sdPoly(px, py, r.mouth) + .2, (top - f) * 4), f, jx, 6];
  }
  function limb(parts, px, py, k) {
    let d = 1e9, bv = 0;
    for (const [A, B, ra, rb] of parts) { const s = seg(px, py, A, B, ra, rb); if (s[0] < d) bv = s[2]; d = d === 1e9 ? s[0] : smin(d, s[0], k); }
    return [d, bv, 0, 7];
  }
  const legParts = L => [[L.HJ, L.K, 9.5, 5.5], [L.K, L.A, 4.6, 3], [L.A, L.F, 3, 2.5], [L.F, L.toe, 2.5, 1.3], [L.F, L.heel, 1.8, 1.1]];
  const armParts = a => [[a.S, a.E, 3.2, 2.4], [a.E, a.Hd, 2.4, 1.8], [a.Hd, a.F1, 1.2, .7], [a.Hd, a.F2, 1.1, .6]];
  const gFarLeg = (r, px, py) => limb(legParts(r.legs[0]), px, py, 1.6);
  const gNearLeg = (r, px, py) => limb(legParts(r.legs[1]), px, py, 1.6);
  const gFarArm = (r, px, py) => limb(armParts(r.arms[0]), px, py, .8);
  const gNearArm = (r, px, py) => limb(armParts(r.arms[1]), px, py, .8);
  // back to front
  const GROUPS = [gFarLeg, gFarArm, gBody, gMouth, gJaw, gHead, gNearLeg, gNearArm];
  const FAR = new Set([0, 1]), BODY = 2, MOUTH = 3, JAWG = 4, HEAD = 5;

  // ---------- rasteriser ----------
  const LX = -.45, LY = -.89;
  function render(p, K = 1) {
    const r = build(p), w = Math.ceil(DW * K), h = Math.ceil(DH * K), N = w * h;
    const win = new Int8Array(N).fill(-1), dd = new Float32Array(N), va = new Float32Array(N), sa = new Float32Array(N), ka = new Int8Array(N), nx = new Float32Array(N), ny = new Float32Array(N);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = (x + .5) / K, py = (y + .5) / K;
      for (let g = GROUPS.length - 1; g >= 0; g--) {
        const res = GROUPS[g](r, px, py);
        if (res[0] >= 0) continue;
        const i = y * w + x, e = .45;
        win[i] = g; dd[i] = res[0] * K; va[i] = res[1]; sa[i] = res[2]; ka[i] = res[3];
        const gx = GROUPS[g](r, px + e, py)[0] - GROUPS[g](r, px - e, py)[0], gy = GROUPS[g](r, px, py + e)[0] - GROUPS[g](r, px, py - e)[0], gl = Math.hypot(gx, gy) || 1;
        nx[i] = gx / gl; ny[i] = gy / gl;
        break;
      }
    }
    const img = new ImageData(w, h), D = img.data;
    const put = (x, y, c) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const i = (y * w + x) * 4; D[i] = c[0]; D[i + 1] = c[1]; D[i + 2] = c[2]; D[i + 3] = 255; };
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? -1 : win[y * w + x];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, g = win[i]; if (g < 0) continue;
      const ramp = FAR.has(g) ? C.far : C.green;
      const nb = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
      if (nb.includes(-1) && g !== MOUTH) { put(x, y, C.outline); continue; }
      const behind = nb.filter(n => n < g && n !== MOUTH);
      if (behind.length && dd[i] > (g === 7 || g === 1 ? -.7 : -1.2) && g !== MOUTH) { put(x, y, (g === HEAD && behind.every(n => n === BODY)) ? ramp[1] : ramp[0]); continue; }
      if (g === MOUTH) {
        // the tongue, with a lighter upper surface
        const f = va[i], top = .6 + .9 * ((sa[i] - 12) / 12) ** 2;
        put(x, y, f < top + .12 ? C.tongueHi : C.tongue); continue;
      }
      const lit = nx[i] * LX + ny[i] * LY, e = clamp(1 + dd[i] / 3.2, 0, 1), v = va[i], b = bay(x, y);
      let lum = .5 + .58 * lit * e - .15 * v;
      let belly = false;
      const px = (x + .5) / K, py = (y + .5) / K;
      if (g === BODY) {
        // probe down and forward: pixels that exit the body quickly sit on the throat, chest front or belly
        const k = ka[i], depth = [6.5, 6.5, 2.8, 5][k] + (b - .5) * 1.4;
        belly = k === 2 ? gBody(r, px, py + depth)[0] > 0 : gBody(r, px + depth * .5, py + depth * .87)[0] > 0;
        if (!belly && k !== 0 && v < -.3 && ((sa[i] / 6) % 1 + 1) % 1 < .2 + (v + 1) * .12) lum -= .2;
      } else if (g === JAWG) belly = gJaw(r, px, py + 1.8 + (b - .5) * .8)[0] > 0;
      if (belly) put(x, y, C.belly[clamp(Math.floor(lum * 3 + .9 + (b - .5) * .5), 1, 3)]);
      else put(x, y, ramp[clamp(Math.floor(lum * 3.6 + .2 + (b - .5) * .5), 1, 4)]);
    }
    // ---- details ----
    const pix = pt => [Math.floor(pt[0] * K), Math.floor(pt[1] * K)];
    const eye = pix(r.Hd(7.4, -4.6));
    put(eye[0] - 1, eye[1] - 1, C.green[0]); put(eye[0], eye[1] - 1, C.green[0]); put(eye[0] + 1, eye[1] - 1, C.green[0]);
    put(eye[0], eye[1], C.eye); put(eye[0] + 1, eye[1], C.pupil);
    const nos = pix(r.Hd(23, -2.4)); put(nos[0], nos[1], C.green[0]);
    const open = p.jawA > .15;
    // teeth: walk each lip, step into the mouth to the first open pixel, then grow the tooth inward
    const gap = (x, y) => { const g = at(x, y); return g !== HEAD && g !== JAWG && g !== MOUTH && sdPoly((x + .5) / K, (y + .5) / K, r.mouth) < .3; };
    const fang = (lip, dir, len) => {
      let [x, y] = pix(lip);
      for (let k = 0; k < 3 && !gap(x, y); k++) y += dir;
      if (!gap(x, y)) return;
      for (let k = 0; k < len && gap(x, y); k++, y += dir) put(x, y, C.teeth);
    };
    const step = 2 / K / HS;
    if (open) {
      let n = 0;
      for (let tx = 7; tx <= 23.5; tx += step, n++) fang(r.Hd(tx, 3.4), 1, tx > 15 ? (n % 2 ? 2 : 3) : 2);
      n = 0;
      for (let tx = 8; tx <= 22.5; tx += step, n++) fang(r.Jw(tx, 0), -1, n % 2 ? 1 : 2);
    } else for (const tx of [10, 15.5, 21]) { const [x, y] = pix(r.Hd(tx, 4.3)); if (at(x, y) === JAWG || at(x, y) === HEAD) put(x, y, C.teeth); }
    for (const c of [r.arms[1].Cl, r.arms[1].Cl2]) { const q = pix(c); put(q[0], q[1], C.claw); }
    const toe = pix([r.legs[1].toe[0] + .4, r.legs[1].toe[1] + .3]); put(toe[0], toe[1], C.claw);
    const mouthPt = pix(r.Hd(22, 4 + p.jawA * 6));
    return { img, w, h, eye, mouth: mouthPt, ground: Math.floor(GY * K) };
  }

  // ---------- animation ----------
  const IDLE = { frames: 24, period: 2.8 };
  const ROAR = { fps: 12, dur: 2.8 };
  ROAR.frames = Math.round(ROAR.fps * ROAR.dur);
  function idle(ph) {
    const b = Math.sin(ph * Math.PI * 2);
    return { hipY: -.25 * b, pitch: -.1 - .012 * b, neckA: -.72 + .035 * b, headA: .18 - .02 * b, jawA: .02, breath: b, sway: b, armA: .08 * b };
  }
  const KT = [0, .45, .85, 1.5, 2.2, 2.8];
  const KV = {
    neckA: [-.72, -.56, -1.12, -1.04, -.98, -.72],
    headA: [.18, .36, -.4, -.32, -.28, .18],
    jawA: [.02, .02, .9, .84, .8, .02],
    pitch: [-.1, -.05, -.2, -.18, -.17, -.1],
    hipY: [0, .8, -1.3, -1.1, -1, 0],
    breath: [0, 1, .4, -.2, -.5, 0],
    armA: [0, .25, -.5, -.45, -.4, 0],
    sway: [0, -.5, 1.2, 1, .8, 0],
    tremble: [0, 0, .5, 1, .7, 0]
  };
  function roar(t) {
    let i = 0; while (i < KT.length - 2 && t > KT[i + 1]) i++;
    const u = sst((t - KT[i]) / (KT[i + 1] - KT[i])), p = {};
    for (const k in KV) p[k] = mix(KV[k][i], KV[k][i + 1], u);
    const tr = p.tremble;
    p.headA += .03 * Math.sin(t * 55) * tr; p.jawA += .06 * Math.sin(t * 41) * tr; p.neckA += .012 * Math.sin(t * 33) * tr;
    return p;
  }
  function toCanvas(f) { const c = document.createElement('canvas'); c.width = f.w; c.height = f.h; c.getContext('2d').putImageData(f.img, 0, 0); return c; }
  function sheet(K = 1) {
    const idleF = [], roarF = [];
    for (let i = 0; i < IDLE.frames; i++) idleF.push(render(idle(i / IDLE.frames), K));
    for (let i = 0; i < ROAR.frames; i++) roarF.push(render(roar(i / ROAR.fps), K));
    return { idle: idleF, roar: roarF };
  }
  // skeleton lines for the artboard overlay
  function bones(p) {
    const r = build(p), lines = [], add = (a, b) => lines.push([a, b]);
    add(xf(r.hip, r.pitch, -9, -3), r.hip); add(r.hip, r.N0); add(r.N0, r.N1);
    add(r.N1, r.Hd(25, -1)); add(r.hinge, r.Jw(23, .5));
    for (let i = 0; i < 10; i++) add(r.tail[i], r.tail[i + 1]);
    for (const l of r.legs) { add(l.HJ, l.K); add(l.K, l.A); add(l.A, l.F); add(l.F, l.toe); }
    for (const a of r.arms) { add(a.S, a.E); add(a.E, a.Hd); add(a.Hd, a.F1); }
    const joints = [r.hip, r.N0, r.N1, r.hinge, ...r.legs.flatMap(l => [l.HJ, l.K, l.A, l.F]), ...r.arms.flatMap(a => [a.S, a.E])];
    return { lines, joints };
  }
  // colour grades: 'day' as drawn, 'night' for the storm, 'lit' for a lightning flash
  const key = c => (c[0] << 16) | (c[1] << 8) | c[2];
  const EYE = key(C.eye), REDS = new Set([C.tongue, C.tongueHi].map(key));
  function grade(f, mode) {
    const c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
    const im = new ImageData(new Uint8ClampedArray(f.img.data), f.w, f.h), d = im.data;
    if (mode !== 'day') for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const r = d[i], g = d[i + 1], b = d[i + 2], k = (r << 16) | (g << 8) | b;
      if (k === EYE) { d[i] = 255; d[i + 1] = 196; d[i + 2] = 96; continue; }
      if (mode === 'night') {
        if (REDS.has(k)) { d[i] = r * .55 + 10; d[i + 1] = g * .3 + 4; d[i + 2] = b * .4 + 10; }
        else { d[i] = r * .3 + 4; d[i + 1] = g * .4 + 8; d[i + 2] = b * .55 + 24; }
      } else { d[i] = r * 1.05 + 40; d[i + 1] = g * 1.05 + 46; d[i + 2] = b * 1.1 + 64; }
    }
    c.getContext('2d').putImageData(im, 0, 0); return c;
  }
  return { render, idle, roar, sheet, toCanvas, bones, grade, IDLE, ROAR, PAL, DW, DH, GY };
})();
