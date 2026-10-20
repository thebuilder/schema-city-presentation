"use client"

import { useLayoutEffect, useState } from "react"
import ctBaseline from "@/deck/city/ct-baseline.json"
import { useStill } from "@/deck/parts/beats"
import { Words } from "@/deck/parts/line"

/*
 * What the backoffice screens add up to. Every Document Type in ct-baseline
 * lands on the slide, then every link between them draws in quick succession:
 * compositions, allowed children, blocks and references. Nothing is laid out
 * to make sense, because the point is how it feels to hold all of it in your
 * head at once. The line lands once the last link is in. It needs no click.
 *
 * The data is the same export the backoffice and the city are built from, so
 * the count of links on screen is the real one.
 */
const graph = ctBaseline.graph as unknown as {
  edges: { from: string; kind: string; to: string }[]
  nodes: { id: string; name: string }[]
}

// A stable number per string, so the mess is the same mess every run.
function hash(text: string): number {
  let value = 2166136261
  for (const char of text) {
    value = Math.imul(value ^ char.charCodeAt(0), 16777619)
  }
  return (value >>> 0) / 4294967295
}

const COLUMNS = 8
const ROWS = Math.ceil(graph.nodes.length / COLUMNS)
const CELL_X = 1680 / COLUMNS
const CELL_Y = 640 / ROWS

// Shuffled into a grid, then nudged, so links cross the slide instead of
// running between neighbours.
const placed = [...graph.nodes]
  .sort((a, b) => hash(a.id) - hash(b.id))
  .map((node, index) => ({
    ...node,
    x: 120 + CELL_X * (index % COLUMNS) + CELL_X / 2 + (hash(`${node.id}x`) - 0.5) * CELL_X * 0.5,
    y: 150 + CELL_Y * Math.floor(index / COLUMNS) + CELL_Y / 2 + (hash(`${node.id}y`) - 0.5) * CELL_Y * 0.5,
  }))
const at = new Map(placed.map((node) => [node.id, node]))

const links = graph.edges.flatMap((edge) => {
  const from = at.get(edge.from)
  const to = at.get(edge.to)
  if (!from || !to || from === to) {
    return []
  }
  // Bend each link to one side by a stable amount, so parallel links fan out.
  const bend = (hash(`${edge.from}${edge.to}${edge.kind}`) - 0.5) * 0.6
  const cx = (from.x + to.x) / 2 - (to.y - from.y) * bend
  const cy = (from.y + to.y) / 2 + (to.x - from.x) * bend
  return [{ d: `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`, key: `${edge.kind}:${edge.from}:${edge.to}` }]
})

// Milliseconds after the slide arrives.
const NODE_GAP = 25
const LINKS_AT = 900
const LINK_GAP = 28
const LINK_DRAW = 500
const LINE_AT = LINKS_AT + LINK_GAP * links.length + LINK_DRAW

export function Tangle() {
  const still = useStill()
  const [arrived, setArrived] = useState(still)

  useLayoutEffect(() => {
    if (still) {
      setArrived(true)
      return
    }
    // One frame in the start state, so the transitions have somewhere to start.
    const frame = requestAnimationFrame(() => setArrived(true))
    return () => cancelAnimationFrame(frame)
  }, [still])

  return (
    <section className="relative h-full w-full overflow-hidden">
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0"
        height={1080}
        viewBox="0 0 1920 1080"
        width={1920}
      >
        {links.map((link, index) => (
          <path
            d={link.d}
            fill="none"
            key={link.key}
            pathLength={1}
            stroke="var(--primary)"
            strokeDasharray={1}
            strokeDashoffset={arrived ? 0 : 1}
            strokeOpacity={0.45}
            strokeWidth={1.5}
            style={{
              transition: still
                ? "none"
                : `stroke-dashoffset ${LINK_DRAW}ms ease-out ${LINKS_AT + index * LINK_GAP}ms`,
            }}
          />
        ))}
        {placed.map((node, index) => (
          <g
            key={node.id}
            style={{
              opacity: arrived ? 1 : 0,
              transition: still ? "none" : `opacity 300ms ease-out ${index * NODE_GAP}ms`,
            }}
          >
            <circle cx={node.x} cy={node.y} fill="var(--primary)" r={5} />
            <text
              className="fill-muted-foreground font-mono"
              fontSize={17}
              textAnchor="middle"
              x={node.x}
              y={node.y - 14}
            >
              {node.name}
            </text>
          </g>
        ))}
      </svg>

      <div
        className="absolute inset-x-0 bottom-[calc(var(--slide-footer-space)+3rem)] flex justify-center"
        style={{
          opacity: arrived ? 1 : 0,
          transition: still ? "none" : `opacity 200ms ease-out ${LINE_AT}ms`,
        }}
      >
        <p
          className="border border-[var(--slide-surface-border)] bg-card px-10 py-6 font-semibold text-[length:var(--slide-heading-size)] text-primary leading-[1.1]"
          data-slide-statement-text=""
          data-slide-surface=""
        >
          <Words delay={LINE_AT} text="It gets messy fast." />
        </p>
      </div>
    </section>
  )
}
