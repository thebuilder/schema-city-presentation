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
import { RoofIcon } from "@/deck/city/roof-icon"
import {
  demoGraph,
  type FloorCell,
  type FloorCellKind,
  type Placement,
  type SchemaGraph,
  type SchemaNode,
  WINDOW_HEIGHT,
  WINDOW_WIDTH,
  type WindowCell,
} from "@/deck/city/schema-city"
import {
  Boards,
  Buildings,
  CAMERA_FOV,
  revealAt,
  tint,
} from "@/deck/city/schema-city-scene"
import { useStep } from "@/deck/city/use-step"

/*
 * The reveal, built up from one Document Type. Content page rises as a
 * building, gets its floors and windows, the composition it uses stands beside
 * it, two more page types turn out to share that composition, and then the
 * camera pulls up and every other type rises as the city around them. A link
 * is drawn only once the building at its far end has finished going up.
 *
 * The three buildings are cut from the full city's own cells, so they are the
 * buildings the city draws. They stand close together while they are being
 * introduced and slide to where the layout files them as the camera pulls up,
 * which is why the zoom-out lands on a city that already contains them.
 */

type Beat = { line: string; name: "focus" | "composition" | "sharers" }

/*
 * One line per step, saying what the Umbraco term becomes in the city, over
 * the name of the type it is about. The term is what the room has to learn,
 * so it is the large text, and the type stays as a small label.
 */
const BEATS: (Beat | null)[] = [
  { line: "A Document Type is a building.", name: "focus" },
  { line: "Property groups are its floors.", name: "focus" },
  { line: "Properties are its windows.", name: "focus" },
  { line: "A composition gets its own plot.", name: "composition" },
  { line: "Every type that uses it links to it.", name: "sharers" },
  null,
]

export const BUILDUP_STEPS = BEATS.length

const PULL_UP = BEATS.length - 1

/** Seconds a part takes to grow in or fade when its step arrives. */
const GROW = 0.7
/** How high a floor starts above its place, and how long it takes to land. */
const DROP_HEIGHT = 3
const DROP = 0.45
/** Seconds between one floor landing, or one storey lighting, and the next. */
const STAGGER = 0.12
/**
 * A window is a few pixels across at this distance, so lighting one is easy to
 * miss. Each one flashes on, a bright pane several times its size shrinking
 * into it, and the storeys light slower than floors land so the eye can
 * follow them up the building.
 */
const LIGHT_STAGGER = 0.3
const FLASH = 0.9
const FLASH_GROWTH = 4.5
/** Screen pixels for the arcs, which are hairlines at a single pixel this close. */
const ARC_WIDTH = 2.5
/** Seconds the three buildings take to slide to their plots on the pull-up. */
const SETTLE = 1.5
/** How quickly the camera closes on its next framing, per second. */
const CAMERA_RATE = 1.6

const BASE: FloorCellKind[] = ["plinth", "core", "element"]
const FLOORS: FloorCellKind[] = ["own", "composed", "separator"]
// The lid caps the top slab, so it is set down after the last floor rather
// than hanging at roof height over a building that is not there yet.
const LID: FloorCellKind[] = ["lid", "litLid"]
/** Seconds between the two pages that also use the composition. */
const SHARER_GAP = 1.2
const LATE: FloorCellKind[] = ["pin", "marker"]

type Cast = { focus: SchemaNode; composition: SchemaNode; sharers: SchemaNode[] }
type Role = "focus" | "composition" | "sharer" | "sharer2"

/**
 * The page the build-up starts from, the composition it shares, and up to two
 * more pages that use it. `alias` wins when the graph has it, so another export still gets
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
      return {
        focus,
        composition: shared.composition,
        sharers: shared.sharers.slice(0, 2),
      }
    }
  }
  return null
}

/** Where each of the three stands while it is introduced, from the focus out. */
const SPOTS = {
  focus: [0, 0],
  composition: [9, -3],
  sharer: [18, 1],
  sharer2: [2, -13],
} as const

/** The step a role arrives on, and how long after it its build starts. */
const ARRIVAL: Record<Role, { step: number; after: number }> = {
  focus: { step: 0, after: 0 },
  composition: { step: 3, after: 0 },
  sharer: { step: 4, after: 0 },
  sharer2: { step: 4, after: SHARER_GAP },
}

/**
 * When each part of an arriving building starts, in seconds from its step.
 * The focus is built a step at a time, so its parts start at once on theirs.
 */
