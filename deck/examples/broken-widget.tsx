"use client"

import type { SchemaGraph } from "@/deck/city/schema-city"
import { useStep } from "@/deck/city/use-step"
import { Evidence, ExampleFrame, Label } from "@/deck/examples/example-frame"
import type { BrokenExample } from "@/deck/examples/park-results"

export function BrokenWidget({
  graph,
  example,
  step,
}: {
  graph: SchemaGraph
  example: BrokenExample
  step?: number
}) {
  const current = useStep(step)
  const focus = current > 0 ? example.focus[current - 1] : undefined
  return (
    <ExampleFrame
      graph={graph}
      line="What's broken?"
      paint={focus ? { lit: focus.ids, selected: focus.ids[0] } : { lit: example.lit }}
    >
      <ul className="flex flex-col gap-4">
        {example.rows.map((row) => (
          <li
            className="flex flex-col transition-opacity duration-500"
            key={row.label}
            style={{ opacity: !focus || row.ids.some((id) => focus.ids.includes(id)) ? 1 : 0.25 }}
          >
            <Label tone="signal">{row.label}</Label>
            <span className="text-[length:var(--slide-support-size)] text-foreground leading-tight">
              {row.names.join(", ")}
            </span>
          </li>
        ))}
      </ul>
      <Evidence shown={focus !== undefined}>{focus?.summary ?? " "}</Evidence>
    </ExampleFrame>
  )
}
