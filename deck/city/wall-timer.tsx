"use client"

import { useCallback, useEffect, useState } from "react"

/*
 * The wall's question starts a clock that keeps running until the live demo
 * answers it, slides later. The start time lives in localStorage rather than in
 * state, so the presenter window, a reload and the morph's return to the table
 * all read the same clock. A start older than LIFETIME is a rehearsal from
 * another day and counts as no start at all.
 */

const KEY = "schema-city-talk:wall-started"
const LIFETIME = 3 * 60 * 60 * 1000

function readStart(): number | null {
  try {
    const value = Number(localStorage.getItem(KEY))
    return value && Date.now() - value < LIFETIME ? value : null
  } catch {
    return null
  }
}

function writeStart(value: number | null) {
  try {
    if (value === null) {
      localStorage.removeItem(KEY)
    } else {
      localStorage.setItem(KEY, String(value))
    }
  } catch {
    // Blocked storage leaves the clock to this page alone, which still counts.
  }
}

/**
 * Seconds since the question went up, ticking. `running` starts the clock if
 * it has not started yet; it never restarts one that has.
 */
export function useWallClock(running: boolean) {
  const [start, setStart] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let found = readStart()
    if (running && found === null) {
      found = Date.now()
      writeStart(found)
    }
    setStart(found)
  }, [running])

  useEffect(() => {
    if (start === null) {
      return
    }
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [start])

  const reset = useCallback(() => {
    const fresh = running ? Date.now() : null
    writeStart(fresh)
    setStart(fresh)
    setNow(Date.now())
  }, [running])

  const seconds = start === null ? 0 : Math.max(0, (now - start) / 1000)
  return { seconds, started: start !== null, reset }
}

export function formatClock(seconds: number): string {
  const whole = Math.floor(seconds)
  const minutes = Math.floor(whole / 60)
  return `${String(minutes).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`
}
