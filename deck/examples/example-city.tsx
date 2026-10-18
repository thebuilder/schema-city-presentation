"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { type ReactNode, type RefObject, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import {
  boardPalette,
  buildingPalette,
  CityLinks,
  CityRoads,
  CityWorld,
  roofAnchors,
  useCity,
} from "@/deck/city/city-world"
import { type CityPalette, useCityPalette } from "@/deck/city/palette"
import { type ChangeKind, ISLAND_PAD, type SchemaGraph } from "@/deck/city/schema-city"
import {
  Boards,
  Buildings,
  CAMERA_FOV,
  changeScale,
  highlightScale,
  revealAt,
} from "@/deck/city/schema-city-scene"
import { useStill } from "@/deck/parts/beats"

/*
 * The site as Schema City draws it, standing to the right of a slide's text. A
 * slide says what to light and the city paints it with the app's own means: a
 * highlight is the binary ramp "Show in city" uses, a focus is the fade the app
 * gives everything outside a neighbourhood, a selection is the signal frame, and
 * a comparison is the change lens. Nothing here decides what is broken or what a
 * change reaches; the slide hands that in from the package's model.
 */

export type CityPaint = {
  /** Types lit in the signal colour, everything else dim. */
  lit?: string[]
  /** Types kept at full strength, everything else faded toward the ground. */
  focus?: string[]
  /** The one type framed in the signal colour. */
  selected?: string | null
  /** The change lens, by type. */
  changes?: [string, ChangeKind][]
  /** Composition arcs between these types. */
  arcs?: string[]
}

const ELEVATION = Math.atan2(0.8, 1)
const START = 0.8
/** Radians per second, slow enough that the city stays framed through a long slide. */
const ORBIT = 0.012
/** Where the city goes on screen, in normalised device units, -1 to 1 each way. */
export type Frame = { left: number; right: number; bottom: number; top: number }
/** Right of ExampleFrame's text column, whose copy ends at 764 of 1920 pixels. */
const BESIDE_TEXT: Frame = { left: -0.2, right: 0.97, bottom: -0.9, top: 0.8 }
const noop = () => undefined

/** What a slide's own scene pieces need to stand in the city. */
export type Stage = {
  city: ReturnType<typeof useCity>
  /** The layer labels pinned in the scene are drawn into, above the canvas. */
  labels: RefObject<HTMLDivElement | null>
  anchors: ReturnType<typeof roofAnchors>
  palette: CityPalette
  still: boolean
}

