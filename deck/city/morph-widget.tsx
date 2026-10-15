"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import {
  boardPalette,
  buildingPalette,
  CityRoads,
  CityWorld,
  useCity,
} from "@/deck/city/city-world"
import { type CityPalette, useCityPalette } from "@/deck/city/palette"
import { SchemaTable, tableRows } from "@/deck/city/schema-table"
import {
  Boards,
  Buildings,
  buildingRiseAt,
  CAMERA_FOV,
  demoGraph,
  type DistrictKind,
  revealAt,
  type SchemaGraph,
} from "@/deck/city/schema-city"
import { useStep } from "@/deck/city/use-step"
import { formatClock, useWallClock } from "@/deck/city/wall-timer"

/*
 * The wall comes back, and on the click its rows lift off the page and land
 * where Schema City's layout puts each type. The city then boots the way it does
 * in the backoffice. The boards fade up, the buildings rise and the roads arrive.
 *
 * Each row is measured where the table drew it, so the slab that replaces it
 * starts on exactly those pixels. The camera starts straight overhead, where a
 * ground plane maps to the screen without distortion, and swings down to the
 * three-quarter view the app opens on while the rows travel.
 */

/** Step 0 is the wall again, step 1 runs the morph. */
export const MORPH_STEPS = 2

/** Seconds the rows take to leave the table, top row first to last. */
const STAGGER = 1
/** Seconds one row takes from the table to its plot. */
const TRAVEL = 1.5
/** When the city takes over from the slabs and replays its own boot. */
const HANDOFF = STAGGER + TRAVEL + 0.2
/** The camera's swing, start and end. */
const SWING = [0.3, 3.2] as const
/** How far the finished city sways either way, in radians, and how fast. */
const SWAY = 0.22
const SWAY_RATE = 0.12

type Rect = { x: number; z: number; width: number; depth: number }

type Slab = {
  from: Rect
  to: { x: number; z: number; footprint: number; height: number }
  colour: THREE.Color
  delay: number
}

const smoother = (t: number) => {
  const p = Math.min(1, Math.max(0, t))
  return p * p * p * (p * (p * 6 - 15) + 10)
}

function districtColour(kind: DistrictKind, palette: CityPalette) {
  if (kind === "structure") {
    return palette.phosphor
  }
  return kind === "elements" ? palette.amber : palette.dim
}

/** Unlit boxes with their edges lit, after the package's own glow on buildings. */
function slabMaterial() {
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    toneMapped: false,
  })
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vLocal;\nvarying vec3 vScale;"
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vLocal = position;
vScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));`
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vLocal;\nvarying vec3 vScale;"
      )
      .replace(
        "#include <opaque_fragment>",
        `vec3 gap = (0.5 - abs(vLocal)) * vScale;
float nearest = min(gap.x, min(gap.y, gap.z));
float farthest = max(gap.x, max(gap.y, gap.z));
float edge = gap.x + gap.y + gap.z - nearest - farthest;
float line = 1.0 - smoothstep(0.0, 0.04 + min(fwidth(edge), 0.08), edge);
outgoingLight = mix(outgoingLight * 0.32, outgoingLight * 1.5, line);
#include <opaque_fragment>`
      )
  }
  return material
}

const SCRATCH = new THREE.Object3D()
const UP_TOP = new THREE.Vector3(0, 0, -1)
const UP_SIDE = new THREE.Vector3(0, 1, 0)

