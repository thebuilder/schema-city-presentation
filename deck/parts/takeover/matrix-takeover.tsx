"use client"

import { isCapturing } from "@thebuilder/deckard-core"
import { useIsPresenterPreview } from "@thebuilder/deckard-core/components"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { playCue } from "@/deck/parts/takeover/cue"
import type { Takeover } from "@/deck/parts/takeover/engine"
import { resolveColour, type TextBox } from "@/deck/parts/takeover/glyphs"
import { claimTakeover } from "@/deck/parts/takeover/takeover-state"
import { diveInto, timeline, wakeLines } from "@/deck/parts/takeover/timeline"

/*
 * live      the full sequence, from the corporate slide to the settled title
 * idle      the settled title over drifting rain, for stepping back to it
 * recording the full sequence, but driven a frame at a time from outside
 * fallback  no WebGPU, so the recording of the sequence plays instead
 * still     the settled title and nothing moving: presenter preview, capture
 */
type Mode = "live" | "idle" | "recording" | "fallback" | "still"

declare global {
  interface Window {
    // Set while ?record is on the URL. scripts/record-takeover.mjs drives it.
    takeoverRecorder?: { seek: (time: number) => Promise<void> }
  }
}

export const fallbackVideo = "/takeover/takeover.webm"

const scrambleSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+<>"

function seeded(index: number) {
  const x = Math.sin(index * 91.7 + 13.1) * 43_758.545_3
  return x - Math.floor(x)
}

// How many characters of `text` are typed `time` seconds after `start`.
function typed(text: string, start: number, time: number, rate: number) {
  return Math.max(0, Math.min(text.length, Math.floor((time - start) * rate)))
}

function scramble(text: string, start: number, time: number) {
  return text
    .split("")
    .map((character, index) => {
      if (character === " ") {
        return " "
      }
      const resolves = start + index * 0.07 + seeded(index) * 0.25
      if (time >= resolves) {
        return character
      }
      const roll = Math.floor(time * 24 + index * 7)
      return scrambleSet[Math.floor(seeded(roll) * scrambleSet.length)]
    })
    .join("")
}

