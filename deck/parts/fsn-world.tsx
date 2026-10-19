"use client"

import type { WorldScene } from "@fsn/app/scene"
import type { FsNode } from "@fsn/core"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/*
 * The real fsn, not a likeness of it. This mounts the WorldScene from the
 * submodule in vendor/fsn, the same renderer fsn.thebuilder.dk runs, so the
 * plots, towers, wires, labels, scan and glow are the site's own. The slide
 * only decides which directory is open and which object is picked, and the
 * scene flies there the way it does when a person clicks.
 *
 * fsn is loaded when the slide mounts rather than imported up front. That
 * keeps three and the renderer out of every other slide's bundle, and out of
 * the module graph `deckard validate` walks, which only knows the `@/` alias.
 */

// The scene listens on the window so its keys work wherever focus is. On a
// slide those keys belong to the deck, and a click is the presenter stepping,
// not a hand taking over the camera, so the scene is built without them.
const deckInput = new Set(["keydown", "keyup", "pointerdown", "wheel"])

function withoutWindowInput<T>(build: () => T): T {
  const add = window.addEventListener
  window.addEventListener = ((
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean
  ) => {
    if (!deckInput.has(type)) {
      add.call(window, type, listener, options)
    }
  }) as typeof window.addEventListener
  try {
    return build()
  } finally {
    // The override was an own property shadowing EventTarget's method, so
    // deleting it puts the original back.
    Reflect.deleteProperty(window, "addEventListener")
  }
}

// fsn plays its scan and its flights unless the viewer asked for less motion,
// and then it lands everything at once. A screenshot is taken a moment after
// the page loads, so it asks for the same thing for as long as it is mounted.
function holdStill(): () => void {
  const matchMedia = window.matchMedia
  window.matchMedia = (query: string) =>
    matchMedia.call(
      window,
      query === "(prefers-reduced-motion: reduce)" ? "all" : query
    )
  return () => {
    Reflect.deleteProperty(window, "matchMedia")
  }
}

/*
 * The site measures each directory from one level further down before it lays
 * one out, so a plot's size and markers say what is inside. The deck knows
 * the whole tree up front, so it measures it once.
 */
function measure(
  root: FsNode,
  peek: typeof import("@fsn/core").peekFromChildren
): Map<string, FsNode> {
  const nodes = new Map<string, FsNode>()
  const visit = (node: FsNode) => {
    nodes.set(node.id, node)
    if (node.children) {
      node.peek = peek(node.children)
      node.children.forEach(visit)
    }
  }
  visit(root)
  return nodes
}

function isBelow(
  node: FsNode,
  ancestor: FsNode,
  nodes: Map<string, FsNode>
): boolean {
  let parent = node.parentId ? nodes.get(node.parentId) : undefined
  while (parent) {
    if (parent.id === ancestor.id) {
      return true
    }
    parent = parent.parentId ? nodes.get(parent.parentId) : undefined
  }
  return false
}

/*
 * fsn frames a directory straight on and then holds still, waiting for a hand
 * on the controls. Nobody touches the controls on a slide, so the deck moves
 * the camera itself: every framing fsn flies to is turned to an angle, and
 * once it lands the camera circles the target and closes in, slowly enough
 * to read the labels while it does.
 *
 * The camera, the controls and the flight are private to WorldScene, so this
 * reaches them by name. It only adjusts poses fsn has already chosen, so a
 * change in how fsn frames a directory still comes through.
 */
interface Rig {
  camera: { position: Vec3 }
  controls: { autoRotate: boolean; autoRotateSpeed: number; target: Vec3 }
  flight: { toPosition: Vec3; toTarget: Vec3 } | null
  flyToArea: (area: unknown, arrival: string) => void
  hoverTarget: Pick | null
  pickMeshes: Map<unknown, Pick[]>
}

interface Pick {
  node: { id: string }
}

/*
 * fsn lifts and brightens the object under the pointer, which is how a person
 * using it sees which pillar is live. No pointer moves on a slide, so the deck
 * hands fsn the pillar it picked as the hovered one, and fsn's own cross-fade
 * moves the lift from one pillar to the next.
 */
function activate(scene: WorldScene, id: string) {
  const rig = scene as unknown as Rig
  const pick = [...rig.pickMeshes.values()]
    .flat()
    .find((candidate) => candidate.node.id === id)
  rig.hoverTarget = pick ?? null
}

interface Vec3 {
  x: number
  y: number
  z: number
}

// Radians off fsn's straight-on framing for the first pose, on the side the
// establishing shot opens from, so the approach keeps turning the same way.
const approachAngle = 0.62
// OrbitControls' units: 2 is a turn every 30 seconds, so this is about three
// minutes a turn. Negative keeps the turn going the way the approach did.
const circleSpeed = -0.35
// How close the camera ends up, as a share of fsn's framing distance, and the
// share of the remaining gap it closes each second.
const closest = 0.7
const closeRate = 0.025

// Turns `point` about `pivot` around the vertical axis and pulls it in.
function orbit(point: Vec3, pivot: Vec3, angle: number, scale: number) {
  const dx = point.x - pivot.x
  const dz = point.z - pivot.z
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  point.x = pivot.x + (dx * cos + dz * sin) * scale
  point.y = pivot.y + (point.y - pivot.y) * scale
  point.z = pivot.z + (dz * cos - dx * sin) * scale
}

