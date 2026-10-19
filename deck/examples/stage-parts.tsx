"use client"

import { Html } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { type ReactNode, type RefObject, useMemo, useRef } from "react"
import * as THREE from "three"

/*
 * The pieces a staged example adds to the city: a link that draws itself, the
 * wireframe of a type that is gone, blocks that stack on a roof, and a label
 * pinned to a point. Each one waits for `on`, then plays from the moment it
 * turned on, so a click starts the motion instead of the motion running ahead
 * of the speaker. Under reduced motion or a capture everything is simply there.
 */

export type Point = [number, number, number]

/** Seconds since `on` last turned true, plus `delay`, or null while off. */
function useSince(on: boolean, delay: number) {
  const since = useRef<number | null>(null)
  return (clock: number) => {
    if (!on) {
      since.current = null
      return null
    }
    if (since.current === null) since.current = clock + delay
    return clock - since.current
  }
}

const ease = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3

const ARC_STEPS = 64
const ARC_SIDES = 6

/**
 * A link from roof to roof, bowed up like the app's arcs, drawn from its start.
 * A tube rather than a line, since WebGL draws every line one pixel wide.
 */
export function Arc({
  from,
  to,
  colour,
  on,
  delay = 0,
  duration = 0.9,
  width = 0.12,
  still,
}: {
  from: Point
  to: Point
  colour: string
  on: boolean
  delay?: number
  duration?: number
  width?: number
  still: boolean
}) {
  const mesh = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const lift = a.distanceTo(b) * 0.3
    const control = a
      .clone()
      .lerp(b, 0.5)
      .setY(Math.max(a.y, b.y) + lift)
    const curve = new THREE.QuadraticBezierCurve3(a, control, b)
    const geometry = new THREE.TubeGeometry(curve, ARC_STEPS, width, ARC_SIDES, false)
    const material = new THREE.MeshBasicMaterial({ color: colour, toneMapped: false })
    const object = new THREE.Mesh(geometry, material)
    object.frustumCulled = false
    return object
  }, [from, to, colour, width])
  const since = useSince(on, delay)
  useFrame((state) => {
    const t = since(state.clock.elapsedTime)
    const progress = t === null ? 0 : still ? 1 : ease(t / duration)
    mesh.geometry.setDrawRange(0, Math.round(progress * ARC_STEPS) * ARC_SIDES * 6)
    mesh.visible = progress > 0
  })
  return <primitive object={mesh} />
}

/** The outline of a building that is no longer there, breathing in the signal colour. */
export function Ghost({
  at,
  size,
  height,
  colour,
  on,
  delay = 0,
  still,
}: {
  at: Point
  size: number
  height: number
  colour: string
  on: boolean
  delay?: number
  still: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const material = useMemo(
    () => new THREE.LineBasicMaterial({ color: colour, transparent: true, toneMapped: false }),
    [colour]
  )
  const plate = useMemo(
    () => new THREE.MeshBasicMaterial({ color: colour, transparent: true, depthWrite: false, toneMapped: false }),
    [colour]
  )
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), [])
  const since = useSince(on, delay)
  useFrame((state) => {
    const t = since(state.clock.elapsedTime)
    const shown = t === null ? 0 : still ? 1 : ease(t / 0.6)
    const breath = still ? 1 : 0.65 + 0.35 * Math.sin(state.clock.elapsedTime * 3)
    material.opacity = shown * breath
    plate.opacity = shown * 0.3
    if (group.current) group.current.visible = shown > 0
  })
  return (
    <group position={at} ref={group}>
      <lineSegments
        geometry={edges}
        material={material}
        position={[0, height / 2, 0]}
        scale={[size, height, size]}
      />
      <mesh material={plate} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size]} />
      </mesh>
    </group>
  )
}

/** The spacing of the blocks Rise stacks. */
const RISE_CELL = 2
/** How many blocks a layer of the pile holds, three across and two deep. */
const RISE_ACROSS = 3
const RISE_DEEP = 2

/** How high the pile stands on the roof. */
export const riseHeight = (count: number) => Math.ceil(count / (RISE_ACROSS * RISE_DEEP)) * RISE_CELL

/*
 * The city is unlit, so a flat colour turns a box into a hexagon. Shading each
 * face by hand, the top brightest and the sides darker, gives the blocks their
 * depth without adding lights the buildings around them would not use.
 */
const FACE_SHADE = [0.72, 0.72, 1, 0.35, 0.5, 0.5]

