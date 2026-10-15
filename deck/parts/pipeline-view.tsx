"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"
import { CityView } from "@/deck/city/city-view"
import {
  cityDistricts,
  type Placement,
  type SchemaGraph,
} from "@/deck/city/schema-city"

/** One type as each stage holds it, computed on the server from medium.json. */
export type Packet = {
  id: string
  alias: string
  umbraco: { name: string; groups: number; properties: number; children: number }
  api: { groups: number; edges: number; isElement: boolean }
  layout: { district: string; x: number; z: number; footprint: number; floors: number }
  scene: { slabs: number; windows: number; pins: number; other: number }
}

/** Seconds between two packets setting off. */
const PERIOD = 1.8
/** Seconds a packet takes from the left edge of the track to the right. */
const CROSSING = PERIOD * 4.6
/** Where each stage's middle sits along the track, as a share of its width. */
const STAGE_AT = [0.125, 0.375, 0.625, 0.875]

/** The packet that last passed stage `k`'s middle, `seconds` after the start. */
function arrivedAt(seconds: number, k: number, count: number) {
  const pass = (STAGE_AT[k] ?? 0) * CROSSING
  const index = Math.floor((seconds - pass) / PERIOD)
  return index < 0 ? null : index % count
}

/**
 * Moves the packets along the track by writing their transforms directly, and
 * hands back which packet each stage holds. Only that changes React state, about
 * once a period, so the city in the last stage is not re-rendered every frame.
 */
function useStream(count: number) {
  const track = useRef<HTMLDivElement>(null)
  // The stream starts a crossing in, so every stage already holds a packet on the
  // first frame, in the server render and in a still export alike.
  const [held, setHeld] = useState(() =>
    STAGE_AT.map((_, k) => arrivedAt(CROSSING, k, count))
  )
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const start = performance.now() - CROSSING * 1000
    let frame = 0
    const tick = () => {
      // Reduced motion holds that first frame.
      const seconds = reduced ? CROSSING : (performance.now() - start) / 1000
      const chips = track.current?.querySelectorAll<HTMLElement>("[data-packet]")
      chips?.forEach((chip, slot) => {
        // Slots are reused: slot s carries packets s, s + n, s + 2n and so on.
        const lanes = chips.length
        const since = seconds - slot * PERIOD
        const lap = Math.floor(since / (lanes * PERIOD))
        const t = (since - lap * lanes * PERIOD) / CROSSING
        const visible = since >= 0 && t <= 1 && !reduced
        // Faded in and out at the ends, and held inside the track by shifting each
        // chip back by its own share of the way, so none pokes past the slide edge.
        chip.style.opacity = visible ? String(Math.min(1, t * 12, (1 - t) * 12)) : "0"
        const along = Math.min(1, Math.max(0, t))
        chip.style.left = `${along * 100}%`
        chip.style.transform = `translate(${-along * 100}%, -50%)`
        chip.textContent = visible
          ? (chip.dataset[`alias${(slot + lap * lanes) % count}`] ?? "")
          : ""
      })
      setHeld((current) => {
        const next = STAGE_AT.map((_, k) => arrivedAt(seconds, k, count))
        return next.every((value, k) => value === current[k]) ? current : next
      })
      if (!reduced) frame = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frame)
  }, [count])
  return { held, track }
}

