import * as THREE from "three"
import {
  DRAGON_INDICES,
  DRAGON_POSITIONS,
  DRAGON_VERTEX_COUNT,
} from "@/deck/parts/terrain/dragon-mesh"

/*
 * The wireframes of thebuilder.dk: objects drawn in out of the dark by a scan
 * front, line by line, the way the site draws its frames and its dragon
 * (lib/scene/scan.ts, frames.ts and dragon.ts in thebuilder-dk). The cage
 * shader is the site's. What is new is the procession: a row of objects
 * stands along the right of the valley, each one drawn in as the camera
 * nears it and recycled ahead once it is passed, and the dragon flies
 * alongside. Every line brightens on the beat when the music plays.
 */

const PHOSPHOR = 0x86_fa_dd
const PHOSPHOR_BRIGHT = 0xd9_ff_ef
const SIGNAL = 0xff_5b_82
const VIOLET = 0xb8_90_ff
const AMBER = 0xff_bc_57
const BLUE = 0x8d_bd_f5

const SCAN_DISTANCE = /* glsl */ `
  uniform vec3 uScanOrigin;
  uniform float uScanRadius;
  uniform float uScanLag;
  uniform float uScanTrail;
  uniform float uScanTime;
  uniform float uScanWobble;

  float scanDistance(vec3 world) {
    float base = distance(world, uScanOrigin);
    return base
      - sin(world.x * 0.055 + uScanTime * 0.9) * uScanWobble
      - sin(world.z * 0.041 - uScanTime * 0.7) * uScanWobble * 0.8;
  }
`

const CAGE_VERTEX = /* glsl */ `
  out vec3 vScanWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vScanWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const CAGE_FRAGMENT = /* glsl */ `
  ${SCAN_DISTANCE}

  uniform vec3 uColor;
  uniform vec3 uFrontColor;
  uniform float uOpacity;
  uniform float uResidual;
  uniform float uScanPulse;

  in vec3 vScanWorld;
  layout(location = 0) out vec4 fragColor;

  void main() {
    float behind = uScanRadius - scanDistance(vScanWorld);
    if (behind < 0.0) discard;

    float rim = exp(-behind / 11.0);
    float trail = 1.0 - smoothstep(0.0, uScanTrail, behind);

    float alpha = (rim * 1.5 + trail * 0.4 + uResidual * (1.0 + uScanPulse * 1.6)) * uOpacity;
    if (alpha < 0.004) discard;

    fragColor = vec4(mix(uColor, uFrontColor, max(rim, uScanPulse * 0.45)), alpha);
  }
