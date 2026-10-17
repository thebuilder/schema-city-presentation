"use client"

import type { SchemaGraph } from "@/deck/city/schema-city"
import { useStep } from "@/deck/city/use-step"
import { Evidence, ExampleFrame, Label } from "@/deck/examples/example-frame"
import type { ReachExample } from "@/deck/examples/park-results"

export function ReachWidget({
  graph,
  example,
  step,
}: {
  graph: SchemaGraph
  example: ReachExample
  step?: number
}) {
  const checked = useStep(step) >= 1
  return (
    <ExampleFrame
      graph={graph}
      line={`What does a change to ${example.startName} reach?`}
      paint={
        checked
          ? { lit: example.collision.ids, focus: example.lit, arcs: example.lit }
          : { lit: example.lit, selected: example.start, arcs: example.lit }
      }
    >
      <p className="font-bold text-[length:var(--slide-subheading-size)] text-foreground leading-tight">
        {example.totals}
      </p>
      <ul className="flex flex-col gap-4">
        {example.paths.map((path) => (
          <li className="text-[length:var(--slide-support-size)] text-muted-foreground leading-snug" key={path}>
            {path}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-3 transition-opacity duration-500" style={{ opacity: checked ? 1 : 0 }}>
        <Label>+ {example.alias}</Label>
        <Evidence>{example.collision.line}</Evidence>
      </div>
    </ExampleFrame>
  )
}
