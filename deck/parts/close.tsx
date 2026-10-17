"use client"

import { useEffect, useRef } from "react"
import { useStill } from "@/deck/parts/beats"
import type { TerrainWorldOptions } from "@/deck/parts/terrain/world"

/*
 * The thank-you slide flies the terrain from thebuilder.dk, with the site's
 * ringed planet standing in as an icon above the words. The world is loaded
 * when the slide mounts, so three stays out of every other slide's bundle.
 *
 * The colours are the site's and not the theme's tokens, because the world
 * under the words is dark in both colour modes.
 */

// In canvas pixels, so the planet lines up with the text column below it.
const planet: TerrainWorldOptions["planet"] = { size: 300, x: 246, y: 200 }

export function Close() {
  const host = useRef<HTMLDivElement>(null)
  const still = useStill()

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
      })
      // Without WebGL the slide keeps its words on the plain background.
      .catch(() => undefined)

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

      <div className="absolute top-[22rem] left-[var(--slide-padding-inline)] flex flex-col gap-10">
        <h1 className="text-[length:var(--slide-title-size)] text-[#d9ffef] leading-none">
          Thank you
        </h1>
        <div className="flex flex-col gap-3 font-[family-name:var(--slide-font-mono)] text-[length:var(--slide-support-size)] text-[#87a39d]">
          <p className="text-[#86fadd]">
            dotnet add package TheBuilder.SchemaCity
          </p>
          <p>github.com/thebuilder/umbraco-schema-city</p>
          <p>umbraco.thebuilder.dk</p>
        </div>
      </div>
    </section>
  )
}
