import * as THREE from "three"
import { CrtPipeline } from "@/deck/parts/terrain/crt"

/*
 * The terrain flight from thebuilder.dk, rebuilt for one slide. The ground,
 * the striped sun, the stars and the ringed planet are the site's own shaders
 * (lib/scene/terrain.ts, sky.ts, hero.ts and textures.ts in thebuilder-dk),
 * cut down to what a slide needs: no beacons, no river, no soundtrack. The
 * camera flies the valley floor forever instead of following the scroll, and
 * the planet rides with the camera so it stays where the slide puts it.
 */

const VOID = 0x05_09_0a
const PHOSPHOR = 0x86_fa_dd
const PHOSPHOR_BRIGHT = 0xd9_ff_ef
const SIGNAL = 0xff_5b_82
const VIOLET = 0xb8_90_ff

const FOV = 52
const GROUND_Y = -14
const GROUND_WIDTH = 1900
const GROUND_DEPTH = 1300
const GROUND_STEP = 3600 / 620
// The ground starts a little behind the camera and runs out past the fog.
const GROUND_AHEAD = GROUND_DEPTH / 2 - 130

const CAMERA_HEIGHT = 17
const SPEED = 30

const SWEEP_SPAN = 950
const SWEEP_LEAD = 240
const BEATS_PER_BAR = 4
const BAR_SECONDS = 2.4

// Where a screenshot or a PDF export lands, far enough in for a sweep line to
// be crossing the valley.
const STILL_TIME = 7.4
const POWER_ON_SECONDS = 1.4
// How long the planet takes to build itself after the power-on.
const ASSEMBLE_SECONDS = 2.6

const SWEEP = /* glsl */ `
  uniform float uSweep;
  uniform float uSweepStep;

  vec2 sweepLine(float z) {
    float along = (z - uSweep) / uSweepStep;
    float index = floor(along + 0.5);
    float inBar = mod(index, ${BEATS_PER_BAR}.0);
    float down = 1.0 - step(0.5, inBar);
    return vec2((along - index) * uSweepStep, down);
  }
`

const TERRAIN_VERTEX = /* glsl */ `
  ${SWEEP}

  uniform float uTime;
  uniform float uCorridor;
  uniform float uRidge;

  out vec3 vWorld;
  out float vHeight;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 cell = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(cell);
    float b = hash(cell + vec2(1.0, 0.0));
    float c = hash(cell + vec2(0.0, 1.0));
    float d = hash(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float sum = 0.0;
    float amplitude = 0.5;
    for (int octave = 0; octave < 5; octave++) {
      sum += amplitude * valueNoise(p);
      p = p * 2.03 + vec2(17.3, 9.1);
      amplitude *= 0.5;
    }
    return sum;
  }

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);

    float wall = smoothstep(uCorridor, uCorridor + 52.0, abs(world.x));
    vec2 field = world.xz * 0.016 + vec2(0.0, uTime * 0.012);

    vec2 line = sweepLine(world.z);
    float swell = 0.25 + 0.75 * line.y * exp(-pow(line.x * 0.021, 2.0));

    float ridged = pow(fbm(field), 1.75);
    float height = ridged * uRidge * wall * (0.8 + 0.12 * swell);

    world.y += height;
    vHeight = height;
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const TERRAIN_FRAGMENT = /* glsl */ `
  ${SWEEP}

  uniform vec3 uCamera;
  uniform vec3 uLow;
  uniform vec3 uHigh;
  uniform vec3 uPeak;
  uniform vec3 uFog;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uSpacing;
  uniform float uMajor;
  uniform float uRidge;

  in vec3 vWorld;
  in float vHeight;

  layout(location = 0) out vec4 fragColor;

  float gridMask(vec2 point, float spacing) {
    vec2 coord = point / spacing;
    vec2 derivative = max(fwidth(coord), vec2(1e-5));
    vec2 distanceToLine = abs(fract(coord - 0.5) - 0.5) / derivative;
    float line = 1.0 - min(min(distanceToLine.x, distanceToLine.y), 1.0);
    float density = max(derivative.x, derivative.y);
    return line * (1.0 - smoothstep(0.3, 1.0, density));
  }

  void main() {
    float minor = gridMask(vWorld.xz, uSpacing);
    float major = gridMask(vWorld.xz, uMajor);
    float lines = max(minor * 0.42, major);

    float climb = clamp(vHeight / max(uRidge, 0.001), 0.0, 1.0);
    vec3 tint = mix(uLow, uHigh, smoothstep(0.0, 0.55, climb));
    tint = mix(tint, uPeak, smoothstep(0.5, 1.0, climb));

    vec2 line = sweepLine(vWorld.z);
    float sweep = line.y * exp(-pow(line.x * 0.075, 2.0));
    tint += uPeak * sweep * 0.5;

    vec3 plate = mix(vec3(0.004, 0.011, 0.014), tint * 0.16, climb * 0.7 + sweep * 0.4);
    vec3 color = mix(plate, tint, lines);

    float fog = smoothstep(uFogNear, uFogFar, length(vWorld - uCamera));
    color = mix(color, uFog, fog);

    fragColor = vec4(color, 1.0);
  }
