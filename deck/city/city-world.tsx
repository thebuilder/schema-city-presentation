"use client"

import { useFrame, useThree } from "@react-three/fiber"
import { useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import type { CityPalette } from "@/deck/city/palette"
import {
  buildFloorCells,
  type BuildingPalette,
  buildPlazaCells,
  cityBounds,
  cityDistricts,
  connectionsOf,
  ISLAND_PAD,
  type Placement,
  type SchemaEdge,
  type SchemaGraph,
} from "@/deck/city/schema-city"
import {
  atmosphere,
  type BoardPalette,
  buildLinkGeometry,
  buildRoadGeometry,
  GRID_FRAGMENT_SHADER,
  GRID_VERTEX_SHADER,
  SKY_FRAGMENT_SHADER,
  SKY_VERTEX_SHADER,
  SLAB_HEIGHT,
  tint,
} from "@/deck/city/schema-city-scene"

/*
 * The stage the package's buildings and boards stand on, rebuilt for slides. The
 * app's own Scene carries a camera rig, flight keys, an inspector and the boot
 * timing, none of which a slide wants, so this keeps its look (the sky, the
 * grid, the lights, the roads and the arcs) and drops the rest. Every position
 * still comes from the package's layout and every road from its router.
 */

export const buildingPalette = (palette: CityPalette): BuildingPalette => ({
  phosphor: palette.phosphor,
  dim: palette.dim,
  signal: palette.signal,
  amber: palette.amber,
  azure: palette.azure,
  background: palette.background,
  separator: palette.separator,
})

export const boardPalette = (palette: CityPalette): BoardPalette => ({
  land: palette.land,
  dim: palette.dim,
  amber: palette.amber,
  background: palette.background,
  mono: palette.mono,
})

/**
 * How far the three-quarter camera sits from the ground's centre, in spans. The
 * ct-baseline city is one small district beside a wide Elements board, and the
 * board's near edge ran off the bottom of the frame any closer than this.
 */
export const VIEW_DISTANCE = 1.6

/** Everything the package derives from a graph before anything is drawn. */
export function useCity(graph: SchemaGraph) {
  return useMemo(() => {
    const city = cityDistricts(graph)
    const nodesById = new Map(graph.nodes.map((node) => [node.id, node]))
    const edges = graph.edges ?? []
    const connections = connectionsOf(edges)
    const { cells, windows, heights } = buildFloorCells(
      nodesById,
      city.placements,
      connections
    )
    const plazas = buildPlazaCells(nodesById, city.placements)
    const placementsById = new Map(city.placements.map((p) => [p.id, p]))
    const bounds = cityBounds(city.placements)
    // The boards reach past the buildings, by the island pad and the district
    // names, so a camera framed on the buildings alone sits off centre.
    const minX = Math.min(...city.districts.map((d) => d.minX)) - ISLAND_PAD
    const maxX = Math.max(...city.districts.map((d) => d.maxX)) + ISLAND_PAD
    const minZ = Math.min(...city.districts.map((d) => d.minZ)) - ISLAND_PAD
    const maxZ = Math.max(...city.districts.map((d) => d.maxZ)) + ISLAND_PAD
    const ground = {
      centre: { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 },
      width: maxX - minX,
      depth: maxZ - minZ,
      span: Math.max(maxX - minX, maxZ - minZ, 4),
    }
    return {
      ground,
      ...city,
      edges,
      nodesById,
      connections,
      cells,
      windows,
      heights,
      plazas,
      placementsById,
      bounds,
      span: Math.max(bounds.width, bounds.depth, 4),
    }
  }, [graph])
}

/** Where a link leaves a roof, as the app computes it. */
export function roofAnchors(
  placements: Placement[],
  heights: Map<string, number>
) {
  return new Map(
    placements.map((placement) => [
      placement.id,
      {
        x: placement.position.x,
        y:
          (placement.y ?? 0) +
          (heights.get(placement.id) ?? placement.height) +
          0.05,
        z: placement.position.z,
      },
    ])
  )
}

const KEY_DIRECTION = new THREE.Vector3(-0.8, 0.9, 0.3).normalize()
const SHADOW_MAP = 2048
const GRID_Y = -(SLAB_HEIGHT + 0.1)

/**
 * The app's sky, fog, grid and three lights, sized once for a city of `span`
 * around `centre` instead of following an orbit camera.
 */
export function CityWorld({
  palette,
  span,
  centre,
}: {
  palette: CityPalette
  span: number
  centre: { x: number; z: number }
}) {
  const camera = useThree((state) => state.camera)
  const grid = useRef<THREE.Mesh>(null)
  const sky = useRef<THREE.Mesh>(null)
  const fog = useRef<THREE.Fog>(null)
  const key = useRef<THREE.DirectionalLight>(null)
  const colours = useMemo(
    () => ({
      horizon: tint(palette.background, palette.dim, 0.3),
      zenith: tint(palette.background, "#000000", 0.55),
    }),
    [palette]
  )
  const gridUniforms = useMemo(
    () => ({
      uGround: { value: new THREE.Color(palette.background) },
      uMinorColour: {
        value: new THREE.Color(palette.dim).lerp(
          new THREE.Color(palette.background),
          0.5
        ),
      },
      uMajorColour: { value: new THREE.Color(palette.dim) },
      uHorizon: { value: colours.horizon },
      uFogNear: { value: 1 },
      uFogFar: { value: 2 },
    }),
    [palette, colours]
  )
  const skyUniforms = useMemo(
    () => ({
      uZenith: { value: colours.zenith },
      uHorizon: { value: colours.horizon },
    }),
    [colours]
  )
  const target = useMemo(
    () => new THREE.Vector3(centre.x, 0, centre.z),
    [centre]
  )
  const reach = Math.max(12, span * 0.7)

  // A light's target only counts once its matrix is current, and a target that
  // is not in the scene is never updated by the renderer.
  useLayoutEffect(() => {
    key.current?.target.position.copy(target)
    key.current?.target.updateMatrixWorld()
  }, [target])

  useFrame(() => {
    const distance = camera.position.distanceTo(target)
    const { near, far } = atmosphere(span, distance)
    if (fog.current) {
      fog.current.near = near
      fog.current.far = far
    }
    const ground = (grid.current?.material as THREE.ShaderMaterial | undefined)
      ?.uniforms
    if (ground) {
      ground.uFogNear.value = near
      ground.uFogFar.value = far
    }
    grid.current?.position.set(camera.position.x, GRID_Y, camera.position.z)
    grid.current?.scale.setScalar(far * 2.2)
    sky.current?.position.copy(camera.position)
    sky.current?.scale.setScalar(far * 1.1)
    const perspective = camera as THREE.PerspectiveCamera
    if (perspective.far < far * 1.2) {
      perspective.far = far * 1.2
      perspective.updateProjectionMatrix()
    }
  })

  const keyPosition = target.clone().addScaledVector(KEY_DIRECTION, reach * 3)

  return (
    <>
      <color args={[colours.horizon]} attach="background" />
      <fog args={[colours.horizon, 1, 2]} attach="fog" ref={fog} />
      <hemisphereLight args={["#a8e8ff", "#101c1e", 0.7]} />
      <directionalLight
        castShadow
        color="#ffeef0"
        intensity={2.1}
        position={keyPosition}
        ref={key}
        shadow-bias={-0.0006}
        shadow-camera-bottom={-reach}
        shadow-camera-far={reach * 6}
        shadow-camera-left={-reach}
        shadow-camera-right={reach}
        shadow-camera-top={reach}
        shadow-mapSize={[SHADOW_MAP, SHADOW_MAP]}
        shadow-normalBias={0.05}
        shadow-radius={3}
      />
      <directionalLight
        color="#6fffe0"
        intensity={0.85}
        position={[-14, 8, -12]}
      />
      <directionalLight color="#cdeee5" intensity={0.4} position={[0, 40, 40]} />
      <mesh frustumCulled={false} ref={sky} renderOrder={-2}>
        <sphereGeometry args={[1, 32, 16]} />
        <shaderMaterial
          depthTest={false}
          depthWrite={false}
          fragmentShader={SKY_FRAGMENT_SHADER}
          side={THREE.BackSide}
          uniforms={skyUniforms}
          vertexShader={SKY_VERTEX_SHADER}
        />
      </mesh>
      <mesh
        frustumCulled={false}
        ref={grid}
        renderOrder={-1}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry />
        <shaderMaterial
          depthWrite={false}
          fragmentShader={GRID_FRAGMENT_SHADER}
          uniforms={gridUniforms}
          vertexShader={GRID_VERTEX_SHADER}
        />
      </mesh>
    </>
  )
}

/**
 * The allowed-child roads, from the package's router, as one flat ribbon mesh.
 * `opacity` is the caller's, so a slide can bring them in on its own timing.
 */
export function CityRoads({
  placementsById,
  edges,
  colour,
  opacity,
}: {
  placementsById: Map<string, Placement>
  edges: SchemaEdge[]
  colour: string
  opacity: number
}) {
  const positions = useMemo(
    () => buildRoadGeometry(placementsById, edges).positions,
    [placementsById, edges]
  )
  if (positions.length === 0) {
    return null
  }
  return (
    <mesh frustumCulled={false} visible={opacity > 0}>
      <bufferGeometry>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" />
      </bufferGeometry>
      <meshBasicMaterial
        color={colour}
        depthWrite={false}
        opacity={opacity * 0.75}
        side={THREE.DoubleSide}
        toneMapped={false}
        transparent
      />
    </mesh>
  )
}

/** One layer of links (composition arcs, block or picker runs) as line segments. */
export function CityLinks({
  layer,
  placementsById,
  anchors,
  edges,
  colour,
  opacity,
}: {
  layer: "compositions" | "blocks" | "references"
  placementsById: Map<string, Placement>
  anchors: Map<string, { x: number; y: number; z: number }>
  edges: SchemaEdge[]
  colour: string
  opacity: number
}) {
  const positions = useMemo(
    () => buildLinkGeometry(layer, edges, anchors, placementsById).positions,
    [layer, edges, anchors, placementsById]
  )
  if (positions.length === 0) {
    return null
  }
  return (
    <lineSegments frustumCulled={false} visible={opacity > 0}>
      <bufferGeometry>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" />
      </bufferGeometry>
      <lineBasicMaterial
        color={colour}
        depthWrite={false}
        opacity={opacity * 0.85}
        toneMapped={false}
        transparent
      />
    </lineSegments>
  )
}
