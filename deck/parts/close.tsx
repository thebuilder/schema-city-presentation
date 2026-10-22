"use client"

import { useEffect, useRef, useState } from "react"
import { Scramble } from "@/components/scramble"
import { useStill } from "@/deck/parts/beats"
import type { TerrainWorldOptions } from "@/deck/parts/terrain/world"

/*
 * The closing slide flies the terrain from thebuilder.dk, with the site's
 * ringed planet standing in as an icon across from the words. The world is loaded
 * when the slide mounts, so three stays out of every other slide's bundle.
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
// The links follow once the title has resolved.
const LINKS_AT = AFTER_POWER_ON + 700
const LINE_GAP = 260

const links = [
  "thebuilder.dk",
  "umbraco.thebuilder.dk",
]

/**
 * Afterglow's scramble, started `delay` ms after the world lights. Until then
 * the line holds its place invisibly, so nothing below it moves when it lands.
 */
function Reveal({ delay, still, text }: { delay: number; still: boolean; text: string }) {
  const [due, setDue] = useState(still)
  useEffect(() => {
    if (still) {
      setDue(true)
      return
    }
    const timer = window.setTimeout(() => setDue(true), delay)
    return () => window.clearTimeout(timer)
  }, [delay, still])
  if (!due) {
    return <span className="invisible">{text}</span>
  }
  return still ? <span>{text}</span> : <Scramble className="font-[family-name:inherit]" text={text} />
}

export function Close() {
  const host = useRef<HTMLDivElement>(null)
  const still = useStill()
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

    import("@/deck/parts/terrain/world")
      .then(({ createTerrainWorld }) => {
        if (cancelled) {
          return
        }
        const world = createTerrainWorld(element, { planet, still })
        teardown = world.dispose
        setLit(true)
      })
      // Without WebGL the slide keeps its words on the plain background.
      .catch(() => setLit(true))

    return () => {
      cancelled = true
      teardown?.()
    }
  }, [still])

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
            <Reveal delay={AFTER_POWER_ON} still={still} text="Thank you" />
          </h1>
          <div className="flex flex-col gap-3 font-[family-name:var(--slide-font-mono)] text-[length:var(--slide-support-size)] text-[#87a39d]">
            {links.map((line, index) => (
              <p className={index === 0 ? "text-[#86fadd]" : ""} key={line}>
                <Reveal delay={LINKS_AT + index * LINE_GAP} still={still} text={line} />
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
