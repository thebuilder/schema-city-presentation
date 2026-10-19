"use client"

import { useEffect, useRef } from "react"

/*
 * The doors from the control room, in pixel art: two panels slide shut over a
 * dark corridor with a pair of eyes in it, a bolt slides out of one
 * door into a keeper on the other, and
 * the light over the frame stops blinking red and holds green. It is drawn on
 * a small canvas and scaled up with smoothing off, so every pixel is placed by
 * the code below rather than by an image.
 *
 * The animation starts when `active` turns on and plays once. A still (a
 * screenshot, an export, reduced motion) draws the locked end state.
 */
const W = 160
const H = 100

// Seconds from the start of the animation.
const closeFrom = 0.4
const closeTo = 1.6
const boltTo = 2.1
const greenAt = 2.3

const colours = {
  wall: "#0d1a17",
  wallLine: "#14251f",
  frame: "#2b443e",
  frameHi: "#3d5a52",
  dark: "#030706",
  door: "#4f6b65",
  doorHi: "#6f8a82",
  doorLo: "#344a45",
  hazardA: "#e8c547",
  hazardB: "#1b1b12",
  slit: "#0a1210",
  bolt: "#b6c4be",
  floor: "#0a1412",
  floorLine: "#13221e",
  eye: "#ffb347",
  red: "#ff3355",
  redDim: "#5a1420",
  green: "#3dff9a",
  greenGlow: "#1d6b47",
} as const

const ease = (t: number) => t * t * (3 - 2 * t)
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

function draw(g: CanvasRenderingContext2D, t: number) {
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    g.fillStyle = c
    g.fillRect(x, y, w, h)
  }

  // Wall, with panel seams.
  rect(0, 0, W, H, colours.wall)
  for (let x = 8; x < W; x += 24) {
    rect(x, 0, 1, 88, colours.wallLine)
  }
  rect(0, 30, W, 1, colours.wallLine)

  // Floor, with tile lines that pick up the light's colour once it is green.
  const locked = t >= greenAt
  rect(0, 88, W, H - 88, colours.floor)
  for (let y = 91; y < H; y += 4) {
    rect(0, y, W, 1, colours.floorLine)
  }
  for (let x = 4; x < W; x += 16) {
    rect(x, 88, 1, H - 88, colours.floorLine)
  }

  // The corridor beyond the doorway, and what is standing in it.
  rect(44, 18, 72, 70, colours.dark)
  const blink = Math.floor(t * 1.3) % 5 === 4
  if (!blink) {
    rect(70, 46, 2, 1, colours.eye)
    rect(77, 46, 2, 1, colours.eye)
  }

  // The doors, closing from both sides onto the seam at x = 80.
  const shut = ease(clamp01((t - closeFrom) / (closeTo - closeFrom)))
  const width = Math.round(2 + 34 * shut)
  for (const [x0, dir] of [
    [44, 1],
    [116, -1],
  ] as const) {
    const x = dir === 1 ? x0 : x0 - width
    rect(x, 18, width, 70, colours.door)
    rect(x, 18, width, 1, colours.doorHi)
    rect(dir === 1 ? x : x + width - 1, 18, 1, 70, colours.doorHi)
    rect(dir === 1 ? x + width - 1 : x, 18, 1, 70, colours.doorLo)
    // A window slit near the leading edge, and the hazard stripe along the foot.
    const slitX = dir === 1 ? x + width - 9 : x + 6
    if (width > 12) {
      rect(slitX, 30, 3, 22, colours.slit)
    }
    for (let i = 0; i < width; i++) {
      rect(x + i, 82, 1, 5, (x + i) % 6 < 3 ? colours.hazardA : colours.hazardB)
    }
  }

  // The bolt is part of the left door and the keeper part of the right, so
  // they slide out from behind the frame with the doors. Clipping to the
  // doorway keeps the part of a lock still inside the wall hidden. Once the
  // doors meet, the bolt slides across the seam into the keeper.
  const leftEdge = 44 + width
  const rightEdge = 116 - width
  g.save()
  g.beginPath()
  g.rect(44, 18, 72, 70)
  g.clip()
  rect(leftEdge - 14, 58, 12, 7, colours.doorLo)
  rect(rightEdge + 3, 58, 8, 7, colours.doorLo)
  rect(rightEdge + 4, 60, 6, 3, colours.slit)
  const bolt = ease(clamp01((t - closeTo) / (boltTo - closeTo)))
  const reach = 10 + Math.round(10 * bolt)
  rect(leftEdge - 12, 60, reach, 3, colours.bolt)
  rect(leftEdge - 12, 63, reach, 1, colours.doorLo)
  g.restore()

  // The frame, drawn over the door edges so they slide out from behind it.
  rect(38, 12, 84, 6, colours.frame)
  rect(38, 12, 84, 1, colours.frameHi)
  rect(38, 12, 6, 76, colours.frame)
  rect(116, 12, 6, 76, colours.frame)

  // The light over the door: blinking red while the doors move, then green.
  const on = locked || Math.floor(t * 4) % 2 === 0
  const lamp = locked ? colours.green : on ? colours.red : colours.redDim
  if (locked) {
    rect(73, 3, 14, 8, colours.greenGlow)
  }
  rect(75, 5, 10, 4, lamp)

  // The keypad beside the frame carries the same light, and the floor shows it.
  rect(130, 44, 12, 18, colours.frame)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      rect(132 + c * 3, 51 + r * 3, 2, 2, colours.frameHi)
    }
  }
  rect(134, 46, 4, 2, lamp)
  if (locked) {
    for (let x = 44; x < 116; x += 2) {
      rect(x, 89, 1, 1, colours.greenGlow)
    }
  }
}

export function DoorLock({
  active,
  still,
}: {
  active: boolean
  still: boolean
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const g = canvas.current?.getContext("2d")
    if (!g) {
      return
    }
    if (still) {
      draw(g, greenAt + 1)
      return
    }
    if (!active) {
      draw(g, 0)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = (now - start) / 1000
      draw(g, t)
      if (t < greenAt + 0.5) {
        frame = requestAnimationFrame(tick)
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, still])

  return (
    <canvas
      ref={canvas}
      className="block aspect-[8/5] w-full [image-rendering:pixelated]"
      width={W}
      height={H}
      aria-hidden
    />
  )
}

// How long the doors take to lock, so the window's status line can follow.
export const DOOR_LOCK_MS = greenAt * 1000
