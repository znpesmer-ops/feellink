'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { X, ZoomIn, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react'

interface Artwork {
  id: string
  title?: string
  caption?: string
  media?: Array<{ url: string; type?: string }>
}

interface ArtGallery3DProps {
  artworks: Artwork[]
  isOpen: boolean
  onClose: () => void
}

// ── Room dimensions ────────────────────────────────────────────────────────────
const P   = 700   // perspective (px)
const RW  = 2800  // room width  (px) — back wall fills ~97% of 1440 viewport
const RH  = 1600  // room height (px)
const RD  = 860   // room depth  (px)
const STEP = 80   // walk step
const MAX_Z = Math.round(P * 0.65)

// ── Frame positions on back wall (2800 × 1600) ────────────────────────────────
// apparent_x = (el_x − RW/2) × P/(P+RD)  + vp_center_x
// at P=700, RD=860: scale = 700/1560 = 0.449
// → frame positions chosen so apparent centers ≈ 25 / 50 / 75 % of viewport
const BACK_FRAMES = [
  { left: 310,  top: 360, w: 460, h: 590 },   // left   — apparent ≈ 205 × 265 px
  { left: 1150, top: 270, w: 500, h: 720 },   // centre — apparent ≈ 225 × 323 px
  { left: 2030, top: 360, w: 460, h: 590 },   // right
]

// Side walls are RD × RH = 860 × 1600
// Frames are positioned in the same relative way on a shorter wall
const SIDE_FRAMES = [
  { left:  45, top: 360, w: 220, h: 460 },
  { left: 320, top: 270, w: 220, h: 560 },
  { left: 595, top: 360, w: 220, h: 460 },
]

const CSS = `
  @keyframes spotBreath { 0%,100%{opacity:.75}  50%{opacity:1} }
  @keyframes gIn        { from{opacity:0} to{opacity:1} }
`

