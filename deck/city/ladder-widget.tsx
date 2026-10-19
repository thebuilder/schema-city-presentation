"use client"

import { useEffect, useMemo, useRef } from "react"
import { demoGraph, type SchemaGraph } from "@/deck/city/schema-city"
import { useStep } from "@/deck/city/use-step"

/*
 * One content model, three interfaces, a click each: the Settings tree, a flat
 * list and a node-link graph. Every rung draws the same graph and each shows a
 * little more, but the graph ends as a hairball and none of them answers the
 * wall's question. The city is held back for the morph, so it is revealed once.
 */

const RUNGS = ["Tree", "List", "Graph"] as const

export const LADDER_STEPS = RUNGS.length

export function LadderWidget({
  graph = demoGraph,
  step,
}: {
  graph?: SchemaGraph
  step?: number
}) {
  const current = Math.min(useStep(step), RUNGS.length - 1)
  return (
    <div className="relative h-full w-full bg-background">
      <Rung active={current === 0}>
        <TreeRung graph={graph} />
      </Rung>
      <Rung active={current === 1}>
        <ListRung graph={graph} />
      </Rung>
      <Rung active={current === 2}>
        <GraphRung active={current === 2} graph={graph} />
      </Rung>
      <p className="absolute top-10 left-16 font-bold text-[length:var(--slide-label-size)] text-primary uppercase tracking-[var(--slide-label-tracking)] [text-shadow:var(--slide-halo)]">
        {RUNGS[current]}
      </p>
    </div>
  )
}

function Rung({
  active,
  children,
}: {
  active: boolean
  children: React.ReactNode
}) {
  return (
    <div
      aria-hidden={!active}
      className="absolute inset-0 transition-opacity duration-500"
      style={{ opacity: active ? 1 : 0 }}
    >
      {children}
    </div>
  )
}

/** Types that some other type composes, which the backoffice lists like any other. */
function compositionIds(graph: SchemaGraph) {
  return new Set(
    (graph.edges ?? [])
      .filter((edge) => edge.kind === "composition")
      .map((edge) => edge.to)
  )
}

type TreeLine = { key: string; guide: string; name: string; folder: boolean }

/**
 * The Document Types tree as the backoffice draws it, fully expanded: folders
 * first, then types, each level in name order.
 */
function treeLines(graph: SchemaGraph): TreeLine[] {
  const byName = <T extends { name: string }>(a: T, b: T) =>
    a.name.localeCompare(b.name)
  const lines: TreeLine[] = [
    { key: "root", guide: "", name: "Document Types", folder: true },
  ]
  const walk = (parentId: string | null, prefix: string) => {
    const folders = (graph.folders ?? [])
      .filter((folder) => (folder.parentId ?? null) === parentId)
      .sort(byName)
    const types = graph.nodes
      .filter((node) => (node.folderId ?? null) === parentId)
      .sort(byName)
    const children = [
      ...folders.map((folder) => ({ folder, node: null })),
      ...types.map((node) => ({ folder: null, node })),
    ]
    children.forEach((child, index) => {
      const last = index === children.length - 1
      const guide = `${prefix}${last ? "└─ " : "├─ "}`
      if (child.folder) {
        lines.push({
          key: child.folder.id,
          guide,
          name: child.folder.name,
          folder: true,
        })
        walk(child.folder.id, `${prefix}${last ? "   " : "│  "}`)
      } else if (child.node) {
        lines.push({
          key: child.node.id,
          guide,
          name: child.node.name,
          folder: false,
        })
      }
    })
  }
  walk(null, "")
  return lines
}

/** Rows that fit under the label at the rung's type size. */
const ROWS_PER_COLUMN = 27

/**
 * As few columns as hold every line, balanced by the browser, so 32 types read
 * as two even lists instead of one full column and a stub.
 */
const columnsFor = (lines: number) =>
  Math.min(4, Math.max(1, Math.ceil(lines / ROWS_PER_COLUMN)))

function TreeRung({ graph }: { graph: SchemaGraph }) {
  const lines = useMemo(() => treeLines(graph), [graph])
  return (
    <div
      className="h-full gap-12 px-16 pt-28 pb-12 font-[family-name:var(--slide-font-mono)] text-[length:calc(var(--slide-label-size)*0.95)] leading-[1.45]"
      style={{ columnCount: columnsFor(lines.length) }}
    >
      {lines.map((line) => (
        <p className="truncate whitespace-pre" key={line.key}>
          <span className="text-muted-foreground/60">{line.guide}</span>
          <span
            className={line.folder ? "text-foreground" : "text-muted-foreground"}
          >
            {line.name}
          </span>
        </p>
      ))}
    </div>
  )
}

