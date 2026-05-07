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

// ─── perspective = depth → back-wall exactly fills viewport after 50% scale ─
const P = 650 // px (perspective value AND room depth)

// ─── Back-wall element is 200 vw × 170 vh (so after scale=0.5 it fills viewport)
// Frame coords are in back-wall element pixels, designed for 1440×900 vp.
// apparent_x = (el_x − 1440) × 0.5 + 720   → centre of el (1440) = centre vp
const WALL_FRAMES = [
  { left: 500,  top: 370, w: 410, h: 540 }, // left frame   — appears ≈200×270 px
  { left: 1180, top: 290, w: 480, h: 640 }, // centre frame — appears ≈240×320 px (taller)
  { left: 1940, top: 370, w: 410, h: 540 }, // right frame  — appears ≈200×270 px
]

const GALLERY_CSS = `
  @keyframes gIn  { from { opacity:0 } to { opacity:1 } }
  @keyframes gOut { from { opacity:1 } to { opacity:0 } }
  @keyframes breathe { 0%,100%{opacity:.75} 50%{opacity:1} }
`

type ViewDir = 'left' | 'center' | 'right'

// ─── Frame component ─────────────────────────────────────────────────────────
function Frame({
  artwork,
  pos,
  idx,
  onZoom,
}: {
  artwork: Artwork | null
  pos: (typeof WALL_FRAMES)[number]
  idx: number
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
      {/* Ambient glow around frame */}
      <div style={{
        position: 'absolute', inset: -40,
        background: `radial-gradient(ellipse at 50% 50%, rgba(255,245,230,${hov ? .10 : .055}), transparent 65%)`,
        pointerEvents: 'none', transition: 'opacity .5s',
      }} />

      {/* Outer frame — dark wood / iron style */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg,#2a2218,#1c1810,#2a2218,#1c1810)',
        border: '1px solid rgba(255,245,230,.12)',
        boxShadow: hov
          ? '0 0 50px rgba(0,0,0,.9), 0 20px 60px rgba(0,0,0,.7), inset 0 0 0 4px rgba(255,245,230,.07)'
          : '0 0 30px rgba(0,0,0,.8), 0 10px 40px rgba(0,0,0,.65), inset 0 0 0 4px rgba(0,0,0,.5)',
        transition: 'box-shadow .4s',
      }}>
        {/* Mat board */}
        <div style={{
          position: 'absolute', inset: 16,
          background: url ? '#0e0c0a' : 'rgba(245,240,232,.025)',
          border: '1px solid rgba(255,245,230,.07)',
          overflow: 'hidden',
        }}>
          {url ? (
            <>
              <img
                src={url}
                alt={artwork?.title ?? 'Eser'}
                style={{
                  width:'100%', height:'100%', objectFit:'cover', display:'block',
                  transform: hov ? 'scale(1.04)' : 'scale(1)',
                  transition: 'transform .6s ease',
                }}
                draggable={false}
              />
              {hov && (
                <button
                  onClick={() => onZoom(url)}
                  style={{
                    position:'absolute', top:10, right:10,
                    width:34, height:34, borderRadius:'50%',
                    background:'rgba(0,0,0,.75)', border:'1px solid rgba(255,245,230,.25)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor:'pointer', color:'rgba(255,245,230,.9)',
                  }}
                >
                  <ZoomIn size={15} />
                </button>
              )}
            </>
          ) : (
            /* ── empty canvas ── */
            <div style={{
              width:'100%', height:'100%',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              background: `
                repeating-linear-gradient(0deg,  transparent,transparent 4px,rgba(255,245,230,.018) 4px,rgba(255,245,230,.018) 5px),
                repeating-linear-gradient(90deg, transparent,transparent 4px,rgba(255,245,230,.012) 4px,rgba(255,245,230,.012) 5px)
              `,
            }}>
              <div style={{ width:1, height:28, background:'rgba(255,245,230,.08)', marginBottom:8 }} />
              <div style={{ width:28, height:1, background:'rgba(255,245,230,.08)' }} />
            </div>
          )}
        </div>
      </div>

      {/* Title placard */}
      {(artwork?.title || !url) && (
        <div style={{
          position:'absolute', top:'calc(100% + 14px)', left:'50%', transform:'translateX(-50%)',
          width: pos.w * .65, padding:'5px 10px',
          background:'rgba(10,8,6,.95)', borderTop:'1px solid rgba(255,245,230,.08)',
          textAlign:'center',
        }}>
          <div style={{
            fontFamily:'Georgia,serif', fontSize:9, letterSpacing:'.18em',
            textTransform:'uppercase',
            color: artwork?.title ? 'rgba(255,245,230,.55)' : 'rgba(255,245,230,.12)',
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          }}>
            {artwork?.title ?? '— — —'}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Wall surface ─────────────────────────────────────────────────────────────
function Wall({
  style,
  artworks,
  onZoom,
}: {
  style: React.CSSProperties
  artworks: (Artwork | null)[]
  onZoom: (url: string) => void
}) {
  return (
    <div style={style}>
      {/* Subtle horizontal wall texture */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        backgroundImage:`
          repeating-linear-gradient(180deg,
            transparent, transparent 79px,
            rgba(255,255,255,.008) 79px, rgba(255,255,255,.008) 80px
          )`,
      }} />
      {/* Ceiling-edge shadow */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:120,
        background:'linear-gradient(180deg,rgba(0,0,0,.55),transparent)',
        pointerEvents:'none',
      }} />
      {/* Floor-edge shadow */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0, height:160,
        background:'linear-gradient(0deg,rgba(0,0,0,.7),transparent)',
        pointerEvents:'none',
      }} />
      {/* Spot light columns from ceiling (soft air glow) */}
      {WALL_FRAMES.map((f, i) => (
        <div key={i} style={{
          position:'absolute',
          left: f.left + f.w / 2,
          top: 0,
          transform:'translateX(-50%)',
          width: f.w * 2.5,
          height:'78%',
          background:`radial-gradient(ellipse 50% 90% at 50% 0%, rgba(255,240,200,.055), transparent)`,
          pointerEvents:'none',
        }} />
      ))}
      {/* Frames */}
      {WALL_FRAMES.map((f, i) => (
        <Frame key={i} artwork={artworks[i]} pos={f} idx={i} onZoom={onZoom} />
      ))}
    </div>
  )
}

