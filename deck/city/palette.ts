"use client"

import { type RefObject, useEffect, useState } from "react"
import type { BuildingPalette } from "@/deck/city/schema-city"

/*
 * The city on a slide takes its colours from the deck theme, the way Schema City
 * takes them from the backoffice's, so a theme edit reaches the buildings too.
 * Azure and dim come from tokens that carry the package's own values, so a city
 * on a slide is coloured like the one in the live demo after it.
 *
 * Light mode writes its tokens in oklch, which THREE.Color cannot parse, so each
 * token is painted onto a one pixel canvas and read back as rgb.
 */
const TOKENS = {
  amber: "--slide-amber",
  azure: "--slide-azure",
  background: "--background",
  bright: "--accent-foreground",
  dim: "--slide-dim",
  foreground: "--foreground",
  land: "--card",
  phosphor: "--primary",
  separator: "--secondary",
  signal: "--slide-signal",
} as const

/**
 * The package's dark values, for a token the theme does not set. A missing token
 * would otherwise paint as whatever the canvas held last.
 */
const FALLBACK: Record<keyof typeof TOKENS, string> = {
  amber: "#ffbc57",
  azure: "#8dbdf5",
  background: "#05090a",
  bright: "#d9ffef",
  dim: "#4d8477",
  foreground: "#e9f6f1",
  land: "#0b1515",
  phosphor: "#86fadd",
  separator: "#081210",
  signal: "#ff5b82",
}

export type CityPalette = BuildingPalette &
  Record<keyof typeof TOKENS, string> & {
    /** The theme's mono stack, for the names printed on the boards. */
    mono: string
  }

function readPalette(element: Element): CityPalette {
  const style = getComputedStyle(element)
  const pixel = document.createElement("canvas")
  pixel.width = 1
  pixel.height = 1
  const context = pixel.getContext("2d", { willReadFrequently: true })
  const rgb = (key: keyof typeof TOKENS) => {
    const value = style.getPropertyValue(TOKENS[key]).trim()
    if (!value) return FALLBACK[key]
    if (!context) return value
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = value
    context.fillRect(0, 0, 1, 1)
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data
    return `rgb(${r}, ${g}, ${b})`
  }
  const colours = Object.fromEntries(
    Object.keys(TOKENS).map((key) => [key, rgb(key as keyof typeof TOKENS)])
  ) as Record<keyof typeof TOKENS, string>
  const mono =
    style.getPropertyValue("--slide-font-mono").trim() ||
    "ui-monospace, monospace"
  return { ...colours, mono }
}

/**
 * The palette under `host`, read again whenever the deck flips its colour mode.
 * Null until the first read, since the tokens only exist once the slide is mounted.
 */
export function useCityPalette(
  host: RefObject<Element | null>
): CityPalette | null {
  const [palette, setPalette] = useState<CityPalette | null>(null)
  useEffect(() => {
    // Any class change anywhere wakes this, so a read that finds the same colours
    // keeps the old object and the city does not repaint for nothing.
    const read = () => {
      if (!host.current) return
      const next = readPalette(host.current)
      setPalette((current) =>
        JSON.stringify(current) === JSON.stringify(next) ? current : next
      )
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, {
      attributeFilter: ["class", "data-slide-color-mode"],
      attributes: true,
      subtree: true,
    })
    return () => observer.disconnect()
  }, [host])
  return palette
}
