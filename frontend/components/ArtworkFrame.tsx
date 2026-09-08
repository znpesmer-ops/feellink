'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import type { ExhibitionArtwork } from '@/components/profile/exhibition/types'

export type GalleryArtworkSlot = {
  position: [number, number, number]
  rotation: [number, number, number]
  size: [number, number]
  spotlight: [number, number, number]
}

type ArtworkFrameProps = {
  artwork: ExhibitionArtwork
  index: number
  slot: GalleryArtworkSlot
  active?: boolean
  onSelect: (index: number) => void
}

function createFallbackTexture(artwork: ExhibitionArtwork) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1280
  const context = canvas.getContext('2d')
  if (!context) return new THREE.CanvasTexture(canvas)

  const palette = artwork.palette?.length ? artwork.palette : ['#182132', '#ed842f', '#f4efe7', '#c7a46a']
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  palette.slice(0, 4).forEach((color, index) => {
    gradient.addColorStop(index / Math.max(palette.slice(0, 4).length - 1, 1), color)
  })
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.globalAlpha = 0.32
  for (let index = 0; index < 9; index += 1) {
    context.fillStyle = palette[(index + 1) % palette.length]
    context.beginPath()
    context.ellipse(
      120 + ((index * 173) % 820),
      160 + ((index * 241) % 980),
      170 + (index % 3) * 56,
      80 + (index % 4) * 44,
      index * 0.72,
      0,
      Math.PI * 2,
    )
    context.fill()
  }
  context.globalAlpha = 1
  context.fillStyle = 'rgba(255,255,255,0.88)'
  context.font = '700 54px Inter, Arial, sans-serif'
  context.textAlign = 'center'
  context.fillText(artwork.title.slice(0, 24), canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function useArtworkTexture(artwork: ExhibitionArtwork) {
  const fallback = useMemo(() => createFallbackTexture(artwork), [artwork])
  const [texture, setTexture] = useState<THREE.Texture>(fallback)

  useEffect(() => {
    let active = true
    setTexture(fallback)

    if (!artwork.mediaUrl) return () => {
      active = false
    }

    const loader = new THREE.TextureLoader()
    loader.crossOrigin = 'anonymous'
    loader.load(
      artwork.mediaUrl,
      (loadedTexture) => {
        if (!active) {
          loadedTexture.dispose()
          return
        }
        loadedTexture.colorSpace = THREE.SRGBColorSpace
        loadedTexture.anisotropy = 12
        loadedTexture.generateMipmaps = true
        setTexture((current) => {
          if (current !== fallback) current.dispose()
          return loadedTexture
        })
      },
      undefined,
      () => undefined,
    )

    return () => {
      active = false
    }
  }, [artwork.mediaUrl, fallback])

  useEffect(() => {
    return () => {
      texture.dispose()
    }
  }, [texture])

  return texture
}

export function ArtworkFrame({ artwork, index, slot, active = false, onSelect }: ArtworkFrameProps) {
  const texture = useArtworkTexture(artwork)
  const [width, height] = slot.size
  const frameThickness = 0.062
  const frameDepth = 0.15

  return (
    <group position={slot.position} rotation={slot.rotation}>
      <mesh
        position={[0.1, -0.1, -0.13]}
        castShadow
        receiveShadow
        onClick={(event) => {
          event.stopPropagation()
          onSelect(index)
        }}
      >
        <boxGeometry args={[width + 0.48, height + 0.48, 0.1]} />
        <meshStandardMaterial color="#14110e" roughness={0.68} metalness={0.12} />
      </mesh>

      <mesh position={[0, 0, -0.13]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.34, height + 0.34, 0.16]} />
        <meshPhysicalMaterial color="#2b2118" roughness={0.38} metalness={0.18} clearcoat={0.36} clearcoatRoughness={0.22} />
      </mesh>

      <mesh position={[0, 0, 0.03]} onClick={(event) => {
        event.stopPropagation()
        onSelect(index)
      }}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} color="#ffffff" toneMapped={false} />
      </mesh>

      <mesh position={[0, 0, 0.043]}>
        <planeGeometry args={[width, height]} />
        <meshPhysicalMaterial
          color="#f7fbff"
          transparent
          opacity={0.032}
          roughness={0.02}
          metalness={0}
          transmission={0.22}
          clearcoat={1}
          clearcoatRoughness={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, height / 2 + frameThickness / 2, 0.075]} castShadow>
        <boxGeometry args={[width + 0.22, frameThickness, frameDepth + 0.03]} />
        <meshStandardMaterial color="#6c533b" roughness={0.36} metalness={0.16} />
      </mesh>
      <mesh position={[0, -height / 2 - frameThickness / 2, 0.075]} castShadow>
        <boxGeometry args={[width + 0.22, frameThickness, frameDepth + 0.03]} />
        <meshStandardMaterial color="#6c533b" roughness={0.36} metalness={0.16} />
      </mesh>
      <mesh position={[-width / 2 - frameThickness / 2, 0, 0.075]} castShadow>
        <boxGeometry args={[frameThickness, height + 0.22, frameDepth + 0.03]} />
        <meshStandardMaterial color="#6c533b" roughness={0.36} metalness={0.16} />
      </mesh>
      <mesh position={[width / 2 + frameThickness / 2, 0, 0.075]} castShadow>
        <boxGeometry args={[frameThickness, height + 0.22, frameDepth + 0.03]} />
        <meshStandardMaterial color="#6c533b" roughness={0.36} metalness={0.16} />
      </mesh>

      <mesh position={[0, -height / 2 - 0.48, 0.035]} castShadow receiveShadow>
        <boxGeometry args={[1.04, 0.34, 0.035]} />
        <meshStandardMaterial color="#f2eee6" roughness={0.62} metalness={0.02} />
      </mesh>
      <Suspense fallback={null}>
        <Text
          position={[-0.43, -height / 2 - 0.4, 0.063]}
          fontSize={0.055}
          maxWidth={0.74}
          lineHeight={1.12}
          color="#28231f"
          anchorX="left"
          anchorY="middle"
        >
          {artwork.title}
        </Text>
        <Text
          position={[-0.43, -height / 2 - 0.52, 0.063]}
          fontSize={0.036}
          maxWidth={0.78}
          color="#9b724d"
          anchorX="left"
          anchorY="middle"
        >
          {artwork.artistName}
        </Text>
      </Suspense>

      {active && (
        <mesh position={[0, 0, 0.082]}>
          <planeGeometry args={[width + 0.52, height + 0.52]} />
          <meshBasicMaterial color="#ff9a3d" transparent opacity={0.08} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}
