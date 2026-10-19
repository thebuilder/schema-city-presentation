"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import * as THREE from "three"
import {
  boardPalette,
  buildingPalette,
  CityLinks,
  CityRoads,
  CityWorld,
  roofAnchors,
  useCity,
  VIEW_DISTANCE,
} from "@/deck/city/city-world"
import { type CityPalette, useCityPalette } from "@/deck/city/palette"
import {
  demoGraph,
  type FloorCellKind,
  type Placement,
  type SchemaGraph,
  type SchemaNode,
} from "@/deck/city/schema-city"
import { SchemaTable, tableRows } from "@/deck/city/schema-table"
import {
  Boards,
  Buildings,
  CAMERA_FOV,
  revealAt,
} from "@/deck/city/schema-city-scene"
import { useStep } from "@/deck/city/use-step"

/*
 * The reveal, built up from one row of the wall. The row becomes a building, the
 * building gets its floors and windows, the composition it uses stands beside
 * it, a second page type turns out to share that composition, and then the
 * camera pulls up and the rest of the wall rises as the city around them.
 *
 * The three buildings are cut from the full city's own cells, so they are the
 * buildings the city draws. They stand close together while they are being
 * introduced and slide to where the layout files them as the camera pulls up,
 * which is why the zoom-out lands on a city that already contains them.
 */

type Beat = { term: string; name?: "focus" | "composition" | "sharer" }

/** One label per step, the term and the type it is about. Step 0 is the wall. */
const BEATS: (Beat | null)[] = [
  null,
  { term: "Document Type", name: "focus" },
  { term: "Property groups", name: "focus" },
  { term: "Properties", name: "focus" },
  { term: "Composition", name: "composition" },
  { term: "Also uses it", name: "sharer" },
  null,
]

export const BUILDUP_STEPS = BEATS.length

const PULL_UP = BEATS.length - 1

/** Seconds a part takes to grow in or fade when its step arrives. */
const GROW = 0.7
/** Seconds the three buildings take to slide to their plots on the pull-up. */
const SETTLE = 2.4
/** How quickly the camera closes on its next framing, per second. */
const CAMERA_RATE = 1.6

const BASE: FloorCellKind[] = ["plinth", "core", "lid", "litLid", "element"]
const FLOORS: FloorCellKind[] = ["own", "composed", "separator"]
const LATE: FloorCellKind[] = ["pin", "marker"]

type Cast = { focus: SchemaNode; composition: SchemaNode; sharer: SchemaNode }

/**
 * The page the wall row belongs to, the composition it shares, and one more page
 * that uses it. `alias` wins when the graph has it, so another export still gets
 * a build-up from the first page that composes something another page also uses.
 */
function castOf(graph: SchemaGraph, alias: string): Cast | null {
  const edges = (graph.edges ?? []).filter((edge) => edge.kind === "composition")
  const byId = new Map(graph.nodes.map((node) => [node.id, node]))
  const pages = [...graph.nodes]
    .filter((node) => !node.isElement)
    .sort((a, b) => (a.alias < b.alias ? -1 : 1))
  const preferred = graph.nodes.find((node) => node.alias === alias)
  for (const focus of preferred ? [preferred, ...pages] : pages) {
    // The composition the most other pages share, so the pull-up has the most
    // to show for it, and the first of those pages in alias order.
    const users = (composition: string) =>
      edges
        .filter((e) => e.to === composition && e.from !== focus.id)
        .map((e) => byId.get(e.from))
        .filter((node): node is SchemaNode => Boolean(node && !node.isElement))
        .sort((a, b) => (a.alias < b.alias ? -1 : 1))
    const shared = edges
      .filter((e) => e.from === focus.id)
      .map((e) => ({ composition: byId.get(e.to), sharers: users(e.to) }))
      .sort((a, b) => b.sharers.length - a.sharers.length)[0]
    if (shared?.composition && shared.sharers[0]) {
      return { focus, composition: shared.composition, sharer: shared.sharers[0] }
    }
  }
  return null
}

/** Where each of the three stands while it is introduced, from the focus out. */
const SPOTS = { focus: [0, 0], composition: [9, -3], sharer: [18, 1] } as const