`

const SUN_VERTEX = /* glsl */ `
  out vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SUN_FRAGMENT = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform float uTime;

  in vec2 vUv;
  layout(location = 0) out vec4 fragColor;

  void main() {
    vec2 centred = vUv * 2.0 - 1.0;
    float radius = length(centred);

    vec3 body = mix(uBottom, uTop, smoothstep(-1.0, 1.0, centred.y));

    float band = pow(clamp(centred.y * 0.5 + 0.5, 0.0, 1.0), 0.55);
    float slit = step(0.42, fract(band * 15.0 - uTime * 0.06));
    float mask = mix(1.0, slit, smoothstep(0.62, 0.0, centred.y * 0.5 + 0.5));

    float disc = smoothstep(0.82, 0.78, radius) * mask;
    float halo = pow(clamp(1.0 - radius, 0.0, 1.0), 3.2) * 0.42;

    vec3 color = body * (disc + halo * 1.1);
    float alpha = clamp(disc + halo, 0.0, 1.0);
    if (alpha < 0.003) discard;
    fragColor = vec4(color, alpha);
  }
`

const PLANET_VERTEX = /* glsl */ `
  out vec3 vNormal;
  out vec3 vWorld;
  out vec2 vUv;
  out float vLocalY;

  void main() {
    vUv = uv;
    vLocalY = position.y;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const PLANET_FRAGMENT = /* glsl */ `
  uniform sampler2D uEnv;
  uniform vec3 uKeyDirection;
  uniform vec3 uKeyColor;
  uniform vec3 uFillDirection;
  uniform vec3 uFillColor;
  uniform vec3 uCheckA;
  uniform vec3 uCheckB;
  uniform vec3 uRim;
  uniform float uTime;
  uniform float uBands;
  uniform float uAssembly;

  in vec3 vNormal;
  in vec3 vWorld;
  in vec2 vUv;
  in float vLocalY;

  layout(location = 0) out vec4 fragColor;

  vec2 equirect(vec3 direction) {
    return vec2(
      atan(direction.z, direction.x) * 0.1591549 + 0.5,
      asin(clamp(direction.y, -1.0, 1.0)) * 0.3183098 + 0.5
    );
  }

  float banded(vec3 normal, vec3 direction) {
    float lambert = dot(normal, normalize(direction)) * 0.5 + 0.5;
    return floor(lambert * uBands) / uBands;
  }

  void main() {
    // The ball fills in from the bottom up behind a glowing cut.
    float plane = mix(-15.0, 15.0, uAssembly);
    if (vLocalY > plane) discard;

    vec3 normal = normalize(vNormal);
    vec3 view = normalize(cameraPosition - vWorld);

    float check = mod(floor(vUv.x * 16.0) + floor(vUv.y * 8.0), 2.0);
    vec3 albedo = mix(uCheckA, uCheckB, check);

    vec3 light = uKeyColor * banded(normal, uKeyDirection) + uFillColor * banded(normal, uFillDirection) * 0.5;

    vec3 reflection = reflect(-view, normal);
    vec3 mirrored = texture(uEnv, equirect(reflection)).rgb;

    float fresnel = pow(1.0 - max(dot(normal, view), 0.0), 3.0);
    vec3 body = mix(albedo * light, mirrored * 1.25, 0.42 + fresnel * 0.5);

    vec3 halfway = normalize(normalize(uKeyDirection) + view);
    float specular = pow(max(dot(normal, halfway), 0.0), 90.0);
    body += uKeyColor * step(0.55, specular) * 0.85;

    body += uRim * fresnel * (0.55 + sin(uTime * 1.6) * 0.18);

    body += uRim * smoothstep(plane - 3.0, plane, vLocalY) * 1.8 * (1.0 - step(1.0, uAssembly));

    fragColor = vec4(body, 1.0);
  }
`

function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

// The sunset the planet's chrome reflects.
function createSkyTexture(): THREE.Texture {
  const canvas = document.createElement("canvas")
  canvas.width = 1024
  canvas.height = 512
  const context = canvas.getContext("2d")
  if (!context) {
    return new THREE.Texture()
  }

  const sky = context.createLinearGradient(0, 0, 0, canvas.height)
  sky.addColorStop(0, "#02060a")
  sky.addColorStop(0.28, "#0a1030")
  sky.addColorStop(0.42, "#4b1a63")
  sky.addColorStop(0.475, "#a63a72")
  sky.addColorStop(0.5, "#e0915f")
  sky.addColorStop(0.53, "#2a4450")
  sky.addColorStop(0.72, "#050f14")
  sky.addColorStop(1, "#02070a")
  context.fillStyle = sky
  context.fillRect(0, 0, canvas.width, canvas.height)

  const sun = context.createRadialGradient(300, 256, 4, 300, 256, 190)
  sun.addColorStop(0, "rgba(255, 236, 190, 0.95)")
  sun.addColorStop(0.35, "rgba(255, 132, 96, 0.5)")
  sun.addColorStop(1, "rgba(255, 91, 130, 0)")
  context.fillStyle = sun
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.strokeStyle = "rgba(134, 250, 221, 0.16)"
  context.lineWidth = 1
  for (let line = 1; line < 16; line += 1) {
    const y = 256 + (line / 16) ** 2.1 * 256
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(canvas.width, y)
    context.stroke()
  }

  const random = seeded(4242)
  context.fillStyle = "rgba(217, 255, 239, 0.75)"
  for (let star = 0; star < 260; star += 1) {
    context.fillRect(random() * canvas.width, random() * 210, 1, 1)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createTerrain() {
  const geometry = new THREE.PlaneGeometry(
    GROUND_WIDTH,
    GROUND_DEPTH,
    340,
    Math.round(GROUND_DEPTH / GROUND_STEP)
  )
  geometry.rotateX(-Math.PI / 2)

  const uniforms = {
    uCamera: { value: new THREE.Vector3() },
    uCorridor: { value: 52 },
    uFog: { value: new THREE.Color(VOID) },
    uFogFar: { value: 820 },
    uFogNear: { value: 260 },
    uHigh: { value: new THREE.Color(PHOSPHOR) },
    uLow: { value: new THREE.Color(0x0f_6b_5c) },
    uMajor: { value: 45 },
    uPeak: { value: new THREE.Color(SIGNAL) },
    uRidge: { value: 66 },
    uSpacing: { value: 9 },
    uSweep: { value: 0 },
    uSweepStep: { value: SWEEP_SPAN / BEATS_PER_BAR },
    uTime: { value: 0 },
  }

  const material = new THREE.ShaderMaterial({
    fog: false,
    fragmentShader: TERRAIN_FRAGMENT,
    glslVersion: THREE.GLSL3,
    uniforms,
    vertexShader: TERRAIN_VERTEX,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.y = GROUND_Y
  mesh.frustumCulled = false
  mesh.renderOrder = -1

  const violet = new THREE.Color(VIOLET)
  const signal = new THREE.Color(SIGNAL)

  return {
    dispose() {
      geometry.dispose()
      material.dispose()
    },
    mesh,
    update(camera: THREE.Camera, elapsed: number) {
      // Snapped to the vertex rows, so the ground moves under the camera
      // without its samples sliding through the heightfield.
      mesh.position.z =
        Math.round((camera.position.z - GROUND_AHEAD) / GROUND_STEP) *
        GROUND_STEP
      uniforms.uTime.value = elapsed
      uniforms.uCamera.value.copy(camera.position)
      const bar = (elapsed / BAR_SECONDS) % 1
      uniforms.uSweep.value = camera.position.z + SWEEP_LEAD - bar * SWEEP_SPAN
      uniforms.uPeak.value
        .copy(signal)
        .lerp(violet, 0.5 + Math.sin(elapsed * 0.35) * 0.5)
    },
  }
}

function createSky(pixelRatio: number) {
  const group = new THREE.Group()

  const sunGeometry = new THREE.PlaneGeometry(1, 1)
  const uniforms = {
    uBottom: { value: new THREE.Color(0xff_3f_7f) },
    uTime: { value: 0 },
    uTop: { value: new THREE.Color(0xff_cf_7a) },
  }
  const sunMaterial = new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthTest: true,
    // Tested against the ridges without painting the transparent disc into
    // the depth buffer.
    depthWrite: false,
    fog: false,
    fragmentShader: SUN_FRAGMENT,
    glslVersion: THREE.GLSL3,
    transparent: true,
    uniforms,
    vertexShader: SUN_VERTEX,
  })
  const sun = new THREE.Mesh(sunGeometry, sunMaterial)
  sun.scale.setScalar(560)
  sun.renderOrder = -30
  sun.frustumCulled = false
  group.add(sun)

  const starCount = 1200
  const positions = new Float32Array(starCount * 3)
  const random = seeded(20_250_821)
  for (let index = 0; index < starCount; index += 1) {
    const radius = 900 + random() * 400
    const theta = random() * Math.PI * 2
    const phi = Math.acos(random() * 0.94)
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[index * 3 + 1] = radius * Math.cos(phi)
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
  }
  const starGeometry = new THREE.BufferGeometry()
  starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  const starMaterial = new THREE.PointsMaterial({
    color: PHOSPHOR_BRIGHT,
    depthWrite: false,
    fog: false,
    opacity: 0.55,
    size: 1.6 * pixelRatio,
    sizeAttenuation: false,
    transparent: true,
  })
  const stars = new THREE.Points(starGeometry, starMaterial)
  stars.frustumCulled = false
  stars.renderOrder = -40
  group.add(stars)

  return {
    dispose() {
      sunGeometry.dispose()
      sunMaterial.dispose()
      starGeometry.dispose()
      starMaterial.dispose()
    },
    group,
    setPixelRatio(ratio: number) {
      starMaterial.size = 1.6 * ratio
    },
    update(camera: THREE.Camera, elapsed: number) {
      stars.position.copy(camera.position)
      sun.position.set(0, 34, camera.position.z - 1500)
      uniforms.uTime.value = elapsed
      starMaterial.opacity = 0.4 + Math.sin(elapsed * 0.7) * 0.06
    },
  }
}

function createPlanet(environment: THREE.Texture) {
  const group = new THREE.Group()
  const pivot = new THREE.Group()
  group.add(pivot)

  const geometry = new THREE.SphereGeometry(14, 96, 64)
  const uniforms = {
    uAssembly: { value: 0 },
    uBands: { value: 5 },
    uCheckA: { value: new THREE.Color(0x12_0a_1c) },
    uCheckB: { value: new THREE.Color(SIGNAL) },
    uEnv: { value: environment },
    uFillColor: { value: new THREE.Color(SIGNAL) },
    uFillDirection: { value: new THREE.Vector3(0.8, -0.2, -0.5) },
    uKeyColor: { value: new THREE.Color(0xff_f0_dc) },
    uKeyDirection: { value: new THREE.Vector3(-0.4, 0.9, 0.6) },
    uRim: { value: new THREE.Color(PHOSPHOR) },
    uTime: { value: 0 },
  }
  const material = new THREE.ShaderMaterial({
    fog: false,
    fragmentShader: PLANET_FRAGMENT,
    glslVersion: THREE.GLSL3,
    uniforms,
    vertexShader: PLANET_VERTEX,
  })
  const ball = new THREE.Mesh(geometry, material)
  pivot.add(ball)

  const cageSource = new THREE.IcosahedronGeometry(23, 1)
  const cageGeometry = new THREE.EdgesGeometry(cageSource)
  cageSource.dispose()
  const cageMaterial = new THREE.LineBasicMaterial({
    color: PHOSPHOR,
    depthWrite: false,
    fog: false,
    opacity: 0.34,
    transparent: true,
  })
  const cage = new THREE.LineSegments(cageGeometry, cageMaterial)
  pivot.add(cage)
  const cageLines = cageGeometry.getAttribute("position").count / 2

  const ringGeometry = new THREE.TorusGeometry(31, 0.22, 8, 160)
  const ringColors = [PHOSPHOR, SIGNAL, VIOLET]
  const rings = ringColors.map((color, index) => {
    const ring = new THREE.Mesh(
      ringGeometry,
      new THREE.MeshBasicMaterial({
        color,
        fog: false,
        opacity: 0.5,
        transparent: true,
      })
    )
    ring.rotation.x = Math.PI / 2 + index * 0.34
    pivot.add(ring)
    return ring
  })

  return {
    dispose() {
      geometry.dispose()
      material.dispose()
      cageGeometry.dispose()
      cageMaterial.dispose()
      ringGeometry.dispose()
      for (const ring of rings) {
        ring.material.dispose()
      }
    },
    group,
    /**
     * `assembly` runs 0 to 1 the way the site's hero does: the cage draws
     * itself a line at a time, the ball fills in from the bottom up behind a
     * glowing cut, and then the rings come on one after the other.
     */
    update(elapsed: number, assembly: number) {
      const drawn = Math.round(smoothstep(0, 0.42, assembly) * cageLines) * 2
      cageGeometry.setDrawRange(0, drawn)
      uniforms.uAssembly.value = smoothstep(0.3, 0.86, assembly)
      for (const [index, ring] of rings.entries()) {
        ring.material.opacity =
          0.5 * smoothstep(0.72 + index * 0.07, 0.9 + index * 0.05, assembly)
      }
      uniforms.uTime.value = elapsed
      ball.rotation.y = elapsed * 0.42
      ball.rotation.z = Math.sin(elapsed * 0.3) * 0.22
      cage.rotation.y = -elapsed * 0.16
      cage.rotation.x = elapsed * 0.09
      pivot.position.y = Math.sin(elapsed * 0.6) * 1.6
      for (const [index, ring] of rings.entries()) {
        ring.rotation.z = index * 0.7 + elapsed * (0.2 + index * 0.13)
      }
    },
  }
}

// The planet's whole width, rings included, in its own units.
const PLANET_SPAN = 62
const PLANET_DISTANCE = 140

export interface TerrainWorldOptions {
  /** Where the planet sits, in canvas pixels, and how wide it is drawn. */
  planet: { size: number; x: number; y: number }
  still: boolean
}

export interface TerrainWorld {
  dispose: () => void
}

export function createTerrainWorld(
  host: HTMLElement,
  options: TerrainWorldOptions
): TerrainWorld {
  const canvas = document.createElement("canvas")
  canvas.className = "block h-full w-full"
  host.append(canvas)

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    canvas,
    powerPreference: "high-performance",
  })
  renderer.autoClear = false
  renderer.toneMapping = THREE.NoToneMapping
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setClearColor(VOID, 1)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 1, 2100)
  scene.add(camera)

  const skyTexture = createSkyTexture()
  const terrain = createTerrain()
  scene.add(terrain.mesh)
  const sky = createSky(1)
  scene.add(sky.group)
  const planet = createPlanet(skyTexture)
  camera.add(planet.group)

  const crt = new CrtPipeline(renderer, { bloom: true, samples: 4 })

  // The slide canvas is a fixed 1920x1080 space scaled to the screen, so the
  // drawing buffer follows the scaled size and not the layout size.
  let layoutWidth = 1
  let layoutHeight = 1
  const resize = () => {
    layoutWidth = Math.max(1, host.clientWidth)
    layoutHeight = Math.max(1, host.clientHeight)
    const shown = host.getBoundingClientRect().width / layoutWidth || 1
    const ratio = Math.min(2, Math.max(0.5, shown * window.devicePixelRatio))
    renderer.setPixelRatio(ratio)
    renderer.setSize(layoutWidth, layoutHeight, false)
    crt.setSize(layoutWidth, layoutHeight, ratio)
    sky.setPixelRatio(ratio)
    camera.aspect = layoutWidth / layoutHeight
    camera.updateProjectionMatrix()
    placePlanet()
  }

  const placePlanet = () => {
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
    const halfHeight = PLANET_DISTANCE * tanHalf
    const ndcX = (options.planet.x / layoutWidth) * 2 - 1
    const ndcY = 1 - (options.planet.y / layoutHeight) * 2
    planet.group.position.set(
      ndcX * halfHeight * camera.aspect,
      ndcY * halfHeight,
      -PLANET_DISTANCE
    )
    const worldPerPixel = (halfHeight * 2) / layoutHeight
    planet.group.scale.setScalar(
      (options.planet.size * worldPerPixel) / PLANET_SPAN
    )
  }

  const aim = new THREE.Vector3()
  const frame = (elapsed: number, delta: number, assembly: number) => {
    const z = -elapsed * SPEED
    camera.position.set(Math.sin(elapsed * 0.21) * 5, CAMERA_HEIGHT, z)
    aim.set(Math.sin(elapsed * 0.21 + 0.6) * 3, 30, z - 100)
    camera.lookAt(aim)
    terrain.update(camera, elapsed)
    sky.update(camera, elapsed)
    planet.update(elapsed, assembly)
    crt.render(scene, camera, elapsed, delta)
  }

  resize()
  const observer = new ResizeObserver(resize)
  observer.observe(host)

  let raf = 0
  if (options.still) {
    crt.setPower(1)
    frame(STILL_TIME, 0, 1)
  } else {
    let last = performance.now()
    const start = last
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000
      crt.setPower(smoothstep(0, POWER_ON_SECONDS, elapsed))
      // The planet builds itself once the tube has lit, as the site's does.
      const assembly = Math.min(1, Math.max(0, (elapsed - POWER_ON_SECONDS) / ASSEMBLE_SECONDS))
      frame(elapsed, (now - last) / 1000, assembly)
      last = now
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }

  return {
    dispose() {
      cancelAnimationFrame(raf)
      observer.disconnect()
      crt.dispose()
      terrain.dispose()
      sky.dispose()
      planet.dispose()
      skyTexture.dispose()
      renderer.dispose()
      canvas.remove()
    },
  }
}
