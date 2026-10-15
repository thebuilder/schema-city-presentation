"use client"

import { type RefObject, useEffect, useState } from "react"
import type { BuildingPalette } from "@/deck/city/schema-city"

/*
 * The city on a slide takes its colours from the deck theme, the way Schema City
 * takes them from the backoffice's, so a theme edit reaches the buildings too.
 *
 * Light mode writes its tokens in oklch, which THREE.Color cannot parse, so each
 * token is painted onto a one pixel canvas and read back as rgb.
 */
const TOKENS: Record<keyof BuildingPalette, string> = {
  amber: "--slide-amber",
  azure: "--accent-foreground",
  background: "--background",
  dim: "--muted-foreground",
  phosphor: "--primary",
  separator: "--secondary",
  signal: "--slide-signal",
}

export type CityPalette = BuildingPalette & { foreground: string }

function readPalette(element: Element): CityPalette {
  const style = getComputedStyle(element)
  const pixel = document.createElement("canvas")
  pixel.width = 1
  pixel.height = 1
  const context = pixel.getContext("2d", { willReadFrequently: true })
  const rgb = (token: string) => {
    const value = style.getPropertyValue(token).trim()
    if (!context) return value
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = value
    context.fillRect(0, 0, 1, 1)
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data
    return `rgb(${r}, ${g}, ${b})`
  }
  const palette = Object.fromEntries(
    Object.entries(TOKENS).map(([key, token]) => [key, rgb(token)])
  ) as BuildingPalette
  return { ...palette, foreground: rgb("--foreground") }
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
