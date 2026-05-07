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

// Scene dimensions (px in virtual 3D space)
const SW = 900   // scene width
const SH = 520   // scene height
const RD = 800   // room depth

// Frame layouts per wall (px within each wall element)
const BACK_FRAMES = [
  { left: 72,  top: 90,  w: 192, h: 240 },
  { left: 354, top: 58,  w: 192, h: 280 },
  { left: 636, top: 90,  w: 192, h: 240 },
]

const SIDE_FRAMES = [
  { left: 60,  top: 90,  w: 192, h: 240 },
  { left: 304, top: 58,  w: 192, h: 280 },
  { left: 548, top: 90,  w: 192, h: 240 },
]

type ViewDir = 'left' | 'center' | 'right'

// ─── Empty canvas texture ────────────────────────────────────────────────────
const CANVAS_BG = `
  repeating-linear-gradient(
    135deg,
    rgba(220,210,190,0.05) 0px, rgba(220,210,190,0.05) 1px,
    transparent 1px, transparent 8px
  ),
  repeating-linear-gradient(
    45deg,
    rgba(220,210,190,0.03) 0px, rgba(220,210,190,0.03) 1px,
    transparent 1px, transparent 8px
  ),
  linear-gradient(160deg, rgba(245,238,220,0.06), rgba(200,185,155,0.04))
`

// ─── Single frame (with or without artwork) ─────────────────────────────────
function GalleryFrame({
  artwork,
  pos,
  onZoom,
}: {
  artwork: Artwork | null
  pos: { left: number; top: number; w: number; h: number }
  onZoom: (url: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const imgUrl = artwork?.media?.[0]?.url
    ? resolveImageUrl(artwork.media[0].url)
    : null

  return (
    <div
      style={{
        position: 'absolute',
        left: pos.left,
        top: pos.top,
        width: pos.w,
        height: pos.h,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Spotlight cone from ceiling */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '100%',
          transform: 'translateX(-50%)',
          width: pos.w * 2.4,
          height: 260,
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(255,215,100,0.13), transparent 72%)',
          pointerEvents: 'none',
          opacity: hovered ? 1 : 0.7,
          transition: 'opacity 0.4s',
        }}
      />

      {/* Outer gold frame */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: '4px solid rgba(185,152,70,0.85)',
          boxShadow: hovered
            ? '0 0 36px rgba(185,152,70,0.28), 0 8px 32px rgba(0,0,0,0.7), inset 0 0 0 12px rgba(120,85,30,0.5)'
            : '0 0 16px rgba(0,0,0,0.6), 0 4px 20px rgba(0,0,0,0.5), inset 0 0 0 12px rgba(100,70,20,0.4)',
          transition: 'box-shadow 0.35s',
        }}
      >
        {/* Inner mat line */}
        <div
          style={{
            position: 'absolute',
            inset: 12,
            border: '1px solid rgba(185,152,70,0.35)',
            overflow: 'hidden',
            background: imgUrl ? undefined : CANVAS_BG,
          }}
        >
          {imgUrl ? (
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
                  transition: 'transform 0.5s ease',
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
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.65)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                  }}
                >
                  <ZoomIn size={13} />
                </button>
              )}
            </>
          ) : (
            /* Empty canvas */
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '1.5px solid rgba(185,152,70,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ color: 'rgba(185,152,70,0.22)', fontSize: 16, lineHeight: 1 }}>
                  +
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Placard below frame */}
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: 10,
          width: pos.w * 0.6,
          padding: '4px 8px',
          background: 'rgba(22,16,10,0.9)',
          border: '1px solid rgba(185,152,70,0.2)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: '0.1em',
            color: artwork?.title
              ? 'rgba(210,185,130,0.75)'
              : 'rgba(180,152,80,0.2)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textTransform: 'uppercase',
          }}
        >
          {artwork?.title || '— — —'}
        </div>
      </div>
    </div>
  )
}