`

// Shared by every cage, so one beat lights them all.
const pulse: THREE.IUniform<number> = { value: 0 }

function cage(color: number, residual: number, lag: number, trail: number) {
  const uniforms = {
    uColor: { value: new THREE.Color(color) },
    uFrontColor: { value: new THREE.Color(PHOSPHOR_BRIGHT) },
    uOpacity: { value: 1 },
    uResidual: { value: residual },
    uScanLag: { value: lag },
    uScanOrigin: { value: new THREE.Vector3() },
    uScanPulse: pulse,
    uScanRadius: { value: -lag },
    uScanTime: { value: 0 },
    uScanTrail: { value: trail },
    uScanWobble: { value: 3 },
  }
  const material = new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    fragmentShader: CAGE_FRAGMENT,
    glslVersion: THREE.GLSL3,
    transparent: true,
    uniforms,
    vertexShader: CAGE_VERTEX,
  })
  return { material, uniforms }
}

function decode(text: string): DataView {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new DataView(bytes.buffer)
}

function dragonGeometry(scale: number) {
  const positions = decode(DRAGON_POSITIONS)
  const position = new Float32Array(DRAGON_VERTEX_COUNT * 3)
  for (let index = 0; index < position.length; index += 1) {
    position[index] = positions.getInt16(index * 2, true) / 32_767
  }
  const indices = decode(DRAGON_INDICES)
  const index = new Uint16Array(indices.byteLength / 2)
  for (let at = 0; at < index.length; at += 1) {
    index[at] = indices.getUint16(at * 2, true)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3))
  geometry.setIndex(new THREE.BufferAttribute(index, 1))
  // Authored nose along +x. Turned to face -z, the way the camera flies.
  geometry.rotateY(Math.PI / 2)
  geometry.scale(scale, scale, scale)
  const wire = new THREE.WireframeGeometry(geometry)
  geometry.dispose()
  return wire
}

function edges(source: THREE.BufferGeometry) {
  const geometry = new THREE.EdgesGeometry(source, 1)
  source.dispose()
  return geometry
}

// The procession, in the order it passes. Sizes are the object's radius.
const SHAPES: { color: number; make: () => THREE.BufferGeometry; size: number }[] = [
  { color: VIOLET, make: () => edges(new THREE.IcosahedronGeometry(20, 1)), size: 20 },
  {
    color: BLUE,
    make: () => new THREE.WireframeGeometry(new THREE.TorusKnotGeometry(13, 4, 72, 8)),
    size: 22,
  },
  { color: SIGNAL, make: () => edges(new THREE.OctahedronGeometry(22, 0)), size: 22 },
  { color: PHOSPHOR, make: () => edges(new THREE.DodecahedronGeometry(19, 0)), size: 19 },
  {
    color: AMBER,
    make: () => new THREE.WireframeGeometry(new THREE.TorusGeometry(17, 5, 10, 28)),
    size: 22,
  },
  { color: BLUE, make: () => edges(new THREE.BoxGeometry(26, 26, 26, 2, 2, 2)), size: 23 },
]

const SPACING = 230
const FIRST = 340
const SIDE_X = [96, 70, 120, 84, 110, 76]
const LIFT_Y = [26, 40, 18, 34, 46, 22]
// Drawn in between these distances from the camera.
const DRAW_FAR = 640
const DRAW_NEAR = 330

// Faded out between these as it passes.
const FADE_NEAR = 110
const FADE_FAR = 240

const DRAGON_SCALE = 40
const DRAGON_AHEAD = 280

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export function createWires() {
  const group = new THREE.Group()
  const disposables: { dispose: () => void }[] = []

  const objects = SHAPES.map((shape, index) => {
    const geometry = shape.make()
    const { material, uniforms } = cage(shape.color, 0.32, 18, 60)
    const lines = new THREE.LineSegments(geometry, material)
    lines.frustumCulled = false
    group.add(lines)
    disposables.push(geometry, material)
    return {
      index,
      lines,
      size: shape.size,
      uniforms,
      z: -FIRST - index * SPACING,
    }
  })

  const dragonWire = dragonGeometry(DRAGON_SCALE)
  const dragon = cage(VIOLET, 0.12, 22, 74)
  const dragonLines = new THREE.LineSegments(dragonWire, dragon.material)
  dragonLines.frustumCulled = false
  group.add(dragonLines)
  disposables.push(dragonWire, dragon.material)
  const nose = new THREE.Vector3()

  const span = SPACING * SHAPES.length

  return {
    dispose() {
      for (const item of disposables) {
        item.dispose()
      }
    },
    group,
    update(camera: THREE.Camera, elapsed: number, beat: number) {
      pulse.value = beat
      const eye = camera.position
      for (const object of objects) {
        // Passed objects go to the back of the line, so the row never ends.
        while (object.z > eye.z + 60) {
          object.z -= span
        }
        const { lines, uniforms } = object
        const x = SIDE_X[object.index] ?? 90
        const y = LIFT_Y[object.index] ?? 30
        lines.position.set(x, y + Math.sin(elapsed * 0.5 + object.index) * 2, object.z)
        lines.rotation.set(elapsed * 0.11 + object.index, elapsed * 0.17 + object.index * 0.7, 0)
        const distance = eye.z - object.z
        const drawn = 1 - smoothstep(DRAW_NEAR, DRAW_FAR, distance)
        // Gone before it is close enough to fill the side of the frame.
        uniforms.uOpacity.value = smoothstep(FADE_NEAR, FADE_FAR, distance)
        // Drawn from its underside up, the way the site builds from the ground.
        uniforms.uScanOrigin.value.set(x, y - object.size, object.z)
        uniforms.uScanTime.value = elapsed
        uniforms.uScanRadius.value =
          -uniforms.uScanLag.value + drawn * (object.size * 2 + uniforms.uScanLag.value * 2)
      }

      // The dragon keeps ahead of the camera, high on the right, drawn in from
      // the nose back over its first seconds and then flying with the scan.
      dragonLines.position.set(
        30 + Math.sin(elapsed * 0.23) * 12,
        52 + Math.sin(elapsed * 0.38) * 4,
        eye.z - DRAGON_AHEAD
      )
      // Turned three-quarters to the camera and banked, so the wings read.
      // Seen straight from behind, it is a thin cross that reads as nothing.
      dragonLines.rotation.set(0.18, 0.85 + Math.sin(elapsed * 0.23) * 0.15, 0.3 + Math.sin(elapsed * 0.31) * 0.1)
      nose.set(0, 0, -0.78 * DRAGON_SCALE)
      dragonLines.localToWorld(nose)
      dragon.uniforms.uScanOrigin.value.copy(nose)
      dragon.uniforms.uScanTime.value = elapsed
      const drawn = smoothstep(1.2, 6, elapsed)
      dragon.uniforms.uScanRadius.value =
        -dragon.uniforms.uScanLag.value +
        drawn * (1.9 * DRAGON_SCALE + dragon.uniforms.uScanLag.value * 2)
    },
  }
}
