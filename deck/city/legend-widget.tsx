"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { type ReactNode, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import {
  buildingPalette,
  CityLinks,
  CityRoads,
  roofAnchors,
} from "@/deck/city/city-world"
import { type CityPalette, useCityPalette } from "@/deck/city/scene-palette"
import {
  buildFloorCells,
  cityDistricts,
  connectionsOf,
  demoGraph,
  type FloorCell,
  type FloorCellKind,
  type Placement,
  type SchemaEdge,
  type SchemaGraph,
  type SchemaNode,
} from "@/deck/city/schema-city"
import { Buildings, CAMERA_FOV, tint } from "@/deck/city/schema-city-scene"
import { useStep } from "@/deck/city/use-step"

/*
 * One small neighbourhood, built up a mapping at a time. A page, its floors, its
 * windows, the composition it uses, the element types its blocks offer, and the
 * types above and below it in the content tree. Every part is cut by the
 * package's own buildFloorCells, footprints come from the package's layout, and
 * the roads and arcs from its router, so the legend is the city's real grammar.
 */

type Entry = { term: string; means: string; swatch: keyof CityPalette }

const ENTRIES: Entry[] = [
  {
    term: "Document Type",
    means: "A building on a plinth. The lid lights up when it has a template.",
    swatch: "phosphor",
  },
  {
    term: "Property group",
    means: "A floor. A new tab starts with a thin board.",
    swatch: "phosphor",
  },
  {
    term: "Property",
    means: "A window. Mandatory ones burn brighter.",
    swatch: "bright",
  },
  {
    term: "Composition",
    means: "A glass shell. Its floors show in azure on every type that uses it.",
    swatch: "azure",
  },
  {
    term: "Element Type",
    means: "A low amber block, fed by the block lists that offer it.",
    swatch: "amber",
  },
  {
    term: "Allowed child",
    means: "A road from parent to child. Pins count the connections.",
    swatch: "phosphor",
  },
]

export const LEGEND_STEPS = ENTRIES.length

/** Seconds a part takes to grow in when its step arrives. */
const GROW = 0.7
/** Radians a second the turntable turns. */
const TURN = 0.14

type Cast = {
  focus: SchemaNode
  composition?: SchemaNode
  elements: SchemaNode[]
  child?: SchemaNode
  parent?: SchemaNode
}

/**
 * The neighbourhood to build: `alias` when the graph has it, otherwise the first
 * page that composes something, offers blocks and allows a child, so a different
 * export still gets a legend with every mapping in it.
 */
function castOf(graph: SchemaGraph, alias: string): Cast | null {
  const edges = graph.edges ?? []
  const byId = new Map(graph.nodes.map((node) => [node.id, node]))
  const targets = (node: SchemaNode, kind: SchemaEdge["kind"]) =>
    [
      ...new Set(
        edges
          .filter((edge) => edge.from === node.id && edge.kind === kind)
          .map((edge) => edge.to)
      ),
    ]
      .map((id) => byId.get(id))
      .filter((found): found is SchemaNode => Boolean(found))
  const complete = (node: SchemaNode) =>
    !node.isElement &&
    targets(node, "composition").length > 0 &&
    targets(node, "block").length > 0 &&
    targets(node, "allowedChild").some((child) => child.id !== node.id)
  const focus =
    graph.nodes.find((node) => node.alias === alias) ??
    [...graph.nodes].sort((a, b) => (a.alias < b.alias ? -1 : 1)).find(complete)
  if (!focus) {
    return null
  }
  const parentEdge = edges.find(
    (edge) =>
      edge.kind === "allowedChild" &&
      edge.to === focus.id &&
      edge.from !== focus.id
  )
  return {
    focus,
    composition: targets(focus, "composition")[0],
    elements: targets(focus, "block").slice(0, 2),
    child: targets(focus, "allowedChild").find((child) => child.id !== focus.id),
    parent: parentEdge ? byId.get(parentEdge.from) : undefined,
  }
}

/** One set of parts that grows in at `step`. */
type Layer = {
  key: string
  step: number
  cells: FloorCell[]
  windows: ReturnType<typeof buildFloorCells>["windows"]
  placements: Placement[]
}

const BASE: FloorCellKind[] = ["plinth", "core", "lid", "litLid", "element"]
const FLOORS: FloorCellKind[] = ["own", "composed", "separator"]
const LATE: FloorCellKind[] = ["pin", "marker"]

