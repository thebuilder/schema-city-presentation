"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useMemo, useRef, useState } from "react"
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
 * The park as Schema City draws it, standing to the right of a slide's text. A
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

export function ExampleCity({
  graph,
  paint,
  frame = BESIDE_TEXT,
  className,
}: {
  graph: SchemaGraph
  paint: CityPaint
  /** Where on screen the city goes, in normalised device units. */
  frame?: Frame
  className?: string
}) {
  const host = useRef<HTMLDivElement>(null)
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
          <ExampleScene frame={frame} graph={graph} paint={paint} palette={palette} still={still} />
        </Canvas>
      ) : null}
    </div>
  )
}

function ExampleScene({
  frame,
  graph,
  paint,
  palette,
  still,
}: {
  frame: Frame
  graph: SchemaGraph
  paint: CityPaint
  palette: CityPalette
  still: boolean
}) {
  const city = useCity(graph)
  const camera = useThree((state) => state.camera)
  const { centre, span } = city.ground
  const target = useMemo(() => new THREE.Vector3(centre.x, 0, centre.z), [centre])
  // Every board's corners and every roof: what a camera has to keep in view. The
  // corners of the ground as a whole would frame the empty space between boards.
  const corners = useMemo(() => {
    const ground = city.districts.flatMap((district) =>
      [district.minX - ISLAND_PAD, district.maxX + ISLAND_PAD].flatMap((x) =>
        [district.minZ - ISLAND_PAD, district.maxZ + ISLAND_PAD].map((z) => new THREE.Vector3(x, 0, z))
      )
    )
    const roofs = city.placements.map(
      (placement) =>
        new THREE.Vector3(
          placement.position.x,
          (placement.y ?? 0) + (city.heights.get(placement.id) ?? placement.height),
          placement.position.z
        )
    )
    return [...ground, ...roofs]
  }, [city])
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

  useFrame((state) => {
    const t = still ? 0 : state.clock.elapsedTime
    fit(camera as THREE.PerspectiveCamera, target, corners, START + t * ORBIT, state.size, frame)
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

/**
 * Puts the camera on its three-quarter heading as close as the whole city allows,
 * then shifts the lens so the city lands inside the frame. A lens shift moves the
 * picture without turning the camera, so the city keeps its angle wherever it sits.
 */
function fit(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  corners: THREE.Vector3[],
  angle: number,
  size: { width: number; height: number },
  frame: Frame
) {
  camera.clearViewOffset()
  const place = (distance: number) => {
    const level = Math.cos(ELEVATION) * distance
    camera.position.set(
      target.x + Math.sin(angle) * level,
      target.y + Math.sin(ELEVATION) * distance,
      target.z + Math.cos(angle) * level
    )
    camera.lookAt(target)
    return extent(camera, corners)
  }
  const fits = (box: ReturnType<typeof extent>) =>
    box.maxX - box.minX <= frame.right - frame.left && box.maxY - box.minY <= frame.top - frame.bottom
  let near = 1
  let far = 4000
  for (let i = 0; i < 24; i++) {
    const middle = (near + far) / 2
    if (fits(place(middle))) far = middle
    else near = middle
  }
  const box = place(far)
  const dx = (frame.left + frame.right) / 2 - (box.minX + box.maxX) / 2
  const dy = (frame.bottom + frame.top) / 2 - (box.minY + box.maxY) / 2
  camera.setViewOffset(
    size.width,
    size.height,
    (-dx * size.width) / 2,
    (dy * size.height) / 2,
    size.width,
    size.height
  )
}
