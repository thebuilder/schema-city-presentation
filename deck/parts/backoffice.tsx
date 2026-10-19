"use client"

import Image from "next/image"
import { useStep } from "@/deck/city/use-step"
import { Words } from "@/deck/parts/line"
import pageMeta from "@/public/backoffice/page-meta.webp"

/*
 * One screen of the real ct-baseline backoffice: Home page on its Metadata
 * tab, every property inherited from Page Meta. The room knows it at a glance.
 * The line lands a beat after the screen, and the click asks the question the
 * rest of the talk answers, over the very screen that cannot answer it.
 */

// After the room has had time to recognise the screen.
const LINE_DELAY = 1500

export const BACKOFFICE_STEPS = 2

export function Backoffice() {
  const asked = useStep() >= 1
  return (
    <section className="relative h-full w-full overflow-hidden bg-background">
      <Image
        alt="Home page on its Metadata tab in the Umbraco backoffice, every property inherited from Page Meta"
        className="absolute inset-0 h-full w-full object-cover object-top-left"
        placeholder="blur"
        priority
        sizes="100vw"
        src={pageMeta}
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent to-60% transition-opacity duration-500"
        style={{ opacity: asked ? 0 : 1 }}
      />
      <p
        className="absolute inset-x-[var(--slide-padding-inline)] bottom-[var(--slide-padding-block)] font-semibold text-[length:var(--slide-heading-size)] text-primary leading-[1.1] transition-opacity duration-500"
        data-slide-statement-text=""
        style={{ opacity: asked ? 0 : 1 }}
      >
        <Words delay={LINE_DELAY} text="This is how we see our content model." />
      </p>
      <div
        className="absolute inset-0 flex items-center justify-center bg-background/60 transition-opacity duration-500"
        style={{ opacity: asked ? 1 : 0 }}
      >
        <div
          className="max-w-[1320px] border border-primary bg-card px-20 py-16 shadow-[var(--slide-halo)]"
          data-slide-surface=""
        >
          <p className="text-balance font-bold text-[length:var(--slide-heading-size)] text-foreground uppercase leading-[1.1] [text-shadow:var(--slide-halo)]">
            What does a change to Page Meta reach?
          </p>
        </div>
      </div>
    </section>
  )
}
