"use client"

import { useEffect, useRef, useState } from "react"
import { useBeat, useStill } from "@/deck/parts/beats"

/*
 * The reflection before the thank you, and the T-rex slide's callback. The
 * same animal stands in the visitor centre rotunda, roars once, and the banner
 * over the hall falls in front of it, as in the last shot of the film. The
 * scene is its own page, public/trex/rotunda.html, next to the storm it shares
 * the rig with.
 *
 * The first line waits for the scene to say the banner has landed, so the room
 * reads the banner and then the line. The second line is the presenter's click,
 * since the pause between the two is where the story gets told.
 */
const LINES = ["UI wasn't perfected in 1993.", "It just took 33 years to try it again."]

// Milliseconds after the frame loads before the roar is cued, so the hall is
// seen standing still first.
const START_AT = 900
// After the banner lands.
const LINE_AT = 500
// In case the scene never reports, the line still arrives.
const FALLBACK_AT = 9000
const FADE_MS = 800

export function Rotunda() {
  const frame = useRef<HTMLIFrameElement>(null)
  const still = useStill()
  const beat = useBeat([0])
  const [loaded, setLoaded] = useState(false)
  const [landed, setLanded] = useState(still)

  useEffect(() => {
    const timer = window.setTimeout(() => setLoaded(true), 1500)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (still) {
      setLanded(true)
      return
    }
    let lineTimer = 0
    const onMessage = (event: MessageEvent) => {
      if (event.source === frame.current?.contentWindow && event.data === "landed") {
        lineTimer = window.setTimeout(() => setLanded(true), LINE_AT)
      }
    }
    window.addEventListener("message", onMessage)
    const fallback = window.setTimeout(() => setLanded(true), FALLBACK_AT)
    return () => {
      window.removeEventListener("message", onMessage)
      window.clearTimeout(fallback)
      window.clearTimeout(lineTimer)
    }
  }, [still])

  useEffect(() => {
    if (still || !loaded) {
      return
    }
    const timer = window.setTimeout(
      () => frame.current?.contentWindow?.postMessage("start", window.location.origin),
      START_AT
    )
    return () => window.clearTimeout(timer)
  }, [still, loaded])

  const shown = [landed, landed && beat >= 1]

  return (
    <section className="relative h-full w-full overflow-hidden bg-black">
      <iframe
        allow="autoplay"
        className="pointer-events-none absolute inset-0 h-full w-full border-0"
        onLoad={() => {
          setLoaded(true)
          if (!still) {
            frame.current?.contentWindow?.postMessage("sound", window.location.origin)
          }
        }}
        ref={frame}
        src={still ? "/trex/rotunda.html?still" : "/trex/rotunda.html"}
        style={{
          opacity: still || loaded ? 1 : 0,
          transition: still ? "none" : `opacity ${FADE_MS}ms ease-out`,
        }}
        tabIndex={-1}
        title="A pixel T-rex roaring in the visitor centre rotunda as a banner falls"
      />
      {/* Clear of the banner on the floor, which takes the bottom tenth. */}
      <div className="absolute inset-x-0 bottom-[150px] flex flex-col items-center gap-4">
        {LINES.map((line, index) => (
          <p
            className="text-center font-bold text-[length:var(--slide-heading-size)] text-foreground uppercase"
            key={line}
            style={{
              opacity: shown[index] ? 1 : 0,
              textShadow: "0 0 0.4em #000, 0 0 0.15em #000, var(--slide-halo)",
              transition: still ? "none" : "opacity 700ms ease-out",
            }}
          >
            {line}
          </p>
        ))}
      </div>
    </section>
  )
}
