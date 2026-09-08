'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Html } from '@react-three/drei'
import { Bloom, EffectComposer, SSAO, Vignette } from '@react-three/postprocessing'
import { Maximize2, Move3D, Sparkles } from 'lucide-react'
import * as THREE from 'three'
import {
  DEFAULT_GALLERY_PALETTE,
  type ExhibitionArtwork,
  type ExhibitionPhase,
} from '@/components/profile/exhibition/types'

export type ExhibitionRoomHandle = {
  enterGallery: () => void
  exitGallery: () => void
  focusArtwork: (index: number, openDetails?: boolean) => void
  resetView: () => void
}

type ExhibitionRoomProps = {
  artworks: ExhibitionArtwork[]
  exhibitionName: string
  autoTour?: boolean
  onPhaseChange?: (phase: ExhibitionPhase) => void
  onArtworkChange?: (index: number) => void
  onArtworkActivate?: (index: number) => void
  onReady?: () => void
  onError?: (message: string) => void
}

type CameraView = {
  position: [number, number, number]
  yaw: number
  pitch: number
}

type GallerySlot = {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  width: number
  height: number
  labelOffset?: [number, number, number]
  focus: CameraView
  scale?: number
}

const INITIAL_VIEW: CameraView = {
  position: [0.12, 1.72, 7.35],
  yaw: 0,
  pitch: -0.018,
}

const ROOM_BOUNDS = {
  minX: -6.15,
  maxX: 6.0,
  minZ: -6.15,
  maxZ: 6.35,
}

const GALLERY_SLOTS: GallerySlot[] = [
  {
    id: 'left-wall-feature',
    position: [-5.86, 2.46, -3.25],
    rotation: [0, Math.PI / 2, 0],
    width: 1.22,
    height: 1.72,
    labelOffset: [0, -1.12, 0.105],
    focus: { position: [-3.58, 2.46, -3.25], yaw: Math.PI / 2, pitch: 0 },
    scale: 0.9,
  },
  {
    id: 'main-wall-left',
    position: [-3.55, 2.52, -5.78],
    rotation: [0, 0, 0],
    width: 1.72,
    height: 1.64,
    focus: { position: [-3.55, 2.52, -2.62], yaw: 0, pitch: 0 },
  },
  {
    id: 'main-wall-center',
    position: [-0.9, 2.54, -5.78],
    rotation: [0, 0, 0],
    width: 1.82,
    height: 1.72,
    focus: { position: [-0.9, 2.54, -2.6], yaw: 0, pitch: 0 },
  },
  {
    id: 'main-wall-right',
    position: [1.8, 2.52, -5.78],
    rotation: [0, 0, 0],
    width: 1.62,
    height: 1.68,
    focus: { position: [1.8, 2.52, -2.62], yaw: 0, pitch: 0 },
  },
  {
    id: 'main-wall-far-right',
    position: [4.15, 2.46, -5.78],
    rotation: [0, 0, 0],
    width: 1.28,
    height: 1.62,
    focus: { position: [4.15, 2.46, -2.66], yaw: 0, pitch: 0 },
    scale: 0.88,
  },
  {
    id: 'right-wall-deep',
    position: [5.84, 2.42, -4.25],
    rotation: [0, -Math.PI / 2, 0],
    width: 1.04,
    height: 1.82,
    focus: { position: [3.62, 2.42, -4.25], yaw: -Math.PI / 2, pitch: 0 },
    scale: 0.9,
  },
  {
    id: 'right-wall-mid',
    position: [5.84, 2.42, -2.52],
    rotation: [0, -Math.PI / 2, 0],
    width: 1.04,
    height: 1.82,
    focus: { position: [3.62, 2.42, -2.52], yaw: -Math.PI / 2, pitch: 0 },
    scale: 0.9,
  },
  {
    id: 'right-wall-front',
    position: [5.84, 2.42, -0.55],
    rotation: [0, -Math.PI / 2, 0],
    width: 1.04,
    height: 1.82,
    focus: { position: [3.62, 2.42, -0.55], yaw: -Math.PI / 2, pitch: 0 },
    scale: 0.9,
  },
]

const FLOOR_MARKS = [
  [-5.4, 0.8, 2.8, 0.22],
  [-2.2, -1.8, 3.2, -0.2],
  [1.8, 2.35, 4.4, 0.08],
  [4.95, -1.2, 3.4, -0.16],
  [0.4, 5.4, 4.8, 0.18],
  [-0.8, 0.2, 5.2, -0.04],
] as const

const FLOOR_SCUFFS = [
  [-5.9, -4.25, 2.8, 0.035, -0.2, 0.09],
  [-3.8, 2.95, 3.6, 0.026, 0.08, 0.08],
  [-2.2, 0.95, 2.4, 0.018, -0.36, 0.06],
  [-0.4, -3.4, 3.1, 0.025, 0.2, 0.075],
  [1.6, 3.7, 4.6, 0.022, -0.1, 0.07],
  [3.8, -1.55, 3.3, 0.02, 0.32, 0.062],
  [5.5, 1.85, 2.7, 0.018, -0.26, 0.056],
  [0.25, 0.2, 6.4, 0.018, 0.02, 0.055],
] as const

