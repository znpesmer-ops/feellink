'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

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

export function ArtGallery3D({ artworks, isOpen, onClose }: ArtGallery3DProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const imageArtworks = artworks.filter(
    (a) => a.media && a.media.length > 0 && a.media[0].url
  )

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning || imageArtworks.length === 0) return
      setIsTransitioning(true)
      setCurrentIndex(((index % imageArtworks.length) + imageArtworks.length) % imageArtworks.length)
      setTimeout(() => setIsTransitioning(false), 600)
    },
    [isTransitioning, imageArtworks.length]
  )

  const prev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo])
  const next = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (zoomedImage) setZoomedImage(null); else onClose() }
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose, prev, next, zoomedImage])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setCurrentIndex(0)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const count = imageArtworks.length

  if (count === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors"
          aria-label="Kapat"
        >
          <X size={28} />
        </button>
        <div className="text-white/60 text-center">
          <div className="text-6xl mb-4">🖼️</div>
          <p className="text-lg">Henüz eser yüklenmemiş</p>
        </div>
      </div>
    )
  }

  // Compute positions for visible artworks in a cylindrical layout
  // We show up to 7 panels: current ±3
  const visibleRange = Math.min(3, Math.floor((count - 1) / 2))
  const panels: Array<{ artwork: Artwork; offset: number }> = []
  for (let o = -visibleRange; o <= visibleRange; o++) {
    const idx = ((currentIndex + o) % count + count) % count
    panels.push({ artwork: imageArtworks[idx], offset: o })
  }

  const ANGLE_STEP = count <= 3 ? 35 : count <= 5 ? 28 : 22
  const RADIUS = count <= 3 ? 420 : count <= 5 ? 520 : 620

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex flex-col select-none"
      ref={containerRef}
    >
      {/* Ambient gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-black to-gray-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(255,123,0,0.06),transparent_60%)] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-5 pb-3">
        <div className="text-white/90 font-semibold tracking-wide text-sm uppercase flex items-center gap-2">
          <span className="text-brand-orange">✦</span>
          <span>Sergi Turu</span>
          <span className="text-white/30 font-normal ml-1">
            {currentIndex + 1} / {count}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          aria-label="Kapat"
        >
          <X size={22} />
        </button>
      </div>

      {/* 3D stage */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {/* Floor line */}
        <div className="absolute bottom-[15%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{ perspective: '1200px', perspectiveOrigin: '50% 45%' }}
        >
          <div
            className="relative"
            style={{
              transformStyle: 'preserve-3d',
              width: '280px',
              height: '360px',
            }}
          >
            {panels.map(({ artwork, offset }) => {
              const angle = offset * ANGLE_STEP
              const isCenter = offset === 0
              const distanceFromCenter = Math.abs(offset)
              const opacity = isCenter ? 1 : distanceFromCenter === 1 ? 0.75 : 0.4
              const imgUrl = resolveImageUrl(artwork.media![0].url)

              return (
                <div
                  key={`${artwork.id}-${offset}`}
                  className="absolute inset-0 transition-all duration-500 ease-out"
                  style={{
                    transform: `rotateY(${angle}deg) translateZ(${RADIUS}px)`,
                    opacity,
                    backfaceVisibility: 'hidden',
                  }}
                >
                  {/* Frame */}
                  <div
                    className={`relative w-full h-full rounded-lg overflow-hidden cursor-pointer transition-all duration-500 ${
                      isCenter
                        ? 'shadow-[0_0_60px_rgba(0,0,0,0.8),0_0_20px_rgba(255,123,0,0.15)] ring-1 ring-white/20'
                        : 'shadow-[0_0_40px_rgba(0,0,0,0.6)] ring-1 ring-white/10'
                    }`}
                    onClick={() => {
                      if (isCenter) setZoomedImage(imgUrl)
                      else goTo(((currentIndex + offset) % count + count) % count)
                    }}
                  >
                    {/* Wall mount top */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-1 h-4 bg-white/20 rounded-t" />

                    <img
                      src={imgUrl}
                      alt={artwork.title || 'Eser'}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />

                    {/* Light overlay on non-center */}
                    {!isCenter && (
                      <div className="absolute inset-0 bg-black/30" />
                    )}

                    {/* Zoom hint on center */}
                    {isCenter && (
                      <div className="absolute top-3 right-3 p-1.5 bg-black/40 rounded-full text-white/60 hover:text-white hover:bg-black/60 transition-all">
                        <ZoomIn size={14} />
                      </div>
                    )}

                    {/* Bottom mat */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Navigation arrows */}
        <button
          onClick={prev}
          className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/40 border border-white/10 text-white/70 hover:text-white hover:bg-black/70 hover:border-white/30 transition-all backdrop-blur-sm"
          aria-label="Önceki"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          onClick={next}
          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/40 border border-white/10 text-white/70 hover:text-white hover:bg-black/70 hover:border-white/30 transition-all backdrop-blur-sm"
          aria-label="Sonraki"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Info panel */}
      <div className="relative z-10 px-6 pb-6 pt-3">
        <div className="max-w-md mx-auto text-center">
          {imageArtworks[currentIndex]?.title && (
            <p className="text-white font-semibold text-base mb-1 transition-all">
              {imageArtworks[currentIndex].title}
            </p>
          )}
          {imageArtworks[currentIndex]?.caption && (
            <p className="text-white/50 text-sm line-clamp-2">
              {imageArtworks[currentIndex].caption}
            </p>
          )}
          {/* Dot indicators */}
          {count > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {imageArtworks.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === currentIndex
                      ? 'w-5 h-1.5 bg-brand-orange'
                      : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Eser ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Zoomed image lightbox */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <button
            className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors"
            onClick={() => setZoomedImage(null)}
            aria-label="Kapat"
          >
            <X size={28} />
          </button>
          <img
            src={zoomedImage}
            alt="Eser"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>
      )}
    </div>
  )
}
