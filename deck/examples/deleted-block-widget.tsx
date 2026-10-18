"use client"

import { useMemo } from "react"
import type { SchemaGraph } from "@/deck/city/schema-city"
import { useStep } from "@/deck/city/use-step"
import type { Stage } from "@/deck/examples/example-city"
import type { DeletedBlockExample } from "@/deck/examples/site-results"
import { Arc, Ghost, type Point, RISE_CELL, RISE_LIFT, Rise, Tag } from "@/deck/examples/stage-parts"
import { StagedFrame } from "@/deck/examples/staged-frame"

/*
 * A block list with one Element Type deleted from under it. The city opens on
 * the whole site, then the camera comes down to the page and its block links
 * draw to the Element Types they resolve. The last link runs to an empty plot
 * where a wireframe stands in for the type that is gone, and the blocks content
 * still stores of it rise off the page's roof.
 */
export function DeletedBlockWidget({
  graph,
  example,
  step,
}: {
  graph: SchemaGraph
  example: DeletedBlockExample
  step?: number
}) {
  const current = useStep(step)
  const close = current >= 1
  const counting = current >= 3
  return (
    <StagedFrame
      extras={(stage) => <Scene current={current} example={example} stage={stage} />}
      frameOn={counting ? [example.host] : close ? [example.host, ...example.targets.map((target) => target.id)] : undefined}
      framePoints={counting ? (city) => countPoints(city, example) : close ? (city) => framePoints(city, example) : undefined}
      graph={graph}
      line={`Someone deleted the ${example.missingName} block.`}
      paint={{
        selected: example.host,
        focus: close ? [example.host, ...example.targets.map((target) => target.id)] : undefined,
        lit: current >= 3 ? [example.host] : undefined,
      }}
    />
  )
}

function Scene({ stage, example, current }: { stage: Stage; example: DeletedBlockExample; current: number }) {
  const { city, anchors, palette, still } = stage
  const ghost = useMemo(() => ghostPlot(city, example), [city, example])
  const from = anchors.get(example.host)
  if (!from) return null
  const roof = (id: string): Point | null => {
    const anchor = anchors.get(id)
    return anchor ? [anchor.x, anchor.y, anchor.z] : null
  }
  const start: Point = [from.x, from.y, from.z]
  const ghostTop: Point = [ghost.at[0], ghost.height + 0.05, ghost.at[2]]
  return (
    <>
      {example.targets.map((target, index) => {
        const to = roof(target.id)
        if (!to) return null
        return (
          <group key={target.id}>
            <Arc colour={palette.phosphor} delay={index * 0.25} from={start} on={current >= 1} still={still} to={to} />
            <Tag layer={stage.labels} at={[to[0], to[1] + 1, to[2]]} delay={0.6 + index * 0.25} on={current >= 1}>
              {target.name}
            </Tag>
          </group>
        )
      })}
      <Arc colour={palette.signal} duration={1.4} from={start} on={current >= 2} still={still} to={ghostTop} />
      <Ghost
        at={ghost.at}
        colour={palette.signal}
        delay={1.2}
        height={ghost.height}
        on={current >= 2}
        size={ghost.size}
        still={still}
      />
      <Tag layer={stage.labels} at={[from.x, 0, from.z + 4]} on={current >= 1}>
        {example.hostName}
      </Tag>
      <Tag layer={stage.labels} at={[ghost.at[0], 0, ghost.at[2] + ghost.size * 1.4]} delay={1.4} on={current >= 2} tone="signal">
        Element Type not found
      </Tag>
      <Rise
        at={[from.x, from.y, from.z]}
        colour={palette.signal}
        count={example.stored}
        on={current >= 3}
        still={still}
      />
      <Tag
        at={[from.x, from.y + riseHeight(example.stored) + 0.8, from.z]}
        layer={stage.labels}
        delay={1.4}
        on={current >= 3}
        tone="signal"
      >
        {example.stored} blocks still in content
      </Tag>
    </>
  )
}

/**
 * Where the deleted Element Type would stand: the next free row of the Elements
 * board, at the size of its neighbours.
 */
function ghostPlot(city: Stage["city"], example: DeletedBlockExample) {
  const first = example.targets[0]
  const district = city.placementsById.get(first?.id ?? "")?.district
  const elements = city.placements.filter((placement) => placement.district === district)
  const board = city.districts.find((each) => each.id === district)
  // Rows are only roughly level, so a row is any run of z within a building's width.
  const rows = elements
    .map((placement) => placement.position.z)
    .sort((a, b) => a - b)
    .reduce<number[]>((found, z) => (found.length > 0 && z - (found.at(-1) ?? 0) < 2 ? found : [...found, z]), [])
  const pitch = rows.length > 1 ? rows[1] - rows[0] : 8
  const size = elements.reduce((sum, placement) => sum + placement.footprint, 0) / Math.max(1, elements.length)
  const height = elements[0]?.height ?? 1.6
  // The last column, clear of the board's name, which starts at the first.
  const columns = elements
    .map((placement) => placement.position.x)
    .sort((a, b) => a - b)
    .reduce<number[]>((found, x) => (found.length > 0 && x - (found.at(-1) ?? 0) < 2 ? found : [...found, x]), [])
  const x = columns.at(-1) ?? 0
  const wanted = (rows.at(-1) ?? 0) + pitch
  const z = board ? Math.min(wanted, board.maxZ - size / 2) : wanted
  return { at: [x, 0, z] as Point, size, height }
}

/** The Elements board, the empty plot and the blocks above the page, for the camera. */
function framePoints(city: Stage["city"], example: DeletedBlockExample): Point[] {
  const { at, size, height } = ghostPlot(city, example)
  const board = city.districts.find(
    (district) => district.id === city.placementsById.get(example.targets[0]?.id ?? "")?.district
  )
  const host = city.placementsById.get(example.host)
  const top = host ? (city.heights.get(host.id) ?? host.height) + riseHeight(example.stored) + 1.5 : 0
  return [
    [at[0] - size, 0, at[2] - size],
    [at[0] + size, 0, at[2] + size],
    [at[0], height + 2, at[2]],
    ...(board
      ? ([
          [board.minX, 0, board.minZ],
          [board.maxX, 0, board.maxZ],
        ] as Point[])
      : []),
    ...(host ? ([[host.position.x, top, host.position.z]] as Point[]) : []),
  ]
}

/** How far the stored blocks stack above the roof. */
const riseHeight = (count: number) => RISE_LIFT + (count > 0 ? RISE_CELL : 0)

/** The page and the blocks over it, with room around them, for the camera's last move. */
function countPoints(city: Stage["city"], example: DeletedBlockExample): Point[] {
  const host = city.placementsById.get(example.host)
  if (!host) return []
  const { x, z } = host.position
  const reach = 14
  const top = (city.heights.get(host.id) ?? host.height) + riseHeight(example.stored) + 2
  return [
    [x - reach, 0, z - reach],
    [x + reach, 0, z + reach],
    [x, top, z],
  ]
}