function buildTimes(role: Role, floors: number, storeys: number) {
  const whole = role !== "focus"
  const start = ARRIVAL[role].after
  const floorsAt = start + (whole ? GROW : 0)
  const lidAt = floorsAt + STAGGER * floors
  const windowsAt = whole ? lidAt + STAGGER + DROP : 0
  const builtAt = windowsAt + LIGHT_STAGGER * storeys + FLASH
  return { start, floorsAt, lidAt, windowsAt, builtAt }
}

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
    const cellsOf = (id: string, kinds: FloorCellKind[]) =>
      city.cells.filter((cell) => cell.buildingId === id && kinds.includes(cell.kind))
    const windowsOf = (id: string) =>
      city.windows.filter((cell) => cell.buildingId === id)
    const home = real(cast.focus)
    if (!home) {
      return null
    }
    const nodeOf: Record<Role, SchemaNode | undefined> = {
      focus: cast.focus,
      composition: cast.composition,
      sharer: cast.sharers[0],
      sharer2: cast.sharers[1],
    }
    const roles = (["focus", "composition", "sharer", "sharer2"] as const).flatMap((role) => {
      const node = nodeOf[role]
      const placement = node && real(node)
      if (!(node && placement)) {
        return []
      }
      const [dx, dz] = SPOTS[role]
      // How far the building is carried from its plot while it is introduced.
      const offset = new THREE.Vector3(
        home.position.x + dx - placement.position.x,
        0,
        home.position.z + dz - placement.position.z
      )
      const floors = byStorey(cellsOf(node.id, FLOORS)).length
      const storeys = byStorey(windowsOf(node.id)).length
      const times = buildTimes(role, floors, storeys)
      return [{ role, node, placement, offset, times }]
    })
    const ids = new Set(roles.map((r) => r.node.id))
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
        ids.has(edge.from)
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

/**
 * Grows its children up from the ground while `shown`, after `delay`, and back
 * down when not.
 */