function useNeighbourhood(graph: SchemaGraph, alias: string) {
  return useMemo(() => {
    const cast = castOf(graph, alias)
    if (!cast) {
      return null
    }
    const { focus, composition, elements, child, parent } = cast
    const city = cityDistricts(graph)
    const laid = new Map(city.placements.map((p) => [p.id, p]))
    // Hand-placed around the page, each at its footprint from the real layout:
    // the composition east, the element types west, parent north, child south.
    const spots: [SchemaNode | undefined, number, number][] = [
      [focus, 0, 0],
      [composition, 10, 0],
      [elements[0], -9, -2.5],
      [elements[1], -9, 3],
      [parent, 0, -10],
      [child, 0, 10],
    ]
    const placements: Placement[] = []
    for (const [node, x, z] of spots) {
      const at = node && laid.get(node.id)
      if (at && !placements.some((p) => p.id === at.id)) {
        // Pages read phosphor here wherever the full city happens to file them,
        // since the legend is about what a type is and ignores which board it is on.
        const districtKind = node.isElement
          ? "elements"
          : node.id === composition?.id
            ? "compositions"
            : "structure"
        placements.push({
          ...at,
          position: { x, z },
          flatten: 0,
          y: 0,
          districtKind,
        })
      }
    }
    const ids = new Set(placements.map((p) => p.id))
    const edges = (graph.edges ?? []).filter(
      (edge) => ids.has(edge.from) && ids.has(edge.to)
    )
    const nodesById = new Map(graph.nodes.map((node) => [node.id, node]))
    const { cells, windows, heights } = buildFloorCells(
      nodesById,
      placements,
      connectionsOf(edges)
    )
    const only = (id: string | undefined) => placements.filter((p) => p.id === id)
    const of = (id: string | undefined, kinds: FloorCellKind[]) =>
      cells.filter((cell) => cell.buildingId === id && kinds.includes(cell.kind))
    const none: Layer["windows"] = []
    const layers: Layer[] = [
      { key: "base", step: 0, cells: of(focus.id, BASE), windows: none, placements: only(focus.id) },
      { key: "floors", step: 1, cells: of(focus.id, FLOORS), windows: none, placements: only(focus.id) },
      {
        key: "windows",
        step: 2,
        cells: [],
        windows: windows.filter((w) => w.buildingId === focus.id),
        placements: only(focus.id),
      },
      {
        key: "composition",
        step: 3,
        cells: cells.filter((c) => c.buildingId === composition?.id && !LATE.includes(c.kind)),
        windows: windows.filter((w) => w.buildingId === composition?.id),
        placements: only(composition?.id),
      },
      ...elements.map((element) => ({
        key: `element-${element.id}`,
        step: 4,
        cells: cells.filter((c) => c.buildingId === element.id && !LATE.includes(c.kind)),
        windows: none,
        placements: only(element.id),
      })),
      ...[parent, child].map((node, index) => ({
        key: `tree-${index}`,
        step: 5,
        cells: cells.filter((c) => c.buildingId === node?.id && !LATE.includes(c.kind)),
        windows: windows.filter((w) => w.buildingId === node?.id),
        placements: only(node?.id),
      })),
      {
        key: "pins",
        step: 5,
        cells: cells.filter((c) => LATE.includes(c.kind)),
        windows: none,
        placements,
      },
    ].filter((layer) => layer.cells.length + layer.windows.length > 0)
    // The traces arrive with the buildings at both ends. The page's own
    // composition and blocks come with their step; anything that also touches
    // the parent or the child waits for those to stand.
    const early = new Set([focus.id, composition?.id, ...elements.map((e) => e.id)])
    const ownTrace = (edge: SchemaEdge) => early.has(edge.from) && early.has(edge.to)
    return {
      cast,
      layers,
      edges,
      early: edges.filter(ownTrace),
      late: edges.filter((edge) => !ownTrace(edge)),
      heights,
      placements,
      placementsById: new Map(placements.map((p) => [p.id, p])),
      anchors: roofAnchors(placements, heights),
    }
  }, [graph, alias])
}

