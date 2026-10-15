"use client"

import { type CSSProperties, useEffect, useState } from "react"
import { useSlideStepper } from "@thebuilder/deckard-core/components"
import { Code } from "@/deck/city/code"

/** One building's ground in the finished city, and the neighbourhood it stood in. */
export type Lot = {
  id: string
  x: number
  z: number
  size: number
  /** Index of its neighbourhood in the district on show, or -1 outside it. */
  cluster: number
  head: boolean
}

type Spot = { x: number; z: number }
type Board = { width: number; depth: number; score: number; spots: Record<string, Spot> }
type Box = { minX: number; maxX: number; minZ: number; maxZ: number }

const STEPS = [
  { label: "a list" },
  { label: "neighbourhoods" },
  { label: "seventeen widths" },
  { label: "the city" },
]

/** Pixels the board is drawn in. The canvas scales the whole slide, so these are canvas pixels. */
const VIEW = { height: 640, width: 960 }
/** Milliseconds each try stays on screen while the search plays. */
const TRY_MS = 420
const EASE = "1100ms cubic-bezier(0.65, 0, 0.35, 1)"
/** Quicker, so each try has landed before the next one starts. */
const SHUFFLE = "380ms ease-in-out"

const thousands = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 })

function boxOf(spots: [Spot, number][]): Box {
  const box = { maxX: -Infinity, maxZ: -Infinity, minX: Infinity, minZ: Infinity }
  for (const [spot, size] of spots) {
    box.minX = Math.min(box.minX, spot.x - size / 2)
    box.maxX = Math.max(box.maxX, spot.x + size / 2)
    box.minZ = Math.min(box.minZ, spot.z - size / 2)
    box.maxZ = Math.max(box.maxZ, spot.z + size / 2)
  }
  return box
}

const union = (a: Box, b: Box): Box => ({
  maxX: Math.max(a.maxX, b.maxX),
  maxZ: Math.max(a.maxZ, b.maxZ),
  minX: Math.min(a.minX, b.minX),
  minZ: Math.min(a.minZ, b.minZ),
})

/** The transform that fits `box`, plus a margin, in the view, centred. */
function fit(box: Box, margin = 0.08): CSSProperties {
  const width = box.maxX - box.minX
  const depth = box.maxZ - box.minZ
  const scale = Math.min(VIEW.width / width, VIEW.height / depth) * (1 - margin * 2)
  const x = VIEW.width / 2 - ((box.minX + box.maxX) / 2) * scale
  const z = VIEW.height / 2 - ((box.minZ + box.maxZ) / 2) * scale
  return {
    transform: `translate(${x}px, ${z}px) scale(${scale})`,
    transformOrigin: "0 0",
    transition: `transform ${EASE}`,
  }
}

/**
 * Plays the shelf search once the slide reaches it: widest board first, down to
 * the narrowest, then back to the one it keeps. Before the step it shows the
 * widest, which is every neighbourhood on one shelf; after it, the winner.
 */
function useTry(step: number, count: number, best: number) {
  const [index, setIndex] = useState(count - 1)
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    const land = (at: number, done: boolean) => {
      setIndex(at)
      setSettled(done)
    }
    if (step < 2) return land(count - 1, false)
    if (step > 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return land(best, true)
    let next = count - 1
    land(next, false)
    const timer = window.setInterval(() => {
      next -= 1
      if (next < 0) {
        window.clearInterval(timer)
        land(best, true)
      } else land(next, false)
    }, TRY_MS)
    return () => window.clearInterval(timer)
  }, [step, count, best])
  return { index, settled }
}

