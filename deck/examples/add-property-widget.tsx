"use client"

import type { SchemaGraph } from "@/deck/city/schema-city"
import { useStep } from "@/deck/city/use-step"
import type { Stage } from "@/deck/examples/example-city"
import type { AddPropertyExample } from "@/deck/examples/site-results"
import { Arc, Chip, type Point, Tag } from "@/deck/examples/stage-parts"
import { StagedFrame } from "@/deck/examples/staged-frame"

/*
 * A property about to be added to a composition. The camera starts on the whole
 * site, comes to the composition and draws the links Umbraco itself would list,
 * then follows inheritance to every type the property would land on, one after
 * another, and last runs the property down to the type that already has one by
 * that name, so the clash is a path you can follow rather than a claim.
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
      sub={
        current >= 3
          ? clashLine(example)
          : current >= 2
            ? example.totals
            : current >= 1
              ? `Umbraco lists ${example.direct.length} types`
              : null
      }
      paint={{
        selected: example.start,
        focus: current >= 2 ? all : current >= 1 ? direct : undefined,
        lit: current >= 3 ? clash : undefined,
      }}
    />
  )
}

const clashLine = (example: AddPropertyExample) =>
  example.collisions.length === 1
    ? `${example.collisions[0]?.name} already has a ${example.alias} property of its own`
    : `${example.collisions.length} types already have a ${example.alias} property`

function Scene({ stage, example, current }: { stage: Stage; example: AddPropertyExample; current: number }) {
  const { anchors, palette, still, labels } = stage
  const roof = (id: string): Point | null => {
    const anchor = anchors.get(id)
    return anchor ? [anchor.x, anchor.y, anchor.z] : null
  }
  const start = roof(example.start)
  if (!start) return null
  const above = (point: Point, lift = 1.2): Point => [point[0], point[1] + lift, point[2]]
  const clashing = current >= 3
  const clashes = new Set(example.collisions.map((type) => type.id))
  const viaOf = new Map(example.further.map((type) => [type.id, type.via]))
  return (
    <>
      {/* The composition and the type that uses it stand side by side, so their labels face away. */}
      <Tag at={above(start)} layer={labels} on={current >= 1} side="left">
        {example.startName}
        <Chip colour={palette.azure}>+ {example.alias}</Chip>
      </Tag>
      {example.direct.map((type, index) => {
        const to = roof(type.id)
        if (!to) return null
        return (
          <group key={type.id}>
            <Arc colour={palette.azure} delay={index * 0.3} from={start} on={current >= 1} still={still} to={to} />
            <Tag at={above(to)} delay={0.7 + index * 0.3} layer={labels} on={current >= 1} side="right">
              {type.name}
            </Tag>
          </group>
        )
      })}
      {example.further.map((type, index) => {
        const from = roof(type.via)
        const to = roof(type.id)
        if (!from || !to) return null
        const clash = clashing && clashes.has(type.id)
        return (
          <group key={type.id}>
            <Arc colour={palette.azure} delay={0.3 + index * 0.25} from={from} on={current >= 2} still={still} to={to} />
            <Tag at={above(to)} delay={clash ? 0 : 0.7 + index * 0.25} layer={labels} on={current >= 2} tone={clash ? "signal" : "plain"}>
              {type.name}
              {clash ? <Chip colour={palette.signal}>{example.alias}</Chip> : null}
            </Tag>
          </group>
        )
      })}
      {/* The way the new property would travel to the clash, redrawn over the reach. */}
      {example.collisions.map((type) => {
        const via = viaOf.get(type.id)
        const middle = via ? roof(via) : null
        const end = roof(type.id)
        if (!end) return null
        const legs: [Point, Point][] = middle && via !== example.start ? [[start, middle], [middle, end]] : [[start, end]]
        return legs.map(([from, to], leg) => (
          <Arc
            colour={palette.signal}
            delay={leg * 0.6}
            duration={0.6}
            from={from}
            key={`${type.id}-${leg}`}
            on={clashing}
            still={still}
            to={to}
            width={0.18}
          />
        ))
      })}
    </>
  )
}