function Morph({
  palette,
  graph,
  slabs,
  startedAt,
  overhead,
}: {
  palette: CityPalette
  graph: SchemaGraph
  slabs: Slab[]
  /** The morph's own clock origin, or null while the wall is up. */
  startedAt: number | null
  overhead: number
}) {
  const city = useCity(graph)
  const camera = useThree((state) => state.camera)
  const clock = useThree((state) => state.clock)
  const mesh = useRef<THREE.InstancedMesh>(null)
  const material = useMemo(slabMaterial, [])
  const box = useMemo(() => new THREE.BoxGeometry(), [])
  const [booted, setBooted] = useState(false)
  const bootedAt = useRef(0)
  const centre = city.ground.centre
  const target = useMemo(
    () => new THREE.Vector3(centre.x, 0, centre.z),
    [centre]
  )
  const top = useMemo(
    () => new THREE.Vector3(centre.x, overhead, centre.z),
    [centre, overhead]
  )
  const side = useMemo(
    () =>
      target
        .clone()
        .add(new THREE.Vector3(0.2, 0.62, 1).normalize().multiplyScalar(city.ground.span * 1.02)),
    [target, city.ground.span]
  )

  useEffect(() => () => {
    material.dispose()
    box.dispose()
  }, [material, box])

  useEffect(() => {
    if (startedAt === null) {
      setBooted(false)
    }
  }, [startedAt])

  // A row starts as dark as the stripe it was in the table and takes its
  // district's colour on the way up, so the swap from text to slabs is quiet.
  const stripe = useMemo(
    () =>
      new THREE.Color(palette.background).lerp(new THREE.Color(palette.dim), 0.3),
    [palette]
  )
  const colour = useMemo(() => new THREE.Color(), [])

  useFrame(() => {
    const t = startedAt === null ? 0 : (performance.now() - startedAt) / 1000

    // The camera starts overhead, swings to the three-quarter view, then drifts.
    const swing = smoother((t - SWING[0]) / (SWING[1] - SWING[0]))
    camera.position.lerpVectors(top, side, swing)
    if (t > SWING[1]) {
      const angle = Math.sin((t - SWING[1]) * SWAY_RATE) * SWAY
      const offset = side.clone().sub(target)
      offset.applyAxisAngle(UP_SIDE, angle)
      camera.position.copy(target).add(offset)
    }
    camera.up.lerpVectors(UP_TOP, UP_SIDE, swing).normalize()
    camera.lookAt(target)

    if (t >= HANDOFF && !booted) {
      // The package's buildings, boards and roads time their boot from the
      // renderer's clock, so restarting it replays the boot from here.
      clock.start()
      bootedAt.current = performance.now()
      setBooted(true)
    }

    const slabsMesh = mesh.current
    if (!slabsMesh) {
      return
    }
    const sinceBoot = booted ? (performance.now() - bootedAt.current) / 1000 : 0
    const rise = booted ? buildingRiseAt(sinceBoot) : 0.08
    material.opacity = booted ? 1 - revealAt(sinceBoot).districts : 1
    slabsMesh.visible = material.opacity > 0.01
    slabs.forEach((slab, index) => {
      const u = Math.min(1, Math.max(0, (t - slab.delay) / TRAVEL))
      const e = smoother(u)
      const height = THREE.MathUtils.lerp(
        0.06,
        Math.max(0.12, slab.to.height * rise),
        e
      )
      const lift = Math.sin(Math.PI * u) * city.span * 0.06
      SCRATCH.position.set(
        THREE.MathUtils.lerp(slab.from.x, slab.to.x, e),
        lift + height / 2,
        THREE.MathUtils.lerp(slab.from.z, slab.to.z, e)
      )
      SCRATCH.scale.set(
        THREE.MathUtils.lerp(slab.from.width, slab.to.footprint * 0.9, e),
        height,
        THREE.MathUtils.lerp(slab.from.depth, slab.to.footprint * 0.9, e)
      )
      SCRATCH.updateMatrix()
      slabsMesh.setMatrixAt(index, SCRATCH.matrix)
      slabsMesh.setColorAt(
        index,
        colour.copy(stripe).lerp(slab.colour, smoother(u * 2))
      )
    })
    slabsMesh.instanceMatrix.needsUpdate = true
    if (slabsMesh.instanceColor) {
      slabsMesh.instanceColor.needsUpdate = true
    }
  })

  const sinceBootNow = () =>
    booted ? (performance.now() - bootedAt.current) / 1000 : 0

  return (
    <>
      <CityWorld centre={centre} palette={palette} span={city.ground.span} />
      {slabs.length > 0 ? (
        <instancedMesh
          args={[box, material, slabs.length]}
          frustumCulled={false}
          key={slabs.length}
          ref={mesh}
        />
      ) : null}
      {booted ? (
        <>
          <Boards
            districts={city.districts}
            fingers={[]}
            folders={[]}
            palette={boardPalette(palette)}
            reducedMotion={false}
            vias={[]}
          />
          <Buildings
            cells={city.cells}
            heights={city.heights}
            hovered={null}
            neighbours={null}
            onFocus={() => undefined}
            onHover={() => undefined}
            onSelect={() => undefined}
            palette={buildingPalette(palette)}
            placements={city.placements}
            plazas={city.plazas}
            reducedMotion={false}
            scale={null}
            selected={null}
            windows={city.windows}
          />
          <BootingRoads
            colour={palette.phosphor}
            edges={city.edges}
            placementsById={city.placementsById}
            since={sinceBootNow}
          />
        </>
      ) : null}
    </>
  )
}

