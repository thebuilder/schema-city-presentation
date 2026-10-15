// The whole takeover in one fullscreen pass. Every pixel is a pure function of
// `params.time`, so a frame can be rendered at any moment of the sequence
// without history: the live run, a scrub during rehearsal and the recorded
// fallback all come out of the same arithmetic.

struct Params {
  // Afterglow ink, its bright head colour, and the void behind them.
  ink: vec4f,
  bright: vec4f,
  ground: vec4f,
  // Where the prompt's masks and the dive letter's mask sit on the slide,
  // as left, top, right, bottom in slide pixels.
  wakeBox: vec4f,
  letterBox: vec4f,
  // The point of the letter the camera breaks through.
  focus: vec2f,
  // The slide's coordinate space and the character grid laid over it.
  canvas: vec2f,
  cell: vec2f,
  grid: vec2f,
  atlasGrid: vec2f,
  glyphCount: f32,
  time: f32,
  // The timeline, in seconds from the click. See timeline.ts.
  crtStart: f32,
  crtLine: f32,
  crtDot: f32,
  crtEnd: f32,
  diveStart: f32,
  diveEnd: f32,
  lockStart: f32,
  lockEnd: f32,
  titleStart: f32,
  settle: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var slide: texture_2d<f32>;
@group(0) @binding(2) var atlas: texture_2d<f32>;
@group(0) @binding(3) var mask: texture_2d<f32>;
@group(0) @binding(4) var samp: sampler;
@group(0) @binding(5) var wakeNear: texture_2d<f32>;
@group(0) @binding(6) var wakeClose: texture_2d<f32>;
@group(0) @binding(7) var diveLetter: texture_2d<f32>;

fn pcg(v: u32) -> u32 {
  let state = v * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

fn hash1(a: f32) -> f32 {
  return f32(pcg(bitcast<u32>(i32(floor(a))))) / 4294967295.0;
}

fn hash2(a: f32, b: f32) -> f32 {
  let h = pcg(pcg(bitcast<u32>(i32(floor(a)))) ^ bitcast<u32>(i32(floor(b))));
  return f32(h) / 4294967295.0;
}

fn luma(c: vec3f) -> f32 {
  return dot(c, vec3f(0.2126, 0.7152, 0.0722));
}

// Rain slows to an idle drift once the title has settled. Time is warped
// rather than speeds changed, so no drop jumps when the pace drops.
fn rainClock(t: f32) -> f32 {
  let after = max(t - params.settle, 0.0);
  return min(t, params.settle) + after * 0.45;
}

// When a column's first drop left the top. The rain has been falling for
// a minute before the click, inside every letter, so the dive can find it
// already running however far from the top a row is.
fn columnStart(column: f32, seed: f32) -> f32 {
  return -60.0 - hash2(column, seed + 3.0) * 8.0;
}

struct Drop {
  speed: f32,
  length: f32,
  period: f32,
  start: f32,
}

fn dropOf(column: f32, seed: f32) -> Drop {
  var drop: Drop;
  drop.speed = mix(11.0, 27.0, hash2(column, seed));
  drop.length = mix(9.0, 30.0, hash2(column, seed + 1.0));
  drop.period = params.grid.y + drop.length
    + mix(2.0, params.grid.y, hash2(column, seed + 2.0));
  drop.start = columnStart(column, seed);
  return drop;
}

// x is the trail brightness, y how close the cell is to the drop's head.
fn rainAt(cell: vec2f, t: f32, seed: f32) -> vec2f {
  let drop = dropOf(cell.x, seed);
  let travelled = (t - drop.start) * drop.speed - cell.y;
  if (travelled < 0.0) {
    return vec2f(0.0);
  }
  let behind = travelled - floor(travelled / drop.period) * drop.period;
  if (behind > drop.length) {
    return vec2f(0.0);
  }
  let trail = pow(1.0 - behind / drop.length, 1.7);
  let head = 1.0 - smoothstep(0.0, 1.6, behind);
  return vec2f(trail, head);
}

// The first moment after `after` that a drop's head crosses this row.
fn nextPass(cell: vec2f, seed: f32, after: f32) -> f32 {
  let drop = dropOf(cell.x, seed);
  let reach = (after - drop.start) * drop.speed - cell.y;
  let lap = max(ceil(reach / drop.period), 0.0);
  return drop.start + (cell.y + lap * drop.period) / drop.speed;
}

fn glyph(index: f32, local: vec2f) -> f32 {
  let n = floor(index - floor(index / params.glyphCount) * params.glyphCount);
  let gx = n - floor(n / params.atlasGrid.x) * params.atlasGrid.x;
  let gy = floor(n / params.atlasGrid.x);
  let uv = (vec2f(gx, gy) + local) / params.atlasGrid;
  return textureSampleLevel(atlas, samp, uv, 0.0).a;
}

// The rain, with the title locking into it when `titled` is set.
fn matrix(p: vec2f, t: f32, titled: bool) -> vec3f {
  let cellPos = p / params.cell;
  let cell = floor(cellPos);
  let local = fract(cellPos);
  let centre = (cell + 0.5) * params.cell / params.canvas;
  let ink = params.ink.rgb;
  let bright = params.bright.rgb;
  let rt = rainClock(t);

  let a = rainAt(cell, rt, 0.0);
  let b = rainAt(cell, rt, 17.0) * 0.55;
  let trail = max(a.x, b.x);
  let head = max(a.y, b.y);

  let flicker = mix(0.4, 7.0, pow(hash2(cell.x * 3.0 + 1.0, cell.y), 4.0));
  let index = floor(hash2(cell.x, cell.y) * params.glyphCount + rt * flicker
    + head * rt * 9.0);
  let shape = glyph(index, local);

  let shapes = textureSampleLevel(mask, samp, centre, 0.0);
  let clearing = shapes.g;
  // A cell belongs to the title if the letter covers much of it, not only
  // its centre, which keeps strokes a cell and a half wide from breaking up.
  let reach = params.cell * 0.3 / params.canvas;
  let letter = max(shapes.r, max(
    max(textureSampleLevel(mask, samp, centre + vec2f(reach.x, 0.0), 0.0).r,
      textureSampleLevel(mask, samp, centre - vec2f(reach.x, 0.0), 0.0).r),
    max(textureSampleLevel(mask, samp, centre + vec2f(0.0, reach.y), 0.0).r,
      textureSampleLevel(mask, samp, centre - vec2f(0.0, reach.y), 0.0).r)) * 0.85);

  // Cells around the title go quiet as it forms, so the word reads.
  let quiet = smoothstep(params.lockStart, params.lockEnd, t) * select(0.0, 1.0, titled);
  let hush = 1.0 - 0.8 * smoothstep(0.04, 0.45, clearing) * quiet;
  let idle = select(1.0, mix(1.0, 0.42, smoothstep(params.titleStart, params.settle, t)), titled);

  var colour = (ink * trail * 1.25 + bright * head * 1.5) * shape * hush * idle;
  colour += ink * trail * 0.07 * hush * idle;

  if (titled && letter > 0.32 && t > params.lockStart) {
    // Each letter cell locks the first time a drop's head runs through it,
    // and every one has locked by lockEnd whatever the rain is doing.
    let deadline = mix(params.lockStart + 0.7, params.lockEnd,
      hash2(cell.x + 9.0, cell.y));
    let passed = min(nextPass(cell, 0.0, params.lockStart),
      nextPass(cell, 17.0, params.lockStart));
    let locked = min(passed, deadline);
    if (t >= locked) {
      let since = t - locked;
      let flash = exp(-since * 5.0);
      let steady = glyph(floor(hash2(cell.y, cell.x) * params.glyphCount), local);
      // Once the crisp title has decoded over them, the cells let go one by
      // one, so the word is not left doubled by a blocky copy behind it.
      let release = params.titleStart + 0.5 + hash2(cell.x + 31.0, cell.y) * 1.1;
      let fade = 1.0 - smoothstep(release, release + 0.3, t);
      let solid = smoothstep(0.32, 0.6, letter);
      let lit = ((bright * (0.55 + flash * 1.6) + ink * 0.7) * steady
        + ink * (0.16 + flash * 0.3)) * fade * solid;
      colour = max(colour, lit);
    }
  }

  return colour;
}

// The corporate slide, increasingly broken.
fn corrupted(uv: vec2f, t: f32, amount: f32, green: f32) -> vec3f {
  let tick = floor(t * 18.0);
  var q = uv;

  // Horizontal tears: bands of rows slide sideways.
  let bands = mix(6.0, 42.0, hash1(tick * 3.0));
  let band = floor(uv.y * bands);
  if (hash2(band, tick) < amount * 0.55) {
    q.x += (hash2(band + 7.0, tick) - 0.5) * 0.18 * amount;
  }

  // Now and then the whole picture rolls.
  if (hash1(tick * 5.0 + 1.0) < amount * 0.25) {
    q.y = fract(q.y + (hash1(tick * 11.0) - 0.5) * 0.2 * amount);
  }

  let split = vec2f(0.004 + amount * 0.02 * hash1(tick * 7.0), 0.0);
  var colour = vec3f(
    textureSampleLevel(slide, samp, q + split, 0.0).r,
    textureSampleLevel(slide, samp, q, 0.0).g,
    textureSampleLevel(slide, samp, q - split, 0.0).b,
  );

  // Blocks of the picture give way to something else.
  let grain = select(vec2f(24.0, 14.0), vec2f(64.0, 36.0), hash1(tick * 13.0) < 0.5);
  let blocks = floor(uv * grain);
  let blockRoll = hash2(blocks.x + blocks.y * 97.0, tick);
  if (blockRoll < amount * 0.08) {
    colour = vec3f(1.0) - colour;
  } else if (blockRoll < amount * 0.2) {
    colour = floor(colour * 3.0) / 3.0 * vec3f(0.4, 1.0, 0.8);
  }

  // The tube's own colour creeps in until the slide is phosphor green.
  let phosphor = params.ink.rgb * (luma(colour) * 1.35);
  colour = mix(colour, phosphor, smoothstep(0.1, 0.9, green));
  return colour;
}

// A mask placed on the slide by `box`, read at slide position `at`.
fn placed(tex: texture_2d<f32>, box: vec4f, at: vec2f) -> vec4f {
  let uv = (at - box.xy) / (box.zw - box.xy);
  let inside = all(uv >= vec2f(0.0)) && all(uv <= vec2f(1.0));
  return select(vec4f(0.0), textureSampleLevel(tex, samp, uv, 0.0), inside);
}

// Coverage that stays crisp under magnification: the bilinear ramp between
// two mask pixels is narrowed back to about one screen pixel.
fn crisp(coverage: f32, tex: texture_2d<f32>, box: vec4f, zoom: f32) -> f32 {
  let texels = f32(textureDimensions(tex).x) / (box.z - box.x);
  let width = clamp(0.5 * texels / zoom, 0.03, 0.5);
  return smoothstep(0.5 - width, 0.5 + width, coverage);
}

// How much of the prompt covers slide position `at` when seen `zoom` times
// closer, from whichever mask is detailed enough at that zoom.
fn prompt(at: vec2f, zoom: f32) -> f32 {
  let near = crisp(placed(wakeNear, params.wakeBox, at).r, wakeNear, params.wakeBox, zoom);
  let close = crisp(placed(wakeClose, params.wakeBox, at).r, wakeClose, params.wakeBox, zoom);
  var coverage = mix(near, close, smoothstep(1.5, 3.0, zoom));
  let box = params.letterBox;
  if (all(at >= box.xy) && all(at <= box.zw)) {
    let finest = crisp(placed(diveLetter, box, at).r, diveLetter, box, zoom);
    coverage = mix(coverage, finest, smoothstep(10.0, 20.0, zoom));
  }
  return coverage;
}

// The screen is a surface and the rain is behind it. The camera pushes
// into the prompt, the surface bulges as it is pressed, and at contact it
// gives: rings run out from the U across the letters, a hole tears open
// from the middle of the letter and the camera goes through into the rain,
// which comes up from a distance until it is the ordinary full-screen rain,
// cell for cell, so the scene after the dive carries on without a seam.
fn dive(p: vec2f, t: f32) -> vec3f {
  let span = params.diveEnd - params.diveStart;
  let u = clamp((t - params.diveStart) / span, 0.0, 1.0);
  // The camera touches the surface, then breaks it.
  let touch = 0.3;
  let contact = 0.42;
  let tau = t - (params.diveStart + span * contact);
  let since = t - (params.diveStart + span * touch);
  let through = clamp((u - contact) / (1.0 - contact), 0.0, 1.0);
  let ink = params.ink.rgb;
  let centre = params.canvas * 0.5;

  // Zoom accelerates all the way, in log space: six times closer at contact,
  // and the surface keeps rushing past after it.
  let reach = log(6.0);
  let lead = u / contact;
  let zoom = exp(reach * lead * lead);
  // The letter glides to the centre of the screen on the way in.
  let aim = mix(params.focus, centre, smoothstep(0.0, contact, u));

  let away = p - aim;
  let r = length(away);
  let outward = away / max(r, 1e-3);

  // Pressed, the surface bulges towards the camera like a lens, and lets go
  // as it tears.
  let press = smoothstep(touch, contact, u) * (1.0 - smoothstep(0.0, 0.3, tau));
  var q = aim + away * (1.0 - 0.3 * press * exp(-r * r / (420.0 * 420.0)));

  // From the touch, rings run outwards across the letters like across
  // water, and die away.
  var slope = 0.0;
  if (since > 0.0) {
    let behind = 900.0 * since - r;
    let fade = exp(-since * 1.1) * smoothstep(-60.0, 60.0, behind) * exp(-max(behind, 0.0) / 520.0);
    slope = cos(behind * 0.03) * fade;
    // In proportion to the letters, so the first rings bend them as much
    // as the last instead of crumpling them while they are still small.
    q += outward * slope * 7.0 * min(zoom, 6.0);
  }

  // A smear back along the zoom, as long as one frame of it.
  let rate = reach * 2.0 * lead / (contact * span);
  var coverage = 0.0;
  for (var k = 0; k < 6; k += 1) {
    let back = exp(-rate * f32(k) / (60.0 * 6.0));
    coverage += prompt(params.focus + (q - aim) / (zoom * back), zoom * back);
  }
  coverage /= 6.0;
  // The rings catch the light as they pass, so the surface reads as one
  // even where there is no letter on it.
  let sheen = ink * max(slope, 0.0) * 0.22;
  let surface = ink * 1.05 * coverage * (1.0 + slope * 0.25) + sheen;

  if (tau <= 0.0) {
    return surface;
  }

  // The hole opens from the middle of the letter, its edge wobbling with
  // the rings, and is past the corners of the screen by the end.
  let angle = atan2(away.y, away.x);
  let open = pow(through, 1.6);
  let wobble = 0.018 * sin(angle * 5.0 + tau * 7.0) + 0.012 * sin(angle * 11.0 - tau * 13.0);
  let edge = 1250.0 * open * (1.0 + wobble) + slope * 24.0 * open;
  let inside = smoothstep(edge + 1.5, edge - 1.5, r);

  // Behind the surface the rain starts out far off, smaller and dimmer,
  // bent a little by the lip of the hole, and comes up to full size.
  let scale = mix(0.45, 1.0, smoothstep(0.0, 1.0, through));
  let lip = exp(-max(edge - r, 0.0) / 70.0) * (1.0 - through);
  let rainP = centre + (p - centre) / scale - outward * lip * 50.0;
  var world = vec3f(0.0);
  if (inside > 0.0) {
    world = matrix(rainP, t, false) * mix(0.55, 1.0, through);
  }

  // The torn edge catches the light as it rolls back.
  let rim = (exp(-abs(r - edge) / 6.0) * 0.45 + exp(-abs(r - edge) / 50.0) * 0.12)
    * (1.0 - smoothstep(0.85, 1.0, through));

  return mix(surface, world, inside) + ink * rim;
}

fn glitchAmount(t: f32) -> f32 {
  let ramp = pow(clamp(t / params.crtStart, 0.0, 1.0), 1.6);
  let tick = floor(t * 14.0);
  let spike = select(0.0, 0.7, hash1(tick + 400.0) < 0.18 + ramp * 0.5);
  // One hard hit straight after the click, so the room knows it is not them.
  let shock = select(0.0, 0.55, t > 0.06 && t < 0.16);
  return clamp(ramp * 0.75 + spike * (0.25 + ramp) + shock, 0.0, 1.0);
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = params.time;
  let p = uv * params.canvas;
  let ink = params.ink.rgb;
  var colour = params.ground.rgb;

  if (t < params.crtStart) {
    let amount = glitchAmount(t);
    let ramp = clamp(t / params.crtStart, 0.0, 1.0);
    colour = corrupted(uv, t, amount, ramp * ramp + amount * 0.25);
    // The rain bleeds through the cracks before it arrives for real.
    let bleed = matrix(p, t, false);
    let column = floor(p.x / params.cell.x);
    let infected = step(hash2(column, floor(t * 6.0)), amount * 0.45);
    colour += bleed * infected * amount;
    colour *= 0.92 + 0.08 * sin(p.y * 2.4 + t * 40.0) * amount;
  } else if (t < params.crtEnd) {
    // The tube switches off: down to a line, the line to a dot, the dot out.
    let toLine = smoothstep(params.crtStart, params.crtLine, t);
    let toDot = smoothstep(params.crtLine, params.crtDot, t);
    let sy = mix(1.0, 0.0025, pow(toLine, 2.2));
    let sx = mix(1.0, 0.002, pow(toDot, 2.0));
    let q = (uv - 0.5) / vec2f(sx, sy) + 0.5;
    let fromCentre = (p - params.canvas * 0.5);
    let white = mix(ink, vec3f(1.0), 0.75);

    if (all(q >= vec2f(0.0)) && all(q <= vec2f(1.0))) {
      let picture = corrupted(q, t, 0.6, 1.0);
      let burn = 1.0 + toLine * 3.0;
      colour = mix(picture * burn, white * 1.6, pow(toLine, 1.5) * 0.85);
    }

    // The bloom around the collapsing line and then the dot.
    let lineGlow = exp(-abs(fromCentre.y) / (4.0 + 60.0 * (1.0 - toLine)))
      * smoothstep(params.canvas.x * 0.5 * sx + 40.0, params.canvas.x * 0.5 * sx - 40.0,
        abs(fromCentre.x));
    let dotLife = 1.0 - smoothstep(params.crtDot, params.crtEnd, t);
    let dotGlow = exp(-length(fromCentre) / (3.0 + 26.0 * dotLife)) * toDot * dotLife;
    colour += white * (lineGlow * toLine * 1.2 + dotGlow * 2.2);
  } else if (t >= params.diveEnd) {
    colour = params.ground.rgb + matrix(p, t, true);
  } else if (t >= params.diveStart) {
    colour = params.ground.rgb + dive(p, t);
  }

  // The tube is always on: scanlines, a soft vignette, a little breath.
  let scan = 0.88 + 0.12 * sin(p.y * 3.14159 / 2.5);
  let edge = uv - 0.5;
  let vignette = 1.0 - dot(edge, edge) * 0.55;
  let breath = 0.985 + 0.015 * sin(t * 9.0) * step(params.crtEnd, t);
  colour = max(colour * scan * vignette * breath, params.ground.rgb);

  return vec4f(colour, 1.0);
}