function shadedBox(size: number) {
  const box = new THREE.BoxGeometry(size, size, size)
  const colours = new Float32Array(box.attributes.position.count * 3)
  box.groups.forEach((group, face) => {
    for (let index = group.start; index < group.start + group.count; index++) {
      const vertex = box.index ? box.index.getX(index) : index
      colours.fill(FACE_SHADE[face] ?? 1, vertex * 3, vertex * 3 + 3)
    }
  })
  box.setAttribute("color", new THREE.BufferAttribute(colours, 3))
  return box
}

/** Blocks that drop onto a roof one after another and stack into a pile you can count. */
export function Rise({
  at,
  count,
  colour,
  on,
  delay = 0,
  still,
}: {
  at: Point
  count: number
  colour: string
  on: boolean
  delay?: number
  still: boolean
}) {
  const layer = RISE_ACROSS * RISE_DEEP
  const meshes = useRef<(THREE.Group | null)[]>([])
  const fill = useMemo(() => new THREE.MeshBasicMaterial({ color: colour, vertexColors: true, toneMapped: false }), [colour])
  const edge = useMemo(
    () => new THREE.LineBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(0.3), toneMapped: false }),
    [colour]
  )
  const size = RISE_CELL * 0.86
  const box = useMemo(() => shadedBox(size), [size])
  const edges = useMemo(() => new THREE.EdgesGeometry(box), [box])
  const since = useSince(on, delay)
  useFrame((state) => {
    const t = since(state.clock.elapsedTime)
    meshes.current.forEach((mesh, index) => {
      if (!mesh) return
      const own = t === null ? 0 : still ? 1 : ease((t - index * 0.12) / 0.45)
      mesh.visible = own > 0
      const level = Math.floor(index / layer)
      const across = index % RISE_ACROSS
      const deep = Math.floor((index % layer) / RISE_ACROSS)
      // Each block falls the last few units into its place, so the pile is seen being counted.
      mesh.position.set(
        (across - (RISE_ACROSS - 1) / 2) * RISE_CELL,
        level * RISE_CELL + size / 2 + (1 - own) * 5,
        (deep - (RISE_DEEP - 1) / 2) * RISE_CELL
      )
    })
  })
  return (
    <group position={at}>
      {Array.from({ length: count }, (_, index) => (
        <group
          // biome-ignore lint/suspicious/noArrayIndexKey: the blocks are identical and never reorder.
          key={index}
          ref={(mesh) => {
            meshes.current[index] = mesh
          }}
        >
          <mesh geometry={box} material={fill} />
          <lineSegments geometry={edges} material={edge} />
        </group>
      ))}
    </group>
  )
}

const SIDES = {
  centre: "translate(-50%, -50%)",
  left: "translate(calc(-100% - 0.75rem), -50%)",
  right: "translate(0.75rem, -50%)",
}

/** A label pinned to a point in the city, on a plate so it reads over the buildings, fading in once `on`. */
export function Tag({
  at,
  layer,
  on,
  delay = 0,
  tone = "plain",
  side = "centre",
  children,
}: {
  at: Point
  /** Where the label's element goes, the stage's label layer. */
  layer: RefObject<HTMLDivElement | null>
  on: boolean
  delay?: number
  tone?: "plain" | "signal"
  /** Which side of the point the plate sits, for two labelled buildings that stand side by side. */
  side?: "centre" | "left" | "right"
  children: ReactNode
}) {
  return (
    <Html portal={layer as RefObject<HTMLElement>} position={at} style={{ pointerEvents: "none" }}>
      <span
        className="flex w-max items-center gap-3 whitespace-nowrap border bg-[var(--slide-surface)] px-3 py-1.5 font-semibold text-[length:var(--slide-support-size)] leading-none backdrop-blur-sm transition-opacity duration-500"
        style={{
          borderColor: tone === "signal" ? "var(--slide-signal)" : "var(--slide-surface-border)",
          color: tone === "signal" ? "var(--slide-signal)" : "var(--foreground)",
          opacity: on ? 1 : 0,
          transform: SIDES[side],
          transitionDelay: on ? `${delay}s` : "0s",
        }}
      >
        {children}
      </span>
    </Html>
  )
}

/** A property alias inside a label, in the colour of the link that brings it or the clash it causes. */
export function Chip({ colour, children }: { colour: string; children: ReactNode }) {
  return (
    <span
      className="border px-2 py-1 font-mono text-[length:var(--slide-label-size)] leading-none"
      style={{ borderColor: colour, color: colour }}
    >
      {children}
    </span>
  )
}
