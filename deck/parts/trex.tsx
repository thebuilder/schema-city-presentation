"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useStill } from "@/deck/parts/beats"

/*
 * Daniel's pixel T-rex in the rain, the setup for the fsn slide after it. The
 * scene is its own page in public/trex, kept as he drew it and framed full
 * bleed, so the deck only tells it when to roar. It takes no pointer events,
 * which keeps the keyboard with the deck rather than with the frame.
 *
 * The slide needs no click. The storm is up as it arrives, the line fades in
 * after a beat, and the roar follows it, so the room reads the line and the
 * T-rex answers.
 *
 * The storm plays with its rain and thunder, and the roar is a recording. The
 * deck asks for the sound once the frame has loaded, and the frame's audio is
 * allowed to start because the presenter pressed a key to reach the slide. A
 * screenshot stays silent.
 */
const LINE = "UI was perfected in 1993."

// Milliseconds after the slide arrives.
const LINE_AT = 1000
const ROAR_AT = 1400

export function Trex() {
  const frame = useRef<HTMLIFrameElement>(null)
  const still = useStill()
  const [said, setSaid] = useState(still)

  useLayoutEffect(() => {
    if (still) {
      setSaid(true)
      return
    }
    // One frame at zero opacity first, so the fade has somewhere to start.
    const frameId = requestAnimationFrame(() => setSaid(true))
    return () => cancelAnimationFrame(frameId)
  }, [still])

  useEffect(() => {
    const timer = window.setTimeout(
      () => frame.current?.contentWindow?.postMessage("roar", window.location.origin),
      still ? 0 : ROAR_AT,
    )
    return () => window.clearTimeout(timer)
  }, [still])

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
          transition: still ? "none" : `opacity 700ms ease-out ${LINE_AT}ms`,
        }}
      >
        {LINE}
      </p>
    </section>
  )
}