function useStage(
  graph: SchemaGraph,
  alias: string,
  city: ReturnType<typeof useCity>
) {
  return useMemo(() => {
    const cast = castOf(graph, alias)
    if (!cast) {
      return null
    }
    const real = (node: SchemaNode) => city.placementsById.get(node.id)
    const home = real(cast.focus)
    if (!home) {
      return null
    }
    const roles = (["focus", "composition", "sharer"] as const).flatMap((role) => {
      const placement = real(cast[role])
      if (!placement) {
        return []
      }
      const [dx, dz] = SPOTS[role]
      // How far the building is carried from its plot while it is introduced.
      const offset = new THREE.Vector3(
        home.position.x + dx - placement.position.x,
        0,
        home.position.z + dz - placement.position.z
      )
      return [{ role, node: cast[role], placement, offset }]
    })
    const ids = new Set(roles.map((r) => r.node.id))
    const cellsOf = (id: string, kinds: FloorCellKind[]) =>
      city.cells.filter((cell) => cell.buildingId === id && kinds.includes(cell.kind))
    const windowsOf = (id: string) =>
      city.windows.filter((cell) => cell.buildingId === id)
    // The arcs while the three stand together, drawn between the spots.
    const staged: Placement[] = roles.map(({ placement, offset }) => ({
      ...placement,
      position: {
        x: placement.position.x + offset.x,
        z: placement.position.z + offset.z,
      },
    }))
    const arcs = city.edges.filter(
      (edge) =>
        edge.kind === "composition" &&
        edge.to === cast.composition.id &&
        (edge.from === cast.focus.id || edge.from === cast.sharer.id)
    )
    return {
      cast,
      roles,
      ids,
      cellsOf,
      windowsOf,
      arcs,
      stagedById: new Map(staged.map((p) => [p.id, p])),
      stagedAnchors: roofAnchors(staged, city.heights),
      realAnchors: roofAnchors(city.placements, city.heights),
      // Everything that is not one of the three, for the rest of the city.
      others: {
        cells: city.cells.filter((cell) => !ids.has(cell.buildingId)),
        windows: city.windows.filter((cell) => !ids.has(cell.buildingId)),
        placements: city.placements.filter((p) => !ids.has(p.id)),
      },
    }
  }, [graph, alias, city])
}

const ease = (t: number) => {
  const p = Math.min(1, Math.max(0, t))
  return p * p * (3 - 2 * p)
}

/** A 0 to 1 value that runs toward `shown` over `seconds`, after `delay`. */
function useRamp(shown: boolean, seconds = GROW, delay = 0) {
  const [value, setValue] = useState(0)
  const current = useRef(0)
  const waited = useRef(0)
  useFrame((_, delta) => {
    waited.current = shown ? waited.current + delta : 0
    const rising = shown && waited.current >= delay
    const next = THREE.MathUtils.clamp(
      current.current + (rising ? delta : -delta) / seconds,
      0,
      1
    )
    if (next !== current.current) {
      current.current = next
      setValue(next)
    }
  })
  return value
}

/** Grows its children up from the ground while `shown`, and back down when not. */
function Grow({ shown, children }: { shown: boolean; children: ReactNode }) {
  const group = useRef<THREE.Group>(null)
  const progress = useRef(0)
  useFrame((_, delta) => {
    const next = THREE.MathUtils.clamp(
      progress.current + (shown ? delta : -delta) / GROW,
      0,
      1
    )
    progress.current = next
    if (group.current) {
      group.current.scale.y = Math.max(0.001, ease(next))
      group.current.visible = next > 0
    }
  })
  return <group ref={group}>{children}</group>
}

type Stage = NonNullable<ReturnType<typeof useStage>>

