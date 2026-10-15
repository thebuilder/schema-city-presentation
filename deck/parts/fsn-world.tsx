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
// slide the arrow keys belong to the deck, so the scene never gets them. A
// scripted scene also loses the pointer, since a click there is the presenter
// stepping rather than a hand taking over the camera.
const deckKeys = new Set(["keydown", "keyup"])
const deckInput = new Set([...deckKeys, "pointerdown", "wheel"])

function withoutWindowInput<T>(blocked: Set<string>, build: () => T): T {
  const add = window.addEventListener
  window.addEventListener = ((
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean
  ) => {
    if (!blocked.has(type)) {
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
  interactive = false,
  load,
  open,
  still,
}: {
  className?: string
  /** The id of the object to pick, inside the open directory. */
  focus?: string
  /**
   * Hands the mouse to the scene, the way the site does: drag to orbit, scroll
   * to zoom, double-click a directory to walk into it. The keys stay with the
   * deck.
   */
  interactive?: boolean
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
      const nodes = measure(root, peekFromChildren)
      // A fresh canvas per scene, so a remount never inherits a disposed context.
      const canvas = document.createElement("canvas")
      canvas.className = "block h-full w-full"
      element.append(canvas)
      const scene: WorldScene = withoutWindowInput(
        interactive ? deckKeys : deckInput,
        () =>
          new WorldScene(canvas, {
            onAim: () => undefined,
            // Flying back over a directory already walked into makes it the
            // open one again, as it does on the site.
            onEnterArea: (id) => {
              shown.current = nodes.get(id) ?? shown.current
            },
            onHover: () => undefined,
            onKeyboardNavigation: () => undefined,
            onOpen: (node) => {
              const directory = nodes.get(node.id)
              if (directory?.kind !== "directory") {
                return
              }
              scene.setDirectory(directory, directory.children ?? [], "forward")
              shown.current = directory
            },
            onSelect: () => undefined,
            onSwapKeys: () => undefined,
          })
      )
      scene.setGlow(
        glowByDefault({
          coarsePointer: false,
          height: window.innerHeight,
          pixelRatio: Math.min(window.devicePixelRatio, 2),
          width: window.innerWidth,
        })
      )
      shown.current = null
      setLoaded({ nodes, root, scene })
      teardown = () => {
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
  }, [interactive, load, still])

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
      className={cn(
        "overflow-hidden",
        interactive ? "cursor-grab" : "pointer-events-none",
        className
      )}
      // A click on an interactive world is aiming the camera, not stepping.
      data-step-ignore-click={interactive ? "true" : undefined}
      ref={host}
    />
  )
}
