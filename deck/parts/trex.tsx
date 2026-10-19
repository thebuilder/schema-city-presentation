"use client"

import { useEffect, useRef } from "react"
import { useStep } from "@/deck/city/use-step"
import { Words } from "@/deck/parts/line"

/*
 * Daniel's pixel T-rex in the rain, the setup for the fsn slide after it. The
 * scene is its own page in public/trex, kept as he drew it and framed full
 * bleed, so the deck only tells it when to roar. It takes no pointer events,
 * which keeps the keyboard with the deck rather than with the frame.
 *
 * Step 0 is the storm. Step 1 is the roar and the line.
 */
export const TREX_STEPS = 2

const LINE = "UI was perfected in 1993."

export function Trex() {
  const step = useStep()
  const frame = useRef<HTMLIFrameElement>(null)
  const said = step >= 1

  useEffect(() => {
    if (said) {
      frame.current?.contentWindow?.postMessage("roar", window.location.origin)
    }
  }, [said])

  return (
    <section className="relative h-full w-full overflow-hidden bg-black">
      <iframe
        className="pointer-events-none absolute inset-0 h-full w-full border-0"
        ref={frame}
        src="/trex/index.html"
        tabIndex={-1}
        title="A pixel T-rex roaring in a rainy night jungle"
      />
      {said ? (
        <p
          className="absolute inset-x-0 bottom-[calc(var(--slide-footer-space)+3rem)] text-center font-bold text-[length:var(--slide-heading-size)] text-foreground uppercase"
          style={{ textShadow: "0 0 0.4em #000, var(--slide-halo)" }}
        >
          <Words delay={600} text={LINE} />
        </p>
      ) : null}
    </section>
  )
}
