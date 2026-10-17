"use client"

import dynamic from "next/dynamic"
import { Statement } from "@/deck/parts/line"

// Loaded on its own so three stays out of the slides around it.
const PlaceCity = dynamic(
  () => import("@/deck/parts/place-city").then((module) => module.PlaceCity),
  { ssr: false }
)

/*
 * The line the talk turns on, said over the thing it means: the demo schema
 * booting as Schema City draws it, circling slowly behind the words.
 */
export function Place({ text }: { text: string }) {
  return (
    <section className="relative h-full w-full overflow-hidden bg-background">
      <PlaceCity className="absolute inset-0" />
      {/* Holds the sky behind the line down, so the words win over the roofs
          that drift under them as the camera turns. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/85 via-background/40 to-transparent" />
      <div className="pointer-events-none absolute inset-0 px-[var(--slide-padding-inline)]">
        <Statement text={text} />
      </div>
    </section>
  )
}
