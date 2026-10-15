"use client"

import { type RefObject, useLayoutEffect, useState } from "react"

/*
 * The colours the package's scene modules read. The deck theme is Afterglow's
 * palette, which is also Schema City's, so the dark values below are what the
 * theme sets and what the backoffice draws. The city is a lit world on a dark
 * ground in either colour mode, so a token that does not hold a colour three can
 * parse, such as the light theme's oklch, falls back to the dark value.
 */
const FALLBACK = {
  phosphor: "#86fadd",
  bright: "#d9ffef",
  dim: "#4d8477",
  signal: "#ff5b82",
  amber: "#ffbc57",
  azure: "#8dbdf5",
  violet: "#b890ff",
  background: "#05090a",
  separator: "#081210",
  land: "#0b1515",
  mono: "ui-monospace, monospace",
}

export type CityPalette = typeof FALLBACK

const TOKENS: Partial<Record<keyof CityPalette, string>> = {
  phosphor: "--primary",
  bright: "--accent-foreground",
  signal: "--slide-signal",
  amber: "--slide-amber",
  background: "--background",
  land: "--card",
  mono: "--slide-font-mono",
}

const PARSEABLE = /^(#|rgb|hsl)/

/**
 * The palette read once from the element the widget mounts in, so the city
 * follows the deck's theme. Three wants concrete colours, which custom
 * properties are not until something computes them.
 */
export function useCityPalette(host: RefObject<HTMLElement | null>) {
  const [palette, setPalette] = useState<CityPalette | null>(null)
  useLayoutEffect(() => {
    if (!host.current) {
      return
    }
    const style = getComputedStyle(host.current)
    const read = { ...FALLBACK }
    for (const [key, token] of Object.entries(TOKENS)) {
      const value = style.getPropertyValue(token as string).trim()
      const name = key as keyof CityPalette
      if (value && (name === "mono" || PARSEABLE.test(value))) {
        read[name] = value
      }
    }
    setPalette(read)
  }, [host])
  return palette
}
