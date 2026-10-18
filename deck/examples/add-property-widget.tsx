"use client"

import type { SchemaGraph } from "@/deck/city/schema-city"
import { useStep } from "@/deck/city/use-step"
import type { Stage } from "@/deck/examples/example-city"
import type { AddPropertyExample } from "@/deck/examples/site-results"
import { Arc, type Point, Tag } from "@/deck/examples/stage-parts"
import { StagedFrame } from "@/deck/examples/staged-frame"

/*
 * A property about to be added to a composition. The camera starts on the whole
 * site, comes to the composition and draws the links Umbraco itself would list,
 * then follows inheritance to every type the property would land on, one after
 * another, and last stops on the type that already has a property by that name.
 */
export function AddPropertyWidget({
  graph,
  example,
  step,
}: {
  graph: SchemaGraph
  example: AddPropertyExample
  step?: number
}) {
  const current = useStep(step)
  const direct = [example.start, ...example.direct.map((type) => type.id)]
  const all = [...direct, ...example.further.map((type) => type.id)]
  const clash = example.collisions.map((type) => type.id)
  return (
    <StagedFrame
      extras={(stage) => <Scene current={current} example={example} stage={stage} />}
      frameOn={current >= 2 ? all : current >= 1 ? direct : undefined}
      graph={graph}
      line={`Can I add a ${example.alias} property to ${example.startName}?`}
      sub={current >= 2 ? example.totals : current >= 1 ? `Umbraco lists ${example.direct.length} types` : null}
      paint={{
        selected: example.start,
        focus: current >= 2 ? all : current >= 1 ? direct : undefined,
        lit: current >= 3 ? clash : undefined,
      }}
    />
  )
}

function Scene({ stage, example, current }: { stage: Stage; example: AddPropertyExample; current: number }) {
  const { anchors, palette, still, labels } = stage
  const roof = (id: string): Point | null => {
    const anchor = anchors.get(id)
    return anchor ? [anchor.x, anchor.y, anchor.z] : null
  }
  const start = roof(example.start)
  if (!start) return null
  const above = (point: Point, lift = 1.2): Point => [point[0], point[1] + lift, point[2]]
  return (
    <>
      {example.direct.map((type, index) => {
        const to = roof(type.id)
        if (!to) return null
        return (
          <group key={type.id}>
            <Arc colour={palette.azure} delay={index * 0.3} from={start} on={current >= 1} still={still} to={to} />
            <Tag at={above(to)} delay={0.7 + index * 0.3} layer={labels} on={current >= 1}>
              {type.name}
            </Tag>
          </group>
        )
      })}
      {example.further.map((type, index) => {
        const from = roof(type.via)
        const to = roof(type.id)
        if (!from || !to) return null
        return (
          <Arc
            colour={palette.azure}
            delay={0.3 + index * 0.25}
            from={from}
            key={type.id}
            on={current >= 2}
            still={still}
            to={to}
          />
        )
      })}
      {example.collisions.map((type) => {
        const at = roof(type.id)
        return at ? (
          <Tag at={above(at, 1.6)} delay={0.4} key={type.id} layer={labels} on={current >= 3} tone="signal">
            {type.name} already has {example.alias}
          </Tag>
        ) : null
      })}
    </>
  )
}