const ease = (t: number) => {
  const p = Math.min(1, Math.max(0, t))
  return p * p * (3 - 2 * p)
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

/** A trace layer that fades in at its step. */
function useFade(shown: boolean) {
  const [opacity, setOpacity] = useState(0)
  const value = useRef(0)
  useFrame((_, delta) => {
    const next = THREE.MathUtils.clamp(
      value.current + (shown ? delta : -delta) / GROW,
      0,
      1
    )
    if (next !== value.current) {
      value.current = next
      setOpacity(next)
    }
  })
  return opacity
}

function Neighbourhood({
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
  const built = useNeighbourhood(graph, alias)
  const table = useRef<THREE.Group>(null)
  const roads = useFade(step >= 5)
  const arcs = useFade(step >= 3)
  const blocks = useFade(step >= 4)
  const late = useFade(step >= 5)
  const colours = useMemo(() => buildingPalette(palette), [palette])

  useFrame((_, delta) => {
    if (table.current) {
      table.current.rotation.y += delta * TURN
    }
  })

  if (!built) {
    return null
  }
  const structure = built.edges.filter((edge) => edge.kind === "allowedChild")
  return (
    <group ref={table}>
      <mesh position={[0, -0.21, 0]} receiveShadow>
        <cylinderGeometry args={[15.5, 15.5, 0.4, 72]} />
        <meshStandardMaterial
          color={tint(palette.land, palette.dim, 0.25)}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>
      {built.layers.map((layer) => (
        <Grow key={layer.key} shown={step >= layer.step}>
          <Buildings
            cells={layer.cells}
            heights={built.heights}
            hovered={null}
            neighbours={null}
            onFocus={() => undefined}
            onHover={() => undefined}
            onSelect={() => undefined}
            palette={colours}
            placements={layer.placements}
            plazas={[]}
            reducedMotion
            scale={null}
            selected={null}
            windows={layer.windows}
          />
        </Grow>
      ))}
      <CityRoads
        colour={palette.phosphor}
        edges={structure}
        opacity={roads}
        placementsById={built.placementsById}
      />
      <CityLinks
        anchors={built.anchors}
        colour={palette.azure}
        edges={built.early}
        layer="compositions"
        opacity={arcs}
        placementsById={built.placementsById}
      />
      <CityLinks
        anchors={built.anchors}
        colour={palette.amber}
        edges={built.early}
        layer="blocks"
        opacity={blocks}
        placementsById={built.placementsById}
      />
      <CityLinks
        anchors={built.anchors}
        colour={palette.azure}
        edges={built.late}
        layer="compositions"
        opacity={late}
        placementsById={built.placementsById}
      />
      <CityLinks
        anchors={built.anchors}
        colour={palette.amber}
        edges={built.late}
        layer="blocks"
        opacity={late}
        placementsById={built.placementsById}
      />
    </group>
  )
}

function Lights() {
  return (
    <>
      <hemisphereLight args={["#a8e8ff", "#101c1e", 0.8]} />
      <directionalLight
        castShadow
        color="#ffeef0"
        intensity={2.1}
        position={[-18, 22, 8]}
        shadow-bias={-0.0006}
        shadow-camera-bottom={-20}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-mapSize={[2048, 2048]}
        shadow-normalBias={0.05}
      />
      <directionalLight color="#6fffe0" intensity={0.85} position={[14, 8, -12]} />
      <directionalLight color="#cdeee5" intensity={0.5} position={[10, 12, 22]} />
    </>
  )
}

export function LegendWidget({
  graph = demoGraph,
  alias = "eventPage",
  step,
}: {
  graph?: SchemaGraph
  /** The Document Type the legend is built around. */
  alias?: string
  step?: number
}) {
  const current = useStep(step)
  const host = useRef<HTMLDivElement>(null)
  const palette = useCityPalette(host)

  return (
    <div className="grid h-full grid-cols-[600px_1fr] gap-[var(--slide-content-gap)]" ref={host}>
      <ol className="flex flex-col justify-center gap-[var(--slide-item-gap)]">
        {ENTRIES.map((entry, index) => (
          <li
            className="grid grid-cols-[1.6rem_1fr] items-baseline gap-x-5 transition-opacity duration-500"
            key={entry.term}
            style={{ opacity: index <= current ? 1 : 0.12 }}
          >
            <span
              aria-hidden
              className="size-[1.1rem] self-center"
              style={{
                background: palette?.[entry.swatch],
                boxShadow: `0 0 12px ${palette?.[entry.swatch] ?? "transparent"}`,
              }}
            />
            <span className="font-bold text-[length:var(--slide-body-size)] text-foreground uppercase leading-tight">
              {entry.term}
            </span>
            <span />
            <span className="text-[length:var(--slide-support-size)] text-muted-foreground leading-snug">
              {entry.means}
            </span>
          </li>
        ))}
      </ol>
      {/* The turntable fades into the slide instead of meeting the canvas edge. */}
      <div className="relative min-h-0 [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_75%)]">
        {palette ? (
          <Canvas
            camera={{ fov: CAMERA_FOV, position: [16.5, 14, 23], near: 0.5, far: 400 }}
            className="absolute! inset-0"
            dpr={[1, 2]}
            gl={{ alpha: true }}
            onCreated={({ camera }) => camera.lookAt(0, 0.5, 0)}
            resize={{ offsetSize: true }}
            shadows="percentage"
          >
            <Lights />
            <Neighbourhood
              alias={alias}
              graph={graph}
              palette={palette}
              step={current}
            />
          </Canvas>
        ) : null}
      </div>
    </div>
  )
}
