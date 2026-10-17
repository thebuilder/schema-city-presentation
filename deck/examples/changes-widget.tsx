"use client"

import type { SchemaGraph } from "@/deck/city/schema-city"
import { useStep } from "@/deck/city/use-step"
import { Evidence, ExampleFrame, Label } from "@/deck/examples/example-frame"
import type { ChangesExample } from "@/deck/examples/park-results"

export function ChangesWidget({
  graph,
  example,
  step,
}: {
  graph: SchemaGraph
  example: ChangesExample
  step?: number
}) {
  const opened = useStep(step) >= 1
  const stranger = example.causes.find((cause) => !cause.planned)
  return (
    <ExampleFrame
      graph={graph}
      line="What did my change do?"
      paint={
        opened && stranger
          ? { changes: example.kinds, focus: [stranger.key, ...stranger.effects], selected: stranger.key }
          : { changes: example.kinds }
      }
    >
      <Label>{example.summary}</Label>
      <ul className="flex flex-col gap-5">
        {example.causes.map((cause) => (
          <li
            className="grid grid-cols-[3.5rem_1fr] transition-opacity duration-500"
            key={cause.key}
            style={{ opacity: !opened || !cause.planned ? 1 : 0.25 }}
          >
            <span
              className="font-bold text-[length:var(--slide-body-size)] leading-tight"
              style={{ color: cause.planned ? "var(--primary)" : "var(--slide-signal)" }}
            >
              {cause.planned ? "[x]" : "[ ]"}
            </span>
            <span className="font-bold text-[length:var(--slide-body-size)] text-foreground leading-tight">
              {cause.name}
            </span>
            <span />
            <span className="text-[length:var(--slide-support-size)] text-muted-foreground leading-snug">
              {cause.line}
            </span>
          </li>
        ))}
      </ul>
      <Evidence shown={opened}>{stranger?.edits.join(", ") ?? " "}</Evidence>
    </ExampleFrame>
  )
}