function useGalleryTexture(kind: 'floor' | 'wall' | 'wood' | 'paleWood') {
  return useMemo(() => {
    if (typeof document === 'undefined') return null
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const context = canvas.getContext('2d')
    if (!context) return null

    let seed = kind === 'floor' ? 143 : kind === 'paleWood' ? 417 : 271
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }

    const base = kind === 'floor' ? '#f8f3ea' : kind === 'paleWood' ? '#fbf7ef' : kind === 'wood' ? '#8b5d35' : '#cec5b8'
    context.fillStyle = base
    context.fillRect(0, 0, canvas.width, canvas.height)

    const grainCount = kind === 'floor' ? 1700 : kind === 'paleWood' ? 980 : kind === 'wood' ? 1300 : 720
    for (let index = 0; index < grainCount; index += 1) {
      const alpha =
        kind === 'floor'
          ? 0.01 + random() * 0.03
          : kind === 'paleWood'
            ? 0.004 + random() * 0.014
            : kind === 'wood'
              ? 0.018 + random() * 0.04
              : 0.01 + random() * 0.02
      const shade = kind === 'wood' ? (random() > 0.58 ? 178 : 72) : kind === 'paleWood' ? (random() > 0.55 ? 255 : 196) : random() > 0.52 ? 246 : 132
      context.fillStyle = kind === 'wood'
        ? `rgba(${shade}, ${Math.max(26, shade - 50)}, ${Math.max(14, shade - 90)}, ${alpha})`
        : kind === 'paleWood'
          ? `rgba(${shade}, ${Math.max(166, shade - 24)}, ${Math.max(126, shade - 52)}, ${alpha})`
        : `rgba(${shade}, ${shade}, ${shade}, ${alpha})`
      context.fillRect(
        random() * 512,
        random() * 512,
        kind === 'wood' || kind === 'paleWood' ? 1.4 + random() * 9 : 0.7 + random() * 1.8,
        kind === 'wood' || kind === 'paleWood' ? 0.35 + random() * 1.2 : 0.7 + random() * 1.8,
      )
    }

    if (kind === 'wood' || kind === 'paleWood') {
      for (let y = 24; y < 512; y += 26 + random() * 28) {
        context.beginPath()
        context.strokeStyle = kind === 'paleWood'
          ? `rgba(255, 252, 238, ${0.045 + random() * 0.06})`
          : `rgba(255, 215, 156, ${0.035 + random() * 0.055})`
        context.lineWidth = kind === 'paleWood' ? 0.55 + random() * 1.1 : 0.8 + random() * 1.6
        context.moveTo(0, y)
        context.bezierCurveTo(140, y + (random() - 0.5) * 12, 310, y + (random() - 0.5) * 16, 512, y + (random() - 0.5) * 10)
        context.stroke()
      }
      for (let index = 0; index < (kind === 'paleWood' ? 10 : 18); index += 1) {
        context.beginPath()
        context.strokeStyle = kind === 'paleWood'
          ? `rgba(154, 122, 83, ${0.018 + random() * 0.032})`
          : `rgba(64, 30, 13, ${0.045 + random() * 0.085})`
        context.lineWidth = kind === 'paleWood' ? 0.28 + random() * 0.72 : 0.4 + random() * 1.2
        const y = random() * 512
        context.ellipse(random() * 512, y, 22 + random() * 58, 3 + random() * 9, random() * 0.12, 0, Math.PI * 2)
        context.stroke()
      }
    } else if (kind === 'floor') {
      for (let index = 0; index < 96; index += 1) {
        context.beginPath()
        context.strokeStyle = `rgba(255, 247, 232, ${0.018 + random() * 0.038})`
        context.lineWidth = 0.16 + random() * 0.78
        const startX = random() * 512
        const startY = random() * 512
        context.moveTo(startX, startY)
        context.bezierCurveTo(
          startX + (random() - 0.5) * 110,
          startY + (random() - 0.5) * 90,
          startX + (random() - 0.5) * 180,
          startY + (random() - 0.5) * 140,
          startX + (random() - 0.5) * 250,
          startY + (random() - 0.5) * 180,
        )
        context.stroke()
      }
    } else {
      context.strokeStyle = 'rgba(82, 74, 64, 0.032)'
      context.lineWidth = 1
      for (let x = 64; x < 512; x += 82) {
        context.beginPath()
        context.moveTo(x, 0)
        context.lineTo(x + (random() - 0.5) * 4, 512)
        context.stroke()
      }
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(
      kind === 'floor' ? 5.2 : kind === 'paleWood' ? 5.8 : kind === 'wood' ? 3.4 : 1.4,
      kind === 'floor' ? 5.8 : kind === 'paleWood' ? 2.15 : kind === 'wood' ? 1.05 : 1.05,
    )
    texture.anisotropy = 4
    return texture
  }, [kind])
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizeAngle(angle: number) {
  let next = angle
  while (next > Math.PI) next -= Math.PI * 2
  while (next < -Math.PI) next += Math.PI * 2
  return next
}

function getArtworkImage(artwork: ExhibitionArtwork) {
  if (!artwork.mediaUrl) return null
  if (/^(https?:|data:|blob:)/i.test(artwork.mediaUrl)) return artwork.mediaUrl
  return artwork.mediaUrl.startsWith('/') ? artwork.mediaUrl : `/${artwork.mediaUrl}`
}

function getArtworkTextureUrl(url: string) {
  if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('/')) return url
  return `/api/proxy-image?url=${encodeURIComponent(url)}`
}

function createArtworkPlaceholderTexture(artwork: ExhibitionArtwork, aspect: number) {
  const colors = artwork.palette.length ? artwork.palette : DEFAULT_GALLERY_PALETTE
  const canvas = document.createElement('canvas')
  const longEdge = 640
  canvas.width = aspect >= 1 ? longEdge : Math.max(1, Math.round(longEdge * aspect))
  canvas.height = aspect >= 1 ? Math.max(1, Math.round(longEdge / aspect)) : longEdge
  const context = canvas.getContext('2d')
  if (!context) return new THREE.CanvasTexture(canvas)

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  colors.slice(0, 4).forEach((color, index, palette) => {
    gradient.addColorStop(index / Math.max(palette.length - 1, 1), color)
  })
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = 'rgba(255,255,255,0.16)'
  context.beginPath()
  context.ellipse(canvas.width * 0.7, canvas.height * 0.25, canvas.width * 0.34, canvas.height * 0.22, -0.4, 0, Math.PI * 2)
  context.fill()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 2
  return texture
}

function useGalleryArtworkTexture(artwork: ExhibitionArtwork, aspect: number, compact: boolean) {
  const fallback = useMemo(
    () => createArtworkPlaceholderTexture(artwork, aspect),
    [artwork.id, artwork.palette, aspect],
  )
  const [texture, setTexture] = useState<THREE.Texture>(fallback)

  useEffect(() => {
    let active = true
    let loadedTexture: THREE.Texture | null = null
    let video: HTMLVideoElement | null = null
    setTexture(fallback)

    const mediaUrl = getArtworkImage(artwork)
    if (!mediaUrl) return () => { active = false }

    if (artwork.mediaType?.toLowerCase().startsWith('video')) {
      video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.muted = true
      video.loop = true
      video.playsInline = true
      video.preload = 'metadata'
      video.src = mediaUrl
      const handleReady = () => {
        if (!active || !video) return
        const nextTexture = new THREE.VideoTexture(video)
        nextTexture.colorSpace = THREE.SRGBColorSpace
        nextTexture.minFilter = THREE.LinearFilter
        nextTexture.magFilter = THREE.LinearFilter
        loadedTexture = nextTexture
        setTexture(nextTexture)
        void video.play().catch(() => undefined)
      }
      video.addEventListener('loadeddata', handleReady, { once: true })
      video.load()
    } else {
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.decoding = 'async'
      image.onload = () => {
        if (!active) return
        const longEdge = compact ? 720 : 1080
        const canvas = document.createElement('canvas')
        canvas.width = aspect >= 1 ? longEdge : Math.max(1, Math.round(longEdge * aspect))
        canvas.height = aspect >= 1 ? Math.max(1, Math.round(longEdge / aspect)) : longEdge
        const context = canvas.getContext('2d')
        if (!context) return
        const imageAspect = image.naturalWidth / Math.max(image.naturalHeight, 1)
        let drawWidth = canvas.width
        let drawHeight = drawWidth / imageAspect
        if (drawHeight < canvas.height) {
          drawHeight = canvas.height
          drawWidth = drawHeight * imageAspect
        }
        context.fillStyle = '#f4f0e8'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(
          image,
          (canvas.width - drawWidth) / 2,
          (canvas.height - drawHeight) / 2,
          drawWidth,
          drawHeight,
        )
        const nextTexture = new THREE.CanvasTexture(canvas)
        nextTexture.colorSpace = THREE.SRGBColorSpace
        nextTexture.anisotropy = compact ? 2 : 4
        nextTexture.generateMipmaps = true
        loadedTexture = nextTexture
        setTexture(nextTexture)
      }
      image.src = getArtworkTextureUrl(mediaUrl)
    }

    return () => {
      active = false
      if (video) {
        video.pause()
        video.removeAttribute('src')
        video.load()
      }
      loadedTexture?.dispose()
    }
  }, [artwork, aspect, compact, fallback])

  useEffect(() => () => fallback.dispose(), [fallback])
  return texture
}