/** One of the three, carried from its plot to its spot by `offset`. */
function Actor({
  stage,
  heights,
  role,
  step,
  settle,
  colours,
}: {
  stage: Stage
  heights: Map<string, number>
  role: Stage["roles"][number]
  step: number
  settle: number
  colours: ReturnType<typeof buildingPalette>
}) {
  const group = useRef<THREE.Group>(null)
  const id = role.node.id
  const from = role.role === "focus" ? 1 : role.role === "composition" ? 4 : 5
  // The focus is built a mapping a step. The other two arrive whole.
  const layers =
    role.role === "focus"
      ? [
          { key: "base", step: 1, cells: stage.cellsOf(id, BASE), windows: [] },
          { key: "floors", step: 2, cells: stage.cellsOf(id, FLOORS), windows: [] },
          { key: "windows", step: 3, cells: [], windows: stage.windowsOf(id) },
        ]
      : [
          {
            key: "whole",
            step: from,
            cells: stage.cellsOf(id, [...BASE, ...FLOORS]),
            windows: stage.windowsOf(id),
          },
        ]
  const late = stage.cellsOf(id, LATE)
  useFrame(() => {
    group.current?.position.copy(role.offset).multiplyScalar(1 - ease(settle))
  })
  const placements = [role.placement]
  const none = () => undefined
  return (
    <group ref={group}>
      {[...layers, { key: "late", step: PULL_UP, cells: late, windows: [] }].map(
        (layer) =>
          layer.cells.length + layer.windows.length > 0 ? (
            <Grow key={layer.key} shown={step >= layer.step}>
              <Buildings
                cells={layer.cells}
                heights={heights}
                hovered={null}
                neighbours={null}
                onFocus={none}
                onHover={none}
                onSelect={none}
                palette={colours}
                placements={placements}
                plazas={[]}
                reducedMotion
                scale={null}
                selected={null}
                windows={layer.windows}
              />
            </Grow>
          ) : null
      )}
    </group>
  )
}

/** The rest of the wall, rising as the city around the three. */
function Rest({
  stage,
  city: graphCity,
  palette,
}: {
  stage: Stage
  city: ReturnType<typeof useCity>
  palette: CityPalette
}) {
  const clock = useThree((state) => state.clock)
  const [roads, setRoads] = useState(0)
  // The package's buildings, boards and roads time their boot from the
  // renderer's clock, so restarting it when the pull-up starts replays the boot.
  useEffect(() => {
    clock.start()
  }, [clock])
  useFrame(() => {
    const next = revealAt(clock.getElapsedTime()).links
    if (Math.abs(next - roads) > 0.02 || (next === 1 && roads !== 1)) {
      setRoads(next)
    }
  })
  const none = () => undefined
  return (
    <>
      <Boards
        districts={graphCity.districts}
        fingers={[]}
        folders={[]}
        palette={boardPalette(palette)}
        reducedMotion={false}
        vias={[]}
      />
      <Buildings
        cells={stage.others.cells}
        heights={graphCity.heights}
        hovered={null}
        neighbours={null}
        onFocus={none}
        onHover={none}
        onSelect={none}
        palette={buildingPalette(palette)}
        placements={stage.others.placements}
        plazas={graphCity.plazas}
        reducedMotion={false}
        scale={null}
        selected={null}
        windows={stage.others.windows}
      />
      <CityRoads
        colour={palette.phosphor}
        edges={graphCity.edges}
        opacity={roads}
        placementsById={graphCity.placementsById}
      />
    </>
  )
}

