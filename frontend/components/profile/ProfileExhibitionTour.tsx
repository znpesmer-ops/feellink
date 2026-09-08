'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Orbit,
  Sparkles,
} from 'lucide-react'
import { ArtworkDetailPanel } from './exhibition/ArtworkDetailPanel'
import {
  ExhibitionGallery,
  type ExhibitionGalleryHandle,
} from './exhibition/ExhibitionGallery'
import { ExhibitionFallback } from './exhibition/ExhibitionFallback'
import {
  toExhibitionArtwork,
  type ExhibitionArtwork,
  type ExhibitionPhase,
  type RawExhibitionArtwork,
} from './exhibition/types'

type ProfileExhibitionTourProps = {
  username: string
  exhibitionName?: string | null
  artworks: RawExhibitionArtwork[]
  isOwnProfile?: boolean
  onCreateArtwork?: () => void
}

export function ProfileExhibitionTour({
  username,
  exhibitionName,
  artworks,
  isOwnProfile = false,
  onCreateArtwork,
}: ProfileExhibitionTourProps) {
  const router = useRouter()
  const shellRef = useRef<HTMLElement | null>(null)
  const galleryRef = useRef<ExhibitionGalleryHandle | null>(null)
  const [phase, setPhase] = useState<ExhibitionPhase>('entrance')
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedArtwork, setSelectedArtwork] = useState<ExhibitionArtwork | null>(null)
  const [autoTour, setAutoTour] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [sceneError, setSceneError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const exhibitionArtworks = useMemo(
    () => (artworks || []).map((artwork, index) => toExhibitionArtwork(artwork, index, username)).slice(0, 12),
    [artworks, username],
  )
  const displayExhibitionName = exhibitionName?.trim() || `${username} sergisi`
  const currentArtwork = exhibitionArtworks[activeIndex] || null

  useEffect(() => {
    if (activeIndex >= exhibitionArtworks.length) setActiveIndex(0)
  }, [activeIndex, exhibitionArtworks.length])

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === shellRef.current)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const handlePhaseChange = useCallback((nextPhase: ExhibitionPhase) => {
    setPhase(nextPhase)
    if (nextPhase === 'entrance') {
      setAutoTour(false)
      setSelectedArtwork(null)
    }
  }, [])

  const handleArtworkChange = useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

  const handleArtworkActivate = useCallback(
    (index: number) => {
      setActiveIndex(index)
      setSelectedArtwork(exhibitionArtworks[index] || null)
    },
    [exhibitionArtworks],
  )

  const handleReady = useCallback(() => {
    setIsReady(true)
    setSceneError(null)
  }, [])

  const handleSceneError = useCallback((message: string) => {
    setIsReady(true)
    setSceneError(message)
  }, [])

  const enterGallery = useCallback(() => {
    setSelectedArtwork(null)
    if (sceneError) {
      setPhase('gallery')
      return
    }
    galleryRef.current?.enterGallery()
  }, [sceneError])

  const exitGallery = useCallback(() => {
    setSelectedArtwork(null)
    if (sceneError) {
      setPhase('entrance')
      return
    }
    galleryRef.current?.exitGallery()
  }, [sceneError])

  const focusArtwork = useCallback(
    (index: number, openDetails = false) => {
      if (!exhibitionArtworks.length) return
      const safeIndex = ((index % exhibitionArtworks.length) + exhibitionArtworks.length) % exhibitionArtworks.length
      setActiveIndex(safeIndex)
      if (sceneError) {
        if (openDetails) setSelectedArtwork(exhibitionArtworks[safeIndex])
        return
      }
      galleryRef.current?.focusArtwork(safeIndex, openDetails)
    },
    [exhibitionArtworks, sceneError],
  )

  const toggleFullscreen = useCallback(async () => {
    const shell = shellRef.current
    if (!shell) return
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await shell.requestFullscreen()
    } catch {
      setIsFullscreen((current) => !current)
    }
  }, [])

  const retryScene = useCallback(() => {
    setSceneError(null)
    setIsReady(false)
    setPhase('entrance')
    setRetryKey((current) => current + 1)
  }, [])

  const createArtwork = useCallback(() => {
    if (onCreateArtwork) onCreateArtwork()
    else router.push('/feed')
  }, [onCreateArtwork, router])

  const openArtwork = useCallback(
    (artwork: ExhibitionArtwork) => {
      router.push(`/posts/${artwork.id}?from=${encodeURIComponent(`/profile/${username}`)}`)
    },
    [router, username],
  )

  const openTicket = useCallback(
    (artwork: ExhibitionArtwork) => {
      if (artwork.code) router.push(`/ticket/${encodeURIComponent(artwork.code)}`)
    },
    [router],
  )

  const iconButtonClass =
    'grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/12 bg-[#15191d]/58 text-white/78 shadow-[0_14px_36px_rgba(31,23,17,0.22)] backdrop-blur-xl transition hover:border-white/24 hover:bg-[#15191d]/72 hover:text-white disabled:cursor-not-allowed disabled:opacity-35'

  return (
    <section
      ref={shellRef}
      className={`relative isolate overflow-hidden bg-[#d6d1ca] text-white ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] h-screen w-screen'
          : 'h-[min(70svh,620px)] min-h-[460px] w-full sm:h-[min(68vh,640px)] sm:min-h-[520px]'
      }`}
    >
      <ExhibitionGallery
        key={retryKey}
        ref={galleryRef}
        artworks={exhibitionArtworks}
        exhibitionName={displayExhibitionName}
        autoTour={autoTour}
        onPhaseChange={handlePhaseChange}
        onArtworkChange={handleArtworkChange}
        onArtworkActivate={handleArtworkActivate}
        onReady={handleReady}
        onError={handleSceneError}
      />

      {sceneError && <ExhibitionFallback artwork={currentArtwork} phase={phase} />}

      {!isReady && !sceneError && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-[#d8d3cb]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#4c443c]/15 border-t-[#bd7540]" />
            <span className="text-xs font-semibold text-[#4c443c]/58">Sergi hazırlanıyor</span>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-40 bg-gradient-to-b from-black/48 via-black/12 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-3 p-4 sm:p-6">
        <div className="min-w-0 pt-0.5 drop-shadow-[0_2px_16px_rgba(0,0,0,0.48)]">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/68">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ff9b42] shadow-[0_0_14px_rgba(255,155,66,0.9)]" />
            {phase === 'gallery' ? 'Feellink dijital sergi' : 'Galeri girişi'}
          </div>
          <h2 className="mt-2 max-w-[36vw] truncate text-xl font-semibold tracking-tight text-white sm:max-w-[520px] sm:text-3xl">
            {displayExhibitionName}
          </h2>
        </div>

        <div className="pointer-events-auto flex max-w-[60vw] flex-nowrap justify-end gap-2 sm:max-w-[58vw] sm:flex-wrap">
          {phase === 'gallery' ? (
            <button type="button" onClick={exitGallery} className={iconButtonClass} aria-label="Boğaz terasına çık" title="Boğaz terasına çık">
              <DoorOpen className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={enterGallery}
              disabled={phase === 'entering'}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#ed842f] px-4 text-xs font-semibold text-white shadow-[0_14px_34px_rgba(237,132,47,0.34)] transition hover:bg-[#ff9b45] disabled:opacity-60"
            >
              <DoorOpen className="h-4 w-4" />
              <span>{phase === 'entering' ? 'Giriliyor' : 'Sergiye gir'}</span>
            </button>
          )}

          {isOwnProfile && (
            <button type="button" onClick={createArtwork} className={iconButtonClass} aria-label="Eser yükle" title="Eser yükle">
              <Plus className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setAutoTour((current) => !current)}
            disabled={phase !== 'gallery' || !exhibitionArtworks.length}
            className={`${iconButtonClass} w-auto gap-2 px-3 ${autoTour ? 'border-[#ffac63]/55 bg-[#ed842f]/88 text-white' : ''}`}
            aria-label={autoTour ? '360 derece sergi turunu durdur' : '360 derece sergi turunu başlat'}
            title={autoTour ? '360° turu durdur' : '360° sergi oda turu'}
          >
            {autoTour ? <Pause className="h-4 w-4" /> : <Orbit className="h-4 w-4" />}
            <span className="hidden text-[11px] font-semibold sm:inline">360° Tur</span>
          </button>
          <button type="button" onClick={toggleFullscreen} className={iconButtonClass} aria-label={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'} title={isFullscreen ? 'Küçült' : 'Tam ekran'}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-52 bg-gradient-to-t from-[#17120e]/88 via-[#17120e]/35 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex items-end justify-between gap-4 p-4 sm:p-6">
        <div className="min-w-0 drop-shadow-[0_2px_16px_rgba(0,0,0,0.52)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-white/48">
            {phase === 'gallery' ? 'Seçkide' : 'Giriş holü'}
          </p>
          <h3 className="mt-1 max-w-[54vw] truncate text-lg font-semibold text-white sm:max-w-[480px] sm:text-2xl">
            {currentArtwork?.title || 'Sergi alanı hazır'}
          </h3>
          <p className="mt-1 text-[11px] text-white/48">
            {exhibitionArtworks.length
              ? `${activeIndex + 1} / ${exhibitionArtworks.length} · ${currentArtwork?.artistName || username}`
              : isOwnProfile
                ? 'İlk eser yüklendiğinde duvarlarda yerini alacak.'
                : 'Bu sergide henüz eser bulunmuyor.'}
          </p>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button type="button" onClick={() => focusArtwork(activeIndex - 1)} disabled={phase !== 'gallery' || exhibitionArtworks.length < 2} className={iconButtonClass} aria-label="Önceki eser" title="Önceki eser">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => galleryRef.current?.resetView()} className={`${iconButtonClass} hidden sm:grid`} aria-label="Kamera görünümünü sıfırla" title="Görünümü sıfırla">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => focusArtwork(activeIndex + 1)} disabled={phase !== 'gallery' || exhibitionArtworks.length < 2} className={iconButtonClass} aria-label="Sonraki eser" title="Sonraki eser">
            <ChevronRight className="h-4 w-4" />
          </button>
          {currentArtwork && phase === 'gallery' && (
            <button
              type="button"
              onClick={() => setSelectedArtwork(currentArtwork)}
              aria-label="Eser DNA’sını aç"
              className="ml-0.5 inline-flex h-10 items-center gap-2 rounded-full bg-[#ed842f] px-3.5 text-xs font-semibold text-white shadow-[0_14px_34px_rgba(237,132,47,0.3)] transition hover:bg-[#ff9b45]"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Eser DNA’sı</span>
              <ArrowUpRight className="hidden h-3.5 w-3.5 sm:block" />
            </button>
          )}
        </div>
      </div>

      {sceneError && (
        <div className="absolute left-4 top-24 z-50 max-w-[calc(100%-2rem)] rounded-xl border border-white/12 bg-[#17191c]/82 px-3.5 py-3 text-xs text-white/70 shadow-xl backdrop-blur-xl sm:left-6">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-4 w-4 shrink-0 text-[#ff9b45]" />
            <span>{sceneError}</span>
            <button type="button" onClick={retryScene} className="font-semibold text-[#ffb36e] hover:text-white">
              Tekrar dene
            </button>
          </div>
        </div>
      )}

      <ArtworkDetailPanel
        artwork={selectedArtwork}
        open={!!selectedArtwork}
        onClose={() => setSelectedArtwork(null)}
        onOpenArtwork={openArtwork}
        onOpenTicket={openTicket}
      />
    </section>
  )
}