function Rise({
  shown,
  delay = 0,
  children,
}: {
  shown: boolean
  delay?: number
  children: ReactNode
}) {
  const group = useRef<THREE.Group>(null)
  const progress = useRef(0)
  const time = useShownFor(shown)
  useFrame((_, delta) => {
    const growing = shown && time.current >= delay
    const next = THREE.MathUtils.clamp(
      progress.current + (growing ? delta : -delta) / GROW,
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

/**
 * Seconds since `shown` turned on, kept in a ref so a frame can read it without
 * a render. Going back a step resets it, so the part is gone at once.
 */
function useShownFor(shown: boolean) {
  const time = useRef(0)
  useFrame((_, delta) => {
    time.current = shown ? time.current + delta : 0
  })
  return time
}

/**
 * Lowers its children onto their place from a little above, after `delay`. A
 * floor set down on the one below reads as built; a floor stretched up out of
 * the ground does not.
 */
function Drop({
  shown,
  delay,
  children,
}: {
  shown: boolean
  delay: number
  children: ReactNode
}) {
  const group = useRef<THREE.Group>(null)
  const time = useShownFor(shown)
  useFrame(() => {
    const g = group.current
    if (!g) {
      return
    }
    const t = time.current - delay
    const p = THREE.MathUtils.clamp(t / DROP, 0, 1)
    g.visible = shown && t > 0
    g.position.y = DROP_HEIGHT * (1 - p) ** 3
  })
  return <group ref={group}>{children}</group>
}

/** Shows its children after `delay`, the way a storey's lights come on. */
function Light({
  shown,
  delay,
  children,
}: {
  shown: boolean
  delay: number
  children: ReactNode
}) {
  const group = useRef<THREE.Group>(null)
  const time = useShownFor(shown)
  useFrame(() => {
    if (group.current) {
      group.current.visible = shown && time.current > delay
    }
  })
  return <group ref={group}>{children}</group>
}

/** The flash that marks a window coming on, drawn just proud of its wall. */
function Flash({
  windows,
  shown,
  delay,
  colour,
}: {
  windows: WindowCell[]
  shown: boolean
  delay: number
  colour: string
}) {
  const group = useRef<THREE.Group>(null)
  const time = useShownFor(shown)
  useFrame(() => {
    const g = group.current
    if (!g) {
      return
    }
    const p = THREE.MathUtils.clamp((time.current - delay) / FLASH, 0, 1)
    g.visible = shown && p > 0 && p < 1
    const grow = 1 + (FLASH_GROWTH - 1) * (1 - p) ** 2
    for (const pane of g.children as THREE.Mesh<
      THREE.BufferGeometry,
      THREE.MeshBasicMaterial
    >[]) {
      pane.scale.set(WINDOW_WIDTH * grow, WINDOW_HEIGHT * grow, 1)
      pane.material.opacity = (1 - p) ** 1.5
    }
  })
  return (
    <group ref={group} visible={false}>
      {windows.map((cell) => (
        <mesh
          key={`${cell.cx}:${cell.cy}:${cell.cz}`}
          position={[
            cell.cx + Math.sin(cell.rotY) * 0.03,
            cell.cy,
            cell.cz + Math.cos(cell.rotY) * 0.03,
          ]}
          rotation={[0, cell.rotY, 0]}
        >
          <planeGeometry />
          <meshBasicMaterial
            blending={THREE.AdditiveBlending}
            color={colour}
            depthWrite={false}
            toneMapped={false}
            transparent
          />
        </mesh>
      ))}
    </group>
  )
}

/** Groups items by storey, lowest first, so they can be built one at a time. */
function byStorey<T extends { cy: number }>(items: T[]): T[][] {
  const storeys = new Map<number, T[]>()
  for (const item of items) {
    const key = Math.round(item.cy * 100)
    storeys.set(key, [...(storeys.get(key) ?? []), item])
  }
  return [...storeys.entries()].sort(([a], [b]) => a - b).map(([, row]) => row)
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
  palette,
}: {
  stage: Stage
  heights: Map<string, number>
  role: Stage["roles"][number]
  step: number
  settle: number
  colours: ReturnType<typeof buildingPalette>
  palette: CityPalette
}) {
  const group = useRef<THREE.Group>(null)
  const id = role.node.id
  const from = ARRIVAL[role.role].step
  // The focus is built a mapping a step. The others arrive whole, run
  // through the same moves back to back.
  const whole = role.role !== "focus"
  const floors = byStorey(stage.cellsOf(id, FLOORS))
  const lit = byStorey(stage.windowsOf(id))
  const { start, floorsAt, lidAt, windowsAt, builtAt } = role.times
  const steps = whole
    ? { base: from, floors: from, windows: from }
    : { base: 0, floors: 1, windows: 2 }
  const late = stage.cellsOf(id, LATE)
  const lid = stage.cellsOf(id, LID)
  useFrame(() => {
    group.current?.position.copy(role.offset).multiplyScalar(1 - ease(settle))
  })
  const placement = role.placement
  const roof = (placement.y ?? 0) + (heights.get(id) ?? placement.height)
  const draw = (cells: FloorCell[], windows: WindowCell[]) => (
    <Buildings
      cells={cells}
      heights={heights}
      hovered={null}
      neighbours={null}
      onFocus={none}
      onHover={none}
      onSelect={none}
      palette={colours}
      placements={[placement]}
      plazas={[]}
      reducedMotion
      scale={null}
      selected={null}
      windows={windows}
    />
  )
  return (
    <group ref={group}>
      <Rise delay={start} shown={step >= steps.base}>
        {draw(stage.cellsOf(id, BASE), [])}
      </Rise>
      {floors.map((cells, index) => (
        <Drop
          delay={floorsAt + STAGGER * index}
          key={`floor-${cells[0].cy}`}
          shown={step >= steps.floors}
        >
          {draw(cells, [])}
        </Drop>
      ))}
      {lid.length > 0 ? (
        <Drop delay={lidAt} shown={step >= steps.floors}>
          {draw(lid, [])}
        </Drop>
      ) : null}
      {lit.map((windows, index) => (
        <group key={`light-${windows[0].cy}`}>
          <Light delay={windowsAt + LIGHT_STAGGER * index} shown={step >= steps.windows}>
            {draw([], windows)}
          </Light>
          <Flash
            colour={palette.bright}
            delay={windowsAt + LIGHT_STAGGER * index}
            shown={step >= steps.windows}
            windows={windows}
          />
        </group>
      ))}
      {late.length > 0 ? <Rise shown={step >= PULL_UP}>{draw(late, [])}</Rise> : null}
      <RoofIcon
        background={palette.background}
        colour={palette.phosphor}
        // The icon sits on the finished roof, so it waits for the last
        // storey to land and light rather than hanging in the air above a
        // building still going up.
        delay={builtAt}
        footprint={placement.footprint}
        icon={role.node.icon}
        shown={step >= steps.windows}
        x={placement.position.x}
        y={roof}
        z={placement.position.z}
      />
    </group>
  )
}

const none = () => undefined

/** Every other type, rising as the city around the three. */
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

/**
 * One composition link while the three stand together. It waits for the later
 * of its two ends to finish building, so a line never reaches for a building
 * that is still going up.
 */
function StagedArc({
  stage,
  edge,
  step,
  pulled,
  colour,
}: {
  stage: Stage
  edge: Stage["arcs"][number]
  step: number
  pulled: boolean
  colour: string
}) {
  const ends = stage.roles.filter((r) => r.node.id === edge.from || r.node.id === edge.to)
  const arrives = Math.max(...ends.map((r) => ARRIVAL[r.role].step))
  const last = ends.find((r) => ARRIVAL[r.role].step === arrives && r.role !== "focus")
  const opacity = useRamp(step >= arrives && !pulled, GROW, last?.times.builtAt ?? 0)
  return (
    <CityLinks
      anchors={stage.stagedAnchors}
      colour={colour}
      edges={[edge]}
      layer="compositions"
      opacity={opacity}
      placementsById={stage.stagedById}
      width={ARC_WIDTH}
    />
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
  // The core is the column a page's floors stand around, near black because in
  // the city it is only seen in the gaps. Here it stands alone on the first
  // step, so the three are drawn with it lifted toward the phosphor.
  const colours = useMemo(
    () => ({
      ...buildingPalette(palette),
      separator: `#${tint(palette.separator, palette.phosphor, 0.6).getHexString()}`,
    }),
    [palette]
  )
  const pulled = step >= PULL_UP
  const settle = useRamp(pulled, SETTLE, 0.2)
  // The rest of the city boots once the three have landed on their plots, so
  // they move over open ground and the city then rises around them, instead
  // of sliding across boards and buildings that are already there.
  const cityUp = useRamp(pulled, 0.05, 0.2 + SETTLE) > 0
  const realArcs = useRamp(pulled, GROW, 0.2 + SETTLE + 1)
  const look = useRef(new THREE.Vector3())
  const placed = useRef(false)
  // The first arc, to the composition, draws once the composition is built.
  // From then on the arcs reach above the buildings, so the camera lifts its
  // aim, timed from the click that brings the composition.
  const compositionBuilt =
    stage?.roles.find((role) => role.role === "composition")?.times.builtAt ?? 0
  const linked =
    useRamp(step >= ARRIVAL.composition.step && !pulled, 0.05, compositionBuilt + GROW) > 0

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
    // Once the arcs are drawn they reach above the buildings, so the camera
    // lifts its aim and the three sit lower, clear of the line at the top.
    const lift = new THREE.Vector3(0, 4, 0)
    const linked = {
      target: trio.target.clone().add(lift),
      position: trio.position.clone().add(lift),
    }
    return { close, trio, linked, overview }
  }, [stage, city])

  useFrame((_, delta) => {
    if (!framings) {
      return
    }
    const framing = pulled
      ? framings.overview
      : linked
        ? framings.linked
        : step >= 3
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
          palette={palette}
          role={role}
          settle={settle}
          stage={stage}
          step={step}
        />
      ))}
      {stage.arcs.map((edge) => (
        <StagedArc
          colour={palette.azure}
          edge={edge}
          key={`${edge.from}-${edge.to}`}
          pulled={pulled}
          stage={stage}
          step={step}
        />
      ))}
      <CityLinks
        anchors={stage.realAnchors}
        colour={palette.azure}
        edges={stage.arcs}
        layer="compositions"
        opacity={realArcs}
        placementsById={city.placementsById}
        width={ARC_WIDTH}
      />
      {cityUp ? <Rest city={city} palette={palette} stage={stage} /> : null}
    </>
  )
}