export function LayoutView({
  lots,
  members,
  tries,
  best,
  offset,
  gap,
  districts,
  district,
  code,
}: {
  lots: Lot[]
  /** The district's types in alias order, the order the list step shows them in. */
  members: string[]
  tries: Board[]
  best: number
  offset: Spot
  gap: number
  districts: (Box & { id: string; name: string })[]
  district: string
  code: { caption: string; code: string }[]
}) {
  const stepper = useSlideStepper()
  const step = Math.min(stepper?.currentStep ?? 0, STEPS.length - 1)
  const { index, settled } = useTry(step, tries.length, best)
  const board = tries[index] as Board
  const lotById = new Map(lots.map((lot) => [lot.id, lot]))
  const inDistrict = new Set(members)

  // The list: every member side by side in alias order, centred on the board.
  const centre = boxOf(
    members.map((id) => [
      (tries[best] as Board).spots[id] as Spot,
      lotById.get(id)?.size ?? 0,
    ])
  )
  const row = new Map<string, Spot>()
  const rowWidth =
    members.reduce((sum, id) => sum + (lotById.get(id)?.size ?? 0), 0) +
    gap * (members.length - 1)
  let left = (centre.minX + centre.maxX) / 2 - rowWidth / 2
  for (const id of members) {
    const size = lotById.get(id)?.size ?? 0
    row.set(id, { x: left + size / 2, z: (centre.minZ + centre.maxZ) / 2 })
    left += size + gap
  }

  const where = (lot: Lot): Spot => {
    if (!inDistrict.has(lot.id) || step === 3) return lot
    if (step === 0) return row.get(lot.id) as Spot
    const spot = board.spots[lot.id] as Spot
    return { x: spot.x + offset.x, z: spot.z + offset.z }
  }
  const sized = (ids: string[]) =>
    ids.map((id): [Spot, number] => {
      const lot = lotById.get(id) as Lot
      return [where(lot), lot.size]
    })

  const shown = boxOf(sized(members))
  const frame =
    step === 3
      ? boxOf(lots.map((lot) => [lot, lot.size]))
      : step === 2
        ? tries
            .map((each) =>
              boxOf(
                members.map((id) => {
                  const spot = each.spots[id] as Spot
                  return [
                    { x: spot.x + offset.x, z: spot.z + offset.z },
                    lotById.get(id)?.size ?? 0,
                  ]
                })
              )
            )
            .reduce(union)
        : shown

  const clusters = [...new Set(lots.map((lot) => lot.cluster))]
    .filter((cluster) => cluster >= 0)
    .map((cluster) =>
      boxOf(sized(lots.filter((lot) => lot.cluster === cluster).map((lot) => lot.id)))
    )
  const scores = tries.map((each) => each.score)
  const low = Math.min(...scores)
  const high = Math.max(...scores)

  const readout = [
    `${members.length} pages, sized by their own properties`,
    `${clusters.length} neighbourhoods, parents over children`,
    `${settled ? "kept" : "try"} ${index + 1} of ${tries.length}   ${board.width.toFixed(0)} x ${board.depth.toFixed(0)}   score ${thousands.format(board.score)}`,
    `${districts.length} districts, ${lots.length} types`,
  ][step]

  const excerpt = code[step] ?? code[0]

  return (
    <section className="grid h-full grid-cols-[720px_1fr] gap-12">
      <style>{"@keyframes layout-arrive { from { opacity: 0 } }"}</style>
      <div className="flex min-h-0 flex-col justify-center">
        {excerpt ? (
          <Code caption={excerpt.caption} code={excerpt.code} key={step} width={42} />
        ) : null}
      </div>
      <div className="flex min-h-0 min-w-0 flex-col justify-center gap-4">
        <p
          className="font-semibold text-[length:var(--slide-label-size)] text-muted-foreground uppercase tracking-[var(--slide-label-tracking)]"
          data-slide-eyebrow=""
        >
          {STEPS[step]?.label}
        </p>
        <svg
          aria-label="The Site district of the demo schema, seen from above"
          className="block h-auto w-full"
          role="img"
          viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        >
          <g style={fit(frame)}>
            {/* The rest of the city is mounted only when it is shown, so it neither
                counts against the slide's bounds nor sits invisibly under the board. */}
            {step === 3 ? districts.map((each) => (
              <rect
                fill="none"
                height={each.maxZ - each.minZ}
                key={each.id}
                stroke="var(--slide-rule)"
                strokeDasharray="4 4"
                style={{ animation: `layout-arrive ${EASE} both` }}
                vectorEffect="non-scaling-stroke"
                width={each.maxX - each.minX}
                x={each.minX}
                y={each.minZ}
              />
            )) : null}
            {clusters.map((box, i) => (
              <rect
                fill="none"
                // Neighbourhoods are positional, the order the district lists them in.
                key={i}
                stroke="var(--muted-foreground)"
                strokeDasharray="6 4"
                style={{
                  height: box.maxZ - box.minZ + 2,
                  opacity: step === 1 || step === 2 ? 0.8 : 0,
                  transition: ["x", "y", "width", "height", "opacity"]
                    .map((property) => `${property} ${step === 2 ? SHUFFLE : EASE}`)
                    .join(", "),
                  width: box.maxX - box.minX + 2,
                  x: box.minX - 1,
                  y: box.minZ - 1,
                }}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {lots.map((lot) => {
              const at = where(lot)
              const mine = inDistrict.has(lot.id)
              if (!(mine || step === 3)) return null
              return (
                <rect
                  height={lot.size}
                  key={lot.id}
                  stroke={mine ? "var(--primary)" : "var(--muted-foreground)"}
                  style={{
                    fill: mine
                      ? `color-mix(in oklab, var(--primary) ${lot.head ? 70 : 28}%, transparent)`
                      : "transparent",
                    animation: mine ? undefined : `layout-arrive ${EASE} both`,
                    transform: `translate(${at.x}px, ${at.z}px)`,
                    transition: `transform ${step === 2 ? SHUFFLE : EASE}`,
                  }}
                  vectorEffect="non-scaling-stroke"
                  width={lot.size}
                  x={-lot.size / 2}
                  y={-lot.size / 2}
                />
              )
            })}
          </g>
        </svg>
        <div className="flex items-end justify-between gap-8">
          <p className="whitespace-pre text-[length:var(--slide-support-size)] text-foreground tabular-nums">
            {readout}
          </p>
          <div
            aria-hidden
            className="flex h-14 shrink-0 items-end gap-1"
            hidden={step !== 2}
          >
            {scores.map((score, i) => (
              <span
                className="w-3"
                // Tries are positional, in the order the search makes them.
                key={i}
                style={{
                  background:
                    i === index ? "var(--primary)" : "var(--muted-foreground)",
                  height: `${20 + ((score - low) / Math.max(high - low, 1)) * 80}%`,
                  opacity: i === index ? 1 : 0.4,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