function Scene({
  palette,
  graph,
  alias,
  step,
}: {
  palette: CityPalette
  graph: SchemaGraph
  alias: string
  step: number
}) {
  const city = useCity(graph)
  const stage = useStage(graph, alias, city)
  const camera = useThree((state) => state.camera)
  const colours = useMemo(() => buildingPalette(palette), [palette])
  const pulled = step >= PULL_UP
  const settle = useRamp(pulled, SETTLE, 0.3)
  const stagedArcs = useRamp(step >= 4 && !pulled)
  const realArcs = useRamp(pulled, GROW, SETTLE)
  const look = useRef(new THREE.Vector3())
  const placed = useRef(false)

  // Each step has a framing: close on the focus while it is built, wide enough
  // for the three while they meet, and the app's own overview on the pull-up.
  const framings = useMemo(() => {
    if (!stage) {
      return null
    }
    const home = stage.roles[0].placement.position
    const height = city.heights.get(stage.cast.focus.id) ?? 4
    const close = {
      target: new THREE.Vector3(home.x, height * 0.45, home.z),
      position: new THREE.Vector3(home.x + 6, height * 0.9 + 4, home.z + 11),
    }
    const middle = new THREE.Vector3(home.x + SPOTS.sharer[0] / 2, 1.5, home.z)
    const trio = {
      target: middle,
      position: middle.clone().add(new THREE.Vector3(3, 13, 26)),
    }
    const centre = city.ground.centre
    const ground = new THREE.Vector3(centre.x, 0, centre.z)
    const overview = {
      target: ground,
      position: ground
        .clone()
        .add(
          new THREE.Vector3(0.2, 0.62, 1)
            .normalize()
            .multiplyScalar(city.ground.span * VIEW_DISTANCE)
        ),
    }
    return { close, trio, overview }
  }, [stage, city])

  useFrame((_, delta) => {
    if (!framings) {
      return
    }
    const framing = pulled
      ? framings.overview
      : step >= 4
        ? framings.trio
        : framings.close
    if (!placed.current) {
      camera.position.copy(framing.position)
      look.current.copy(framing.target)
      placed.current = true
    }
    const k = 1 - Math.exp(-delta * CAMERA_RATE)
    camera.position.lerp(framing.position, k)
    look.current.lerp(framing.target, k)
    camera.lookAt(look.current)
  })

  if (!stage) {
    return null
  }
  return (
    <>
      <CityWorld centre={city.ground.centre} palette={palette} span={city.ground.span} />
      {stage.roles.map((role) => (
        <Actor
          colours={colours}
          heights={city.heights}
          key={role.node.id}
          role={role}
          settle={settle}
          stage={stage}
          step={step}
        />
      ))}
      <CityLinks
        anchors={stage.stagedAnchors}
        colour={palette.azure}
        edges={stage.arcs.filter(
          (edge) => step >= 5 || edge.from === stage.cast.focus.id
        )}
        layer="compositions"
        opacity={stagedArcs}
        placementsById={stage.stagedById}
      />
      <CityLinks
        anchors={stage.realAnchors}
        colour={palette.azure}
        edges={stage.arcs}
        layer="compositions"
        opacity={realArcs}
        placementsById={city.placementsById}
      />
      {pulled ? <Rest city={city} palette={palette} stage={stage} /> : null}
    </>
  )
}

export function BuildupWidget({
  graph = demoGraph,
  alias = "contentPage",
  step,
}: {
  graph?: SchemaGraph
  /** The Document Type whose row the build-up starts from. */
  alias?: string
  step?: number
}) {
  const current = Math.min(useStep(step), BUILDUP_STEPS - 1)
  const host = useRef<HTMLDivElement>(null)
  const palette = useCityPalette(host)
  const rows = useMemo(() => tableRows(graph), [graph])
  const cast = useMemo(() => castOf(graph, alias), [graph, alias])
  const rowElements = useRef(new Map<string, HTMLElement>())
  const beat = BEATS[current]
  const walled = current === 0

  // On the wall, every row but the focus's falls back, so the room knows which
  // row the building is about to be.
  useEffect(() => {
    for (const [id, element] of rowElements.current) {
      const focused = id === cast?.focus.id
      element.style.transition = "opacity 500ms, color 500ms"
      element.style.opacity = focused ? "1" : "0.18"
      element.style.color = focused ? "var(--slide-signal)" : ""
    }
  }, [cast])

  return (
    <div className="relative h-full w-full bg-background" ref={host}>
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: walled ? 0 : 1 }}
      >
        {palette ? (
          <Canvas
            camera={{ fov: CAMERA_FOV, near: 0.5, far: 4000 }}
            dpr={[1, 2]}
            resize={{ offsetSize: true }}
            shadows="percentage"
          >
            <Scene alias={alias} graph={graph} palette={palette} step={current} />
          </Canvas>
        ) : null}
      </div>
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: walled ? 1 : 0 }}
      >
        <SchemaTable
          graph={graph}
          rowRef={(id, element) => {
            if (element) {
              rowElements.current.set(id, element)
            } else {
              rowElements.current.delete(id)
            }
          }}
          rows={rows}
        />
      </div>
      <div
        className="absolute top-10 left-16 transition-opacity duration-500"
        style={{ opacity: beat ? 1 : 0 }}
      >
        <p className="font-bold text-[length:var(--slide-label-size)] text-primary uppercase tracking-[var(--slide-label-tracking)] [text-shadow:var(--slide-halo)]">
          {beat?.term ?? ""}
        </p>
        <p className="mt-2 text-[length:var(--slide-support-size)] text-foreground [text-shadow:var(--slide-halo)]">
          {beat?.name && cast ? cast[beat.name].name : ""}
        </p>
      </div>
    </div>
  )
}