function offsetWithin(element: HTMLElement, root: HTMLElement) {
  let left = 0
  let top = 0
  let node: HTMLElement | null = element
  while (node && node !== root) {
    left += node.offsetLeft
    top += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return { left, top }
}

function textBox(element: HTMLElement, root: HTMLElement, text: string): TextBox {
  const style = getComputedStyle(element)
  const { left, top } = offsetWithin(element, root)
  return {
    font: `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
    left,
    letterSpacing: style.letterSpacing === "normal" ? "0px" : style.letterSpacing,
    lineHeight: Number.parseFloat(style.lineHeight),
    text,
    top,
  }
}

function pickMode(isPreview: boolean, claimed: boolean): Mode {
  if (isPreview || isCapturing()) {
    return "still"
  }
  if (new URLSearchParams(window.location.search).has("record")) {
    return "recording"
  }
  return claimed ? "live" : "idle"
}

export function MatrixTakeover({
  corporate,
  credits,
  title,
}: {
  corporate: ReactNode
  credits: string
  title: string
}) {
  const isPreview = useIsPresenterPreview()
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const corporateRef = useRef<HTMLDivElement>(null)
  const wakeRefs = useRef<(HTMLParagraphElement | null)[]>([])
  const titleRef = useRef<HTMLHeadingElement>(null)
  const creditsRef = useRef<HTMLParagraphElement>(null)
  // Strict mode runs effects twice, and the claim must be spent only once.
  const claim = useRef<boolean | null>(null)
  const [mode, setMode] = useState<Mode | null>(null)

  useEffect(() => {
    if (claim.current === null) {
      claim.current = claimTakeover()
    }
    setMode(pickMode(isPreview, claim.current))
  }, [isPreview])

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    const slide = corporateRef.current?.querySelector("svg")
    const titleElement = titleRef.current
    const creditsElement = creditsRef.current
    const wakeElements = wakeRefs.current.filter(
      (element): element is HTMLParagraphElement => element !== null
    )
    if (
      !(mode && root && canvas && slide && titleElement && creditsElement) ||
      wakeElements.length !== wakeLines.length
    ) {
      return
    }
    if (mode === "still" || mode === "fallback") {
      return
    }

    let disposed = false
    let takeover: Takeover | undefined
    let stopCue: (() => void) | undefined
    let shown = false

    const onFrame = (time: number) => {
      if (!shown) {
        shown = true
        canvas.style.opacity = "1"
        corporateRef.current?.style.setProperty("opacity", "0")
      }
      wakeLines.forEach((line, index) => {
        const element = wakeRefs.current[index]
        if (!element) {
          return
        }
        const start = timeline.wakeStart + index * 1.4
        const count = typed(line, start, time, 16)
        const typing = count < line.length || index === wakeLines.length - 1
        const cursor = typing && time >= start && Math.floor(time * 2.5) % 2 === 0
        element.textContent = `${line.slice(0, count)}${cursor ? "█" : ""}`
        // The shader draws the prompt from here, to dive into it.
        element.style.opacity = time >= timeline.diveStart ? "0" : "1"
      })
      const titleOn = time >= timeline.titleStart
      titleElement.style.opacity = titleOn ? "1" : "0"
      titleElement.textContent = titleOn
        ? scramble(title, timeline.titleStart, time)
        : title
      creditsElement.style.opacity = time >= timeline.creditsStart ? "1" : "0"
      creditsElement.textContent = credits.slice(
        0,
        typed(credits, timeline.creditsStart, time, 40)
      )
    }

    const style = getComputedStyle(root)
    const ink = resolveColour(style.getPropertyValue("--primary"), "#86fadd")
    const ground = resolveColour(style.getPropertyValue("--background"), "#05090a")
    const bright = [
      ink[0] + (1 - ink[0]) * 0.65,
      ink[1] + (1 - ink[1]) * 0.65,
      ink[2] + (1 - ink[2]) * 0.65,
      1,
    ] as const

    // The title is invisible but laid out, so the mask lines up with it.
    if (mode !== "idle") {
      titleElement.style.opacity = "0"
      creditsElement.style.opacity = "0"
    }

    // A tick's grace lets strict mode's throwaway mount unmount before it
    // ever asks for a device.
    // The engine and its shader load on this slide only. That also keeps the
    // .wgsl import out of the module graph deckard validate walks in Node.
    const start = new Promise((resolve) => setTimeout(resolve, 0)).then(async () => {
      if (disposed) {
        throw new Error("unmounted")
      }
      const { createTakeover } = await import("@/deck/parts/takeover/engine")
      return createTakeover({
        canvas,
        colours: { bright, ground, ink },
        monoFamily: getComputedStyle(titleElement).fontFamily,
        onFrame,
        readback: mode === "recording",
        slide,
        diveInto,
        titles: [textBox(titleElement, root, title)],
        wake: wakeElements.map((element, index) =>
          textBox(element, root, wakeLines[index] ?? "")
        ),
      })
    })

    start
      .then((created) => {
        if (disposed) {
          created.dispose()
          return
        }
        takeover = created
        if (mode === "recording") {
          window.takeoverRecorder = { seek: created.seek }
          return
        }
        created.play(mode === "idle" ? timeline.settle : 0)
        if (mode === "live") {
          stopCue = playCue()
        }
      })
      .catch((error: unknown) => {
        if (disposed) {
          return
        }
        console.warn("The takeover could not start WebGPU.", error)
        setMode(mode === "live" ? "fallback" : "still")
      })

    return () => {
      disposed = true
      takeover?.dispose()
      stopCue?.()
      window.takeoverRecorder = undefined
    }
  }, [credits, mode, title])

  // The fallback is only ever reached from a live run, and the recording
  // starts at the click like the cue does.
  useEffect(() => (mode === "fallback" ? playCue() : undefined), [mode])

  const settled = mode === "still" || mode === "fallback"

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      data-takeover={mode ?? "pending"}
      ref={rootRef}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        ref={corporateRef}
        style={{ opacity: mode === "live" || mode === "recording" || mode === null ? 1 : 0 }}
      >
        {corporate}
      </div>
      <canvas
        aria-hidden
        className="absolute inset-0 h-full w-full"
        ref={canvasRef}
        style={{ opacity: 0 }}
      />
      {mode === "fallback" ? (
        <video
          aria-hidden
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
          muted
          onError={() => setMode("still")}
          playsInline
          src={fallbackVideo}
        />
      ) : null}

      <div
        aria-hidden
        className="absolute top-[var(--slide-padding-block)] left-[var(--slide-padding-inline)] flex flex-col gap-4 font-[family-name:var(--slide-font-mono)] text-[length:var(--slide-heading-size)] text-primary leading-[1.3]"
        style={{ textShadow: "var(--slide-halo)" }}
      >
        {wakeLines.map((line, index) => (
          <p
            key={line}
            // Laid out before it is typed, so the shader's copy lines up.
            className="min-h-lh"
            ref={(element) => {
              wakeRefs.current[index] = element
            }}
          />
        ))}
      </div>

      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-12"
        style={{ opacity: mode === "fallback" ? 0 : 1 }}
      >
        <h1
          className="text-primary"
          ref={titleRef}
          style={{
            fontSize: "calc(var(--slide-title-size) * 2.5)",
            letterSpacing: "0.02em",
            lineHeight: "calc(var(--slide-title-size) * 2.5)",
            opacity: settled ? 1 : 0,
            textShadow:
              "0 0 18px color-mix(in oklab, var(--primary) 70%, transparent), 0 0 70px color-mix(in oklab, var(--primary) 45%, transparent)",
            whiteSpace: "pre",
          }}
        >
          {title}
        </h1>
        <p
          className="text-[length:var(--slide-lead-size)] text-primary uppercase tracking-[var(--slide-label-tracking)]"
          ref={creditsRef}
          style={{ opacity: settled ? 1 : 0, textShadow: "var(--slide-halo)", minHeight: "1.2em" }}
        >
          {credits}
        </p>
      </div>
    </div>
  )
}
