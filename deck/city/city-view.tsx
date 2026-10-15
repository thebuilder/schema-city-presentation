"use client"

import { useEffect, useMemo, useRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import type * as THREE from "three"
import { type CityPalette, useCityPalette } from "@/deck/city/palette"
import {
  buildFloorCells,
  buildPlazaCells,
  cityBounds,
  connectionsOf,
  type Placement,
  type SchemaGraph,
} from "@/deck/city/schema-city"
import { BuildingFrames, Buildings } from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/BuildingMeshes"

/** What the renderer did on the last frame, read off `gl.info` and the scene. */
export type RenderStats = {
  calls: number
  triangles: number
  /** Instanced meshes in the scene, which is what the boxes are drawn with. */
  meshes: number
  /** Boxes those meshes draw between them. */
  instances: number
}

type CityViewProps = {
  graph: SchemaGraph
  placements: Placement[]
  /** The building framed in the signal colour, as a click on it would. */
  selected?: string | null
  /** Draws every part as its triangles, the way the GPU is handed them. */
  wireframe?: boolean
  /** Radians per second the camera circles the city at. */
  orbit?: number
  /** Camera distance as a multiple of the city's larger side. */
  distance?: number
  /** Camera height over its distance, so 0.6 looks down a little over 30 degrees. */
  pitch?: number
  onStats?: (stats: RenderStats) => void
  className?: string
}

const noop = () => undefined
const NO_SELECTION = null

/**
 * Schema City's own buildings, from its own meshes and materials, lit by the deck
 * theme. Everything here is camera, light and framing; what a building is made of
 * and how it glows comes from the Schema City submodule unchanged.
 */
export function CityView({
  graph,
  placements,
  selected = null,
  wireframe = false,
  orbit = 0.12,
  distance = 0.95,
  pitch = 0.62,
  onStats,
  className,
}: CityViewProps) {
  const host = useRef<HTMLDivElement>(null)
  const palette = useCityPalette(host)
  return (
    <div className={className} ref={host}>
      {palette ? (
        <Canvas
          camera={{ far: 2000, fov: 32, near: 0.5 }}
          dpr={[1, 2]}
          gl={{ antialias: true }}
        >
          <CityScene
            distance={distance}
            graph={graph}
            onStats={onStats}
            orbit={orbit}
            palette={palette}
            pitch={pitch}
            placements={placements}
            selected={selected}
            wireframe={wireframe}
          />
        </Canvas>
      ) : null}
    </div>
  )
}

function CityScene({
  graph,
  placements,
  selected,
  wireframe,
  orbit,
  distance,
  pitch,
  palette,
  onStats,
}: Required<Omit<CityViewProps, "className" | "onStats">> & {
  palette: CityPalette
  onStats?: (stats: RenderStats) => void
}) {
  const city = useMemo(() => {
    const nodesById = new Map(graph.nodes.map((node) => [node.id, node]))
    const { cells, windows, heights } = buildFloorCells(
      nodesById,
      placements,
      connectionsOf(graph.edges ?? [])
    )
    return {
      frame: frameOf(placements, heights),
      cells,
      heights,
      placementsById: new Map(placements.map((p) => [p.id, p])),
      plazas: buildPlazaCells(nodesById, placements),
      windows,
    }
  }, [graph, placements])
  const reducedMotion = useReducedMotion()

  return (
    <>
      <hemisphereLight
        args={[palette.foreground, palette.background, 0.9]}
      />
      <directionalLight
        color={palette.foreground}
        intensity={1.8}
        position={[40, 60, 30]}
      />
      <directionalLight
        color={palette.phosphor}
        intensity={0.7}
        position={[-30, 20, -25]}
      />
      <Buildings
        cells={city.cells}
        heights={city.heights}
        hovered={NO_SELECTION}
        neighbours={NO_SELECTION}
        onFocus={noop}
        onHover={noop}
        onSelect={noop}
        palette={palette}
        placements={placements}
        plazas={city.plazas}
        reducedMotion={reducedMotion}
        scale={NO_SELECTION}
        selected={selected}
        windows={city.windows}
      />
      <BuildingFrames
        heights={city.heights}
        hovered={NO_SELECTION}
        palette={palette}
        placementsById={city.placementsById}
        reducedMotion={reducedMotion}
        selected={selected}
      />
      <Orbit
        frame={city.frame}
        distance={distance}
        pitch={pitch}
        speed={reducedMotion ? 0 : orbit}
      />
      <Wireframe on={wireframe} />
      {onStats ? <Stats onStats={onStats} /> : null}
    </>
  )
}

/** The sphere around every building, footprints and roofs included. */
function frameOf(placements: Placement[], heights: Map<string, number>) {
  const bounds = cityBounds(placements)
  const tallest = Math.max(0, ...heights.values())
  const half = {
    x: (bounds.width + (placements[0]?.footprint ?? 0)) / 2,
    y: tallest / 2,
    z: (bounds.depth + (placements[0]?.footprint ?? 0)) / 2,
  }
  return {
    radius: Math.hypot(half.x, half.y, half.z),
    x: bounds.centre.x,
    y: half.y,
    z: bounds.centre.z,
  }
}

function useReducedMotion() {
  return useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  )
}