function getArtistName(exhibitionName: string, artworks: ExhibitionArtwork[]) {
  if (artworks[0]?.artistName) return artworks[0].artistName
  return exhibitionName.replace(/\s+sergisi\s*$/i, '').trim() || exhibitionName
}

function ArtworkPlaceholder({ palette, title }: { palette: string[]; title: string }) {
  const colors = palette.length ? palette : DEFAULT_GALLERY_PALETTE
  return (
    <div
      className="artwork-html-placeholder"
      aria-label={`${title} için galeri eseri yer tutucu`}
      style={{
        background: `
          radial-gradient(circle at 72% 18%, rgba(255, 236, 205, 0.42), transparent 21%),
          radial-gradient(circle at 18% 74%, ${colors[2] || '#ed842f'}80, transparent 28%),
          linear-gradient(135deg, ${colors[0]} 0%, ${colors[1] || '#665746'} 52%, ${colors[2] || '#ed842f'} 100%)
        `,
      }}
    >
      <span />
    </div>
  )
}

function TargetedSpot({
  position,
  target,
  intensity = 34,
  angle = 0.34,
  color = '#ffe0b3',
  penumbra = 0.78,
  decay = 2,
  distance = 9,
  shadowSize = 1024,
}: {
  position: [number, number, number]
  target: [number, number, number]
  intensity?: number
  angle?: number
  color?: string
  penumbra?: number
  decay?: number
  distance?: number
  shadowSize?: number
}) {
  const lightRef = useRef<THREE.SpotLight | null>(null)
  const targetRef = useRef<THREE.Object3D>(new THREE.Object3D())
  const { scene } = useThree()

  useEffect(() => {
    const targetObject = targetRef.current
    targetObject.position.set(...target)
    scene.add(targetObject)
    if (lightRef.current) lightRef.current.target = targetObject
    return () => {
      scene.remove(targetObject)
    }
  }, [scene, target])

  return (
    <spotLight
      ref={lightRef}
      position={position}
      color={color}
      intensity={intensity}
      angle={angle}
      penumbra={penumbra}
      distance={distance}
      decay={decay}
      castShadow
      shadow-mapSize-width={shadowSize}
      shadow-mapSize-height={shadowSize}
      shadow-bias={-0.002}
    />
  )
}

function GalleryLighting({ slots, compact }: { slots: GallerySlot[]; compact: boolean }) {
  const visibleSlots = slots.slice(0, compact ? 5 : slots.length)

  return (
    <>
      <ambientLight intensity={compact ? 0.26 : 0.3} color="#fffdf8" />
      <hemisphereLight args={['#fffaf2', '#d9d3ca', compact ? 0.38 : 0.44]} />
      {visibleSlots.map((slot) => {
        const [x, y, z] = slot.position
        let lightX = x
        let lightZ = z

        if (z < -5.4 && Math.abs(x) < 5.4) {
          lightZ = z + 2
        } else if (x > 5.4) {
          lightX = 4.05
        } else if (x < -5.4) {
          lightX = -4.05
        } else {
          lightZ = z + 1.6
        }

        return (
          <TargetedSpot
            key={`spot-${slot.id}`}
            position={[lightX, 5.6, lightZ]}
            target={[x, y - 0.1, z]}
            intensity={x > 5.4 ? (compact ? 28 : 44) : compact ? 34 : 58}
            angle={0.28}
            penumbra={0.65}
            decay={1.5}
            distance={9}
            color="#fff2dc"
            shadowSize={compact ? 384 : 512}
          />
        )
      })}
    </>
  )
}

function WallPanelLines() {
  return null
}

function TrackLighting({ compact }: { compact: boolean }) {
  const railMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#090909', roughness: 0.24, metalness: 0.92 }),
    [],
  )
  const grooveMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1c1712', roughness: 0.62, metalness: 0.18 }),
    [],
  )
  const headMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.15, metalness: 0.98 }),
    [],
  )
  const bulbMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: '#ffe8a0',
      emissive: '#ffcc44',
      emissiveIntensity: compact ? 2.2 : 3.0,
      roughness: 0.05,
      metalness: 0,
    }),
    [compact],
  )
  const stripMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#fff0d5',
        transparent: true,
        opacity: compact ? 0.2 : 0.24,
        depthWrite: false,
      }),
    [compact],
  )
  const beamMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffe7b8',
        transparent: true,
        opacity: compact ? 0.018 : 0.024,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [compact],
  )

  const railsX = compact ? [-3.1, 0, 3.1] : [-4.55, 0, 4.55]
  const crossZs = compact ? [-5.55, -2.0, 1.6, 5.15] : [-6.1, -2.25, 1.85, 5.95]
  const stripZs = compact ? [-4.0, -0.25, 3.75] : [-4.55, -0.25, 4.05]
  const spotZs = compact ? [-5.2, -2.55, 0.35, 3.05, 5.55] : [-6.45, -3.25, -0.15, 3.15, 6.35]

  return (
    <group position={[0, 5.72, 0.24]}>
      {crossZs.map((z) => (
        <mesh key={`ceiling-groove-${z}`} position={[0, -0.018, z]} material={grooveMat} receiveShadow>
          <boxGeometry args={[14.4, 0.018, 0.026]} />
        </mesh>
      ))}

      {stripZs.map((z) => (
        <mesh key={`ceiling-strip-${z}`} position={[0, -0.034, z]} material={stripMat}>
          <boxGeometry args={[2.7, 0.012, 0.045]} />
        </mesh>
      ))}

      {railsX.map((rx) => (
        <group key={rx}>
          <mesh position={[rx, -0.048, 0]} material={railMat} castShadow receiveShadow>
            <boxGeometry args={[0.038, 0.044, 14.4]} />
          </mesh>

          {spotZs.map((rz, index) => {
            const tiltY = rx < -0.2 ? -0.18 : rx > 0.2 ? 0.18 : index % 2 === 0 ? 0.08 : -0.08
            return (
              <group key={rz} position={[rx, -0.062, rz]}>
                <mesh position={[0, 0.012, 0]} material={headMat} castShadow>
                  <boxGeometry args={[0.14, 0.028, 0.055]} />
                </mesh>
                <mesh position={[0, -0.028, 0]} material={headMat} castShadow>
                  <cylinderGeometry args={[0.009, 0.009, 0.07, 10]} />
                </mesh>
                <group position={[0, -0.11, 0]} rotation={[0.32, tiltY, 0]}>
                  <mesh material={headMat} castShadow>
                    <cylinderGeometry args={[0.052, 0.038, 0.16, 18]} />
                  </mesh>
                  <mesh position={[0, -0.086, 0]} material={bulbMat}>
                    <sphereGeometry args={[0.017, 12, 12]} />
                  </mesh>
                  <mesh position={[0, -0.44, 0.06]} rotation={[Math.PI, 0, 0]} material={beamMat}>
                    <coneGeometry args={[0.34, 0.72, 32, 1, true]} />
                  </mesh>
                </group>
              </group>
            )
          })}
        </group>
      ))}

      {crossZs.map((z) => (
        <mesh key={`cross-rail-${z}`} position={[0, -0.052, z]} material={railMat} castShadow receiveShadow>
          <boxGeometry args={[10.6, 0.032, 0.032]} />
        </mesh>
      ))}
    </group>
  )
}