// ─── Wall panel (back / left / right) ───────────────────────────────────────
function Wall({
  style,
  frames,
  artworks,
  onZoom,
}: {
  style: React.CSSProperties
  frames: typeof BACK_FRAMES
  artworks: (Artwork | null)[]
  onZoom: (url: string) => void
}) {
  return (
    <div style={style}>
      {/* Dado rail */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '60%',
          height: 6,
          background:
            'linear-gradient(180deg, rgba(185,152,70,0.18), rgba(185,152,70,0.08))',
        }}
      />
      {/* Baseboard */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 12,
          background: 'rgba(185,152,70,0.12)',
        }}
      />
      {frames.map((f, i) => (
        <GalleryFrame key={i} artwork={artworks[i]} pos={f} onZoom={onZoom} />
      ))}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export function ArtGallery3D({ artworks, isOpen, onClose }: ArtGallery3DProps) {
  const [viewDir, setViewDir] = useState<ViewDir>('center')
  const [roomIndex, setRoomIndex] = useState(0)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)

  const imageArtworks = artworks.filter((a) => a.media?.[0]?.url)
  const FRAMES_PER_ROOM = 9 // 3 walls × 3 frames
  const totalRooms = Math.max(1, Math.ceil(imageArtworks.length / FRAMES_PER_ROOM))

  const getWallArtworks = useCallback(
    (wallIdx: number) =>
      Array.from({ length: 3 }, (_, fi) => {
        const gi = roomIndex * FRAMES_PER_ROOM + wallIdx * 3 + fi
        return imageArtworks[gi] ?? null
      }),
    [imageArtworks, roomIndex]
  )

  // room rotates opposite to view direction so we appear to look that way
  const roomRotY = viewDir === 'left' ? 90 : viewDir === 'right' ? -90 : 0

  const prevView = useCallback(() => {
    setViewDir((v) => (v === 'right' ? 'center' : v === 'center' ? 'left' : 'left'))
  }, [])
  const nextView = useCallback(() => {
    setViewDir((v) => (v === 'left' ? 'center' : v === 'center' ? 'right' : 'right'))
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomedImage) setZoomedImage(null)
        else onClose()
      }
      if (e.key === 'ArrowLeft') prevView()
      if (e.key === 'ArrowRight') nextView()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, zoomedImage, onClose, prevView, nextView])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setViewDir('center')
      setRoomIndex(0)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const WALL_BASE: React.CSSProperties = {
    position: 'absolute',
    overflow: 'visible',
  }

  const backWallStyle: React.CSSProperties = {
    ...WALL_BASE,
    width: SW,
    height: SH,
    left: 0,
    top: 0,
    transform: `translateZ(-${RD}px)`,
    background: 'linear-gradient(175deg, #1f1a16 0%, #14100c 55%, #0e0b08 100%)',
  }

  const leftWallStyle: React.CSSProperties = {
    ...WALL_BASE,
    width: RD,
    height: SH,
    left: 0,
    top: 0,
    transformOrigin: 'left center',
    transform: 'rotateY(90deg)',
    background: 'linear-gradient(175deg, #1c1814 0%, #12100c 55%, #0c0a07 100%)',
  }

  const rightWallStyle: React.CSSProperties = {
    ...WALL_BASE,
    width: RD,
    height: SH,
    right: 0,
    top: 0,
    transformOrigin: 'right center',
    transform: 'rotateY(-90deg)',
    background: 'linear-gradient(175deg, #1c1814 0%, #12100c 55%, #0c0a07 100%)',
  }

  const floorStyle: React.CSSProperties = {
    position: 'absolute',
    width: SW,
    height: RD,
    left: 0,
    bottom: 0,
    transformOrigin: 'bottom center',
    transform: 'rotateX(-90deg)',
    background: `
      repeating-linear-gradient(
        90deg,
        transparent, transparent 89px,
        rgba(0,0,0,0.25) 89px, rgba(0,0,0,0.25) 90px
      ),
      repeating-linear-gradient(
        0deg,
        transparent, transparent 149px,
        rgba(0,0,0,0.12) 149px, rgba(0,0,0,0.12) 150px
      ),
      linear-gradient(to bottom, #2e2015 0%, #1a1008 80%, #0e0804 100%)
    `,
  }

  const ceilingStyle: React.CSSProperties = {
    position: 'absolute',
    width: SW,
    height: RD,
    left: 0,
    top: 0,
    transformOrigin: 'top center',
    transform: 'rotateX(90deg)',
    background: `
      radial-gradient(ellipse at 16% 80%, rgba(255,210,80,0.08), transparent 38%),
      radial-gradient(ellipse at 50% 80%, rgba(255,210,80,0.06), transparent 38%),
      radial-gradient(ellipse at 84% 80%, rgba(255,210,80,0.08), transparent 38%),
      linear-gradient(to bottom, #0b0906, #16110d)
    `,
  }

  const viewLabel =
    viewDir === 'left' ? 'Sol Duvar' : viewDir === 'right' ? 'Sağ Duvar' : 'Ön Duvar'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: '#060403',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Ambient vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.75) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Header ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#e8a840', fontSize: 11 }}>✦</span>
          <span
            style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              fontWeight: 300,
            }}
          >
            Sergi Turu
          </span>
          <span
            style={{
              color: 'rgba(232,168,64,0.55)',
              fontSize: 10,
              letterSpacing: '0.12em',
              marginLeft: 4,
            }}
          >
            {viewLabel}
          </span>
          {totalRooms > 1 && (
            <span
              style={{
                color: 'rgba(255,255,255,0.2)',
                fontSize: 10,
                marginLeft: 8,
              }}
            >
              Oda {roomIndex + 1} / {totalRooms}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%',
            width: 34,
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.9)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* ── 3D Scene ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: '680px',
          perspectiveOrigin: '50% 42%',
        }}
      >
        {/* Room container — rotates to simulate looking left/right */}
        <div
          style={{
            position: 'relative',
            width: SW,
            height: SH,
            transformStyle: 'preserve-3d',
            transform: `rotateY(${roomRotY}deg)`,
            transition: 'transform 0.85s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Back wall */}
          <Wall
            style={backWallStyle}
            frames={BACK_FRAMES}
            artworks={getWallArtworks(0)}
            onZoom={setZoomedImage}
          />

          {/* Left wall */}
          <Wall
            style={leftWallStyle}
            frames={SIDE_FRAMES}
            artworks={getWallArtworks(1)}
            onZoom={setZoomedImage}
          />

          {/* Right wall */}
          <Wall
            style={rightWallStyle}
            frames={SIDE_FRAMES}
            artworks={getWallArtworks(2)}
            onZoom={setZoomedImage}
          />

          {/* Floor */}
          <div style={floorStyle} />

          {/* Ceiling */}
          <div style={ceilingStyle} />
        </div>
      </div>

      {/* ── Left / Right nav arrows ── */}
      <button
        onClick={prevView}
        style={{
          position: 'absolute',
          left: 20,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 20,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.45)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(6px)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0,0,0,0.7)'
          e.currentTarget.style.borderColor = 'rgba(232,168,64,0.4)'
          e.currentTarget.style.color = 'rgba(255,255,255,0.95)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0,0,0,0.45)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
          e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
        }}
      >
        <ChevronLeft size={20} />
      </button>

      <button
        onClick={nextView}
        style={{
          position: 'absolute',
          right: 20,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 20,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.45)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(6px)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0,0,0,0.7)'
          e.currentTarget.style.borderColor = 'rgba(232,168,64,0.4)'
          e.currentTarget.style.color = 'rgba(255,255,255,0.95)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0,0,0,0.45)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
          e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
        }}
      >
        <ChevronRight size={20} />
      </button>

      {/* ── Bottom controls ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 28,
          left: 0,
          right: 0,
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Wall indicator dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(['left', 'center', 'right'] as ViewDir[]).map((d) => (
            <button
              key={d}
              onClick={() => setViewDir(d)}
              style={{
                width: viewDir === d ? 24 : 6,
                height: 6,
                borderRadius: 3,
                background:
                  viewDir === d ? 'rgba(232,168,64,0.9)' : 'rgba(255,255,255,0.2)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.35s',
                padding: 0,
              }}
            />
          ))}
        </div>

        {/* Room navigation (only if multiple rooms) */}
        {totalRooms > 1 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              disabled={roomIndex === 0}
              onClick={() => { setRoomIndex((r) => r - 1); setViewDir('center') }}
              style={{
                padding: '5px 14px',
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(232,168,64,0.3)',
                color: roomIndex === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(232,168,64,0.75)',
                cursor: roomIndex === 0 ? 'default' : 'pointer',
                borderRadius: 2,
              }}
            >
              ← Önceki Oda
            </button>
            <button
              disabled={roomIndex === totalRooms - 1}
              onClick={() => { setRoomIndex((r) => r + 1); setViewDir('center') }}
              style={{
                padding: '5px 14px',
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(232,168,64,0.3)',
                color: roomIndex === totalRooms - 1 ? 'rgba(255,255,255,0.2)' : 'rgba(232,168,64,0.75)',
                cursor: roomIndex === totalRooms - 1 ? 'default' : 'pointer',
                borderRadius: 2,
              }}
            >
              Sonraki Oda →
            </button>
          </div>
        )}

        {/* Keyboard hint */}
        <p
          style={{
            color: 'rgba(255,255,255,0.18)',
            fontSize: 10,
            letterSpacing: '0.12em',
            margin: 0,
          }}
        >
          ← → klavye · ESC çıkış
        </p>
      </div>

      {/* ── Zoomed image lightbox ── */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            background: 'rgba(0,0,0,0.96)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <button
            onClick={() => setZoomedImage(null)}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <X size={18} />
          </button>
          <img
            src={zoomedImage}
            alt="Eser"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '88vw',
              maxHeight: '88vh',
              objectFit: 'contain',
              borderRadius: 4,
              boxShadow: '0 0 80px rgba(0,0,0,0.9)',
              border: '3px solid rgba(185,152,70,0.4)',
            }}
            draggable={false}
          />
        </div>
      )}
    </div>
  )
}
