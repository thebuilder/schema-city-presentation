"use client"

import { useEffect } from "react"
import { armTakeover } from "@/deck/parts/takeover/takeover-state"

// Mounting the fake-out is what makes the next slide play its takeover, so
// stepping back to it and forward again replays the whole thing.
export function TakeoverArm() {
  useEffect(() => {
    armTakeover()
  }, [])

  return null
}