function FloorPatina({ compact }: { compact: boolean }) {
  if (compact) return null
  return (
    <>
      {FLOOR_SCUFFS.map(([x, z, width, height, rotation, opacity]) => (
        <mesh key={`${x}-${z}-${rotation}`} position={[x, 0.032, z]} rotation={[-Math.PI / 2, 0, rotation]}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial color="#f3efe7" transparent opacity={opacity * 0.22} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}

function GalleryArchitecture({ compact }: { compact: boolean }) {
  const concreteMaps = useLoader(THREE.TextureLoader, [
    '/textures/concrete_color.jpg',
    '/textures/concrete_roughness.jpg',
    '/textures/concrete_normal.jpg',
  ])
  const plasterMaps = useLoader(THREE.TextureLoader, [
    '/textures/plaster_color.jpg',
    '/textures/plaster_normal.jpg',
  ])
  const parquetMaps = useLoader(THREE.TextureLoader, [
    '/textures/parquet_color.jpg',
    '/textures/parquet_roughness.jpg',
    '/textures/parquet_normal.jpg',
  ])
  const ceilingMaps = useLoader(THREE.TextureLoader, [
    '/textures/ceiling_color.jpg',
    '/textures/ceiling_normal.jpg',
  ])
  const floorDetailTexture = useGalleryTexture('paleWood')
  const wallDetailTexture = useGalleryTexture('wall')

  const materialMaps = useMemo(() => {
    const [concreteColor, concreteRoughness, concreteNormal] = concreteMaps
    const [plasterColor, plasterNormal] = plasterMaps
    const [parquetColor, parquetRoughness, parquetNormal] = parquetMaps
    const [ceilingColor, ceilingNormal] = ceilingMaps
    const textureGroups = [
      { textures: [concreteColor, concreteRoughness, concreteNormal], repeat: [6, 12] as const },
      { textures: [plasterColor, plasterNormal], repeat: [4, 2] as const },
      { textures: [parquetColor, parquetRoughness, parquetNormal], repeat: [12, 20] as const },
      { textures: [ceilingColor, ceilingNormal], repeat: [4, 7] as const },
    ]

    textureGroups.forEach(({ textures, repeat }) => {
      textures.forEach((texture) => {
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(repeat[0], repeat[1])
        texture.anisotropy = compact ? 4 : 8
        texture.needsUpdate = true
      })
    })

    concreteColor.colorSpace = THREE.SRGBColorSpace
    plasterColor.colorSpace = THREE.SRGBColorSpace
    parquetColor.colorSpace = THREE.SRGBColorSpace
    ceilingColor.colorSpace = THREE.SRGBColorSpace

    return {
      concreteColor,
      concreteRoughness,
      concreteNormal,
      plasterColor,
      plasterNormal,
      parquetColor,
      parquetRoughness,
      parquetNormal,
      ceilingColor,
      ceilingNormal,
      plasterNormalScale: new THREE.Vector2(0.18, 0.18),
      concreteNormalScale: new THREE.Vector2(0.22, 0.22),
      parquetNormalScale: new THREE.Vector2(0.18, 0.18),
      ceilingNormalScale: new THREE.Vector2(0.2, 0.2),
    }
  }, [compact, concreteMaps, plasterMaps, parquetMaps, ceilingMaps])
  const baseMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ece8e0', roughness: 0.85 }), [])
  const BASE_H = 0.1
  const BASE_T = 0.012
  const ROOM_W = 17.2
  const ROOM_D = 16.0
  const ROOM_Z = 0.24

  return (
    <group>
      <mesh position={[0, -0.04, 0.24]} receiveShadow>
        <boxGeometry args={[17.2, 0.08, 16.0]} />
        <meshPhysicalMaterial
          color="#fbf7ef"
          roughnessMap={materialMaps.parquetRoughness}
          normalMap={materialMaps.parquetNormal}
          normalScale={materialMaps.parquetNormalScale}
          roughness={0.42}
          metalness={0.0}
          clearcoat={0.16}
          clearcoatRoughness={0.62}
          reflectivity={0.08}
        />
      </mesh>
      <mesh position={[0, 0.014, 0.24]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[17.2, 16.0, 1, 1]} />
        <meshPhysicalMaterial
          color="#fbf7ef"
          roughnessMap={materialMaps.parquetRoughness}
          normalMap={materialMaps.parquetNormal}
          normalScale={materialMaps.parquetNormalScale}
          roughness={0.42}
          metalness={0.0}
          clearcoat={0.16}
          clearcoatRoughness={0.62}
          reflectivity={0.08}
        />
      </mesh>
      <mesh position={[0, 0.02, 0.24]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[17.2, 16.0, 1, 1]} />
        <meshBasicMaterial color="#fffdf7" map={floorDetailTexture || undefined} transparent opacity={0.09} depthWrite={false} />
      </mesh>
      {[-7.7, -6.1, -4.5, -2.9, -1.3, 0.3, 1.9, 3.5, 5.1, 6.7].map((x) => (
        <mesh key={`floor-long-seam-${x}`} position={[x, 0.028, 0.24]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.012, 15.9]} />
        <meshBasicMaterial color="#f3e8d7" transparent opacity={0.004} depthWrite={false} />
        </mesh>
      ))}
      {[-6.8, -4.8, -2.8, -0.8, 1.2, 3.2, 5.2, 7.2].map((z, index) => (
        <mesh key={`floor-cross-seam-${z}`} position={[index % 2 === 0 ? -0.42 : 0.58, 0.029, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[15.9, 0.01]} />
          <meshBasicMaterial color="#f3e8d7" transparent opacity={0.002} depthWrite={false} />
        </mesh>
      ))}

      <mesh position={[0, 2.86, -5.92]} receiveShadow>
        <boxGeometry args={[15.9, 5.72, 0.24]} />
        <meshStandardMaterial color="#f0ece4" map={materialMaps.plasterColor} normalMap={materialMaps.plasterNormal} normalScale={materialMaps.plasterNormalScale} roughness={0.9} metalness={0.0} />
      </mesh>
      <mesh position={[0, 2.86, -5.786]} receiveShadow>
        <planeGeometry args={[15.66, 5.52, 1, 1]} />
        <meshBasicMaterial color="#fff7ee" map={wallDetailTexture || undefined} transparent opacity={0.02} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[6.02, 2.86, -0.56]} receiveShadow>
        <boxGeometry args={[0.24, 5.72, 10.9]} />
        <meshStandardMaterial color="#f0ece4" map={materialMaps.plasterColor} normalMap={materialMaps.plasterNormal} normalScale={materialMaps.plasterNormalScale} roughness={0.9} metalness={0.0} />
      </mesh>
      <mesh position={[5.884, 2.86, -0.56]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[10.66, 5.52, 1, 1]} />
        <meshBasicMaterial color="#fff7ee" map={wallDetailTexture || undefined} transparent opacity={0.02} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[-6.02, 2.86, -0.56]} receiveShadow>
        <boxGeometry args={[0.24, 5.72, 10.9]} />
        <meshStandardMaterial color="#f0ece4" map={materialMaps.plasterColor} normalMap={materialMaps.plasterNormal} normalScale={materialMaps.plasterNormalScale} roughness={0.9} metalness={0.0} />
      </mesh>
      <mesh position={[-5.884, 2.86, -0.56]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[10.66, 5.52, 1, 1]} />
        <meshBasicMaterial color="#fff7ee" map={wallDetailTexture || undefined} transparent opacity={0.02} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Closed front wall keeps the experience inside one square gallery room. */}
      <mesh position={[0, 2.86, ROOM_Z + ROOM_D / 2 - 0.12]} receiveShadow>
        <boxGeometry args={[ROOM_W, 5.72, 0.24]} />
        <meshStandardMaterial color="#f0ece4" map={materialMaps.plasterColor} normalMap={materialMaps.plasterNormal} normalScale={materialMaps.plasterNormalScale} roughness={0.9} metalness={0.0} />
      </mesh>
      <mesh position={[0, 2.86, ROOM_Z + ROOM_D / 2 - 0.246]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W - 0.24, 5.52, 1, 1]} />
        <meshBasicMaterial color="#fff7ee" map={wallDetailTexture || undefined} transparent opacity={0.018} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 5.78, 0.24]} receiveShadow>
        <boxGeometry args={[17.2, 0.18, 16.0]} />
        <meshStandardMaterial
          color="#ffffff"
          map={materialMaps.ceilingColor}
          normalMap={materialMaps.ceilingNormal}
          normalScale={materialMaps.ceilingNormalScale}
          roughness={0.95}
          metalness={0.0}
        />
      </mesh>
      <mesh position={[0, 5.675, 0.24]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[17.0, 15.8, 1, 1]} />
        <meshBasicMaterial
          color="#ffffff"
          map={wallDetailTexture || undefined}
          transparent
          opacity={0.018}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <WallPanelLines />
      <TrackLighting compact={compact} />
      <FloorPatina compact={compact} />

      {FLOOR_MARKS.map(([x, z, width, rotation]) => (
        <mesh key={`${x}-${z}`} position={[x, 0.012, z]} rotation={[0, rotation, 0]} receiveShadow>
          <boxGeometry args={[width, 0.006, 0.014]} />
        <meshBasicMaterial color="#d8cab9" transparent opacity={0.01} />
        </mesh>
      ))}

      <mesh position={[0.15, 0.018, 0.68]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[13.8, 13.1, 1, 1]} />
        <meshBasicMaterial color="#fffaf2" transparent opacity={0.002} />
      </mesh>
      <mesh position={[0.18, 0.026, -2.35]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[11.6, 5.8, 1, 1]} />
        <meshBasicMaterial color="#fffaf2" transparent opacity={0.002} />
      </mesh>
      <mesh position={[0, BASE_H / 2, ROOM_Z - ROOM_D / 2 + BASE_T / 2]} material={baseMat} receiveShadow>
        <boxGeometry args={[ROOM_W, BASE_H, BASE_T]} />
      </mesh>
      <mesh position={[ROOM_W / 2 - BASE_T / 2, BASE_H / 2, ROOM_Z]} material={baseMat} receiveShadow>
        <boxGeometry args={[BASE_T, BASE_H, ROOM_D]} />
      </mesh>
      <mesh position={[-ROOM_W / 2 + BASE_T / 2, BASE_H / 2, ROOM_Z]} material={baseMat} receiveShadow>
        <boxGeometry args={[BASE_T, BASE_H, ROOM_D]} />
      </mesh>
      <mesh position={[0, BASE_H / 2, ROOM_Z + ROOM_D / 2 - BASE_T / 2]} material={baseMat} receiveShadow>
        <boxGeometry args={[ROOM_W, BASE_H, BASE_T]} />
      </mesh>
    </group>
  )
}