function ListRung({ graph }: { graph: SchemaGraph }) {
  const names = useMemo(
    () => graph.nodes.map((node) => node.name).sort((a, b) => a.localeCompare(b)),
    [graph]
  )
  return (
    <ul
      className="h-full gap-12 px-16 pt-28 pb-12 font-[family-name:var(--slide-font-mono)] text-[length:calc(var(--slide-label-size)*0.95)] text-muted-foreground leading-[1.45]"
      style={{ columnCount: columnsFor(names.length) }}
    >
      {names.map((name, index) => (
        <li className="truncate" key={`${name}-${index}`}>
          {name}
        </li>
      ))}
    </ul>
  )
}

/** The graph's viewBox, the slide canvas below the label. */
const VIEW = { width: 1800, height: 900 }
const SETTLE_STEPS = 420
const STEPS_PER_FRAME = 3

/** A small deterministic generator, so the hairball tangles the same way each run. */
function seeded(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

/**
 * Fruchterman and Reingold's spring layout, the default answer to "draw me the
 * graph", run live so the room watches it settle into a hairball.
 */
function GraphRung({
  active,
  graph,
}: {
  active: boolean
  graph: SchemaGraph
}) {
  const nodes = graph.nodes
  const links = useMemo(() => {
    const index = new Map(nodes.map((node, i) => [node.id, i]))
    const seen = new Set<string>()
    const pairs: [number, number][] = []
    for (const edge of graph.edges ?? []) {
      const a = index.get(edge.from)
      const b = index.get(edge.to)
      if (a === undefined || b === undefined || a === b) continue
      const key = a < b ? `${a}:${b}` : `${b}:${a}`
      if (seen.has(key)) continue
      seen.add(key)
      pairs.push([a, b])
    }
    return pairs
  }, [graph, nodes])
  const kinds = useMemo(() => {
    const composed = compositionIds(graph)
    return nodes.map((node) =>
      node.isElement ? "element" : composed.has(node.id) ? "composition" : "page"
    )
  }, [graph, nodes])
  const degree = useMemo(() => {
    const counts = nodes.map(() => 0)
    for (const [a, b] of links) {
      counts[a] += 1
      counts[b] += 1
    }
    return counts
  }, [links, nodes])

  const circles = useRef<(SVGCircleElement | null)[]>([])
  const lines = useRef<(SVGLineElement | null)[]>([])

  useEffect(() => {
    if (!active) return
    const n = nodes.length
    const random = seeded(7)
    const x = new Float64Array(n)
    const y = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      x[i] = (random() - 0.5) * VIEW.width * 0.3
      y[i] = (random() - 0.5) * VIEW.height * 0.3
    }
    const k = Math.sqrt((VIEW.width * VIEW.height) / n)
    const dx = new Float64Array(n)
    const dy = new Float64Array(n)
    let step = 0
    let frame = 0

    const tick = () => {
      const heat = VIEW.width * 0.05 * (1 - step / SETTLE_STEPS)
      dx.fill(0)
      dy.fill(0)
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const ex = x[i] - x[j]
          const ey = y[i] - y[j]
          const d = Math.max(1, Math.hypot(ex, ey))
          const push = (k * k) / d / d
          dx[i] += ex * push
          dy[i] += ey * push
          dx[j] -= ex * push
          dy[j] -= ey * push
        }
      }
      for (const [a, b] of links) {
        const ex = x[a] - x[b]
        const ey = y[a] - y[b]
        const d = Math.max(1, Math.hypot(ex, ey))
        const pull = d / k
        dx[a] -= ex * pull
        dy[a] -= ey * pull
        dx[b] += ex * pull
        dy[b] += ey * pull
      }
      for (let i = 0; i < n; i++) {
        // A constant pull to the centre keeps the types with no links in reach.
        const r = Math.max(1, Math.hypot(x[i], y[i]))
        dx[i] -= (x[i] / r) * k * 6
        dy[i] -= (y[i] / r) * k * 6
        const d = Math.max(1, Math.hypot(dx[i], dy[i]))
        const move = Math.min(d, heat)
        x[i] += (dx[i] / d) * move
        y[i] += (dy[i] / d) * move
      }
      step += 1
    }

    // The whole settle runs up front and plays back. Fitting the frame to the
    // live layout rescaled the view every frame, and the raw spring steps
    // overshoot near rest, so both read as jitter on a projector.
    const frames: Float64Array[] = []
    const record = () => {
      const snapshot = new Float64Array(n * 2)
      snapshot.set(x)
      snapshot.set(y, n)
      frames.push(snapshot)
    }
    record()
    while (step < SETTLE_STEPS) {
      for (let s = 0; s < STEPS_PER_FRAME && step < SETTLE_STEPS; s++) tick()
      record()
    }
    // Each spring step overshoots and the next pulls back, so the raw frames
    // flicker. A moving average over the recording keeps the drift and drops
    // the flicker.
    const SMOOTH = 8
    const smoothed = frames.map((_, f) => {
      const from = Math.max(0, f - SMOOTH)
      const to = Math.min(frames.length - 1, f + SMOOTH)
      const mean = new Float64Array(n * 2)
      for (let g = from; g <= to; g++) {
        for (let v = 0; v < n * 2; v++) mean[v] += frames[g][v]
      }
      for (let v = 0; v < n * 2; v++) mean[v] /= to - from + 1
      return mean
    })

    // Types with no links get pushed far out, so the frame fits the bulk of the
    // settled graph and pins the strays to its edge instead of shrinking the rest.
    const fit = (values: Float64Array) => {
      const sorted = Array.from(values).sort((p, q) => p - q)
      const at = (share: number) =>
        sorted[Math.min(n - 1, Math.floor(share * (n - 1)))]
      return [at(0.03), at(0.97)] as const
    }
    const [minX, maxX] = fit(x)
    const [minY, maxY] = fit(y)
    const scale = Math.min(
      (VIEW.width * 0.9) / Math.max(1, maxX - minX),
      (VIEW.height * 0.9) / Math.max(1, maxY - minY)
    )
    const clamp = (value: number, size: number) =>
      Math.min(size - 12, Math.max(12, value))

    // What is on screen eases toward the recorded frame, which damps the
    // spring layout's back and forth without changing where it ends up.
    const shownX = Float64Array.from(smoothed[0].subarray(0, n))
    const shownY = Float64Array.from(smoothed[0].subarray(n))
    const EASE = 0.18
    let played = 0

    const draw = () => {
      const target = smoothed[Math.min(played, smoothed.length - 1)]
      for (let i = 0; i < n; i++) {
        shownX[i] += (target[i] - shownX[i]) * EASE
        shownY[i] += (target[n + i] - shownY[i]) * EASE
      }
      const px = (i: number) =>
        clamp(
          VIEW.width / 2 + (shownX[i] - (minX + maxX) / 2) * scale,
          VIEW.width
        )
      const py = (i: number) =>
        clamp(
          VIEW.height / 2 + (shownY[i] - (minY + maxY) / 2) * scale,
          VIEW.height
        )
      circles.current.forEach((circle, i) => {
        circle?.setAttribute("cx", px(i).toFixed(1))
        circle?.setAttribute("cy", py(i).toFixed(1))
      })
      lines.current.forEach((line, index) => {
        const [a, b] = links[index]
        line?.setAttribute("x1", px(a).toFixed(1))
        line?.setAttribute("y1", py(a).toFixed(1))
        line?.setAttribute("x2", px(b).toFixed(1))
        line?.setAttribute("y2", py(b).toFixed(1))
      })
    }

    // A tail past the last frame lets the easing land.
    const TAIL = 60
    const loop = () => {
      draw()
      played += 1
      if (played < smoothed.length + TAIL) {
        frame = requestAnimationFrame(loop)
      }
    }
    loop()
    return () => cancelAnimationFrame(frame)
  }, [active, links, nodes])

  return (
    <div className="h-full px-16 pt-28 pb-12">
      <svg
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      >
        <g className="stroke-muted-foreground" opacity={0.3} strokeWidth={1}>
          {links.map(([a, b], index) => (
            <line
              key={`${a}:${b}`}
              ref={(element) => {
                lines.current[index] = element
              }}
            />
          ))}
        </g>
        {nodes.map((node, i) => (
          <circle
            className={
              kinds[i] === "element"
                ? "fill-[var(--slide-amber)]"
                : kinds[i] === "composition"
                  ? "fill-[var(--slide-azure)]"
                  : "fill-primary"
            }
            key={node.id}
            r={4 + Math.sqrt(degree[i]) * 1.6}
            ref={(element) => {
              circles.current[i] = element
            }}
          />
        ))}
      </svg>
    </div>
  )
}