/** The layout run in this browser, five times, reported as the median. */
function useLayoutTime(graph: SchemaGraph) {
  const [ms, setMs] = useState<number | null>(null)
  useEffect(() => {
    const runs = Array.from({ length: 5 }, () => {
      const start = performance.now()
      cityDistricts(graph)
      return performance.now() - start
    }).sort((a, b) => a - b)
    setMs(runs[2] ?? null)
  }, [graph])
  return ms
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`
const kb = (bytes: number) => `${Math.round(bytes / 1024)}`
const fixed = (value: number) => value.toFixed(1).padStart(6)

export function PipelineView({
  graph,
  placements,
  packets,
  bytes,
  edges,
}: {
  graph: SchemaGraph
  placements: Placement[]
  packets: Packet[]
  bytes: number
  edges: number
}) {
  const { held, track } = useStream(packets.length)
  const layoutMs = useLayoutTime(graph)
  const [calls, setCalls] = useState<number | null>(null)
  const at = (k: number) => {
    const index = held[k]
    return index === null || index === undefined ? null : packets[index]
  }
  const umbraco = at(0)
  const api = at(1)
  const layout = at(2)
  const scene = at(3)

  return (
    <section className="flex h-full flex-col justify-center gap-6">
      <style>{`@keyframes pipeline-arrive { from { color: var(--primary); text-shadow: var(--slide-halo) } }`}</style>
      <div className="grid grid-cols-4 gap-10">
        <Stage
          call={["contentTypeService", ".GetAll()"]}
          figure={String(graph.nodes.length)}
          index="01"
          label="umbraco"
          unit="document types"
        >
          {umbraco ? (
            <Readout id={umbraco.alias}>
              <span className="text-muted-foreground">IContentType</span>
              {`"${umbraco.umbraco.name}"`}
              <Row label="groups" value={umbraco.umbraco.groups} />
              <Row label="properties" value={umbraco.umbraco.properties} />
              <Row label="children" value={umbraco.umbraco.children} />
            </Readout>
          ) : null}
        </Stage>
        <Stage
          call={["GET .../schema-city", "/graph"]}
          figure={kb(bytes)}
          index="02"
          label="graph api"
          unit={`KB json, ${edges} edges`}
        >
          {api ? (
            <Readout id={api.alias}>
              {`{ "alias":\n    "${api.alias}",\n  "isElement": ${api.api.isElement},\n  "groups": [${api.api.groups}],\n  "edges": ${api.api.edges} }`}
            </Readout>
          ) : null}
        </Stage>
        <Stage
          call={["cityDistricts(graph)", ""]}
          figure={layoutMs === null ? "--" : layoutMs.toFixed(0)}
          index="03"
          label="layout"
          unit="ms, in this browser"
        >
          {layout ? (
            <Readout id={layout.alias}>
              <span className="text-muted-foreground">Placement in</span>
              {`"${layout.layout.district}"`}
              <Row label="x" value={fixed(layout.layout.x)} />
              <Row label="z" value={fixed(layout.layout.z)} />
              <Row label="footprint" value={fixed(layout.layout.footprint)} />
              <Row label="floors" value={layout.layout.floors} />
            </Readout>
          ) : null}
        </Stage>
        <Stage
          call={["buildFloorCells()", ""]}
          figure={calls === null ? "--" : String(calls)}
          index="04"
          label="scene"
          unit="draw calls, live"
        >
          <div className="flex h-full flex-col">
            {scene ? (
              <Readout id={scene.alias}>
                <span className="text-muted-foreground">
                  {`${plural(scene.scene.slabs, "slab")}, ${plural(scene.scene.windows, "window")}`}
                </span>
              </Readout>
            ) : (
              <div className="h-[2.4em]" />
            )}
            <CityView
              className="min-h-0 flex-1"
              distance={0.34}
              graph={graph}
              onStats={(stats) => setCalls(stats.calls)}
              orbit={0.08}
              pitch={0.9}
              placements={placements}
              selected={scene?.id ?? null}
            />
          </div>
        </Stage>
      </div>
      <Track packets={packets} track={track} />
    </section>
  )
}

function Stage({
  index,
  label,
  call,
  figure,
  unit,
  children,
}: {
  index: string
  label: string
  call: [string, string]
  figure: string
  unit: string
  children: ReactNode
}) {
  return (
    <div
      className="flex flex-col border border-[var(--slide-surface-border)] bg-[var(--slide-surface)]"
      data-slide-surface=""
    >
      <p className="border-[var(--slide-surface-border)] border-b px-5 py-3 font-semibold text-[length:var(--slide-label-size)] text-muted-foreground uppercase tracking-[var(--slide-label-tracking)]">
        <span className="text-primary">{index}</span> {label}
      </p>
      <p className="h-[4.5em] whitespace-pre px-5 pt-4 text-[length:var(--slide-support-size)] text-primary leading-snug">
        {call.join("\n")}
      </p>
      <div className="h-[300px] overflow-hidden px-5">{children}</div>
      <p className="flex items-baseline gap-3 border-[var(--slide-surface-border)] border-t px-5 py-4">
        <span
          className="font-bold text-[length:var(--slide-heading-size)] text-foreground tabular-nums leading-none"
          data-stat-value=""
        >
          {figure}
        </span>
        <span className="text-[length:var(--slide-label-size)] text-muted-foreground leading-tight">
          {unit}
        </span>
      </p>
    </div>
  )
}

/** One packet's view at a stage. Keyed by the packet, so each arrival flashes. */
function Readout({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div
      className="grid gap-1 whitespace-pre py-2 text-[length:var(--slide-support-size)] text-foreground leading-snug [animation:pipeline-arrive_900ms_ease-out]"
      key={id}
    >
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </span>
  )
}

/**
 * The bus under the stages. Each chip is one packet slot; useStream moves it and
 * writes the alias it is carrying, from the data attributes set here.
 */
function Track({
  packets,
  track,
}: {
  packets: Packet[]
  track: React.RefObject<HTMLDivElement | null>
}) {
  const aliases = Object.fromEntries(
    packets.map((packet, i) => [`data-alias${i}`, packet.alias])
  )
  // Enough slots that a packet's chip is free again before its next turn.
  const slots = Math.ceil(CROSSING / PERIOD) + 1
  return (
    <div className="relative h-14" ref={track}>
      <div className="absolute inset-x-0 top-1/2 border-[var(--slide-rule)] border-t border-dashed" />
      {STAGE_AT.map((at) => (
        <div
          className="absolute top-0 h-full border-[var(--slide-rule)] border-l"
          key={at}
          style={{ left: `${at * 100}%` }}
        />
      ))}
      {Array.from({ length: slots }, (_, slot) => (
        <span
          className="absolute top-1/2 border border-primary bg-background px-3 py-1 text-[length:var(--slide-label-size)] text-primary opacity-0 shadow-[var(--slide-halo)]"
          data-packet=""
          key={slot}
          {...aliases}
        />
      ))}
    </div>
  )
}