function castName(cast: Cast, name: Beat["name"]) {
  return name === "sharers"
    ? cast.sharers.map((node) => node.name).join(" and ")
    : cast[name].name
}

export function BuildupWidget({
  graph = demoGraph,
  alias = "contentPage",
  step,
}: {
  graph?: SchemaGraph
  /** The Document Type the build-up starts from. */
  alias?: string
  step?: number
}) {
  const current = Math.min(useStep(step), BUILDUP_STEPS - 1)
  const host = useRef<HTMLDivElement>(null)
  const palette = useCityPalette(host)
  const cast = useMemo(() => castOf(graph, alias), [graph, alias])
  const beat = BEATS[current]

  return (
    <div className="relative h-full w-full bg-background" ref={host}>
      <div className="absolute inset-0">
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
        className="absolute top-[var(--slide-padding-block)] left-[var(--slide-padding-inline)] transition-opacity duration-500"
        style={{ opacity: beat ? 1 : 0 }}
      >
        <p className="font-bold text-[length:var(--slide-support-size)] text-primary uppercase tracking-[var(--slide-label-tracking)] [text-shadow:var(--slide-halo)]">
          {beat && cast ? castName(cast, beat.name) : ""}
        </p>
        <p className="mt-3 font-bold text-[length:var(--slide-heading-size)] text-foreground leading-tight [text-shadow:var(--slide-halo)]">
          {beat?.line ?? ""}
        </p>
      </div>
    </div>
  )
}