function drift(scene: WorldScene, still: boolean): () => void {
  const rig = scene as unknown as Rig
  const flyToArea = rig.flyToArea.bind(scene)
  let angle = approachAngle
  let scale = 1
  let first = true

  rig.flyToArea = (area, arrival) => {
    // A later flight keeps the angle the circling has got to, so the camera
    // does not swing back to straight on between directories.
    if (!first) {
      const { position } = rig.camera
      const { target } = rig.controls
      angle = Math.atan2(position.x - target.x, position.z - target.z)
    }
    first = false
    flyToArea(area, arrival)
    if (rig.flight) {
      orbit(rig.flight.toPosition, rig.flight.toTarget, angle, scale)
    } else {
      // A still lands at once, with no flight to adjust.
      orbit(rig.camera.position, rig.controls.target, angle, scale)
    }
  }

  if (still) {
    return () => undefined
  }

  rig.controls.autoRotate = true
  rig.controls.autoRotateSpeed = circleSpeed
  let last = performance.now()
  let frame = requestAnimationFrame(function closeIn(now) {
    const seconds = Math.min((now - last) / 1000, 0.1)
    last = now
    if (!rig.flight && scale > closest) {
      const next = closest + (scale - closest) * Math.exp(-closeRate * seconds)
      orbit(rig.camera.position, rig.controls.target, 0, next / scale)
      scale = next
    }
    frame = requestAnimationFrame(closeIn)
  })
  return () => cancelAnimationFrame(frame)
}

// How long a move between neighbouring directories takes to land, so a pick
// in the new one happens once the camera is there rather than on the way.
const travel = 1500

interface Loaded {
  nodes: Map<string, FsNode>
  root: FsNode
  scene: WorldScene
}

export function FsnWorld({
  className,
  focus,
  load,
  open,
  still,
}: {
  className?: string
  /** The id of the object to pick, inside the open directory. */
  focus?: string
  /** The filesystem to fly, fetched once the slide is up. */
  load: () => Promise<FsNode>
  /** The id of the directory on screen, the root when left out. */
  open?: string
  still: boolean
}) {
  const host = useRef<HTMLDivElement>(null)
  const shown = useRef<FsNode | null>(null)
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    const element = host.current
    if (!element) {
      return
    }
    let cancelled = false
    let teardown: (() => void) | undefined

    Promise.all([
      import("@fsn/app/scene"),
      import("@fsn/app/bloom"),
      import("@fsn/core"),
      load(),
    ]).then(([{ WorldScene }, { glowByDefault }, { peekFromChildren }, root]) => {
      if (cancelled) {
        return
      }
      const release = still ? holdStill() : undefined
      // A fresh canvas per scene, so a remount never inherits a disposed context.
      const canvas = document.createElement("canvas")
      canvas.className = "block h-full w-full"
      element.append(canvas)
      const scene = withoutWindowInput(
        () =>
          new WorldScene(canvas, {
            onAim: () => undefined,
            onEnterArea: () => undefined,
            onHover: () => undefined,
            onKeyboardNavigation: () => undefined,
            onOpen: () => undefined,
            onSelect: () => undefined,
            onSwapKeys: () => undefined,
          })
      )
      const stopDrift = drift(scene, still)
      scene.setGlow(
        glowByDefault({
          coarsePointer: false,
          height: window.innerHeight,
          pixelRatio: Math.min(window.devicePixelRatio, 2),
          width: window.innerWidth,
        })
      )
      shown.current = null
      setLoaded({ nodes: measure(root, peekFromChildren), root, scene })
      teardown = () => {
        stopDrift()
        scene.destroy()
        canvas.remove()
        release?.()
      }
    })

    return () => {
      cancelled = true
      teardown?.()
      setLoaded(null)
    }
  }, [load, still])

  useEffect(() => {
    if (!loaded) {
      return
    }
    const { nodes, root, scene } = loaded
    const directory = open ? nodes.get(open) : root
    if (!directory) {
      return
    }
    const previous = shown.current
    if (previous?.id !== directory.id) {
      let direction: "initial" | "forward" | "backward" = "initial"
      if (previous) {
        direction = isBelow(directory, previous, nodes) ? "forward" : "backward"
      }
      scene.setDirectory(directory, directory.children ?? [], direction)
      shown.current = directory
    }
    const target = focus ? nodes.get(focus) : undefined
    if (!target) {
      return
    }
    // focusNode picks the object and flies up to it, close enough that its
    // neighbours' names fill the screen. refocus straight after keeps the
    // pick and takes the camera back to the directory's own framing, so the
    // room can see the door locks and what stands around them.
    const pick = () => {
      scene.focusNode(target)
      scene.refocus()
      activate(scene, target.id)
    }
    if (still || previous?.id === directory.id) {
      pick()
      return
    }
    const timer = window.setTimeout(pick, travel)
    return () => window.clearTimeout(timer)
  }, [focus, loaded, open, still])

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none overflow-hidden", className)}
      ref={host}
    />
  )
}
