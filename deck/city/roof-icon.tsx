"use client"

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"

/*
 * A Document Type's icon, painted flat on its roof the way Schema City does it.
 * The app reads each icon's SVG from the backoffice's icon registry, which a
 * slide has no access to, so the few icons the build-up needs are written out
 * here. Umbraco's icon set is drawn from Lucide, and these are Lucide's paths
 * (ISC licence) for the same names.
 */
const ICONS: Record<string, string> = {
  "icon-document":
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h8"/><path d="M8 17h8"/>',
  "icon-newspaper":
    '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>',
  "icon-code":
    '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
}

/** Pixels per side of the rasterised icon. */
const PX = 128
/** The icon and its darker cap, as fractions of the building's footprint. */
const ICON_FOOTPRINT = 0.6
const CAP_FOOTPRINT = 0.72
/** Seconds the icon takes to fade in once it is shown. */
const FADE = 0.4

function useIconTexture(icon: string, colour: string) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null)
  useEffect(() => {
    const paths = ICONS[icon]
    if (!paths) {
      return
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PX}" height="${PX}" viewBox="0 0 24 24" fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
    const image = new Image()
    let made: THREE.CanvasTexture | null = null
    let live = true
    image.onload = () => {
      if (!live) {
        return
      }
      const canvas = document.createElement("canvas")
      canvas.width = PX
      canvas.height = PX
      canvas.getContext("2d")?.drawImage(image, 0, 0, PX, PX)
      made = new THREE.CanvasTexture(canvas)
      made.colorSpace = THREE.SRGBColorSpace
      setTexture(made)
    }
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    return () => {
      live = false
      made?.dispose()
    }
  }, [icon, colour])
  return texture
}

export function RoofIcon({
  icon,
  x,
  y,
  z,
  footprint,
  colour,
  background,
  shown,
  delay = 0,
}: {
  icon: string
  x: number
  y: number
  z: number
  footprint: number
  colour: string
  background: string
  shown: boolean
  delay?: number
}) {
  const texture = useIconTexture(icon, colour)
  const iconMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const capMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const time = useRef(0)
  const flat = useMemo(() => new THREE.Euler(-Math.PI / 2, 0, 0), [])

  useFrame((_, delta) => {
    time.current = shown ? time.current + delta : 0
    const fade = THREE.MathUtils.clamp((time.current - delay) / FADE, 0, 1)
    if (iconMaterial.current) {
      iconMaterial.current.opacity = fade
    }
    if (capMaterial.current) {
      capMaterial.current.opacity = fade * 0.55
    }
  })

  if (!texture) {
    return null
  }
  return (
    <group position={[x, y, z]}>
      <mesh
        position={[0, 0.02, 0]}
        rotation={flat}
        scale={footprint * CAP_FOOTPRINT}
      >
        <planeGeometry />
        <meshBasicMaterial
          color={background}
          depthWrite={false}
          opacity={0}
          ref={capMaterial}
          transparent
        />
      </mesh>
      <mesh
        position={[0, 0.03, 0]}
        renderOrder={1}
        rotation={flat}
        scale={footprint * ICON_FOOTPRINT}
      >
        <planeGeometry />
        <meshBasicMaterial
          alphaTest={0.08}
          depthWrite={false}
          map={texture}
          opacity={0}
          ref={iconMaterial}
          toneMapped={false}
          transparent
        />
      </mesh>
    </group>
  )
}
