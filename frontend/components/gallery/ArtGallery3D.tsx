'use client'

import { useState, useEffect, useCallback } from 'react'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { X, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react'

interface Artwork {
  id: string
  title?: string
  caption?: string
  media?: Array<{ url: string; type?: string }>
  _count?: { likes: number; comments: number }
}

interface ArtGallery3DProps {
  artworks: Artwork[]
  isOpen: boolean
  onClose: () => void
}

// ── Room dimensions ──────────────────────────────────────────────────────────
const SW = 920    // scene width
const SH = 540    // scene height
const RD = 900    // room depth

// ── Gold helper ──────────────────────────────────────────────────────────────
const g = (a: number) => `rgba(201,168,76,${a})`

// ── Frame layouts ─────────────────────────────────────────────────────────────
// Back wall  (SW × SH = 920 × 540)
const BACK_FRAMES = [
  { left: 62,  top: 100, w: 188, h: 248 },
  { left: 366, top: 62,  w: 188, h: 292 },
  { left: 670, top: 100, w: 188, h: 248 },
]
// Side walls  (RD × SH = 900 × 540)
const SIDE_FRAMES = [
  { left: 52,  top: 100, w: 188, h: 248 },
  { left: 356, top: 62,  w: 188, h: 292 },
  { left: 660, top: 100, w: 188, h: 248 },
]

// Spotlight X-centre ratios on back wall (matches BACK_FRAMES centre)
const SPOT_XS = [
  (62  + 188 / 2) / SW,  // ≈ 0.169
  (366 + 188 / 2) / SW,  // ≈ 0.5
  (670 + 188 / 2) / SW,  // ≈ 0.829
]

type ViewDir = 'left' | 'center' | 'right'

// ── CSS keyframes injected once ───────────────────────────────────────────────
const GALLERY_STYLES = `
  @keyframes galleryIn {
    from { opacity: 0; transform: scale(0.94) translateY(8px); }
    to   { opacity: 1; transform: scale(1)    translateY(0px); }
  }
  @keyframes lampPulse {
    0%, 100% { opacity: 0.80; }
    50%       { opacity: 1.00; }
  }
  @keyframes dustA {
    0%   { transform: translateY(0px)   translateX(0px);  opacity: 0;    }
    15%  { opacity: 0.55; }
    85%  { opacity: 0.35; }
    100% { transform: translateY(-55px) translateX(7px);  opacity: 0;    }
  }
  @keyframes dustB {
    0%   { transform: translateY(0px)   translateX(0px);  opacity: 0;    }
    20%  { opacity: 0.45; }
    80%  { opacity: 0.25; }
    100% { transform: translateY(-42px) translateX(-9px); opacity: 0;    }
  }
  @keyframes dustC {
    0%   { transform: translateY(0px)   translateX(0px);  opacity: 0;    }
    10%  { opacity: 0.5;  }
    90%  { opacity: 0.3;  }
    100% { transform: translateY(-70px) translateX(4px);  opacity: 0;    }
  }
`

// ── Dust motes ────────────────────────────────────────────────────────────────
function DustMotes({ x }: { x: number }) {
  const motes = [
    { left: x - 18, top: 180, anim: 'dustA 5.5s 0.4s ease-in-out infinite' },
    { left: x + 14, top: 220, anim: 'dustB 6.8s 1.8s ease-in-out infinite' },
    { left: x + 2,  top: 155, anim: 'dustC 7.2s 3.1s ease-in-out infinite' },
  ]
  return (
    <>
      {motes.map((m, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: m.left,
            top: m.top,
            width: 2,
            height: 2,
            borderRadius: '50%',
            background: 'rgba(255,228,120,0.65)',
            filter: 'blur(0.6px)',
            animation: m.anim,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  )
}

// ── Ornate frame corner ornament ──────────────────────────────────────────────
function CornerOrnament({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const offsets = {
    tl: { top: -6, left: -6 },
    tr: { top: -6, right: -6 },
    bl: { bottom: -6, left: -6 },
    br: { bottom: -6, right: -6 },
  }[pos]
  return (
    <div
      style={{
        position: 'absolute',
        width: 12,
        height: 12,
        border: `2px solid ${g(0.9)}`,
        boxShadow: `0 0 4px ${g(0.3)}`,
        ...offsets,
      }}
    />
  )
}

// ── Single artwork frame ──────────────────────────────────────────────────────
function GalleryFrame({
  artwork,
  pos,
  frameNo,
  onZoom,
}: {
  artwork: Artwork | null
  pos: { left: number; top: number; w: number; h: number }
  frameNo: number
  onZoom: (url: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const imgUrl = artwork?.media?.[0]?.url
    ? resolveImageUrl(artwork.media[0].url)
    : null
  const cx = pos.left + pos.w / 2

  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']

  return (
    <div
      style={{ position: 'absolute', left: pos.left, top: pos.top, width: pos.w, height: pos.h }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Air spotlight cone */}
      <div
        style={{
          position: 'absolute',
          left: pos.w / 2,
          bottom: '100%',
          transform: 'translateX(-50%)',
          width: pos.w * 2.8,
          height: 320,
          background: `radial-gradient(ellipse at 50% 0%, rgba(255,218,90,${hovered ? 0.14 : 0.09}), transparent 68%)`,
          pointerEvents: 'none',
          transition: 'opacity 0.5s',
        }}
      />

      {/* Wall shadow (simulated cast shadow behind frame) */}
      <div
        style={{
          position: 'absolute',
          inset: -12,
          borderRadius: 2,
          background: 'radial-gradient(ellipse at center 40%, rgba(0,0,0,0.7), transparent 75%)',
          zIndex: 0,
          filter: 'blur(6px)',
        }}
      />

      {/* Outer frame — double border with gold gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background: `linear-gradient(135deg, ${g(0.18)}, ${g(0.09)}, ${g(0.22)}, ${g(0.10)})`,
          border: `3px solid ${g(hovered ? 0.95 : 0.80)}`,
          boxShadow: hovered
            ? `0 0 40px ${g(0.25)}, 0 12px 40px rgba(0,0,0,0.75), inset 0 0 0 3px rgba(0,0,0,0.6), inset 0 0 0 14px ${g(0.18)}`
            : `0 0 18px rgba(0,0,0,0.55), 0 6px 24px rgba(0,0,0,0.6), inset 0 0 0 3px rgba(0,0,0,0.5), inset 0 0 0 14px ${g(0.13)}`,
          transition: 'box-shadow 0.4s, border-color 0.4s',
        }}
      >
        {/* Four corner ornaments */}
        <CornerOrnament pos="tl" />
        <CornerOrnament pos="tr" />
        <CornerOrnament pos="bl" />
        <CornerOrnament pos="br" />

        {/* Inner frame line */}
        <div
          style={{
            position: 'absolute',
            inset: 14,
            border: `1px solid ${g(0.45)}`,
            overflow: 'hidden',
          }}
        >
          {imgUrl ? (
            /* ── Filled frame ── */
            <>
              <img
                src={imgUrl}
                alt={artwork?.title || 'Eser'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  transform: hovered ? 'scale(1.04)' : 'scale(1)',
                  transition: 'transform 0.6s ease',
                }}
                draggable={false}
              />
              {hovered && (
                <button
                  onClick={() => onZoom(imgUrl)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.7)',
                    border: `1px solid ${g(0.5)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: g(0.9),
                  }}
                >
                  <ZoomIn size={14} />
                </button>
              )}
            </>
          ) : (
            /* ── Empty canvas ── */
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                background: `
                  repeating-linear-gradient(0deg,   transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px),
                  repeating-linear-gradient(90deg,  transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px),
                  rgba(242,234,214,0.04)
                `,
              }}
            >
              {/* Roman numeral */}
              <span
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: 28,
                  letterSpacing: '0.18em',
                  color: g(0.13),
                  lineHeight: 1,
                }}
              >
                {ROMAN[frameNo] ?? 'I'}
              </span>
              <div style={{ width: 30, height: 1, background: g(0.10) }} />
            </div>
          )}
        </div>
      </div>

      {/* Placard */}
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: 14,
          width: pos.w * 0.66,
          padding: '6px 10px',
          background: 'rgba(18,12,6,0.95)',
          border: `1px solid ${g(0.22)}`,
          boxShadow: `0 2px 10px rgba(0,0,0,0.5)`,
          textAlign: 'center',
        }}
      >
        {artwork?.title ? (
          <>
            <div
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 9.5,
                letterSpacing: '0.14em',
                color: 'rgba(220,195,140,0.8)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {artwork.title}
            </div>
            {artwork.caption && (
              <div
                style={{
                  fontSize: 8,
                  letterSpacing: '0.08em',
                  color: 'rgba(180,155,100,0.45)',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {artwork.caption}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 9, letterSpacing: '0.2em', color: g(0.18) }}>
            · · ·
          </div>
        )}
      </div>

      {/* Dust motes in spotlight */}
      <DustMotes x={pos.w / 2} />
    </div>
  )
}

// ── Wall with architecture details ────────────────────────────────────────────
function GalleryWall({
  wallStyle,
  frames,
  artworks,
  wallOffset,
  wallWidth,
  onZoom,
}: {
  wallStyle: React.CSSProperties
  frames: typeof BACK_FRAMES
  artworks: (Artwork | null)[]
  wallOffset: number
  wallWidth: number
  onZoom: (url: string) => void
}) {
  const spotXs = frames.map((f) => f.left + f.w / 2)
  return (
    <div style={wallStyle}>
      {/* Spotlight cones on wall surface */}
      {spotXs.map((x, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: 0,
            left: x,
            transform: 'translateX(-50%)',
            width: frames[i].w * 2.6,
            height: '85%',
            background: `radial-gradient(ellipse 50% 80% at 50% 0%, rgba(255,215,80,0.07), transparent)`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Crown molding — top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 16, background: `linear-gradient(180deg, rgba(201,168,76,0.18), rgba(201,168,76,0.08) 60%, transparent)` }} />
      <div style={{ position: 'absolute', top: 16, left: 0, right: 0, height: 3, background: g(0.15) }} />

      {/* Picture rail */}
      <div style={{ position: 'absolute', top: 36, left: 0, right: 0, height: 6, background: `linear-gradient(180deg, rgba(30,22,12,0.8), rgba(45,32,16,0.9), rgba(30,22,12,0.8))`, borderTop: `1px solid ${g(0.2)}`, borderBottom: `1px solid ${g(0.12)}` }} />

      {/* Upper wall (above dado) — plain deep colour */}
      <div style={{ position: 'absolute', top: 42, left: 0, right: 0, height: '52%', background: 'linear-gradient(180deg, rgba(255,255,255,0.012) 0%, transparent 100%)' }} />

      {/* Dado rail */}
      <div style={{ position: 'absolute', top: '54%', left: 0, right: 0, height: 10, background: `linear-gradient(180deg, ${g(0.22)}, ${g(0.14)} 50%, ${g(0.08)})`, boxShadow: `0 2px 8px rgba(0,0,0,0.4)` }} />

      {/* Wainscoting panels (lower wall) */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(54% + 10px)',
          left: 0,
          right: 0,
          bottom: 12,
          backgroundImage: `
            repeating-linear-gradient(90deg, transparent, transparent 178px, ${g(0.14)} 178px, ${g(0.14)} 180px),
            repeating-linear-gradient(90deg, transparent, transparent 88px,  ${g(0.07)} 88px,  ${g(0.07)} 90px)
          `,
        }}
      />

      {/* Baseboard */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 14, background: `linear-gradient(180deg, ${g(0.2)}, ${g(0.12)})`, borderTop: `1px solid ${g(0.25)}` }} />

      {/* Frames */}
      {frames.map((f, i) => (
        <GalleryFrame
          key={i}
          artwork={artworks[i]}
          pos={f}
          frameNo={wallOffset + i}
          onZoom={onZoom}
        />
      ))}
    </div>
  )
}

// ── Ceiling with pendant lamps ────────────────────────────────────────────────
function GalleryCeiling({ style, spotXRatios }: { style: React.CSSProperties; spotXRatios: number[] }) {
  return (
    <div style={style}>
      {/* Ambient ceiling gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #09070503, #14100c)' }} />

      {/* Pendant lamps */}
      {spotXRatios.map((xr, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: 18,
            left: `${xr * 100}%`,
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Cord */}
          <div style={{ width: 1, height: 22, background: 'rgba(180,150,80,0.35)' }} />
          {/* Lamp shade */}
          <div
            style={{
              width: 22,
              height: 14,
              borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
              background: 'linear-gradient(180deg, rgba(80,60,20,0.9), rgba(140,100,30,0.85))',
              border: `1px solid ${g(0.5)}`,
              borderBottom: 'none',
              position: 'relative',
              animation: 'lampPulse 4s ease-in-out infinite',
              animationDelay: `${i * 1.1}s`,
            }}
          >
            {/* Bulb glow */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'rgba(255,230,140,0.95)',
                boxShadow: '0 0 10px rgba(255,220,100,0.9), 0 0 25px rgba(255,210,80,0.5)',
              }}
            />
          </div>
          {/* Downward glow from lamp */}
          <div
            style={{
              position: 'absolute',
              bottom: -4,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 120,
              height: 80,
              background: 'radial-gradient(ellipse at 50% 0%, rgba(255,218,80,0.18), transparent 75%)',
              pointerEvents: 'none',
              animation: 'lampPulse 4s ease-in-out infinite',
              animationDelay: `${i * 1.1}s`,
            }}
          />
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function ArtGallery3D({ artworks, isOpen, onClose }: ArtGallery3DProps) {
  const [viewDir, setViewDir]       = useState<ViewDir>('center')
  const [roomIndex, setRoomIndex]   = useState(0)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [mounted, setMounted]       = useState(false)

  const imageArtworks = artworks.filter((a) => a.media?.[0]?.url)
  const FRAMES_PER_ROOM = 9
  const totalRooms = Math.max(1, Math.ceil(imageArtworks.length / FRAMES_PER_ROOM))

  const getWallArtworks = useCallback(
    (wallIdx: number) =>
      Array.from({ length: 3 }, (_, fi) => {
        const gi = roomIndex * FRAMES_PER_ROOM + wallIdx * 3 + fi
        return imageArtworks[gi] ?? null
      }),
    [imageArtworks, roomIndex]
  )

  const roomRotY = viewDir === 'left' ? 90 : viewDir === 'right' ? -90 : 0

  const prevView = useCallback(
    () => setViewDir((v) => (v === 'right' ? 'center' : 'left')),
    []
  )
  const nextView = useCallback(
    () => setViewDir((v) => (v === 'left' ? 'center' : 'right')),
    []
  )

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { zoomedImage ? setZoomedImage(null) : onClose() }
      if (e.key === 'ArrowLeft')  prevView()
      if (e.key === 'ArrowRight') nextView()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, zoomedImage, onClose, prevView, nextView])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setViewDir('center')
      setRoomIndex(0)
      setMounted(false)
      const t = setTimeout(() => setMounted(true), 20)
      return () => clearTimeout(t)
    }
    document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  // ── Wall base style ──
  const wallBase: React.CSSProperties = {
    position: 'absolute',
    overflow: 'visible',
    background: 'linear-gradient(175deg, #1e1914 0%, #141009 55%, #0e0b07 100%)',
  }

  const backWall: React.CSSProperties = {
    ...wallBase,
    width: SW, height: SH,
    left: 0, top: 0,
    transform: `translateZ(-${RD}px)`,
  }
  const leftWall: React.CSSProperties = {
    ...wallBase,
    width: RD, height: SH,
    left: 0, top: 0,
    transformOrigin: 'left center',
    transform: 'rotateY(90deg)',
  }
  const rightWall: React.CSSProperties = {
    ...wallBase,
    width: RD, height: SH,
    right: 0, top: 0,
    transformOrigin: 'right center',
    transform: 'rotateY(-90deg)',
  }
  const floorStyle: React.CSSProperties = {
    position: 'absolute',
    width: SW, height: RD,
    left: 0, bottom: 0,
    transformOrigin: 'bottom center',
    transform: 'rotateX(-90deg)',
    background: `
      repeating-linear-gradient(90deg, transparent, transparent 89px, rgba(0,0,0,0.22) 89px, rgba(0,0,0,0.22) 90px),
      repeating-linear-gradient(0deg,  transparent, transparent 44px, rgba(0,0,0,0.10) 44px, rgba(0,0,0,0.10) 45px),
      linear-gradient(to bottom, #2c1e12 0%, #1a1008 60%, #0e0804 100%)
    `,
  }
  const ceilingStyle: React.CSSProperties = {
    position: 'absolute',
    width: SW, height: RD,
    left: 0, top: 0,
    transformOrigin: 'top center',
    transform: 'rotateX(90deg)',
    background: '#0b0806',
    overflow: 'visible',
  }

  // View label
  const VIEW_LABELS: Record<ViewDir, string> = {
    left: 'Sol Duvar', center: 'Ön Duvar', right: 'Sağ Duvar',
  }

  // Spotlight x positions on ceiling match back wall SPOT_XS only when viewing center
  const ceilSpotXs = SPOT_XS

  return (
    <>
      {/* Keyframe animations */}
      <style>{GALLERY_STYLES}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background: '#050302',
          overflow: 'hidden',
          userSelect: 'none',
          animation: mounted ? 'galleryIn 0.55s ease-out both' : 'none',
        }}
      >
        {/* Vignette */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,0.8) 100%)', pointerEvents: 'none', zIndex: 5 }} />

        {/* ── Header ── */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 15,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 24px 10px',
            background: 'linear-gradient(180deg, rgba(5,3,2,0.9), transparent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#c9a84c', fontSize: 10, letterSpacing: '0.3em' }}>✦</span>
            <span style={{ color: 'rgba(255,255,255,0.78)', fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 300 }}>
              Sergi Turu
            </span>
            <span style={{ width: 1, height: 12, background: g(0.3) }} />
            <span style={{ color: g(0.65), fontSize: 10, letterSpacing: '0.15em' }}>
              {VIEW_LABELS[viewDir]}
            </span>
            {totalRooms > 1 && (
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, marginLeft: 4 }}>
                Oda {roomIndex + 1}/{totalRooms}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${g(0.2)}`,
              borderRadius: '50%', width: 34, height: 34, display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `rgba(201,168,76,0.12)`; e.currentTarget.style.borderColor = g(0.5); e.currentTarget.style.color = 'rgba(255,255,255,0.9)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = g(0.2); e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── 3-D Scene ── */}
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            perspective: '660px', perspectiveOrigin: '50% 41%',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: SW, height: SH,
              transformStyle: 'preserve-3d',
              transform: `rotateY(${roomRotY}deg)`,
              transition: 'transform 0.9s cubic-bezier(0.4, 0, 0.15, 1)',
            }}
          >
            {/* Back wall */}
            <GalleryWall wallStyle={backWall}  frames={BACK_FRAMES} artworks={getWallArtworks(0)} wallOffset={0} wallWidth={SW}  onZoom={setZoomedImage} />
            {/* Left wall */}
            <GalleryWall wallStyle={leftWall}  frames={SIDE_FRAMES} artworks={getWallArtworks(1)} wallOffset={3} wallWidth={RD}  onZoom={setZoomedImage} />
            {/* Right wall */}
            <GalleryWall wallStyle={rightWall} frames={SIDE_FRAMES} artworks={getWallArtworks(2)} wallOffset={6} wallWidth={RD}  onZoom={setZoomedImage} />
            {/* Floor */}
            <div style={floorStyle}>
              {/* Floor reflection glow */}
              {ceilSpotXs.map((xr, i) => (
                <div key={i} style={{ position: 'absolute', top: 0, left: `${xr * 100}%`, transform: 'translateX(-50%)', width: 200, height: 120, background: 'radial-gradient(ellipse at 50% 0%, rgba(255,215,80,0.07), transparent 70%)', pointerEvents: 'none' }} />
              ))}
            </div>
            {/* Ceiling */}
            <GalleryCeiling style={ceilingStyle} spotXRatios={ceilSpotXs} />
          </div>
        </div>

        {/* ── Side arrows ── */}
        {(['left', 'right'] as const).map((side) => (
          <button
            key={side}
            onClick={side === 'left' ? prevView : nextView}
            style={{
              position: 'absolute',
              [side]: 20, top: '50%', transform: 'translateY(-50%)',
              zIndex: 15, width: 46, height: 46, borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)', border: `1px solid ${g(0.18)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(8px)', transition: 'all 0.25s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.75)'; e.currentTarget.style.borderColor = g(0.55); e.currentTarget.style.color = g(0.95) }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)';  e.currentTarget.style.borderColor = g(0.18); e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
          >
            {side === 'left' ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        ))}

        {/* ── Bottom UI ── */}
        <div
          style={{
            position: 'absolute', bottom: 24, left: 0, right: 0, zIndex: 15,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}
        >
          {/* Wall indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(['left', 'center', 'right'] as ViewDir[]).map((d) => (
              <button
                key={d}
                onClick={() => setViewDir(d)}
                style={{
                  width: viewDir === d ? 28 : 6, height: 6, borderRadius: 3,
                  background: viewDir === d ? g(0.9) : 'rgba(255,255,255,0.18)',
                  border: 'none', cursor: 'pointer', transition: 'all 0.35s', padding: 0,
                }}
              />
            ))}
          </div>

          {/* Room navigation */}
          {totalRooms > 1 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: '← Önceki Oda', disabled: roomIndex === 0, action: () => { setRoomIndex((r) => r - 1); setViewDir('center') } },
                { label: 'Sonraki Oda →', disabled: roomIndex === totalRooms - 1, action: () => { setRoomIndex((r) => r + 1); setViewDir('center') } },
              ].map(({ label, disabled, action }) => (
                <button
                  key={label}
                  disabled={disabled}
                  onClick={action}
                  style={{
                    padding: '5px 14px', fontSize: 10, letterSpacing: '0.12em',
                    textTransform: 'uppercase', background: 'rgba(0,0,0,0.55)',
                    border: `1px solid ${g(disabled ? 0.1 : 0.35)}`,
                    color: disabled ? 'rgba(255,255,255,0.15)' : g(0.8),
                    cursor: disabled ? 'default' : 'pointer', borderRadius: 2,
                    fontFamily: 'Georgia, serif',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 9.5, letterSpacing: '0.14em', margin: 0 }}>
            ← → klavye · ESC çıkış
          </p>
        </div>

        {/* ── Zoom lightbox ── */}
        {zoomedImage && (
          <div
            onClick={() => setZoomedImage(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 110,
              background: 'rgba(0,0,0,0.97)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'zoom-out',
            }}
          >
            <button
              onClick={() => setZoomedImage(null)}
              style={{
                position: 'absolute', top: 20, right: 20,
                background: 'rgba(255,255,255,0.07)', border: `1px solid ${g(0.3)}`,
                borderRadius: '50%', width: 38, height: 38,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: g(0.8),
              }}
            >
              <X size={17} />
            </button>
            <img
              src={zoomedImage}
              alt="Eser"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '88vw', maxHeight: '88vh',
                objectFit: 'contain', borderRadius: 3,
                boxShadow: `0 0 100px rgba(0,0,0,0.95), 0 0 40px rgba(0,0,0,0.8)`,
                border: `3px solid ${g(0.4)}`,
              }}
              draggable={false}
            />
          </div>
        )}
      </div>
    </>
  )
}