// ─── Main Gallery Component ───────────────────────────────────────────────────
export function ArtGallery3D({ artworks, isOpen, onClose }: ArtGallery3DProps) {
  const [view,       setView]       = useState<ViewDir>('center')
  const [room,       setRoom]       = useState(0)
  const [zoomed,     setZoomed]     = useState<string | null>(null)
  const [visible,    setVisible]    = useState(false)

  const imgs          = artworks.filter(a => a.media?.[0]?.url)
  const FPR           = 9
  const totalRooms    = Math.max(1, Math.ceil(imgs.length / FPR))
  const roomRotY      = view === 'left' ? 90 : view === 'right' ? -90 : 0

  const wallArts = useCallback((wi: number) =>
    Array.from({ length: 3 }, (_, fi) => imgs[room * FPR + wi * 3 + fi] ?? null),
    [imgs, room]
  )

  const goLeft  = useCallback(() => setView(v => v === 'right' ? 'center' : 'left'),  [])
  const goRight = useCallback(() => setView(v => v === 'left'  ? 'center' : 'right'), [])

  useEffect(() => {
    if (!isOpen) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      { zoomed ? setZoomed(null) : onClose() }
      if (e.key === 'ArrowLeft')   goLeft()
      if (e.key === 'ArrowRight')  goRight()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isOpen, zoomed, onClose, goLeft, goRight])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setView('center'); setRoom(0)
      const t = setTimeout(() => setVisible(true), 30)
      return () => clearTimeout(t)
    } else {
      setVisible(false)
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  // ─── Shared wall base ───────────────────────────────────────────────────────
  // All walls are 200vw × 170vh (oversized) so after perspective scale=0.5 they fill viewport.
  // left='-50%' / right=0 places them relative to the room container (which is inset-0).
  const wallBase: React.CSSProperties = {
    position: 'absolute',
    width: '200%',
    height: '170%',
    top: '-35%',
    overflow: 'visible',
    background: 'linear-gradient(170deg,#1a1714 0%,#141210 50%,#0f0d0b 100%)',
  }

  const VIEWS: Record<ViewDir, string> = { left:'Sol Duvar', center:'Ön Duvar', right:'Sağ Duvar' }

  return (
    <>
      <style>{GALLERY_CSS}</style>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: '#0a0806',
          overflow: 'hidden',
          userSelect: 'none',
          opacity: visible ? 1 : 0,
          transition: 'opacity .55s ease',
        }}
      >
        {/* ── radial vignette ── */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none', zIndex:6,
          background:'radial-gradient(ellipse at 50% 50%, transparent 42%, rgba(0,0,0,.72) 100%)',
        }} />

        {/* ── Header ── */}
        <div style={{
          position:'absolute', top:0, left:0, right:0, zIndex:20,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'20px 28px 16px',
          background:'linear-gradient(180deg,rgba(10,8,6,.9) 0%,transparent 100%)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <span style={{ color:'rgba(255,245,230,.35)', fontSize:11, letterSpacing:'.32em', fontWeight:300, textTransform:'uppercase' }}>
              Sergi Turu
            </span>
            <span style={{ width:1, height:10, background:'rgba(255,245,230,.15)' }} />
            <span style={{ color:'rgba(255,245,230,.28)', fontSize:10, letterSpacing:'.2em' }}>
              {VIEWS[view]}
            </span>
            {totalRooms > 1 && (
              <span style={{ color:'rgba(255,245,230,.15)', fontSize:10, marginLeft:4 }}>
                {room + 1} / {totalRooms}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,245,230,.1)',
              borderRadius:'50%', width:34, height:34,
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'rgba(255,245,230,.45)', transition:'all .2s',
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.1)';e.currentTarget.style.color='rgba(255,245,230,.9)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.04)';e.currentTarget.style.color='rgba(255,245,230,.45)'}}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── 3-D Scene ── */}
        <div style={{
          position:'absolute', inset:0,
          perspective:`${P}px`, perspectiveOrigin:'50% 44%',
        }}>
          {/* Room — rotates for view direction */}
          <div style={{
            position:'absolute', inset:0,
            transformStyle:'preserve-3d',
            transform:`rotateY(${roomRotY}deg)`,
            transition:'transform .92s cubic-bezier(.4,0,.15,1)',
          }}>

            {/* ── Back wall ── */}
            <Wall
              style={{ ...wallBase, left:'-50%', transform:`translateZ(-${P}px)` }}
              artworks={wallArts(0)}
              onZoom={setZoomed}
            />

            {/* ── Left wall ── */}
            <Wall
              style={{ ...wallBase, left:0, transformOrigin:'left center', transform:'rotateY(90deg)' }}
              artworks={wallArts(1)}
              onZoom={setZoomed}
            />

            {/* ── Right wall ── */}
            <Wall
              style={{ ...wallBase, right:0, left:'auto', transformOrigin:'right center', transform:'rotateY(-90deg)' }}
              artworks={wallArts(2)}
              onZoom={setZoomed}
            />

            {/* ── Floor ── */}
            <div style={{
              position:'absolute', bottom:0, left:'-50%',
              width:'200%', height:`${P}px`,
              transformOrigin:'bottom center',
              transform:'rotateX(-90deg)',
              background:`
                repeating-linear-gradient(90deg, transparent,transparent 89px, rgba(255,255,255,.028) 89px,rgba(255,255,255,.028) 90px),
                linear-gradient(to bottom,#221a10,#110c06)
              `,
            }}>
              {/* Floor glow beneath each frame */}
              {WALL_FRAMES.map((f,i) => (
                <div key={i} style={{
                  position:'absolute', top:0,
                  left: f.left + f.w/2, transform:'translateX(-50%)',
                  width:f.w*1.8, height:160,
                  background:'radial-gradient(ellipse at 50% 0%, rgba(255,240,200,.06), transparent 70%)',
                  pointerEvents:'none',
                }} />
              ))}
            </div>

            {/* ── Ceiling ── */}
            <div style={{
              position:'absolute', top:0, left:'-50%',
              width:'200%', height:`${P}px`,
              transformOrigin:'top center',
              transform:'rotateX(90deg)',
              background:'linear-gradient(to bottom,#060504,#111009)',
            }}>
              {/* Ceiling spot-light halos above each frame */}
              {WALL_FRAMES.map((f,i) => (
                <div key={i} style={{
                  position:'absolute', bottom:8,
                  left: f.left + f.w/2, transform:'translateX(-50%)',
                  width:f.w*1.6, height:80,
                  background:'radial-gradient(ellipse at 50% 100%, rgba(255,248,220,.1), transparent 65%)',
                  animation:'breathe 4s ease-in-out infinite',
                  animationDelay:`${i * 1.3}s`,
                  pointerEvents:'none',
                }} />
              ))}
            </div>

          </div>{/* /room */}
        </div>{/* /3d scene */}

        {/* ── Nav arrows ── */}
        {(['left','right'] as const).map(side => (
          <button key={side}
            onClick={side==='left' ? goLeft : goRight}
            style={{
              position:'absolute', [side]:24, top:'50%', transform:'translateY(-50%)',
              zIndex:20, width:48, height:48, borderRadius:'50%',
              background:'rgba(0,0,0,.5)', border:'1px solid rgba(255,245,230,.1)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'rgba(255,245,230,.5)',
              backdropFilter:'blur(10px)', transition:'all .25s',
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.08)';e.currentTarget.style.borderColor='rgba(255,245,230,.3)';e.currentTarget.style.color='rgba(255,245,230,.95)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,0,0,.5)';e.currentTarget.style.borderColor='rgba(255,245,230,.1)';e.currentTarget.style.color='rgba(255,245,230,.5)'}}
          >
            {side==='left' ? <ChevronLeft size={22}/> : <ChevronRight size={22}/>}
          </button>
        ))}

        {/* ── Bottom UI ── */}
        <div style={{
          position:'absolute', bottom:26, left:0, right:0, zIndex:20,
          display:'flex', flexDirection:'column', alignItems:'center', gap:10,
        }}>
          {/* Wall dots */}
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {(['left','center','right'] as ViewDir[]).map(d => (
              <button key={d} onClick={()=>setView(d)} style={{
                width: view===d ? 28 : 6, height:6, borderRadius:3, border:'none', padding:0,
                background: view===d ? 'rgba(255,245,230,.7)' : 'rgba(255,245,230,.2)',
                cursor:'pointer', transition:'all .35s',
              }} />
            ))}
          </div>
          {/* Room nav */}
          {totalRooms > 1 && (
            <div style={{ display:'flex', gap:8 }}>
              {[
                { label:'← Önceki', dis:room===0,          fn:()=>{setRoom(r=>r-1);setView('center')} },
                { label:'Sonraki →', dis:room===totalRooms-1, fn:()=>{setRoom(r=>r+1);setView('center')} },
              ].map(({label,dis,fn})=>(
                <button key={label} disabled={dis} onClick={fn} style={{
                  padding:'5px 14px', fontSize:9.5, letterSpacing:'.14em', textTransform:'uppercase',
                  background:'rgba(0,0,0,.5)', border:'1px solid rgba(255,245,230,.12)',
                  color: dis ? 'rgba(255,245,230,.15)' : 'rgba(255,245,230,.55)',
                  cursor:dis?'default':'pointer', borderRadius:2, fontFamily:'Georgia,serif',
                }}>
                  {label}
                </button>
              ))}
            </div>
          )}
          <p style={{ color:'rgba(255,245,230,.13)', fontSize:9, letterSpacing:'.16em', margin:0 }}>
            ← → klavye &nbsp;·&nbsp; ESC çıkış
          </p>
        </div>

        {/* ── Zoom lightbox ── */}
        {zoomed && (
          <div
            onClick={()=>setZoomed(null)}
            style={{
              position:'fixed', inset:0, zIndex:110, background:'rgba(0,0,0,.97)',
              display:'flex', alignItems:'center', justifyContent:'center', cursor:'zoom-out',
            }}
          >
            <button onClick={()=>setZoomed(null)} style={{
              position:'absolute', top:22, right:22,
              background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,245,230,.15)',
              borderRadius:'50%', width:38, height:38,
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'rgba(255,245,230,.7)',
            }}>
              <X size={17}/>
            </button>
            <img
              src={zoomed} alt="Eser"
              onClick={e=>e.stopPropagation()}
              style={{
                maxWidth:'88vw', maxHeight:'88vh', objectFit:'contain', borderRadius:3,
                boxShadow:'0 0 120px rgba(0,0,0,.95)',
                border:'1px solid rgba(255,245,230,.1)',
              }}
              draggable={false}
            />
          </div>
        )}
      </div>
    </>
  )
}
