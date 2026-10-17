"use client"

import dynamic from "next/dynamic"
import type { SchemaGraph } from "@/deck/city/schema-city"
import { Statement } from "@/deck/parts/line"

const ExampleCity = dynamic(
  () => import("@/deck/examples/example-city").then((module) => module.ExampleCity),
  { ssr: false }
)

/* The park booting above its one line, before anything on it is lit. */
export function ParkIntro({ graph, text }: { graph: SchemaGraph; text: string }) {
  return (
    <section className="relative h-full w-full overflow-hidden bg-background">
      <ExampleCity
        className="absolute inset-0"
        frame={{ left: -0.15, right: 0.95, bottom: -0.1, top: 0.92 }}
        graph={graph}
        paint={{}}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] px-[var(--slide-padding-inline)]">
        <Statement text={text} />
      </div>
    </section>
  )
}
