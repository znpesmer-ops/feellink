import { resolveImageUrl } from '@/lib/resolveImageUrl'

export type ExhibitionPhase = 'entrance' | 'entering' | 'gallery'

export type ArtworkDna = {
  mood: string
  temperature: string
  signature: string
  summary: string
  warmth: number
  energy: number
  luminosity: number
}

export type ExhibitionArtwork = {
  id: string
  title: string
  artistName: string
  description: string
  mediaUrl: string | null
  mediaType: string
  palette: string[]
  code: string | null
  createdAt: string | null
  likesCount: number
  commentsCount: number
  dna: ArtworkDna
}

export type RawExhibitionArtwork = Record<string, any>

export const DEFAULT_GALLERY_PALETTE = ['#c66d38', '#263449', '#d8b98e', '#f2ede4']

function normalizeHex(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw.split('').map((character) => `${character}${character}`).join('')}`
  }
  if (/^[0-9a-f]{6,8}$/i.test(raw)) return `#${raw.slice(0, 6)}`
  return null
}

export function sanitizeArtworkPalette(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_GALLERY_PALETTE
  const palette = value.map(normalizeHex).filter((color): color is string => Boolean(color))
  return palette.length ? palette.slice(0, 8) : DEFAULT_GALLERY_PALETTE
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex) || '#808080'
  const value = Number.parseInt(normalized.slice(1), 16)
  return {
    red: (value >> 16) & 255,
    green: (value >> 8) & 255,
    blue: value & 255,
  }
}

function rgbToHsl(red: number, green: number, blue: number) {
  const r = red / 255
  const g = green / 255
  const b = blue / 255
  const maximum = Math.max(r, g, b)
  const minimum = Math.min(r, g, b)
  const luminosity = (maximum + minimum) / 2
  const delta = maximum - minimum
  if (delta === 0) return { hue: 0, saturation: 0, luminosity }
  const saturation = delta / (1 - Math.abs(2 * luminosity - 1))
  const hueBase =
    maximum === r
      ? ((g - b) / delta) % 6
      : maximum === g
        ? (b - r) / delta + 2
        : (r - g) / delta + 4
  return { hue: (hueBase * 60 + 360) % 360, saturation, luminosity }
}

function deriveArtworkDna(palette: string[], explicitMood?: string | null): ArtworkDna {
  const samples = palette.map((color) => {
    const { red, green, blue } = hexToRgb(color)
    return rgbToHsl(red, green, blue)
  })
  const average = (selector: (sample: (typeof samples)[number]) => number) =>
    samples.reduce((sum, sample) => sum + selector(sample), 0) / Math.max(samples.length, 1)
  const warmShare =
    samples.filter(({ hue }) => hue <= 70 || hue >= 325).length / Math.max(samples.length, 1)
  const saturation = average((sample) => sample.saturation)
  const luminosity = average((sample) => sample.luminosity)
  const warmth = Math.round(warmShare * 100)
  const energy = Math.round(Math.min(1, saturation * 0.82 + Math.abs(luminosity - 0.5) * 0.36) * 100)
  const light = Math.round(luminosity * 100)
  const temperature = warmShare > 0.62 ? 'Sıcak' : warmShare < 0.38 ? 'Soğuk' : 'Dengeli'
  const signature = saturation > 0.62 ? 'Canlı ve belirgin' : saturation > 0.34 ? 'Dengeli ve katmanlı' : 'Sakin ve rafine'
  const mood =
    explicitMood?.trim() ||
    (luminosity > 0.7
      ? 'Aydınlık ve açık'
      : saturation > 0.62
        ? 'Dinamik ve canlı'
        : luminosity < 0.34
          ? 'Derin ve düşünsel'
          : 'Dengeli ve dingin')

  return {
    mood,
    temperature,
    signature,
    warmth,
    energy,
    luminosity: light,
    summary: `${temperature.toLocaleLowerCase('tr-TR')} tonlar ile ${signature.toLocaleLowerCase('tr-TR')} bir görsel dil oluşturuyor.`,
  }
}

function getPrimaryMedia(rawArtwork: RawExhibitionArtwork) {
  const media = Array.isArray(rawArtwork.media) ? rawArtwork.media[0] : null
  const url =
    media?.thumbnailUrl ||
    media?.url ||
    media?.path ||
    media?.fileName ||
    rawArtwork.imageUrl ||
    rawArtwork.mediaUrl ||
    rawArtwork.cover
  return {
    url: typeof url === 'string' && url.trim() ? resolveImageUrl(url) : null,
    type: media?.type || rawArtwork.mediaType || 'image',
  }
}

export function toExhibitionArtwork(
  rawArtwork: RawExhibitionArtwork,
  index: number,
  profileUsername: string,
): ExhibitionArtwork {
  const media = getPrimaryMedia(rawArtwork)
  const palette = sanitizeArtworkPalette(rawArtwork.colorPalette || rawArtwork.colors)
  const titleSource = rawArtwork.title || rawArtwork.caption || rawArtwork.description
  const title = typeof titleSource === 'string' && titleSource.trim() ? titleSource.trim() : `Eser ${index + 1}`
  const descriptionSource = rawArtwork.description || rawArtwork.caption
  const description =
    typeof descriptionSource === 'string' && descriptionSource.trim()
      ? descriptionSource.trim()
      : 'Bu eser, sanatçının Feellink portföyünde yer alan seçkilerinden biridir.'
  const explicitMood =
    rawArtwork.emotionAnalysis?.dominantEmotion ||
    rawArtwork.emotionAnalysis?.mood ||
    rawArtwork.dominantMood ||
    rawArtwork.mood ||
    null

  return {
    id: String(rawArtwork.id),
    title,
    artistName: rawArtwork.user?.fullName || rawArtwork.user?.username || profileUsername,
    description,
    mediaUrl: media.url,
    mediaType: media.type,
    palette,
    code: typeof rawArtwork.code === 'string' && rawArtwork.code.trim() ? rawArtwork.code.trim() : null,
    createdAt: rawArtwork.artworkCreatedDate || rawArtwork.createdAt || null,
    likesCount: Number(rawArtwork._count?.likes || rawArtwork.likesCount || 0),
    commentsCount: Number(rawArtwork._count?.comments || rawArtwork.commentsCount || 0),
    dna: deriveArtworkDna(palette, explicitMood),
  }
}
