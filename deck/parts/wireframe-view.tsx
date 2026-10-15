"use client"

import { useState } from "react"
import { useSlideStepper } from "@thebuilder/deckard-core/components"
import { CityView, type RenderStats } from "@/deck/city/city-view"
import { Code } from "@/deck/city/code"
import type { Token } from "@/deck/city/highlight"
import type { Placement, SchemaGraph } from "@/deck/city/schema-city"

type Subject = { graph: SchemaGraph; placements: Placement[]; types: number }

const STEPS = [
  { distance: 0.55, label: "one type", subject: "single", wireframe: true },
  { distance: 0.55, label: "300 types", subject: "city", wireframe: true },
  // Close enough that the lit edges read as lines rather than as dots.
  { distance: 0.24, label: "the glow", subject: "city", wireframe: false },
] as const

const count = new Intl.NumberFormat("en-GB")

export function WireframeView({
  single,
  city,
  instancing,
  glow,
}: {
  single: Subject
  city: Subject
  instancing: Token[][]
  glow: Token[][]
}) {
  const stepper = useSlideStepper()
  const step = STEPS[Math.min(stepper?.currentStep ?? 0, STEPS.length - 1)]
  const subject = step.subject === "single" ? single : city
  const [stats, setStats] = useState<RenderStats | null>(null)

  const rows: [string, number | undefined][] = [
    ["document types", subject.types],
    ["instances", stats?.instances],
    ["triangles", stats?.triangles],
    ["instanced meshes", stats?.meshes],
  ]

  return (
    <section className="grid h-full grid-cols-[720px_1fr] gap-12">
      <div className="flex min-h-0 flex-col justify-center gap-[var(--slide-content-gap)]">
        <div className="flex flex-col gap-2">
          <p
            className="font-semibold text-[length:var(--slide-label-size)] text-muted-foreground uppercase tracking-[var(--slide-label-tracking)]"
            data-slide-eyebrow=""
          >
            {step.label}
          </p>
          <p className="flex items-baseline gap-6">
            <span
              className="font-bold text-[length:var(--slide-figure-size)] text-primary tabular-nums leading-none"
              data-stat-value=""
            >
              {stats ? stats.calls : "--"}
            </span>
            <span className="text-[length:var(--slide-body-size)] text-foreground">
              draw calls
            </span>
          </p>
        </div>
        {/* The shader needs the room on the last step, and the count it would show
            is the one the step before already made. */}
        <dl
          className="grid grid-cols-[1fr_auto] gap-x-8 gap-y-1 text-[length:var(--slide-support-size)]"
          hidden={!step.wireframe}
        >
          {rows.map(([label, value]) => (
            <div className="contents" key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right text-foreground tabular-nums">
                {value === undefined ? "--" : count.format(value)}
              </dd>
            </div>
          ))}
        </dl>
        <Code
          caption={
            step.wireframe ? "BuildingMeshes.tsx" : "fragment shader"
          }
          lines={step.wireframe ? instancing : glow}
        />
      </div>
      <CityView
        className="min-h-0"
        distance={step.distance}
        graph={subject.graph}
        key={step.subject}
        onStats={setStats}
        orbit={step.subject === "single" ? 0.25 : 0.06}
        pitch={step.subject === "single" ? 0.35 : 0.8}
        placements={subject.placements}
        wireframe={step.wireframe}
      />
    </section>
  )
}
