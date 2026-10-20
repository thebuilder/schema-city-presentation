"use client"

import { useEffect, useRef, useState } from "react"
import { useStill } from "@/deck/parts/beats"

/*
 * Where to read more, as the room will find it: the hero of
 * schema-city.thebuilder.dk, rebuilt from @thebuilder/umbraco-docs so it is
 * the docs site's own particle logo rather than a screenshot of it. It keeps
 * the docs family's violet on purpose, inside a browser frame, so it reads as
 * another site and not as part of the deck.
 *
 * The copy and the logo are the hub's entry for the package, in
 * thebuilder/umbraco-docs apps/hub/src/packages.ts.
 */
const SITE = "schema-city.thebuilder.dk"
const SUMMARY =
  "Shows your Document Types as a city in the backoffice, with the links between them, and flags schema problems before they ship."
const INSTALL = "dotnet add package TheBuilder.SchemaCity"
const LOGO = "/docs/schema-city.svg"

// The docs family's dark theme, from @thebuilder/umbraco-docs styles/landing.css.
const ACCENT = "#a78bfa"
const GRADIENT = "linear-gradient(105deg, #60a5fa, #a78bfa 52%, #f472b6)"

export function Docs() {
  const still = useStill()
  const canvas = useRef<HTMLCanvasElement>(null)
  const art = useRef<HTMLDivElement>(null)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    const target = canvas.current
    if (!target || !art.current) {
      return
    }
    let stop: (() => void) | undefined
    let gone = false
    // The hero needs WebGPU, so it loads only in the browser, once the slide is up.
    import("@thebuilder/umbraco-docs/hero").then(({ startHeroParticles }) => {
      if (gone) {
        return
      }
      stop = startHeroParticles(target, {
        anchor: art.current ?? undefined,
        logo: LOGO,
        onFallback: () => setFallback(true),
      })
    })
    return () => {
      gone = true
      stop?.()
    }
  }, [])

  return (
    <section className="flex h-full w-full items-center justify-center">
      <div
        className="flex h-[900px] w-[1640px] flex-col overflow-hidden rounded-[14px] border border-white/15 shadow-[0_30px_120px_rgba(0,0,0,0.6)]"
        style={{ background: "#09090b", fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif" }}
      >
        <div className="flex items-center gap-2 border-white/10 border-b bg-[#18181b] px-6 py-4">
          <span className="size-3.5 rounded-full bg-white/20" />
          <span className="size-3.5 rounded-full bg-white/20" />
          <span className="size-3.5 rounded-full bg-white/20" />
          <span className="ml-6 rounded-md bg-white/8 px-5 py-1.5 font-mono text-[1.15rem] text-white/70">
            {SITE}
          </span>
        </div>

        <div className="relative flex-1">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-[-10%] top-[-30%] h-[130%]"
            style={{
              background: `radial-gradient(ellipse at top, color-mix(in oklab, ${ACCENT} 24%, transparent), transparent 70%)`,
            }}
          />
          <canvas
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full"
            ref={canvas}
          />

          <div className="relative grid h-full grid-cols-[1.15fr_1fr] items-center gap-16 px-24">
            <div className="flex flex-col items-start gap-9">
              <p className="font-bold text-[1.1rem] uppercase tracking-[0.1em]" style={{ color: ACCENT }}>
                Umbraco package
              </p>
              {/* A paragraph, since the deck's theme dresses every heading in its
                  own face and glow, and this is the docs site's title. */}
              <p className="m-0 font-semibold text-[6.5rem] text-white leading-[1.02] tracking-[-0.02em]">
                Schema{" "}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: GRADIENT }}>
                  City
                </span>
              </p>
              <p className="max-w-[40rem] text-[1.75rem] text-white/80 leading-[1.55]">{SUMMARY}</p>
              <div className="flex gap-4">
                <span
                  className="rounded-[0.5rem] px-7 py-3.5 font-semibold text-[1.35rem] text-[#09090b]"
                  style={{ background: ACCENT }}
                >
                  Get started
                </span>
                <span className="rounded-[0.5rem] border border-white/20 px-7 py-3.5 font-semibold text-[1.35rem] text-white">
                  GitHub
                </span>
              </div>
              <div className="flex items-center gap-4 rounded-[0.5rem] border border-white/15 bg-white/5 px-6 py-3.5 font-mono text-[1.3rem]">
                <span className="text-white/50">$</span>
                <code className="text-white">{INSTALL}</code>
              </div>
              <p className="text-[1.2rem] text-white/60">Umbraco 17 and 18 · .NET 10</p>
            </div>

            {/* Where the particle logo forms, and the still logo when it cannot. */}
            <div className="relative h-[560px]" ref={art}>
              {fallback || still ? (
                // biome-ignore lint/performance/noImgElement: a fixed logo standing in for the particles
                <img alt="" className="absolute inset-[5%] h-[90%] w-[90%] object-contain" src={LOGO} />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
