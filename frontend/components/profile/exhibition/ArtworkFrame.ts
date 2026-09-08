import type { Group, Mesh, Vector3, WebGLRenderer } from 'three'
import type { ExhibitionArtwork } from './types'

type ThreeModule = typeof import('three')

type ArtworkFrameProps = {
  THREE: ThreeModule
  parent: Group
  artwork: ExhibitionArtwork
  index: number
  position: [number, number, number]
  rotationY: number
  width: number
  height: number
  renderer: WebGLRenderer
  textureCache: Map<string, any>
  isDisposed: () => boolean
}

export type ArtworkFrameHandle = {
  group: Group
  hitTarget: Mesh
  focusPosition: Vector3
  lookAt: Vector3
  setHovered: (hovered: boolean) => void
  loadPromise: Promise<void>
}

function getTextureUrl(url: string) {
  if (url.startsWith('blob:') || url.startsWith('data:')) return url
  return `/api/proxy-image?url=${encodeURIComponent(url)}`
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function createPlaceholderTexture(THREE: ThreeModule, artwork: ExhibitionArtwork) {
  const canvas = document.createElement('canvas')
  canvas.width = 768
  canvas.height = 960
  const context = canvas.getContext('2d')
  if (!context) return new THREE.CanvasTexture(canvas)

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  artwork.palette.slice(0, 4).forEach((color, index, colors) => {
    gradient.addColorStop(index / Math.max(colors.length - 1, 1), color)
  })
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = 'rgba(255,255,255,0.14)'
  context.beginPath()
  context.arc(180, 220, 260, 0, Math.PI * 2)
  context.fill()
  context.beginPath()
  context.arc(630, 760, 300, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = 'rgba(255,255,255,0.92)'
  context.font = '700 46px Inter, Arial, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  const words = artwork.title.split(/\s+/)
  const lines: string[] = []
  let line = ''
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word
    if (context.measureText(candidate).width > 590 && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  })
  if (line) lines.push(line)
  lines.slice(0, 3).forEach((text, index) => context.fillText(text, canvas.width / 2, 430 + index * 64))
  context.font = '600 24px Inter, Arial, sans-serif'
  context.fillStyle = 'rgba(255,255,255,0.74)'
  context.fillText(artwork.artistName, canvas.width / 2, 700)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function createPlaqueTexture(THREE: ThreeModule, artwork: ExhibitionArtwork) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 420
  const context = canvas.getContext('2d')
  if (!context) return new THREE.CanvasTexture(canvas)

  context.fillStyle = '#f7f4ee'
  roundedRect(context, 12, 12, canvas.width - 24, canvas.height - 24, 34)
  context.fill()
  context.strokeStyle = 'rgba(78,64,48,0.18)'
  context.lineWidth = 4
  context.stroke()
  context.fillStyle = '#1e1c19'
  context.font = '700 52px Inter, Arial, sans-serif'
  context.textAlign = 'left'
  context.fillText(artwork.title.slice(0, 32), 64, 118)
  context.fillStyle = '#6d6257'
  context.font = '500 34px Inter, Arial, sans-serif'
  context.fillText(artwork.artistName.slice(0, 34), 64, 184)
  context.fillStyle = '#9a6b3e'
  context.font = '700 27px Inter, Arial, sans-serif'
  context.fillText(artwork.code ? `FEELLINK · ${artwork.code}` : 'FEELLINK · SANATSAL DNA', 64, 310)
  artwork.palette.slice(0, 5).forEach((color, index) => {
    context.fillStyle = color
    context.beginPath()
    context.arc(716 + index * 54, 306, 18, 0, Math.PI * 2)
    context.fill()
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

async function loadArtworkTexture(
  THREE: ThreeModule,
  artwork: ExhibitionArtwork,
  aspect: number,
  renderer: WebGLRenderer,
  textureCache: Map<string, any>,
) {
  if (!artwork.mediaUrl) return createPlaceholderTexture(THREE, artwork)
  const sourceUrl = getTextureUrl(artwork.mediaUrl)
  const cacheKey = `${sourceUrl}|${aspect.toFixed(3)}`
  const cached = textureCache.get(cacheKey)
  if (cached) return cached

  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.decoding = 'async'
  const loadedImage = await new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Artwork texture could not be loaded'))
    image.src = sourceUrl
  }).catch(() => null)
  if (!loadedImage) return createPlaceholderTexture(THREE, artwork)

  const isCompact = window.matchMedia('(max-width: 720px)').matches
  const longEdge = isCompact ? 720 : 1080
  const canvas = document.createElement('canvas')
  if (aspect >= 1) {
    canvas.width = longEdge
    canvas.height = Math.max(1, Math.round(longEdge / aspect))
  } else {
    canvas.height = longEdge
    canvas.width = Math.max(1, Math.round(longEdge * aspect))
  }
  const context = canvas.getContext('2d')
  if (!context) return createPlaceholderTexture(THREE, artwork)

  context.fillStyle = '#f4f0e8'
  context.fillRect(0, 0, canvas.width, canvas.height)
  const imageAspect = loadedImage.naturalWidth / Math.max(loadedImage.naturalHeight, 1)
  let drawWidth = canvas.width
  let drawHeight = drawWidth / imageAspect
  if (drawHeight > canvas.height) {
    drawHeight = canvas.height
    drawWidth = drawHeight * imageAspect
  }
  const drawX = (canvas.width - drawWidth) / 2
  const drawY = (canvas.height - drawHeight) / 2
  context.filter = 'saturate(1.18) contrast(1.08) brightness(1.02)'
  context.drawImage(loadedImage, drawX, drawY, drawWidth, drawHeight)
  context.filter = 'none'

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8)
  texture.generateMipmaps = true
  texture.needsUpdate = true
  textureCache.set(cacheKey, texture)
  return texture
}

export function ArtworkFrame({
  THREE,
  parent,
  artwork,
  index,
  position,
  rotationY,
  width,
  height,
  renderer,
  textureCache,
  isDisposed,
}: ArtworkFrameProps): ArtworkFrameHandle {
  const group = new THREE.Group()
  group.position.set(...position)
  group.rotation.y = rotationY
  parent.add(group)

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: '#262321',
    roughness: 0.62,
    metalness: 0.035,
    emissive: '#8b633f',
    emissiveIntensity: 0.006,
  })
  const innerMaterial = new THREE.MeshStandardMaterial({
    color: '#a97d50',
    roughness: 0.48,
    metalness: 0.46,
  })
  const matMaterial = new THREE.MeshStandardMaterial({ color: '#f2eee7', roughness: 0.96, metalness: 0 })
  const imageMaterial = new THREE.MeshBasicMaterial({
    map: createPlaceholderTexture(THREE, artwork),
    toneMapped: false,
  })

  const makeBox = (size: [number, number, number], localPosition: [number, number, number], material: any) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material)
    mesh.position.set(...localPosition)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }

  makeBox([width + 0.28, height + 0.28, 0.14], [0, 0, -0.06], frameMaterial)
  makeBox([width + 0.13, height + 0.13, 0.155], [0, 0, -0.045], innerMaterial)
  makeBox([width + 0.04, height + 0.04, 0.17], [0, 0, -0.032], matMaterial)

  const imagePlane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), imageMaterial)
  imagePlane.position.z = 0.065
  imagePlane.userData = { type: 'artwork', artworkIndex: index }
  group.add(imagePlane)

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(width + 0.015, height + 0.015),
    new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 0.04,
      metalness: 0,
      transparent: true,
      opacity: 0.024,
      transmission: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      depthWrite: false,
    }),
  )
  glass.position.z = 0.076
  group.add(glass)

  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.min(1.2, width * 0.82), 0.48),
    new THREE.MeshBasicMaterial({ map: createPlaqueTexture(THREE, artwork), toneMapped: false }),
  )
  plaque.position.set(0, -height / 2 - 0.43, 0.075)
  group.add(plaque)
  makeBox([Math.min(1.23, width * 0.85), 0.5, 0.045], [0, -height / 2 - 0.43, 0.045], matMaterial)

  const spot = new THREE.SpotLight('#fff2dc', 3.15, 6.4, Math.PI / 8, 0.72, 2)
  spot.position.set(0, height / 2 + 1.22, 1.08)
  spot.target.position.set(0, 0, 0.02)
  spot.castShadow = index < 3
  if (spot.castShadow) {
    spot.shadow.mapSize.set(768, 768)
    spot.shadow.bias = -0.00035
    spot.shadow.normalBias = 0.02
  }
  group.add(spot)
  group.add(spot.target)

  group.updateMatrixWorld(true)
  const lookAt = new THREE.Vector3()
  group.getWorldPosition(lookAt)
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(group.getWorldQuaternion(new THREE.Quaternion())).normalize()
  const compact = window.matchMedia('(max-width: 720px)').matches
  const focusDistance = compact ? 5.55 : width > 1.8 ? 5.35 : 5.15
  const focusPosition = lookAt.clone().add(normal.multiplyScalar(focusDistance))
  focusPosition.y = Math.max(1.58, lookAt.y)
  lookAt.y -= 0.16

  const loadPromise = loadArtworkTexture(THREE, artwork, width / height, renderer, textureCache).then((texture) => {
    if (isDisposed()) return
    const previous = imageMaterial.map
    imageMaterial.map = texture
    imageMaterial.needsUpdate = true
    if (previous && previous !== texture && !textureCache.has(String(previous.uuid))) previous.dispose()
  })

  return {
    group,
    hitTarget: imagePlane,
    focusPosition,
    lookAt,
    loadPromise,
    setHovered: (hovered: boolean) => {
      frameMaterial.emissiveIntensity = hovered ? 0.09 : 0.006
      group.scale.setScalar(hovered ? 1.006 : 1)
    },
  }
}