export function ExampleCity({
  graph,
  paint,
  frame = BESIDE_TEXT,
  frameOn,
  framePoints,
  extras,
  className,
}: {
  graph: SchemaGraph
  paint: CityPaint
  /** Where on screen the city goes, in normalised device units. */
  frame?: Frame
  /** The types the camera keeps in view, all of the city when left out. */
  frameOn?: string[]
  /** Points the camera keeps in view as well, for pieces a slide adds. */
  framePoints?: (city: Stage["city"]) => [number, number, number][]
  /** A slide's own pieces, drawn in the city's space. */
  extras?: (stage: Stage) => ReactNode
  className?: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const labels = useRef<HTMLDivElement>(null)
  const palette = useCityPalette(host)
  const still = useStill()
  return (
    <div className={className} ref={host}>
      {palette ? (
        <Canvas
          camera={{ far: 4000, fov: CAMERA_FOV, near: 0.5 }}
          dpr={[1, 2]}
          resize={{ offsetSize: true }}
          shadows="percentage"
        >
          <ExampleScene
            extras={extras}
            frame={frame}
            frameOn={frameOn}
            framePoints={framePoints}
            graph={graph}
            labels={labels}
            paint={paint}
            palette={palette}
            still={still}
          />
        </Canvas>
      ) : null}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" ref={labels} />
    </div>
  )
}

function ExampleScene({
  extras,
  frame,
  frameOn,
  framePoints,
  graph,
  labels,
  paint,
  palette,
  still,
}: {
  extras?: (stage: Stage) => ReactNode
  labels: RefObject<HTMLDivElement | null>
  frame: Frame
  frameOn?: string[]
  framePoints?: (city: Stage["city"]) => [number, number, number][]
  graph: SchemaGraph
  paint: CityPaint
  palette: CityPalette
  still: boolean
}) {
  const city = useCity(graph)
  const camera = useThree((state) => state.camera)
  const { centre, span } = city.ground
  // Every board's corners and every roof: what a camera has to keep in view. The
  // corners of the ground as a whole would frame the empty space between boards.
  // A slide that frames a few types keeps their footprints and roofs instead.
  const corners = useMemo(() => {
    const roof = (placement: (typeof city.placements)[number]) =>
      new THREE.Vector3(
        placement.position.x,
        (placement.y ?? 0) + (city.heights.get(placement.id) ?? placement.height),
        placement.position.z
      )
    const extra = (framePoints?.(city) ?? []).map(([x, y, z]) => new THREE.Vector3(x, y, z))
    if (frameOn) {
      const among = new Set(frameOn)
      return [
        ...city.placements
          .filter((placement) => among.has(placement.id))
          .flatMap((placement) => {
            const half = placement.footprint / 2 + 1
            return [
              roof(placement),
              ...[-half, half].flatMap((dx) =>
                [-half, half].map(
                  (dz) => new THREE.Vector3(placement.position.x + dx, 0, placement.position.z + dz)
                )
              ),
            ]
          }),
        ...extra,
      ]
    }
    const ground = city.districts.flatMap((district) =>
      [district.minX - ISLAND_PAD, district.maxX + ISLAND_PAD].flatMap((x) =>
        [district.minZ - ISLAND_PAD, district.maxZ + ISLAND_PAD].map((z) => new THREE.Vector3(x, 0, z))
      )
    )
    return [...ground, ...city.placements.map(roof), ...extra]
  }, [city, frameOn, framePoints])
  const rig = useRef<Rig | null>(null)
  const [roads, setRoads] = useState(still ? 1 : 0)

  const scale = useMemo(() => {
    if (paint.changes) return changeScale(graph, new Map(paint.changes))
    if (paint.lit) return highlightScale(graph, new Set(paint.lit))
    return null
  }, [graph, paint.changes, paint.lit])
  const focus = useMemo(() => (paint.focus ? new Set(paint.focus) : null), [paint.focus])
  // Under any lens the app paints every Element Type phosphor-dim, so amber is
  // never mistaken for a ramp's end. A slide has no ramp legend to confuse, and
  // green blocks read as pages there, so the Element Types a lens says nothing
  // about stand apart in their own amber, drawn without the lens.
  const groups = useMemo(() => {
    const plain = new Set(
      scale
        ? graph.nodes
            .filter((node) => node.isElement && !((scale.t.get(node.id) ?? 0) > 0))
            .map((node) => node.id)
        : []
    )
    const split = <T extends { buildingId: string }>(cells: T[], keep: boolean) =>
      cells.filter((cell) => plain.has(cell.buildingId) === keep)
    const part = (keep: boolean) => ({
      cells: split(city.cells, keep),
      windows: split(city.windows, keep),
      plazas: split(city.plazas, keep),
      placements: city.placements.filter((placement) => plain.has(placement.id) === keep),
    })
    return { lensed: part(false), plain: part(true) }
  }, [city, graph, scale])
  const anchors = useMemo(() => roofAnchors(city.placements, city.heights), [city])
  const arcs = useMemo(() => {
    const among = new Set(paint.arcs ?? [])
    return city.edges.filter(
      (edge) => edge.kind === "composition" && among.has(edge.from) && among.has(edge.to)
    )
  }, [city.edges, paint.arcs])

  useFrame((state, delta) => {
    const t = still ? 0 : state.clock.elapsedTime
    const perspective = camera as THREE.PerspectiveCamera
    const angle = START + t * ORBIT
    const wanted = solve(perspective, corners, angle, frame)
    // Ease toward each new framing, so a step moves the camera instead of cutting.
    const k = still || !rig.current ? 1 : 1 - Math.exp(-delta * 2.2)
    rig.current = rig.current ? blend(rig.current, wanted, k) : wanted
    place(perspective, rig.current, angle, state.size)
    const next = revealAt(state.clock.elapsedTime, still).links
    if (Math.abs(next - roads) > 0.02 || (next === 1 && roads !== 1)) setRoads(next)
  })

  return (
    <>
      <CityWorld centre={centre} palette={palette} span={span} />
      <Boards
        districts={city.districts}
        fingers={[]}
        folders={[]}
        palette={boardPalette(palette)}
        reducedMotion={still}
        vias={[]}
      />
      {[
        { key: "lensed", ...groups.lensed, scale },
        { key: "plain", ...groups.plain, scale: null },
      ].map((group) =>
        group.placements.length > 0 ? (
          <Buildings
            cells={group.cells}
            heights={city.heights}
            hovered={null}
            key={group.key}
            neighbours={focus}
            onFocus={noop}
            onHover={noop}
            onSelect={noop}
            palette={buildingPalette(palette)}
            placements={group.placements}
            plazas={group.plazas}
            reducedMotion={still}
            scale={group.scale}
            selected={paint.selected ?? null}
            windows={group.windows}
          />
        ) : null
      )}
      <CityRoads
        colour={palette.phosphor}
        edges={city.edges}
        opacity={roads * (focus ? 0.35 : 1)}
        placementsById={city.placementsById}
      />
      <CityLinks
        anchors={anchors}
        colour={palette.azure}
        edges={arcs}
        layer="compositions"
        opacity={roads}
        placementsById={city.placementsById}
      />
      {extras?.({ city, anchors, labels, palette, still })}
    </>
  )
}

const SCRATCH = new THREE.Vector3()

/** The corners' extent on screen with the camera where it stands now. */
function extent(camera: THREE.PerspectiveCamera, corners: THREE.Vector3[]) {
  camera.updateMatrixWorld()
  const box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  for (const corner of corners) {
    SCRATCH.copy(corner).project(camera)
    box.minX = Math.min(box.minX, SCRATCH.x)
    box.maxX = Math.max(box.maxX, SCRATCH.x)
    box.minY = Math.min(box.minY, SCRATCH.y)
    box.maxY = Math.max(box.maxY, SCRATCH.y)
  }
  return box
}

/** Where the camera looks from and how the lens is shifted, for one framing. */
type Rig = { x: number; z: number; distance: number; dx: number; dy: number }

const blend = (a: Rig, b: Rig, k: number): Rig => ({
  x: a.x + (b.x - a.x) * k,
  z: a.z + (b.z - a.z) * k,
  distance: a.distance + (b.distance - a.distance) * k,
  dx: a.dx + (b.dx - a.dx) * k,
  dy: a.dy + (b.dy - a.dy) * k,
})

function aim(camera: THREE.PerspectiveCamera, x: number, z: number, distance: number, angle: number) {
  const level = Math.cos(ELEVATION) * distance
  camera.position.set(x + Math.sin(angle) * level, Math.sin(ELEVATION) * distance, z + Math.cos(angle) * level)
  camera.lookAt(x, 0, z)
}

/**
 * Puts the camera on its three-quarter heading as close as the corners allow,
 * then works out the lens shift that lands them inside the frame. A lens shift
 * moves the picture without turning the camera, so the city keeps its angle
 * wherever it sits.
 */
function solve(camera: THREE.PerspectiveCamera, corners: THREE.Vector3[], angle: number, frame: Frame): Rig {
  camera.clearViewOffset()
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const corner of corners) {
    minX = Math.min(minX, corner.x)
    maxX = Math.max(maxX, corner.x)
    minZ = Math.min(minZ, corner.z)
    maxZ = Math.max(maxZ, corner.z)
  }
  const x = (minX + maxX) / 2
  const z = (minZ + maxZ) / 2
  const measure = (distance: number) => {
    aim(camera, x, z, distance, angle)
    return extent(camera, corners)
  }
  const fits = (box: ReturnType<typeof extent>) =>
    box.maxX - box.minX <= frame.right - frame.left && box.maxY - box.minY <= frame.top - frame.bottom
  let near = 1
  let far = 4000
  for (let i = 0; i < 24; i++) {
    const middle = (near + far) / 2
    if (fits(measure(middle))) far = middle
    else near = middle
  }
  const box = measure(far)
  return {
    x,
    z,
    distance: far,
    dx: (frame.left + frame.right) / 2 - (box.minX + box.maxX) / 2,
    dy: (frame.bottom + frame.top) / 2 - (box.minY + box.maxY) / 2,
  }
}

function place(camera: THREE.PerspectiveCamera, rig: Rig, angle: number, size: { width: number; height: number }) {
  aim(camera, rig.x, rig.z, rig.distance, angle)
  camera.setViewOffset(
    size.width,
    size.height,
    (-rig.dx * size.width) / 2,
    (rig.dy * size.height) / 2,
    size.width,
    size.height
  )
}
