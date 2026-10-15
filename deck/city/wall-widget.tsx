"use client"

import { useMemo } from "react"
import { SchemaTable, tableRows } from "@/deck/city/schema-table"
import { demoGraph, type SchemaGraph } from "@/deck/city/schema-city"
import { useStep } from "@/deck/city/use-step"

/** Step 0 is the wall alone. Step 1 puts the question over it. */
export const WALL_STEPS = 2

export function WallWidget({
  graph = demoGraph,
  question = "What breaks if you change SEO Composition?",
  step,
}: {
  graph?: SchemaGraph
  question?: string
  step?: number
}) {
  const current = useStep(step)
  const rows = useMemo(() => tableRows(graph), [graph])
  const asked = current >= 1

  return (
    <div className="relative h-full w-full bg-background">
      <SchemaTable graph={graph} rows={rows} />
      <div
        className="absolute inset-0 flex items-center justify-center bg-background/55 transition-opacity duration-500"
        style={{ opacity: asked ? 1 : 0 }}
      >
        <div
          className="max-w-[1320px] border border-primary bg-card px-20 py-16 shadow-[var(--slide-halo)]"
          data-slide-surface=""
        >
          <p className="text-balance font-bold text-[length:var(--slide-heading-size)] text-foreground uppercase leading-[1.1] [text-shadow:var(--slide-halo)]">
            {question}
          </p>
        </div>
      </div>
    </div>
  )
}