/** The roads, arriving last the way the app's links do. */
function BootingRoads({
  since,
  ...roads
}: {
  since: () => number
  colour: string
  edges: SchemaGraph["edges"]
  placementsById: Map<string, import("@/deck/city/schema-city").Placement>
}) {
  const [opacity, setOpacity] = useState(0)
  useFrame(() => {
    const next = revealAt(since()).links
    if (Math.abs(next - opacity) > 0.02 || (next === 1 && opacity !== 1)) {
      setOpacity(next)
    }
  })
  return <CityRoads {...roads} edges={roads.edges ?? []} opacity={opacity} />
}

export function MorphWidget({
  graph = demoGraph,
  step,
}: {
  graph?: SchemaGraph
  step?: number
}) {
  const current = useStep(step)
  const host = useRef<HTMLDivElement>(null)
  const canvasBox = useRef<HTMLDivElement>(null)
  const palette = useCityPalette(host)
  const rows = useMemo(() => tableRows(graph), [graph])
  const city = useCity(graph)
  const rowElements = useRef(new Map<string, HTMLElement>())
  const [slabs, setSlabs] = useState<Slab[]>([])
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const clock = useWallClock(false)
  const playing = current >= 1

  // Overhead height that makes the table about as wide on the ground as the
  // city, so the rows travel a short way instead of shrinking to specks.
  const overhead = useMemo(() => {
    const aspect = 1920 / 1080
    const halfHeight = city.ground.width / aspect / 2
    return (halfHeight * 1.15) / Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180)
  }, [city.ground.width])

  useLayoutEffect(() => {
    if (!playing) {
      setStartedAt(null)
      return
    }
    if (!(palette && canvasBox.current)) {
      return
    }
    // Where each row is now, in the ground coordinates of the overhead camera.
    // A plane square to the view maps to the screen linearly, so a row's corners
    // land at the same share of the visible ground as of the canvas.
    const frame = canvasBox.current.getBoundingClientRect()
    const halfHeight = overhead * Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180)
    const halfWidth = halfHeight * (frame.width / frame.height)
    const { centre } = city.ground
    const ground = (px: number, py: number) => ({
      x: centre.x + ((px - frame.left) / frame.width - 0.5) * 2 * halfWidth,
      z: centre.z + ((py - frame.top) / frame.height - 0.5) * 2 * halfHeight,
    })
    const byId = city.placementsById
    const next: Slab[] = []
    rows.forEach((row, index) => {
      const element = rowElements.current.get(row.id)
      const placement = byId.get(row.id)
      if (!(element && placement)) {
        return
      }
      const rect = element.getBoundingClientRect()
      const a = ground(rect.left, rect.top)
      const b = ground(rect.right, rect.bottom)
      next.push({
        from: {
          x: (a.x + b.x) / 2,
          z: (a.z + b.z) / 2,
          width: b.x - a.x,
          depth: Math.max(0.05, (b.z - a.z) * 0.8),
        },
        to: {
          x: placement.position.x,
          z: placement.position.z,
          footprint: placement.footprint,
          height: city.heights.get(row.id) ?? placement.height,
        },
        colour: new THREE.Color(districtColour(placement.districtKind, palette)),
        delay: 0.15 + (STAGGER * index) / Math.max(1, rows.length - 1),
      })
    })
    setSlabs(next)
    setStartedAt(performance.now())
  }, [playing, palette, rows, city, overhead])

  return (
    <div className="relative h-full w-full bg-background" ref={host}>
      <div
        className="absolute inset-0 transition-opacity duration-500"
        ref={canvasBox}
        style={{ opacity: startedAt === null ? 0 : 1 }}
      >
        {palette ? (
          <Canvas
            camera={{ fov: CAMERA_FOV, near: 0.5, far: 4000 }}
            dpr={[1, 2]}
            resize={{ offsetSize: true }}
            shadows="percentage"
          >
            <Morph
              graph={graph}
              overhead={overhead}
              palette={palette}
              slabs={slabs}
              startedAt={startedAt}
            />
          </Canvas>
        ) : null}
      </div>
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: startedAt === null ? 1 : 0 }}
      >
        <SchemaTable
          graph={graph}
          rowRef={(id, element) => {
            if (element) {
              rowElements.current.set(id, element)
            } else {
              rowElements.current.delete(id)
            }
          }}
          rows={rows}
        />
        {clock.started ? (
          <p className="absolute top-6 right-10 font-bold text-[length:calc(var(--slide-label-size)*0.6)] text-[var(--slide-signal)] tabular-nums tracking-[var(--slide-label-tracking)]">
            {formatClock(clock.seconds)}
          </p>
        ) : null}
      </div>
    </div>
  )
}