function ArtistWallText({ artistName }: { artistName: string }) {
  return (
    <group position={[-5.86, 2.5, -4.72]} rotation={[0, Math.PI / 2, 0]}>
      <Html transform center distanceFactor={1.18} style={{ pointerEvents: 'none' }}>
        <div className="gallery-artist-text">
          <strong>{artistName}</strong>
          <span>
            Feellink seçkisi; eser, duygu analizi ve sanatçı belleğini gerçek galeri atmosferinde buluşturur.
          </span>
        </div>
      </Html>
    </group>
  )
}

function GalleryArtworkFrame({
  artwork,
  index,
  slot,
  active,
  compact,
  onSelect,
}: {
  artwork: ExhibitionArtwork
  index: number
  slot: GallerySlot
  active: boolean
  compact: boolean
  onSelect: (index: number, openDetails?: boolean) => void
}) {
  const frameDepth = 0.12
  const frameSize = 0.09 * (slot.scale || 1)
  const woodTexture = useGalleryTexture('wood')
  const artworkTexture = useGalleryArtworkTexture(artwork, slot.width / slot.height, compact)

  return (
    <group position={slot.position} rotation={slot.rotation}>
      {[1.08, 0.72, 0.46].map((scale, layer) => (
        <mesh key={`light-pool-${scale}`} position={[0, 0.12, -0.009 - layer * 0.002]} receiveShadow>
          <circleGeometry args={[Math.max(slot.width, slot.height) * (0.68 * scale), 64]} />
          <meshBasicMaterial
            color="#fff3de"
            transparent
            opacity={(active ? 0.012 : 0.007) + layer * 0.003}
            depthWrite={false}
          />
        </mesh>
      ))}
      <mesh position={[0.08, -0.12, -0.035]} receiveShadow>
        <planeGeometry args={[slot.width + 0.18, slot.height + 0.18]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.12} />
      </mesh>
      <mesh position={[0, 0, -0.035]} castShadow receiveShadow>
        <boxGeometry args={[slot.width + frameSize * 2.8, slot.height + frameSize * 2.8, frameDepth]} />
        <meshPhysicalMaterial color="#241f1a" roughness={0.38} metalness={0.28} clearcoat={0.18} clearcoatRoughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.034]} castShadow receiveShadow>
        <boxGeometry args={[slot.width + frameSize, slot.height + frameSize, 0.035]} />
        <meshPhysicalMaterial
          color="#8a6747"
          map={woodTexture || undefined}
          roughness={0.36}
          metalness={0.05}
          clearcoat={0.26}
          clearcoatRoughness={0.28}
        />
      </mesh>
      <mesh position={[0, 0, 0.065]} receiveShadow>
        <planeGeometry args={[slot.width, slot.height]} />
        <meshPhysicalMaterial color="#f8f3ea" roughness={0.78} metalness={0.01} clearcoat={0.08} clearcoatRoughness={0.78} />
      </mesh>
      <mesh
        position={[0, 0, 0.071]}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerOver={(event) => {
          event.stopPropagation()
          onSelect(index)
        }}
        onClick={(event) => {
          event.stopPropagation()
          onSelect(index, true)
        }}
      >
        <planeGeometry args={[slot.width, slot.height]} />
        <meshBasicMaterial map={artworkTexture} color={active ? '#ffffff' : '#f6f2ec'} toneMapped={false} />
      </mesh>
      <Html
        transform
        center
        position={slot.labelOffset || [0, -slot.height / 2 - 0.28, 0.088]}
        distanceFactor={0.82}
        zIndexRange={[12, 3]}
        style={{ pointerEvents: 'auto' }}
      >
        <button
          type="button"
          className={`gallery-label-3d ${active ? 'is-active' : ''}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onSelect(index, true)
          }}
        >
          <span>{artwork.title}</span>
          <small>{artwork.dna?.mood || 'Sanatsal DNA'}</small>
        </button>
      </Html>
    </group>
  )
}

function FirstPersonControls({
  phase,
  targetView,
  compact,
  onManualMove,
}: {
  phase: ExhibitionPhase
  targetView: CameraView | null
  compact: boolean
  onManualMove: () => void
}) {
  const { camera, gl } = useThree()
  const viewRef = useRef({
    position: new THREE.Vector3(...INITIAL_VIEW.position),
    yaw: INITIAL_VIEW.yaw,
    pitch: INITIAL_VIEW.pitch,
  })
  const targetRef = useRef<CameraView | null>(null)
  const keyRef = useRef<Record<string, boolean>>({})
  const dragRef = useRef({ active: false, x: 0, y: 0 })

  useEffect(() => {
    targetRef.current = targetView
  }, [targetView])

  useEffect(() => {
    const canvas = gl.domElement
    canvas.tabIndex = 0

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) return
      keyRef.current[key] = true
      targetRef.current = null
      onManualMove()
      event.preventDefault()
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      keyRef.current[event.key.toLowerCase()] = false
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (phase !== 'gallery') return
      dragRef.current = { active: true, x: event.clientX, y: event.clientY }
      canvas.setPointerCapture?.(event.pointerId)
      canvas.focus()
    }
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragRef.current.active || phase !== 'gallery') return
      const dx = event.clientX - dragRef.current.x
      const dy = event.clientY - dragRef.current.y
      dragRef.current = { active: true, x: event.clientX, y: event.clientY }
      viewRef.current.yaw = normalizeAngle(viewRef.current.yaw - dx * (compact ? 0.0042 : 0.0032))
      viewRef.current.pitch = clamp(viewRef.current.pitch - dy * 0.0022, -0.42, 0.25)
      targetRef.current = null
      onManualMove()
    }
    const endDrag = (event: PointerEvent) => {
      dragRef.current.active = false
      try {
        canvas.releasePointerCapture?.(event.pointerId)
      } catch {
        // Pointer capture may already be released by the browser.
      }
    }
    const handleWheel = (event: WheelEvent) => {
      if (phase !== 'gallery') return
      const direction = new THREE.Vector3(-Math.sin(viewRef.current.yaw), 0, -Math.cos(viewRef.current.yaw))
      viewRef.current.position.addScaledVector(direction, clamp(event.deltaY * -0.004, -0.28, 0.28))
      viewRef.current.position.x = clamp(viewRef.current.position.x, ROOM_BOUNDS.minX, ROOM_BOUNDS.maxX)
      viewRef.current.position.z = clamp(viewRef.current.position.z, ROOM_BOUNDS.minZ, ROOM_BOUNDS.maxZ)
      targetRef.current = null
      onManualMove()
      event.preventDefault()
    }

    window.addEventListener('keydown', handleKeyDown, { passive: false })
    window.addEventListener('keyup', handleKeyUp)
    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', endDrag)
    canvas.addEventListener('pointercancel', endDrag)
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', endDrag)
      canvas.removeEventListener('pointercancel', endDrag)
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [compact, gl.domElement, onManualMove, phase])

  useFrame((_, delta) => {
    const view = viewRef.current
    const target = targetRef.current
    if (target) {
      const targetPosition = new THREE.Vector3(...target.position)
      view.position.lerp(targetPosition, 1 - Math.pow(0.0009, delta))
      view.yaw = normalizeAngle(view.yaw + normalizeAngle(target.yaw - view.yaw) * (1 - Math.pow(0.0012, delta)))
      view.pitch += (target.pitch - view.pitch) * (1 - Math.pow(0.0012, delta))
    } else if (phase === 'gallery') {
      const keys = keyRef.current
      const speed = (compact ? 2.35 : 3.15) * delta
      const forward = new THREE.Vector3(-Math.sin(view.yaw), 0, -Math.cos(view.yaw))
      const right = new THREE.Vector3(Math.cos(view.yaw), 0, -Math.sin(view.yaw))
      const move = new THREE.Vector3()
      if (keys.w || keys.arrowup) move.add(forward)
      if (keys.s || keys.arrowdown) move.sub(forward)
      if (keys.d || keys.arrowright) move.add(right)
      if (keys.a || keys.arrowleft) move.sub(right)
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(speed)
        view.position.add(move)
        view.position.x = clamp(view.position.x, ROOM_BOUNDS.minX, ROOM_BOUNDS.maxX)
        view.position.z = clamp(view.position.z, ROOM_BOUNDS.minZ, ROOM_BOUNDS.maxZ)
      }
    }

    camera.position.copy(view.position)
    camera.quaternion.setFromEuler(new THREE.Euler(view.pitch, view.yaw, 0, 'YXZ'))
  })

  return null
}

function EmptyGalleryNote() {
  return (
    <Html transform center position={[0, 2.3, -4.78]} distanceFactor={1.3}>
      <div className="empty-gallery-note-3d">
        <strong>Henüz eser yok</strong>
        <span>İlk eser yüklendiğinde bu gerçek galeri duvarlarında yerini alacak.</span>
      </div>
    </Html>
  )
}

function GalleryPostProcessing({ compact }: { compact: boolean }) {
  if (compact) return null

  return (
    <EffectComposer multisampling={2} enableNormalPass>
      <SSAO
        samples={24}
        rings={4}
        radius={0.22}
        intensity={18}
        luminanceInfluence={0.54}
        distanceThreshold={0.86}
        distanceFalloff={0.16}
        rangeThreshold={0.42}
        rangeFalloff={0.22}
        worldDistanceThreshold={0.9}
        worldDistanceFalloff={0.16}
        worldProximityThreshold={0.58}
        worldProximityFalloff={0.2}
      />
      <Bloom intensity={0.16} luminanceThreshold={0.72} luminanceSmoothing={0.26} mipmapBlur />
      <Vignette offset={0.2} darkness={0.43} eskil={false} />
    </EffectComposer>
  )
}

function GalleryScene({
  artworks,
  exhibitionName,
  activeIndex,
  phase,
  targetView,
  compact,
  onReady,
  onManualMove,
  onArtworkSelect,
}: {
  artworks: ExhibitionArtwork[]
  exhibitionName: string
  activeIndex: number
  phase: ExhibitionPhase
  targetView: CameraView | null
  compact: boolean
  onReady: () => void
  onManualMove: () => void
  onArtworkSelect: (index: number, openDetails?: boolean) => void
}) {
  const visibleArtworks = artworks.slice(0, GALLERY_SLOTS.length)
  const artistName = getArtistName(exhibitionName, artworks)

  useEffect(() => {
    onReady()
  }, [onReady])

  return (
    <>
      <color attach="background" args={['#ede7dd']} />
      <fog attach="fog" args={['#d8cec0', 22, 48]} />
      {!compact && <Environment preset="apartment" environmentIntensity={0.42} />}
      <GalleryLighting slots={GALLERY_SLOTS} compact={compact} />
      <GalleryArchitecture compact={compact} />
      <ArtistWallText artistName={artistName} />
      {visibleArtworks.map((artwork, index) => (
        <GalleryArtworkFrame
          key={artwork.id}
          artwork={artwork}
          index={index}
          slot={GALLERY_SLOTS[index]}
          active={activeIndex === index}
          compact={compact}
          onSelect={onArtworkSelect}
        />
      ))}
      {!visibleArtworks.length && <EmptyGalleryNote />}
      {!compact && (
        <ContactShadows
          position={[0, 0.035, 0.75]}
          opacity={0.5}
          scale={14}
          blur={2.8}
          far={6.4}
          resolution={512}
          color="#15110e"
        />
      )}
      <GalleryPostProcessing compact={compact} />
      <FirstPersonControls phase={phase} targetView={targetView} compact={compact} onManualMove={onManualMove} />
    </>
  )
}

export const ExhibitionRoom = forwardRef<ExhibitionRoomHandle, ExhibitionRoomProps>(function ExhibitionRoom(
  {
    artworks,
    exhibitionName,
    autoTour = false,
    onPhaseChange = () => undefined,
    onArtworkChange = () => undefined,
    onArtworkActivate = () => undefined,
    onReady = () => undefined,
    onError = () => undefined,
  },
  ref,
) {
  const roomRef = useRef<HTMLDivElement | null>(null)
  const phaseTimeoutRef = useRef<number | null>(null)
  const [phase, setPhaseState] = useState<ExhibitionPhase>('gallery')
  const [activeIndex, setActiveIndex] = useState(0)
  const [targetView, setTargetView] = useState<CameraView | null>(INITIAL_VIEW)
  const [compact, setCompact] = useState(false)
  const [ready, setReady] = useState(false)
  const visibleArtworks = useMemo(() => artworks.slice(0, GALLERY_SLOTS.length), [artworks])

  const setPhase = useCallback(
    (nextPhase: ExhibitionPhase) => {
      setPhaseState(nextPhase)
      onPhaseChange(nextPhase)
    },
    [onPhaseChange],
  )

  const handleReady = useCallback(() => {
    setReady(true)
    onReady()
  }, [onReady])

  const handleManualMove = useCallback(() => {
    if (targetView) setTargetView(null)
  }, [targetView])

  const focusArtwork = useCallback(
    (index: number, openDetails = false) => {
      if (!artworks.length) return
      const safeIndex = ((index % artworks.length) + artworks.length) % artworks.length
      const slot = GALLERY_SLOTS[safeIndex % GALLERY_SLOTS.length]
      setActiveIndex(safeIndex)
      onArtworkChange(safeIndex)
      setPhase('gallery')
      setTargetView(slot.focus)
      if (openDetails) onArtworkActivate(safeIndex)
    },
    [artworks.length, onArtworkActivate, onArtworkChange, setPhase],
  )

  const enterGallery = useCallback(() => {
    if (phaseTimeoutRef.current) window.clearTimeout(phaseTimeoutRef.current)
    setPhase('entering')
    setTargetView(INITIAL_VIEW)
    phaseTimeoutRef.current = window.setTimeout(() => {
      setPhase('gallery')
      setTargetView(INITIAL_VIEW)
    }, 560)
  }, [setPhase])

  const exitGallery = useCallback(() => {
    if (phaseTimeoutRef.current) window.clearTimeout(phaseTimeoutRef.current)
    setPhase('gallery')
    setTargetView(INITIAL_VIEW)
  }, [setPhase])

  const resetView = useCallback(() => {
    setPhase('gallery')
    setTargetView(INITIAL_VIEW)
  }, [setPhase])

  useImperativeHandle(
    ref,
    () => ({
      enterGallery,
      exitGallery,
      focusArtwork,
      resetView,
    }),
    [enterGallery, exitGallery, focusArtwork, resetView],
  )

  useEffect(() => {
    const room = roomRef.current
    if (!room) return undefined
    const update = () => {
      const coarsePointer = window.matchMedia('(pointer: coarse)').matches
      const limitedCpu = navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4
      const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
      const limitedMemory = typeof deviceMemory === 'number' && deviceMemory <= 4
      setCompact(room.clientWidth < 980 || coarsePointer || limitedCpu || limitedMemory)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(room)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = roomRef.current?.querySelector('canvas')
    if (!canvas) return undefined
    const handleContextLost = (event: Event) => {
      event.preventDefault()
      onError('Bu cihazda 3B görünüm geçici olarak durdu. Yeniden deneyebilirsiniz.')
    }
    canvas.addEventListener('webglcontextlost', handleContextLost)
    return () => canvas.removeEventListener('webglcontextlost', handleContextLost)
  }, [ready, onError])

  useEffect(() => {
    return () => {
      if (phaseTimeoutRef.current) window.clearTimeout(phaseTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (activeIndex >= artworks.length) setActiveIndex(0)
  }, [activeIndex, artworks.length])

  useEffect(() => {
    if (!autoTour || phase !== 'gallery' || artworks.length < 2) return undefined
    const tour = window.setInterval(() => {
      focusArtwork(activeIndex + 1)
    }, 6200)
    return () => window.clearInterval(tour)
  }, [activeIndex, artworks.length, autoTour, focusArtwork, phase])

  const handleArtworkSelect = useCallback(
    (index: number, openDetails = false) => {
      focusArtwork(index, openDetails)
    },
    [focusArtwork],
  )

  const viewportClass = phase === 'entering' ? 'is-entering' : 'is-gallery'
  return (
    <div
      ref={roomRef}
      data-gallery-room="reference-walkable-3d-2026-06-29"
      className={`gallery-room-3d ${viewportClass}`}
      role="application"
      aria-label={`${exhibitionName} yürünebilir dijital sergi odası`}
    >
      <style jsx>{`
        .gallery-room-3d {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 520px;
          overflow: hidden;
          isolation: isolate;
          background:
            radial-gradient(circle at 50% 42%, rgba(224, 196, 156, 0.2), transparent 43%),
            linear-gradient(180deg, #51473d 0%, #211d19 100%);
          outline: none;
        }

        .gallery-room-3d :global(canvas) {
          cursor: grab;
          touch-action: none;
          outline: none;
        }

        .gallery-room-3d :global(canvas:active) {
          cursor: grabbing;
        }

        :global(.artwork-html-surface) {
          display: block;
          overflow: hidden;
          border: 0;
          padding: 0;
          background:
            linear-gradient(145deg, rgba(255, 249, 239, 0.96), rgba(232, 221, 203, 0.98)),
            #eee3d2;
          box-shadow:
            inset 0 0 0 2px rgba(246, 237, 222, 0.92),
            inset 0 0 0 3px rgba(28, 22, 17, 0.08);
          cursor: pointer;
          contain: strict;
          backface-visibility: hidden;
          transform: translate3d(0, 0, 0);
          transform-origin: 50% 50%;
          transition:
            filter 280ms ease,
            box-shadow 280ms ease;
        }

        :global(.artwork-html-surface.is-active) {
          transform: translate3d(0, 0, 0);
          box-shadow:
            inset 0 0 0 2px rgba(248, 239, 224, 0.95),
            inset 0 0 0 3px rgba(255, 188, 92, 0.18),
            0 0 28px rgba(255, 213, 160, 0.16);
        }

        :global(.artwork-html-surface img),
        :global(.artwork-html-surface video) {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          background:
            radial-gradient(circle at 50% 42%, rgba(255, 247, 232, 0.62), rgba(226, 215, 198, 0.72) 72%),
            #ede3d2;
          filter: brightness(0.96) saturate(0.98) contrast(1.01);
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
        }

        :global(.artwork-html-placeholder) {
          display: grid;
          place-items: center;
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          object-fit: cover;
          filter: brightness(0.86) saturate(0.84) contrast(0.96);
          transform: translateZ(0);
        }

        :global(.artwork-html-placeholder span) {
          position: absolute;
          inset: 15% 19%;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background:
            linear-gradient(130deg, rgba(255, 255, 255, 0.16), transparent 42%),
            radial-gradient(circle at 36% 42%, rgba(255, 255, 255, 0.18), transparent 24%);
          opacity: 0.5;
          transform: rotate(-18deg);
        }

        :global(.gallery-label-3d) {
          display: grid;
          width: 150px;
          max-width: 150px;
          gap: 3px;
          border: 0;
          border-left: 1px solid rgba(75, 62, 48, 0.24);
          border-radius: 7px;
          background: rgba(244, 237, 225, 0.88);
          padding: 8px 10px;
          color: #251f19;
          text-align: left;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: background 240ms ease, transform 240ms ease;
        }

        :global(.gallery-label-3d.is-active) {
          background: rgba(255, 246, 231, 0.96);
          transform: translateY(-2px);
        }

        :global(.gallery-label-3d span) {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0;
        }

        :global(.gallery-label-3d small) {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: rgba(65, 54, 43, 0.62);
          font-size: 8px;
          font-weight: 700;
        }

        :global(.gallery-artist-text) {
          width: 180px;
          color: #29221b;
          text-align: left;
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.24);
        }

        :global(.gallery-artist-text strong) {
          display: block;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0;
        }

        :global(.gallery-artist-text span) {
          display: block;
          margin-top: 10px;
          width: 150px;
          font-size: 7px;
          line-height: 1.7;
          color: rgba(43, 35, 27, 0.62);
        }

        :global(.empty-gallery-note-3d) {
          width: 280px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 22px;
          background: rgba(23, 20, 17, 0.72);
          padding: 20px;
          color: rgba(255, 255, 255, 0.86);
          text-align: center;
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.36);
          backdrop-filter: blur(20px);
        }

        :global(.empty-gallery-note-3d strong) {
          display: block;
          font-size: 18px;
        }

        :global(.empty-gallery-note-3d span) {
          display: block;
          margin-top: 8px;
          color: rgba(255, 255, 255, 0.58);
          font-size: 12px;
          line-height: 1.5;
        }

        .gallery-vignette {
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: 6;
          background:
            radial-gradient(ellipse at center, transparent 60%, rgba(0, 0, 0, 0.22) 100%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.08), transparent 18%, transparent 78%, rgba(0, 0, 0, 0.16));
          mix-blend-mode: multiply;
        }

        .gallery-help {
          position: absolute;
          right: 18px;
          bottom: 18px;
          z-index: 30;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          background: rgba(16, 15, 14, 0.42);
          padding: 8px 10px;
          color: rgba(255, 255, 255, 0.72);
          font-size: 11px;
          font-weight: 700;
          backdrop-filter: blur(12px);
          opacity: 0.82;
          pointer-events: none;
        }

        .gallery-help svg {
          width: 14px;
          height: 14px;
          color: #ffad61;
        }

        .gallery-loading {
          position: absolute;
          inset: 0;
          z-index: 50;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(2px);
          pointer-events: none;
        }

        .gallery-loading span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.28);
          padding: 8px 14px;
          color: white;
          font-size: 12px;
          font-weight: 800;
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.26);
          backdrop-filter: blur(18px);
        }

        @media (max-width: 760px) {
          .gallery-room-3d {
            min-height: 520px;
          }

          :global(.artwork-html-surface img),
          :global(.artwork-html-surface video),
          :global(.artwork-html-placeholder) {
            filter: brightness(0.87) saturate(0.86) contrast(0.95);
          }

          :global(.gallery-label-3d) {
            width: 128px;
            max-width: 128px;
            padding: 7px 9px;
          }

          .gallery-help {
            left: 16px;
            right: auto;
            bottom: 16px;
            max-width: calc(100% - 32px);
          }
        }
      `}</style>

      <Canvas
        shadows={!compact}
        dpr={compact ? [0.85, 1.15] : [1, 1.65]}
        camera={{ position: INITIAL_VIEW.position, fov: compact ? 64 : 60, near: 0.08, far: 60 }}
        gl={{
          antialias: !compact,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = compact ? 1.12 : 1.08
          gl.shadowMap.enabled = !compact
          gl.shadowMap.type = THREE.PCFSoftShadowMap
          ;(gl as THREE.WebGLRenderer & { physicallyCorrectLights?: boolean }).physicallyCorrectLights = true
        }}
      >
        <GalleryScene
          artworks={visibleArtworks}
          exhibitionName={exhibitionName}
          activeIndex={activeIndex}
          phase={phase}
          targetView={targetView}
          compact={compact}
          onReady={handleReady}
          onManualMove={handleManualMove}
          onArtworkSelect={handleArtworkSelect}
        />
      </Canvas>

      <div className="gallery-vignette" aria-hidden="true" />

      <div className="gallery-help" aria-hidden="true">
        {compact ? <Maximize2 /> : <Move3D />}
        {compact ? 'Sürükle ve dokun' : 'Fareyle bak, WASD / oklarla yürü'}
      </div>

      {(!ready || phase === 'entering') && (
        <div className="gallery-loading">
          <span>
            <Sparkles className="h-4 w-4 text-[#ffad61]" />
            Galeri hazırlanıyor
          </span>
        </div>
      )}
    </div>
  )
})