// ── Frame component ────────────────────────────────────────────────────────────
function Frame({
  artwork,
  pos,
  onZoom,
}: {
  artwork: Artwork | null
  pos: { left: number; top: number; w: number; h: number }
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
      {/* Spotlight cone from ceiling */}
      <div style={{
        position: 'absolute',
        left: '50%', bottom: '100%',
        transform: 'translateX(-50%)',
        width: pos.w * 3.2, height: 600,
        background: `radial-gradient(ellipse 42% 100% at 50% 0%,
          rgba(255,238,180,${hov ? 0.22 : 0.14}), transparent 70%)`,
        pointerEvents: 'none',
        animation: 'spotBreath 5s ease-in-out infinite',
        transition: 'opacity .4s',
      }} />

      {/* Ambient wall glow around frame */}
      <div style={{
        position: 'absolute', inset: -70,
        background: `radial-gradient(ellipse 60% 55% at 50% 50%,
          rgba(255,238,180,${hov ? 0.13 : 0.07}), transparent 65%)`,
        pointerEvents: 'none', transition: 'opacity .4s',
      }} />

      {/* Dark metallic frame */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(145deg,#2e2820,#1b1710,#2a2418)',
        boxShadow: hov
          ? `0 0 70px rgba(0,0,0,.95), 0 24px 60px rgba(0,0,0,.8),
             inset 0 0 0 2px rgba(255,238,180,.13), inset 0 0 0 6px rgba(0,0,0,.5)`
          : `0 0 40px rgba(0,0,0,.9), 0 12px 40px rgba(0,0,0,.7),
             inset 0 0 0 2px rgba(255,238,180,.07), inset 0 0 0 6px rgba(0,0,0,.4)`,
        transition: 'box-shadow .4s',
      }}>
        {/* Inner thin accent line */}
        <div style={{
          position: 'absolute', inset: 6,
          border: '1px solid rgba(255,238,180,.1)',
          pointerEvents: 'none',
        }} />

        {/* Artwork / empty canvas area */}
        <div style={{
          position: 'absolute', inset: 14,
          background: url ? '#0c0a08' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {url ? (
            <>
              <img
                src={url}
                alt={artwork?.title ?? 'Eser'}
                style={{
                  maxWidth: '100%', maxHeight: '100%',
                  width: 'auto', height: 'auto',
                  objectFit: 'contain', display: 'block',
                  transform: hov ? 'scale(1.03)' : 'scale(1)',
                  transition: 'transform .6s ease',
                }}
                draggable={false}
              />
              {hov && (
                <button
                  onClick={() => onZoom(url)}
                  style={{
                    position: 'absolute', top: 9, right: 9,
                    width: 33, height: 33, borderRadius: '50%',
                    background: 'rgba(0,0,0,.75)',
                    border: '1px solid rgba(255,238,180,.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'rgba(255,238,180,.9)',
                  }}
                >
                  <ZoomIn size={14} />
                </button>
              )}
            </>
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: `
                repeating-linear-gradient(0deg,  transparent,transparent 4px,rgba(255,238,180,.016) 4px,rgba(255,238,180,.016) 5px),
                repeating-linear-gradient(90deg, transparent,transparent 4px,rgba(255,238,180,.010) 4px,rgba(255,238,180,.010) 5px),
                #0e0b08
              `,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 24, height: 24, opacity: .14, position: 'relative',
              }}>
                <div style={{ position:'absolute',left:11,top:0,width:2,height:24,background:'rgba(255,238,180,1)' }} />
                <div style={{ position:'absolute',top:11,left:0,width:24,height:2,background:'rgba(255,238,180,1)' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Placard */}
      <div style={{
        position: 'absolute', top: 'calc(100% + 12px)', left: '50%',
        transform: 'translateX(-50%)', minWidth: 90, maxWidth: pos.w * .7,
        padding: '5px 11px', textAlign: 'center',
        background: 'rgba(8,6,4,.93)',
        borderTop: '1px solid rgba(255,238,180,.08)',
      }}>
        <div style={{
          fontFamily: 'Georgia,serif', fontSize: 9, letterSpacing: '.18em',
          textTransform: 'uppercase', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
          color: artwork?.title ? 'rgba(255,238,180,.5)' : 'rgba(255,238,180,.13)',
        }}>
          {artwork?.title ?? '· · ·'}
        </div>
      </div>
    </div>
  )
}

// ── Wall panel ─────────────────────────────────────────────────────────────────
function Wall({
  ws, frames, artworks, onZoom, ebruId,
}: {
  ws: React.CSSProperties
  frames: typeof BACK_FRAMES
  artworks: (Artwork | null)[]
  onZoom: (url: string) => void
  ebruId: string
}) {
  return (
    <div style={ws}>
      {/* ── Ebru marbling texture ── */}
      <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:0 }}>
        <div style={{
          position:'absolute', inset:-80,
          backgroundImage:`repeating-linear-gradient(
            8deg,
            #030c0a 0px,   #030c0a 20px,
            #004D40 20px,  #004D40 21.5px,
            #007A7A 21.5px,#007A7A 22.5px,
            #00ACC1 22.5px,#00ACC1 23.5px,
            #030c0a 23.5px,#030c0a 42px,
            #8B2500 42px,  #8B2500 43px,
            #D4400B 43px,  #D4400B 44px,
            #E8642A 44px,  #E8642A 45px,
            #FF8F00 45px,  #FF8F00 46px,
            #8B2500 46px,  #8B2500 47px,
            #030c0a 47px,  #030c0a 68px
          )`,
          filter:`url(#${ebruId})`,
          opacity:0.28,
        }} />
      </div>

      {/* Ambient upper light */}
      <div style={{ position:'absolute',inset:0,pointerEvents:'none',zIndex:1,
        background:'linear-gradient(180deg,rgba(255,238,180,.04) 0%,transparent 60%)' }} />
      {/* Floor shadow */}
      <div style={{ position:'absolute',bottom:0,left:0,right:0,height:'28%',pointerEvents:'none',zIndex:1,
        background:'linear-gradient(0deg,rgba(0,0,0,.6),transparent)' }} />
      <div style={{ position:'relative', zIndex:2 }}>
        {frames.map((f, i) => (
          <Frame key={i} artwork={artworks[i]} pos={f} onZoom={onZoom} />
        ))}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export function ArtGallery3D({ artworks, isOpen, onClose }: ArtGallery3DProps) {
  const [rotY,    setRotY]    = useState(0)   // room Y rotation (degrees)
  const [camZ,    setCamZ]    = useState(0)   // camera Z translation
  const [room,    setRoom]    = useState(0)   // room index
  const [zoomed,  setZoomed]  = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  // Drag state
  const dragRef    = useRef<{ x: number; baseRot: number } | null>(null)
  const [liveRot,  setLiveRot]  = useState(0)   // extra rotation while dragging
  const [dragging, setDragging] = useState(false)

  const imgs       = artworks.filter(a => a.media?.[0]?.url)
  const FPR        = 9
  const totalRooms = Math.max(1, Math.ceil(imgs.length / FPR))
  const wallArts   = useCallback(
    (wi: number) => Array.from({ length: 3 }, (_, fi) => imgs[room * FPR + wi * 3 + fi] ?? null),
    [imgs, room]
  )

  // Snap rotation to nearest 0 / ±90 / ±180
  const snap = useCallback((r: number) => {
    const positions = [-180, -90, 0, 90, 180]
    return positions.reduce((a, b) => (Math.abs(b - r) < Math.abs(a - r) ? b : a))
  }, [])

  // ── Drag / swipe handlers ──────────────────────────────────────────────────
  const onDragStart = useCallback((clientX: number) => {
    dragRef.current = { x: clientX, baseRot: rotY }
    setDragging(true)
  }, [rotY])

  const onDragMove = useCallback((clientX: number) => {
    if (!dragRef.current) return
    const delta = dragRef.current.x - clientX
    // ~300 px drag = 90°
    setLiveRot(delta * 0.3)
  }, [])

  const onDragEnd = useCallback(() => {
    if (!dragRef.current) return
    const finalRot = dragRef.current.baseRot + liveRot
    const snapped  = Math.max(-90, Math.min(90, snap(finalRot)))
    setRotY(snapped)
    setLiveRot(0)
    setDragging(false)
    dragRef.current = null
  }, [liveRot, snap])

  // Mouse events on the scene
  const onMouseDown  = useCallback((e: React.MouseEvent)  => onDragStart(e.clientX), [onDragStart])
  const onMouseMove  = useCallback((e: React.MouseEvent)  => onDragMove(e.clientX),  [onDragMove])
  const onMouseUp    = useCallback(                         onDragEnd,                [onDragEnd])
  const onTouchStart = useCallback((e: React.TouchEvent)  => onDragStart(e.touches[0].clientX), [onDragStart])
  const onTouchMove  = useCallback((e: React.TouchEvent)  => { e.preventDefault(); onDragMove(e.touches[0].clientX) }, [onDragMove])
  const onTouchEnd   = useCallback(                         onDragEnd,                [onDragEnd])

  const goLeft  = useCallback(() => { setRotY(r => Math.min(r + 90, 90));  setCamZ(0) }, [])
  const goRight = useCallback(() => { setRotY(r => Math.max(r - 90, -90)); setCamZ(0) }, [])
  const walkIn  = useCallback(() => setCamZ(z => Math.min(z + STEP, MAX_Z)), [])
  const walkOut = useCallback(() => setCamZ(z => Math.max(z - STEP, 0)),    [])

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const kd = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      { zoomed ? setZoomed(null) : onClose(); return }
      if (e.key === 'ArrowLeft')   goLeft()
      if (e.key === 'ArrowRight')  goRight()
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp')   walkIn()
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') walkOut()
    }
    window.addEventListener('keydown', kd)
    return () => window.removeEventListener('keydown', kd)
  }, [isOpen, zoomed, onClose, goLeft, goRight, walkIn, walkOut])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setRotY(0); setCamZ(0); setRoom(0); setLiveRot(0)
      const t = setTimeout(() => setVisible(true), 40)
      return () => clearTimeout(t)
    }
    setVisible(false)
    document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const effectiveRot = rotY + liveRot
  const viewDir      = effectiveRot > 45 ? 'left' : effectiveRot < -45 ? 'right' : 'center'
  const walkPct      = Math.round((camZ / MAX_Z) * 100)

  // ── Wall base style ────────────────────────────────────────────────────────
  // Room container is RW×RH, absolutely centered in viewport.
  // Walls are children using transformOrigin for correct 3D placement.
  const wallBase: React.CSSProperties = {
    position: 'absolute',
    overflow: 'visible',
    background: 'linear-gradient(165deg,#2a2318 0%,#1e1a14 50%,#161210 100%)',
  }

  const VIEWS: Record<string, string> = { left:'Sol Duvar', center:'Ön Duvar', right:'Sağ Duvar' }

  return (
    <>
      <style>{CSS}</style>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: '#0d0b08', overflow: 'hidden', userSelect: 'none',
          opacity: visible ? 1 : 0, transition: 'opacity .5s ease',
          cursor: dragging ? 'grabbing' : 'grab',
          animation: visible ? 'gIn .5s ease both' : 'none',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={dragging ? onMouseMove : undefined}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6,
          background: 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 40%, rgba(0,0,0,.7) 100%)',
        }} />

        {/* ── Header ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 26px 14px',
          background: 'linear-gradient(180deg,rgba(8,6,4,.9),transparent)',
          pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color:'rgba(255,238,180,.3)', fontSize:10, letterSpacing:'.3em', textTransform:'uppercase', fontWeight:300 }}>
              Sergi Turu
            </span>
            <span style={{ width:1, height:10, background:'rgba(255,238,180,.15)' }} />
            <span style={{ color:'rgba(255,238,180,.22)', fontSize:9.5, letterSpacing:'.18em' }}>
              {VIEWS[viewDir]}
            </span>
            {totalRooms > 1 && (
              <span style={{ color:'rgba(255,238,180,.14)', fontSize:9.5, marginLeft:4 }}>
                {room + 1} / {totalRooms}
              </span>
            )}
          </div>
          {/* drag hint */}
          <span style={{ color:'rgba(255,238,180,.18)', fontSize:9, letterSpacing:'.12em' }}>
            ← sürükle →
          </span>
        </div>

        {/* Close button (pointer-events re-enabled) */}
        <button
          onClick={onClose}
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'absolute', top: 16, right: 22, zIndex: 25,
            background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,238,180,.12)',
            borderRadius: '50%', width: 34, height: 34,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(255,238,180,.45)', transition: 'all .2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.1)'; e.currentTarget.style.color='rgba(255,238,180,.9)' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.05)'; e.currentTarget.style.color='rgba(255,238,180,.45)' }}
        >
          <X size={15} />
        </button>

        {/* ── SVG ebru filter defs (hidden) ── */}
        <svg style={{ position:'absolute', width:0, height:0, overflow:'hidden' }} aria-hidden>
          <defs>
            {(['ebru-back','ebru-left','ebru-right'] as const).map((id, i) => (
              <filter key={id} id={id} x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
                <feTurbulence type="turbulence" baseFrequency="0.0055 0.0025" numOctaves="7" seed={i * 19 + 5} result="noise"/>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="300" xChannelSelector="R" yChannelSelector="G"/>
              </filter>
            ))}
          </defs>
        </svg>

        {/* ── 3-D Scene ── */}
        <div style={{
          position: 'absolute', inset: 0,
          perspective: `${P}px`, perspectiveOrigin: '50% 42%',
        }}>
          {/* Room container — centred, rotates & walks */}
          <div style={{
            position: 'absolute',
            left: `calc(50% - ${RW / 2}px)`,
            top:  `calc(50% - ${RH / 2}px)`,
            width: RW, height: RH,
            transformStyle: 'preserve-3d',
            transform: `translateZ(${camZ}px) rotateY(${-effectiveRot}deg)`,
            transition: dragging ? 'none' : 'transform .75s cubic-bezier(.4,0,.15,1)',
          }}>

            {/* ── BACK WALL ── */}
            <Wall
              ws={{ ...wallBase, left: 0, top: 0, width: RW, height: RH,
                    transform: `translateZ(-${RD}px)` }}
              frames={BACK_FRAMES}
              artworks={wallArts(0)}
              onZoom={setZoomed}
              ebruId="ebru-back"
            />

            {/* ── LEFT WALL ── (transformOrigin left centre → extends into room at Z<0) */}
            <Wall
              ws={{ ...wallBase, left: 0, top: 0, width: RD, height: RH,
                    transformOrigin: 'left center',
                    transform: 'rotateY(90deg)' }}
              frames={SIDE_FRAMES}
              artworks={wallArts(1)}
              onZoom={setZoomed}
              ebruId="ebru-left"
            />

            {/* ── RIGHT WALL ── */}
            <Wall
              ws={{ ...wallBase, right: 0, left: 'auto', top: 0, width: RD, height: RH,
                    transformOrigin: 'right center',
                    transform: 'rotateY(-90deg)' }}
              frames={SIDE_FRAMES}
              artworks={wallArts(2)}
              onZoom={setZoomed}
              ebruId="ebru-right"
            />

            {/* ── FLOOR ── */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, width: RW, height: RD,
              transformOrigin: 'bottom center', transform: 'rotateX(-90deg)',
              background: `
                repeating-linear-gradient(90deg,transparent,transparent 89px,rgba(255,255,255,.02) 89px,rgba(255,255,255,.02) 90px),
                linear-gradient(to bottom,#291e0f,#100b05)
              `,
            }}>
              {/* Floor glow puddles */}
              {BACK_FRAMES.map((f, i) => (
                <div key={i} style={{
                  position:'absolute',top:0,
                  left:f.left + f.w/2, transform:'translateX(-50%)',
                  width:f.w*2.2, height:200,
                  background:'radial-gradient(ellipse at 50% 0%, rgba(255,238,180,.08), transparent 70%)',
                  pointerEvents:'none',
                }} />
              ))}
            </div>

            {/* ── CEILING ── */}
            <div style={{
              position: 'absolute', top: 0, left: 0, width: RW, height: RD,
              transformOrigin: 'top center', transform: 'rotateX(90deg)',
              background: 'linear-gradient(to bottom,#060504,#0e0a07)',
            }}>
              {/* Ceiling spot sources */}
              {BACK_FRAMES.map((f, i) => (
                <div key={i} style={{
                  position:'absolute', bottom:0,
                  left:f.left + f.w/2, transform:'translateX(-50%)',
                  width:f.w*2, height:110,
                  background:'radial-gradient(ellipse at 50% 100%, rgba(255,238,180,.2), transparent 70%)',
                  animation:`spotBreath ${4+i*.7}s ease-in-out infinite`,
                  animationDelay:`${i*1.1}s`,
                  pointerEvents:'none',
                }} />
              ))}
            </div>

          </div>{/* /room */}
        </div>

        {/* ── Rotation arrows ── */}
        {[
          { side:'left',  label:'‹', fn: goLeft,  Icon: ChevronLeft  },
          { side:'right', label:'›', fn: goRight, Icon: ChevronRight },
        ].map(({ side, fn, Icon }) => (
          <button
            key={side}
            onClick={fn}
            onMouseDown={e => e.stopPropagation()}
            style={{
              position:'absolute', [side]:20, top:'50%', transform:'translateY(-50%)',
              zIndex:20, width:48, height:48, borderRadius:'50%',
              background:'rgba(0,0,0,.5)', border:'1px solid rgba(255,238,180,.12)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'rgba(255,238,180,.5)',
              backdropFilter:'blur(10px)', transition:'all .2s',
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.09)';e.currentTarget.style.borderColor='rgba(255,238,180,.35)';e.currentTarget.style.color='rgba(255,238,180,.95)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,0,0,.5)';e.currentTarget.style.borderColor='rgba(255,238,180,.12)';e.currentTarget.style.color='rgba(255,238,180,.5)'}}
          >
            <Icon size={22} />
          </button>
        ))}

        {/* ── Walk buttons ── */}
        <div style={{
          position:'absolute', right:78, top:'50%', transform:'translateY(-50%)',
          zIndex:20, display:'flex', flexDirection:'column', alignItems:'center', gap:5,
        }}>
          {[{ Icon:ArrowUp, fn:walkIn }, { Icon:ArrowDown, fn:walkOut }].map(({Icon,fn},i)=>(
            <button key={i} onClick={fn} onMouseDown={e=>e.stopPropagation()} style={{
              width:36, height:36, borderRadius:'50%',
              background:'rgba(0,0,0,.5)', border:'1px solid rgba(255,238,180,.1)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'rgba(255,238,180,.45)', transition:'all .2s',
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.09)';e.currentTarget.style.color='rgba(255,238,180,.9)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,0,0,.5)';e.currentTarget.style.color='rgba(255,238,180,.45)'}}
            >
              <Icon size={14}/>
            </button>
          ))}
          {/* Walk progress */}
          <div style={{ width:2, height:36, background:'rgba(255,238,180,.1)', borderRadius:1, overflow:'hidden', margin:'2px 0' }}>
            <div style={{ width:'100%', height:`${walkPct}%`, background:'rgba(255,238,180,.5)', transition:'height .3s', marginTop:`${100-walkPct}%` }} />
          </div>
        </div>

        {/* ── Bottom UI ── */}
        <div style={{
          position:'absolute', bottom:24, left:0, right:0, zIndex:20,
          display:'flex', flexDirection:'column', alignItems:'center', gap:10,
          pointerEvents:'none',
        }}>
          {/* View dots */}
          <div style={{ display:'flex', gap:8, alignItems:'center', pointerEvents:'auto' }}>
            {[90, 0, -90].map(deg => (
              <button key={deg}
                onClick={() => { setRotY(deg); setCamZ(0) }}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  width: Math.abs(effectiveRot - deg) < 46 ? 26 : 6,
                  height: 6, borderRadius: 3, border: 'none', padding: 0,
                  background: Math.abs(effectiveRot - deg) < 46 ? 'rgba(255,238,180,.65)' : 'rgba(255,255,255,.2)',
                  cursor: 'pointer', transition: 'all .35s',
                }}
              />
            ))}
          </div>

          {totalRooms > 1 && (
            <div style={{ display:'flex', gap:8, pointerEvents:'auto' }}>
              {[
                { label:'← Önceki', dis:room===0,              fn:()=>{setRoom(r=>r-1);setRotY(0);setCamZ(0)} },
                { label:'Sonraki →', dis:room===totalRooms-1,  fn:()=>{setRoom(r=>r+1);setRotY(0);setCamZ(0)} },
              ].map(({label,dis,fn})=>(
                <button key={label} disabled={dis} onClick={fn} onMouseDown={e=>e.stopPropagation()} style={{
                  padding:'5px 14px', fontSize:9.5, letterSpacing:'.14em', textTransform:'uppercase',
                  background:'rgba(0,0,0,.5)', border:'1px solid rgba(255,238,180,.12)',
                  color: dis ? 'rgba(255,238,180,.14)' : 'rgba(255,238,180,.5)',
                  cursor: dis ? 'default' : 'pointer', borderRadius:2, fontFamily:'Georgia,serif',
                }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          <p style={{ color:'rgba(255,238,180,.13)', fontSize:9, letterSpacing:'.16em', margin:0 }}>
            ← sürükle → &nbsp;·&nbsp; W / S ileri-geri &nbsp;·&nbsp; ESC çıkış
          </p>
        </div>

        {/* ── Zoom lightbox ── */}
        {zoomed && (
          <div
            onClick={() => setZoomed(null)}
            onMouseDown={e => e.stopPropagation()}
            style={{
              position:'fixed', inset:0, zIndex:110,
              background:'rgba(0,0,0,.97)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'zoom-out',
            }}
          >
            <button onClick={() => setZoomed(null)} style={{
              position:'absolute', top:22, right:22,
              background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,238,180,.14)',
              borderRadius:'50%', width:38, height:38,
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'rgba(255,238,180,.7)',
            }}>
              <X size={17}/>
            </button>
            <img
              src={zoomed} alt="Eser"
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth:'90vw', maxHeight:'90vh',
                objectFit:'contain', borderRadius:3,
                boxShadow:'0 0 120px rgba(0,0,0,.95)',
                border:'1px solid rgba(255,238,180,.09)',
              }}
              draggable={false}
            />
          </div>
        )}
      </div>
    </>
  )
}