/**
 * Circles the city from the south-east, where Schema City's camera starts, far
 * enough out that its bounding sphere fills the view whatever the canvas shape.
 */
function Orbit({
  frame,
  distance,
  pitch,
  speed,
}: {
  frame: { x: number; y: number; z: number; radius: number }
  distance: number
  pitch: number
  speed: number
}) {
  // Eased toward a new distance, so a step that moves the camera glides there.
  const eased = useRef(distance)
  useFrame((state, delta) => {
    eased.current += (distance - eased.current) * Math.min(1, delta * 2.5)
    const camera = state.camera as THREE.PerspectiveCamera
    // The narrower of the two fields decides, so a tall canvas does not crop sides.
    const half = (camera.fov * Math.PI) / 360
    const narrowest = Math.min(half, Math.atan(Math.tan(half) * camera.aspect))
    const reach = (frame.radius / Math.sin(narrowest)) * eased.current
    const angle = Math.PI / 4 + state.clock.elapsedTime * speed
    const level = Math.cos(Math.atan(pitch))
    camera.position.set(
      frame.x + Math.sin(angle) * reach * level,
      frame.y + reach * Math.sin(Math.atan(pitch)),
      frame.z + Math.cos(angle) * reach * level
    )
    camera.lookAt(frame.x, frame.y, frame.z)
  })
  return null
}

/** Every material in the scene drawn as its triangles, or back to solid. */
function Wireframe({ on }: { on: boolean }) {
  const scene = useThree((state) => state.scene)
  useFrame(() => {
    scene.traverse((object) => {
      const material = (object as THREE.Mesh).material as
        | (THREE.Material & { wireframe?: boolean })
        | undefined
      if (material && "wireframe" in material && material.wireframe !== on) {
        material.wireframe = on
        material.needsUpdate = true
      }
    })
  })
  return null
}

/** Reports `gl.info` twice a second, which is often enough for a number on a slide. */
function Stats({ onStats }: { onStats: (stats: RenderStats) => void }) {
  const last = useRef(0)
  const report = useRef(onStats)
  useEffect(() => {
    report.current = onStats
  }, [onStats])
  useFrame((state) => {
    if (state.clock.elapsedTime - last.current < 0.5) return
    last.current = state.clock.elapsedTime
    let meshes = 0
    let instances = 0
    let triangles = 0
    state.scene.traverse((object) => {
      const mesh = object as THREE.InstancedMesh
      if (!mesh.isInstancedMesh) return
      meshes += 1
      instances += mesh.count
      // Counted off the geometry, because gl.info counts a wireframe as lines.
      const { index, attributes } = mesh.geometry
      triangles += ((index?.count ?? attributes.position.count) / 3) * mesh.count
    })
    report.current({
      calls: state.gl.info.render.calls,
      instances,
      meshes,
      triangles,
    })
  })
  return null
}
