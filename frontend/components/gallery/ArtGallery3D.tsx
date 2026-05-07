'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { X, ZoomIn, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react'

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

const P    = 650          // perspective == room depth (back-wall fills viewport at scale=0.5)
const STEP = 90           // px per walk step
const MAX_Z = Math.round(P * 0.68)  // max walk-in distance

// ── Frame positions inside the back-wall element (2880×1530 for 1440×900 vp)
// apparent_x = (el_x − 1440) × 0.5 + 720  →  centred on viewport
const WALL_FRAMES = [
  { left: 490,  top: 340, w: 420, h: 560 },   // left
  { left: 1170, top: 260, w: 500, h: 680 },   // centre (taller)
  { left: 1950, top: 340, w: 420, h: 560 },   // right
]

const CSS = `
  @keyframes spotPulse { 0%,100%{opacity:.8} 50%{opacity:1} }
`

type ViewDir = 'left' | 'center' | 'right'

// ── Single frame ──────────────────────────────────────────────────────────────
function Frame({
  artwork,
  pos,
  onZoom,
}: {
  artwork: Artwork | null
  pos: (typeof WALL_FRAMES)[number]
  onZoom: (url: string) => void
}) {
  const [hov, setHov] = useState(false)
  const url = artwork?.media?.[0]?.url ? resolveImageUrl(artwork.media[0].url) : null

  return (
    <div
      style={{ position: 'absolute', left: pos.left, top: pos.top, width: pos.w, height: pos.h }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Spot-light cone on wall surface */}
      <div style={{
        position: 'absolute',
        left: '50%', bottom: '100%',
        transform: 'translateX(-50%)',
        width: pos.w * 3,
        height: 500,
        background: `radial-gradient(ellipse 45% 100% at 50% 0%,
          rgba(255,240,190,${hov ? .22 : .14}), transparent 72%)`,
        pointerEvents: 'none',
        transition: 'opacity .4s',
        animation: 'spotPulse 5s ease-in-out infinite',
      }} />

      {/* Wall glow halo around frame */}
      <div style={{
        position: 'absolute', inset: -55,
        background: `radial-gradient(ellipse at 50% 50%,
          rgba(255,240,190,${hov ? .12 : .07}), transparent 65%)`,
        pointerEvents: 'none', transition: 'opacity .4s',
      }} />

      {/* Outer frame — dark metallic */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(150deg,#2e2820,#1c1814,#2e2820)',
        boxShadow: hov
          ? '0 0 60px rgba(0,0,0,.9),0 20px 50px rgba(0,0,0,.7),inset 0 0 0 3px rgba(255,240,190,.1)'
          : '0 0 35px rgba(0,0,0,.85),0 10px 35px rgba(0,0,0,.65)',
        transition: 'box-shadow .4s',
      }}>
        {/* Thin inner gold line */}
        <div style={{
          position: 'absolute', inset: 3,
          border: '1px solid rgba(255,240,190,.14)',
        }} />

        {/* Mat + artwork */}
        <div style={{
          position: 'absolute', inset: 12,
          background: '#111009',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {url ? (
            <>
              {/* objectFit:contain → full image always visible */}
              <img
                src={url}
                alt={artwork?.title ?? 'Eser'}
                style={{
                  maxWidth: '100%', maxHeight: '100%',
                  width: 'auto', height: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                  transform: hov ? 'scale(1.03)' : 'scale(1)',
                  transition: 'transform .6s ease',
                }}
                draggable={false}
              />
              {hov && (
                <button
                  onClick={() => onZoom(url)}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(0,0,0,.75)',
                    border: '1px solid rgba(255,240,190,.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'rgba(255,240,190,.9)',
                  }}
                >
                  <ZoomIn size={14} />
                </button>
              )}
            </>
          ) : (
            /* Empty canvas */
            <div style={{
              width: '100%', height: '100%',
              background: `
                repeating-linear-gradient(0deg,  transparent,transparent 4px,rgba(255,240,190,.015) 4px,rgba(255,240,190,.015) 5px),
                repeating-linear-gradient(90deg, transparent,transparent 4px,rgba(255,240,190,.01)  4px,rgba(255,240,190,.01)  5px)
              `,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 20, height: 20, position: 'relative',
                opacity: .18,
              }}>
                <div style={{ position: 'absolute', left: 9, top: 0, width: 1, height: 20, background: 'rgba(255,240,190,1)' }} />
                <div style={{ position: 'absolute', top: 9, left: 0, width: 20, height: 1, background: 'rgba(255,240,190,1)' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Label */}
      <div style={{
        position: 'absolute', top: 'calc(100% + 12px)', left: '50%',
        transform: 'translateX(-50%)',
        width: pos.w * .62,
        padding: '5px 10px',
        background: 'rgba(8,6,4,.92)',
        borderTop: '1px solid rgba(255,240,190,.09)',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'Georgia,serif', fontSize: 9,
          letterSpacing: '.18em', textTransform: 'uppercase',
          color: artwork?.title ? 'rgba(255,240,190,.5)' : 'rgba(255,240,190,.12)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {artwork?.title ?? '· · ·'}
        </div>
      </div>
    </div>
  )
}

// ── Wall surface ──────────────────────────────────────────────────────────────
function Wall({
  wallStyle,
  artworks,
  onZoom,
}: {
  wallStyle: React.CSSProperties
  artworks: (Artwork | null)[]
  onZoom: (url: string) => void
}) {
  return (
    <div style={wallStyle}>
      {/* Ambient upper light */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '55%',
        background: 'linear-gradient(180deg,rgba(255,240,190,.04) 0%,transparent 100%)',
        pointerEvents: 'none',
      }} />
      {/* Floor shadow */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%',
        background: 'linear-gradient(0deg,rgba(0,0,0,.55) 0%,transparent 100%)',
        pointerEvents: 'none',
      }} />
      {WALL_FRAMES.map((f, i) => (
        <Frame key={i} artwork={artworks[i]} pos={f} onZoom={onZoom} />
      ))}
    </div>
  )
}

// ── Icon button helper ────────────────────────────────────────────────────────
function NavBtn({
  onClick, children, style,
}: {
  onClick: () => void
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 46, height: 46, borderRadius: '50%',
        background: hov ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.5)',
        border: `1px solid ${hov ? 'rgba(255,240,190,.35)' : 'rgba(255,255,255,.1)'}`,
        cursor: 'pointer',
        color: hov ? 'rgba(255,240,190,.95)' : 'rgba(255,255,255,.5)',
        backdropFilter: 'blur(10px)',
        transition: 'all .2s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function ArtGallery3D({ artworks, isOpen, onClose }: ArtGallery3DProps) {
  const [view,    setView]    = useState<ViewDir>('center')
  const [room,    setRoom]    = useState(0)
  const [camZ,    setCamZ]    = useState(0)
  const [zoomed,  setZoomed]  = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const walkRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const imgs       = artworks.filter(a => a.media?.[0]?.url)
  const FPR        = 9
  const totalRooms = Math.max(1, Math.ceil(imgs.length / FPR))
  const roomRotY   = view === 'left' ? 90 : view === 'right' ? -90 : 0

  const wallArts = useCallback(
    (wi: number) => Array.from({ length: 3 }, (_, fi) => imgs[room * FPR + wi * 3 + fi] ?? null),
    [imgs, room]
  )

  const walkIn  = useCallback(() => setCamZ(z => Math.min(z + STEP, MAX_Z)), [])
  const walkOut = useCallback(() => setCamZ(z => Math.max(z - STEP, 0)), [])
  const goLeft  = useCallback(() => { setView(v => v === 'right' ? 'center' : 'left');  setCamZ(0) }, [])
  const goRight = useCallback(() => { setView(v => v === 'left' ? 'center' : 'right'); setCamZ(0) }, [])

  // Keyboard: ←→ rotate, W/S walk
  useEffect(() => {
    if (!isOpen) return
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     { zoomed ? setZoomed(null) : onClose(); return }
      if (e.key === 'ArrowLeft')  { goLeft();  return }
      if (e.key === 'ArrowRight') { goRight(); return }
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp')   walkIn()
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') walkOut()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [isOpen, zoomed, onClose, goLeft, goRight, walkIn, walkOut])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setView('center'); setRoom(0); setCamZ(0)
      const t = setTimeout(() => setVisible(true), 30)
      return () => clearTimeout(t)
    }
    setVisible(false)
    document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  // Shared wall style — 200vw × 170vh so after scale=0.5 fills viewport
  const wallBase: React.CSSProperties = {
    position: 'absolute',
    width: '200%', height: '170%', top: '-35%',
    overflow: 'visible',
    // Lighter wall: dark warm charcoal with visible ambient
    background: 'linear-gradient(170deg,#2c2620 0%,#221e18 45%,#1a1612 100%)',
  }

  const VIEWS: Record<ViewDir, string> = {
    left: 'Sol Duvar', center: 'Ön Duvar', right: 'Sağ Duvar',
  }

  const walkPct = Math.round((camZ / MAX_Z) * 100)

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: '#100d0a', overflow: 'hidden', userSelect: 'none',
        opacity: visible ? 1 : 0, transition: 'opacity .5s ease',
      }}>

        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6,
          background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,.65) 100%)',
        }} />

        {/* ── Header ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 26px 14px',
          background: 'linear-gradient(180deg,rgba(10,8,6,.85),transparent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'rgba(255,240,190,.3)', fontSize: 10, letterSpacing: '.3em', textTransform: 'uppercase', fontWeight: 300 }}>
              Sergi Turu
            </span>
            <span style={{ width: 1, height: 10, background: 'rgba(255,240,190,.15)' }} />
            <span style={{ color: 'rgba(255,240,190,.22)', fontSize: 9.5, letterSpacing: '.18em' }}>
              {VIEWS[view]}
            </span>
            {totalRooms > 1 && (
              <span style={{ color: 'rgba(255,240,190,.14)', fontSize: 9.5, marginLeft: 4 }}>
                {room + 1} / {totalRooms}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,240,190,.1)',
              borderRadius: '50%', width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,240,190,.4)', transition: 'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.09)'; e.currentTarget.style.color = 'rgba(255,240,190,.9)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.color = 'rgba(255,240,190,.4)' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── 3-D Scene ── */}
        <div style={{
          position: 'absolute', inset: 0,
          perspective: `${P}px`, perspectiveOrigin: '50% 44%',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            transformStyle: 'preserve-3d',
            // camZ pushes viewer forward; roomRotY rotates to look left/right
            transform: `translateZ(${camZ}px) rotateY(${roomRotY}deg)`,
            transition: 'transform .8s cubic-bezier(.4,0,.15,1)',
          }}>

            {/* Back wall */}
            <Wall
              wallStyle={{ ...wallBase, left: '-50%', transform: `translateZ(-${P}px)` }}
              artworks={wallArts(0)}
              onZoom={setZoomed}
            />

            {/* Left wall */}
            <Wall
              wallStyle={{ ...wallBase, left: 0, transformOrigin: 'left center', transform: 'rotateY(90deg)' }}
              artworks={wallArts(1)}
              onZoom={setZoomed}
            />

            {/* Right wall */}
            <Wall
              wallStyle={{ ...wallBase, right: 0, left: 'auto', transformOrigin: 'right center', transform: 'rotateY(-90deg)' }}
              artworks={wallArts(2)}
              onZoom={setZoomed}
            />

            {/* Floor */}
            <div style={{
              position: 'absolute', bottom: 0, left: '-50%',
              width: '200%', height: `${P}px`,
              transformOrigin: 'bottom center', transform: 'rotateX(-90deg)',
              background: `
                repeating-linear-gradient(90deg,transparent,transparent 89px,rgba(255,255,255,.022) 89px,rgba(255,255,255,.022) 90px),
                linear-gradient(to bottom,#2a1e12,#120d07)
              `,
            }}>
              {/* Glow puddles on floor */}
              {WALL_FRAMES.map((f, i) => (
                <div key={i} style={{
                  position: 'absolute', top: 0,
                  left: f.left + f.w / 2, transform: 'translateX(-50%)',
                  width: f.w * 2, height: 180,
                  background: 'radial-gradient(ellipse at 50% 0%, rgba(255,240,190,.08), transparent 70%)',
                  pointerEvents: 'none',
                }} />
              ))}
            </div>

            {/* Ceiling */}
            <div style={{
              position: 'absolute', top: 0, left: '-50%',
              width: '200%', height: `${P}px`,
              transformOrigin: 'top center', transform: 'rotateX(90deg)',
              background: 'linear-gradient(to bottom,#060504,#0e0b08)',
            }}>
              {/* Ceiling spot lights above frames */}
              {WALL_FRAMES.map((f, i) => (
                <div key={i} style={{
                  position: 'absolute', bottom: 0,
                  left: f.left + f.w / 2, transform: 'translateX(-50%)',
                  width: f.w * 2, height: 100,
                  background: 'radial-gradient(ellipse at 50% 100%, rgba(255,240,190,.18), transparent 70%)',
                  animation: `spotPulse ${4 + i * 0.7}s ease-in-out infinite`,
                  animationDelay: `${i * 1.1}s`,
                  pointerEvents: 'none',
                }} />
              ))}
            </div>

          </div>
        </div>

        {/* ── Left / Right rotation arrows ── */}
        <NavBtn onClick={goLeft}  style={{ position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)', zIndex: 20 }}>
          <ChevronLeft size={22} />
        </NavBtn>
        <NavBtn onClick={goRight} style={{ position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)', zIndex: 20 }}>
          <ChevronRight size={22} />
        </NavBtn>

        {/* ── Walk controls (right side vertical) ── */}
        <div style={{
          position: 'absolute', right: 80, top: '50%', transform: 'translateY(-50%)',
          zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}>
          <NavBtn onClick={walkIn} style={{ width: 38, height: 38 }}>
            <ArrowUp size={16} />
          </NavBtn>
          {/* Walk progress bar */}
          <div style={{
            width: 2, height: 40,
            background: 'rgba(255,240,190,.1)',
            borderRadius: 1, overflow: 'hidden',
          }}>
            <div style={{
              width: '100%',
              height: `${walkPct}%`,
              background: 'rgba(255,240,190,.5)',
              transition: 'height .3s',
              marginTop: `${100 - walkPct}%`,
            }} />
          </div>
          <NavBtn onClick={walkOut} style={{ width: 38, height: 38 }}>
            <ArrowDown size={16} />
          </NavBtn>
        </div>

        {/* ── Bottom UI ── */}
        <div style={{
          position: 'absolute', bottom: 24, left: 0, right: 0, zIndex: 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          {/* Wall dots */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {(['left', 'center', 'right'] as ViewDir[]).map(d => (
              <button key={d} onClick={() => { setView(d); setCamZ(0) }} style={{
                width: view === d ? 28 : 6, height: 6, borderRadius: 3, border: 'none', padding: 0,
                background: view === d ? 'rgba(255,240,190,.65)' : 'rgba(255,255,255,.18)',
                cursor: 'pointer', transition: 'all .35s',
              }} />
            ))}
          </div>

          {/* Room navigation */}
          {totalRooms > 1 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: '← Önceki', dis: room === 0,             fn: () => { setRoom(r => r - 1); setView('center'); setCamZ(0) } },
                { label: 'Sonraki →', dis: room === totalRooms - 1, fn: () => { setRoom(r => r + 1); setView('center'); setCamZ(0) } },
              ].map(({ label, dis, fn }) => (
                <button key={label} disabled={dis} onClick={fn} style={{
                  padding: '5px 14px', fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase',
                  background: 'rgba(0,0,0,.5)', border: '1px solid rgba(255,240,190,.12)',
                  color: dis ? 'rgba(255,240,190,.14)' : 'rgba(255,240,190,.5)',
                  cursor: dis ? 'default' : 'pointer', borderRadius: 2, fontFamily: 'Georgia,serif',
                }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          <p style={{ color: 'rgba(255,240,190,.13)', fontSize: 9, letterSpacing: '.16em', margin: 0 }}>
            ← → duvar &nbsp;·&nbsp; W / S ileri-geri &nbsp;·&nbsp; ESC çıkış
          </p>
        </div>

        {/* ── Zoom lightbox ── */}
        {zoomed && (
          <div
            onClick={() => setZoomed(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 110,
              background: 'rgba(0,0,0,.97)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'zoom-out',
            }}
          >
            <button onClick={() => setZoomed(null)} style={{
              position: 'absolute', top: 22, right: 22,
              background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,240,190,.15)',
              borderRadius: '50%', width: 38, height: 38,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,240,190,.7)',
            }}>
              <X size={17} />
            </button>
            <img
              src={zoomed} alt="Eser"
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: '90vw', maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: 3,
                boxShadow: '0 0 120px rgba(0,0,0,.95)',
                border: '1px solid rgba(255,240,190,.1)',
              }}
              draggable={false}
            />
          </div>
        )}

      </div>
    </>
  )
}
