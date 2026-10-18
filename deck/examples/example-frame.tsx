"use client"

import dynamic from "next/dynamic"
import type { ReactNode } from "react"
import type { CityPaint } from "@/deck/examples/example-city"
import type { SchemaGraph } from "@/deck/city/schema-city"

// Loaded on its own so three stays out of the slides around it.
const ExampleCity = dynamic(
  () => import("@/deck/examples/example-city").then((module) => module.ExampleCity),
  { ssr: false }
)

/*
 * Every example slide is the same picture: the site on the right, the question on
 * the left, and under it what Schema City answered. The gradient holds the sky
 * down behind the words, the way the place slide does.
 */
export function ExampleFrame({
  graph,
  paint,
  line,
  children,
}: {
  graph: SchemaGraph
  paint: CityPaint
  line: string
  children?: ReactNode
}) {
  return (
    <section className="relative h-full w-full overflow-hidden bg-background">
      <ExampleCity className="absolute inset-0" graph={graph} paint={paint} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/90 via-background/55 to-transparent" />
      <div className="absolute inset-y-0 left-0 flex w-[860px] flex-col gap-[var(--slide-content-gap)] px-[var(--slide-padding-inline)] py-[var(--slide-padding-block)]">
        <h2 className="text-balance font-bold text-[length:var(--slide-heading-size)] text-primary uppercase leading-[1.08] tracking-[-0.015em] [text-shadow:var(--slide-halo)]">
          {line}
        </h2>
        {children}
      </div>
    </section>
  )
}

/** A row label, small and spaced the way the theme sets its eyebrows. */
export function Label({ children, tone }: { children: ReactNode; tone?: "signal" }) {
  return (
    <span
      className="font-bold text-[length:var(--slide-label-size)] uppercase tracking-[var(--slide-label-tracking)]"
      style={{ color: tone === "signal" ? "var(--slide-signal)" : "var(--muted-foreground)" }}
    >
      {children}
    </span>
  )
}

/** What the app said, set as the evidence it is. */
export function Evidence({ children, shown = true }: { children: ReactNode; shown?: boolean }) {
  return (
    <p
      className="border-[color:var(--slide-signal)] border-l-4 pl-6 text-[length:var(--slide-support-size)] text-foreground leading-snug transition-opacity duration-500"
      style={{ opacity: shown ? 1 : 0 }}
    >
      {children}
    </p>
  )
}
