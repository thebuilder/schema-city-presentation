"use client"

import dynamic from "next/dynamic"
import type { ComponentProps, ReactNode } from "react"
import type { ExampleCity as City, Frame } from "@/deck/examples/example-city"

// Loaded on its own so three stays out of the slides around it.
const ExampleCity = dynamic(
  () => import("@/deck/examples/example-city").then((module) => module.ExampleCity),
  { ssr: false }
)

/** Under the heading and across the rest of the slide. */
const FRAME: Frame = { left: -0.85, right: 0.85, bottom: -0.88, top: 0.3 }

/*
 * A staged example: one line at the top and the city across the whole slide,
 * with the slide's own pieces and labels standing in it. The camera, the lit
 * buildings and the pieces all follow the step, so what the slide says is
 * shown in the city rather than written beside it.
 */
export function StagedFrame({
  line,
  sub,
  ...city
}: {
  line: string
  /** A count or a short answer under the line, which may change with the step. */
  sub?: ReactNode
} & Omit<ComponentProps<typeof City>, "frame">) {
  return (
    <section className="relative h-full w-full overflow-hidden bg-background">
      <ExampleCity className="absolute inset-0" frame={FRAME} {...city} />
      {/* The city runs up behind the heading, so the heading sits on a fade of the page's own background. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-[linear-gradient(to_bottom,var(--background)_60%,transparent)] px-[var(--slide-padding-inline)] pt-[var(--slide-padding-block)] pb-[calc(var(--slide-padding-block)*2)]">
        <h2 className="text-balance font-bold text-[length:var(--slide-heading-size)] text-primary uppercase leading-[1.08] tracking-[-0.015em] [text-shadow:var(--slide-halo)]">
          {line}
        </h2>
        {sub ? (
          <p className="mt-4 font-bold text-[length:var(--slide-subheading-size)] text-foreground leading-tight [text-shadow:var(--slide-halo)]">
            {sub}
          </p>
        ) : null}
      </div>
    </section>
  )
}
