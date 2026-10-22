"use client"

import { useIsPresenterPreview } from "@thebuilder/deckard-core/components"
import { useEffect, useRef, useState } from "react"
import { useStill } from "@/deck/parts/beats"
import { Words } from "@/deck/parts/line"
import styles from "@/deck/parts/line.module.css"
import { preloadMusic, startMusic } from "@/deck/parts/terrain/music"
import type { TerrainWorldOptions } from "@/deck/parts/terrain/world"

/*
 * The closing slide flies the terrain from thebuilder.dk, with the site's
 * ringed planet standing in as an icon across from the words, its wireframes
 * drawing themselves in along the valley, and its soundtrack playing. The
 * world is loaded when the slide mounts, so three stays out of every other
 * slide's bundle. The track is fetched as the deck loads, so it starts on the
 * key press that reaches the slide. A preview or a capture stays silent.
 *
 * The colours are the site's and not the theme's tokens, because the world
 * under the words is dark in both colour modes.
 */

// In canvas pixels. Right of the sun and clear of the text column, so it can
// be drawn large.
const planet: TerrainWorldOptions["planet"] = { size: 620, x: 1440, y: 330 }

// The words wait for the screen to finish powering on (1.4s in world.ts), so
// they land on the lit world rather than in the dark.
const AFTER_POWER_ON = 1300
// The links follow once both words of the line have landed.
const LINKS_AT = AFTER_POWER_ON + 700
const LINE_GAP = 260

// Fetched with the deck rather than with the slide, so the first bars are not late.
if (typeof window !== "undefined") {
  preloadMusic()
}

const links = [
  "thebuilder.dk",
  "umbraco.thebuilder.dk",
]

export function Close() {
  const host = useRef<HTMLDivElement>(null)
  const still = useStill()
  const preview = useIsPresenterPreview()
  // Counted from the world existing, not from the slide mounting, because the
  // world is imported first and the power-on starts only once it is built.
  const [lit, setLit] = useState(false)

  useEffect(() => {
    const element = host.current
    if (!element) {
      return
    }
    let cancelled = false
    let teardown: (() => void) | undefined
    const music = still || preview ? null : startMusic()

    import("@/deck/parts/terrain/world")
      .then(({ createTerrainWorld }) => {
        if (cancelled) {
          return
        }
        const world = createTerrainWorld(element, { music, planet, still })
        teardown = world.dispose
        setLit(true)
      })
      // Without WebGL the slide keeps its words on the plain background.
      .catch(() => setLit(true))

    return () => {
      cancelled = true
      teardown?.()
      music?.stop()
    }
  }, [preview, still])

  return (
    <section className="relative h-full w-full overflow-hidden bg-[#05090a]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        ref={host}
      />

      {lit || still ? (
        <div className="absolute top-[24rem] left-[var(--slide-padding-inline)] flex flex-col gap-12">
          <h1 className="text-[length:var(--slide-title-size)] text-[#d9ffef] leading-none">
            <Words delay={still ? 0 : AFTER_POWER_ON} text="Thank you" />
          </h1>
          <div className="flex flex-col gap-3 font-[family-name:var(--slide-font-mono)] text-[length:var(--slide-support-size)] text-[#87a39d]">
            {links.map((line, index) => (
              <p
                className={`${still ? styles.still : styles.word} ${index === 0 ? "text-[#86fadd]" : ""}`}
                key={line}
                style={{ animationDelay: `${LINKS_AT + index * LINE_GAP}ms` }}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
