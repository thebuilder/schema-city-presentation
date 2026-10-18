"use client"

import { Html } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { type ReactNode, type RefObject, useMemo, useRef } from "react"
import * as THREE from "three"

/*
 * The pieces a staged example adds to the city: a link that draws itself, the
 * wireframe of a type that is gone, markers that rise off a roof, and a label
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
export const RISE_CELL = 2.2
/** How high above the roof the blocks settle. */
export const RISE_LIFT = 4

/** Small blocks that rise off a roof one after another and settle in a grid. */
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
  const columns = Math.ceil(Math.sqrt(count))
  const cell = RISE_CELL
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: colour, toneMapped: false }), [colour])
  const box = useMemo(() => new THREE.BoxGeometry(RISE_CELL * 0.5, RISE_CELL * 0.5, RISE_CELL * 0.5), [])
  const since = useSince(on, delay)
  useFrame((state) => {
    const t = since(state.clock.elapsedTime)
    meshes.current.forEach((mesh, index) => {
      if (!mesh) return
      const own = t === null ? 0 : still ? 1 : ease((t - index * 0.12) / 0.5)
      mesh.visible = own > 0
      // A flat grid hovering over the roof, which reads as a count from above.
      const row = Math.floor(index / columns)
      const column = index % columns
      mesh.position.set(
        (column - (columns - 1) / 2) * cell,
        own * RISE_LIFT,
        (row - (Math.ceil(count / columns) - 1) / 2) * cell
      )
      mesh.scale.setScalar(Math.max(0.001, own))
    })
  })
  return (
    <group position={at}>
      {Array.from({ length: count }, (_, index) => (
        <mesh
          geometry={box}
          // biome-ignore lint/suspicious/noArrayIndexKey: the blocks are identical and never reorder.
          key={index}
          material={material}
          ref={(mesh) => {
            meshes.current[index] = mesh
          }}
        />
      ))}
    </group>
  )
}

/** A label pinned to a point in the city, fading in once `on`. */
export function Tag({
  at,
  layer,
  on,
  delay = 0,
  tone = "plain",
  children,
}: {
  at: Point
  /** Where the label's element goes, the stage's label layer. */
  layer: RefObject<HTMLDivElement | null>
  on: boolean
  delay?: number
  tone?: "plain" | "signal"
  children: ReactNode
}) {
  return (
    <Html center portal={layer as RefObject<HTMLElement>} position={at} style={{ pointerEvents: "none" }}>
      <span
        className="whitespace-nowrap font-bold text-[length:var(--slide-label-size)] uppercase tracking-[var(--slide-label-tracking)] transition-opacity duration-500 [text-shadow:var(--slide-halo)]"
        style={{
          color: tone === "signal" ? "var(--slide-signal)" : "var(--foreground)",
          opacity: on ? 1 : 0,
          transitionDelay: on ? `${delay}s` : "0s",
        }}
      >
        {children}
      </span>
    </Html>
  )
}
