"use client"

import { useEffect } from "react"
import { preloadCue } from "@/deck/parts/takeover/cue"
import { armTakeover } from "@/deck/parts/takeover/takeover-state"

// Mounting the fake-out is what makes the next slide play its takeover, so
// stepping back to it and forward again replays the whole thing. It also
// loads the takeover's sound, so the cue is ready on the click.
export function TakeoverArm() {
  useEffect(() => {
    armTakeover()
    preloadCue()
  }, [])

  return null
}
