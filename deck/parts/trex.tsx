"use client"

import { useEffect, useRef } from "react"
import { useStep } from "@/deck/city/use-step"
import { useStill } from "@/deck/parts/beats"

/*
 * Daniel's pixel T-rex in the rain, the setup for the fsn slide after it. The
 * scene is its own page in public/trex, kept as he drew it and framed full
 * bleed, so the deck only tells it when to roar. It takes no pointer events,
 * which keeps the keyboard with the deck rather than with the frame.
 *
 * Step 0 is the storm. On step 1 the line fades in after a beat, and the roar
 * follows it, so the room reads the line and the T-rex answers.
 *
 * The storm plays with its rain and thunder, and the roar is a recording. The
 * deck asks for the sound once the frame has loaded, and the frame's audio is
 * allowed to start because the presenter has already pressed a key in the
 * deck. A screenshot stays silent.
 */
export const TREX_STEPS = 2

const LINE = "UI was perfected in 1993."

// Milliseconds after the click.
const LINE_AT = 1000
const ROAR_AT = 1400

export function Trex() {
  const step = useStep()
  const frame = useRef<HTMLIFrameElement>(null)
  const said = step >= 1
  const still = useStill()

  useEffect(() => {
    if (!said) {
      return
    }
    const post = (message: string) =>
      frame.current?.contentWindow?.postMessage(message, window.location.origin)
    // Asking again covers a deck opened straight on this slide, where the
    // first key press is the one that brings the roar. The ask has to happen
    // inside the key press, while the browser still counts it as one.
    if (!still) {
      post("sound")
    }
    const timer = window.setTimeout(() => post("roar"), still ? 0 : ROAR_AT)
    return () => window.clearTimeout(timer)
  }, [said, still])

  return (
    <section className="relative h-full w-full overflow-hidden bg-black">
      <iframe
        allow="autoplay"
        className="pointer-events-none absolute inset-0 h-full w-full border-0"
        onLoad={() => {
          if (!still) {
            frame.current?.contentWindow?.postMessage("sound", window.location.origin)
          }
        }}
        ref={frame}
        src="/trex/index.html"
        tabIndex={-1}
        title="A pixel T-rex roaring in a rainy night jungle"
      />
      <p
        className="absolute inset-x-0 bottom-[calc(var(--slide-footer-space)+3rem)] text-center font-bold text-[length:var(--slide-heading-size)] text-foreground uppercase"
        style={{
          opacity: said ? 1 : 0,
          textShadow: "0 0 0.4em #000, var(--slide-halo)",
          transition: still || !said ? "none" : `opacity 700ms ease-out ${LINE_AT}ms`,
        }}
      >
        {LINE}
      </p>
    </section>
  )
}
