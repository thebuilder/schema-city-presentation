"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useMemo, useRef, useState } from "react"
import * as THREE from "three"
import {
  boardPalette,
  buildingPalette,
  CityRoads,
  CityWorld,
  useCity,
} from "@/deck/city/city-world"
import { type CityPalette, useCityPalette } from "@/deck/city/palette"
import { demoGraph } from "@/deck/city/schema-city"
import {
  Boards,
  Buildings,
  CAMERA_FOV,
  revealAt,
} from "@/deck/city/schema-city-scene"
import { useStill } from "@/deck/parts/beats"

// The three-quarter view the build-up slide settles on, as a height over a reach.
const ELEVATION = Math.atan2(0.62, Math.hypot(0.2, 1))
const START = Math.atan2(0.2, 1)
/** Radians per second, slow enough that the city reads as standing still. */
const ORBIT = 0.04
/** How far left of the city the camera aims, as a share of its span, so the
 * city sits to the right of the line. */
const AIM_LEFT = 0.2

const noop = () => undefined
const UP = new THREE.Vector3(0, 1, 0)

export function PlaceCity({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null)
  const palette = useCityPalette(host)
  const still = useStill()
  return (
    <div className={className} ref={host}>
      {palette ? (
        <Canvas
          camera={{ far: 4000, fov: CAMERA_FOV, near: 0.5 }}
          dpr={[1, 2]}
          resize={{ offsetSize: true }}
          shadows="percentage"
        >
          <PlaceScene palette={palette} still={still} />
        </Canvas>
      ) : null}
    </div>
  )
}

function PlaceScene({
  palette,
  still,
}: {
  palette: CityPalette
  still: boolean
}) {
  const city = useCity(demoGraph)
  const camera = useThree((state) => state.camera)
  const { centre, span } = city.ground
  const target = useMemo(
    () => new THREE.Vector3(centre.x, 0, centre.z),
    [centre]
  )
  const aim = useMemo(() => new THREE.Vector3(), [])
  const right = useMemo(() => new THREE.Vector3(), [])
  const [roads, setRoads] = useState(still ? 1 : 0)

  useFrame((state) => {
    const t = still ? 0 : state.clock.elapsedTime
    const angle = START + t * ORBIT
    const reach = span * 1.1
    const level = Math.cos(ELEVATION) * reach
    camera.position.set(
      target.x + Math.sin(angle) * level,
      Math.sin(ELEVATION) * reach,
      target.z + Math.cos(angle) * level
    )
    right.subVectors(target, camera.position).cross(UP).normalize()
    aim.copy(target).addScaledVector(right, -span * AIM_LEFT)
    camera.lookAt(aim)

    // The package's boot runs off the renderer's clock, which starts with the
    // slide, so the city builds itself as the line comes up.
    const next = revealAt(state.clock.elapsedTime, still).links
    if (Math.abs(next - roads) > 0.02 || (next === 1 && roads !== 1)) {
      setRoads(next)
    }
  })

  return (
    <>
      <CityWorld centre={centre} palette={palette} span={span} />
      <Boards
        districts={city.districts}
        fingers={[]}
        folders={[]}
        palette={boardPalette(palette)}
        reducedMotion={still}
        vias={[]}
      />
      <Buildings
        cells={city.cells}
        heights={city.heights}
        hovered={null}
        neighbours={null}
        onFocus={noop}
        onHover={noop}
        onSelect={noop}
        palette={buildingPalette(palette)}
        placements={city.placements}
        plazas={city.plazas}
        reducedMotion={still}
        scale={null}
        selected={null}
        windows={city.windows}
      />
      <CityRoads
        colour={palette.phosphor}
        edges={city.edges ?? []}
        opacity={roads}
        placementsById={city.placementsById}
      />
    </>
  )
}
