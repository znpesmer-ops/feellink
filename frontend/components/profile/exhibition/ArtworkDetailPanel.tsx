'use client'

import { useEffect } from 'react'
import {
  ArrowUpRight,
  CalendarDays,
  Heart,
  MessageCircle,
  Palette,
  QrCode,
  Sparkles,
  X,
} from 'lucide-react'
import type { ExhibitionArtwork } from './types'

type ArtworkDetailPanelProps = {
  artwork: ExhibitionArtwork | null
  open: boolean
  onClose: () => void
  onOpenArtwork: (artwork: ExhibitionArtwork) => void
  onOpenTicket: (artwork: ExhibitionArtwork) => void
}

function DnaMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-semibold text-white/55">
        <span>{label}</span>
        <span className="font-mono text-white/80">{value}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#3548ff,#e65383_56%,#ff8a1f)] transition-[width] duration-700"
          style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  )
}

export function ArtworkDetailPanel({
  artwork,
  open,
  onClose,
  onOpenArtwork,
  onOpenTicket,
}: ArtworkDetailPanelProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!artwork) return null

  const formattedDate = artwork.createdAt
    ? new Intl.DateTimeFormat('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }).format(
        new Date(artwork.createdAt),
      )
    : null

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-label={`${artwork.title} eser detayları`}
      className={`absolute inset-x-3 bottom-3 z-50 max-h-[76%] overflow-y-auto rounded-2xl border border-white/12 bg-[#0b1018]/94 text-white shadow-[0_30px_100px_rgba(0,0,0,0.58)] backdrop-blur-2xl transition-all duration-500 ease-out sm:inset-y-4 sm:left-auto sm:right-4 sm:w-[min(390px,38vw)] sm:max-h-none ${
        open ? 'translate-y-0 opacity-100 sm:translate-x-0' : 'pointer-events-none translate-y-[110%] opacity-0 sm:translate-x-[110%] sm:translate-y-0'
      }`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/8 bg-[#0b1018]/82 px-5 py-4 backdrop-blur-2xl">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#ffb064]">
          <Sparkles className="h-3.5 w-3.5" />
          Sanatsal DNA
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/12 hover:text-white"
          aria-label="Eser detaylarını kapat"
          title="Kapat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/38">Seçili eser</p>
        <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-white">{artwork.title}</h3>
        <p className="mt-1 text-sm font-medium text-[#ffc181]">{artwork.artistName}</p>
        <p className="mt-4 text-sm leading-6 text-white/62">{artwork.description}</p>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] text-white/48">
          {formattedDate && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/9 bg-white/[0.045] px-2.5 py-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {formattedDate}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/9 bg-white/[0.045] px-2.5 py-1.5">
            <Heart className="h-3.5 w-3.5" />
            {artwork.likesCount}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/9 bg-white/[0.045] px-2.5 py-1.5">
            <MessageCircle className="h-3.5 w-3.5" />
            {artwork.commentsCount}
          </span>
        </div>

        <div className="mt-6 border-t border-white/8 pt-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
              <Palette className="h-4 w-4 text-[#ff9a3d]" />
              Renk imzası
            </div>
            <span className="text-[11px] font-medium text-white/38">{artwork.dna.signature}</span>
          </div>
          <div className="mt-3 flex gap-2">
            {artwork.palette.slice(0, 7).map((color, index) => (
              <span
                key={`${color}-${index}`}
                className="h-8 min-w-0 flex-1 rounded-md border border-white/12 shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-white/8 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-white/80">Duygu analizi</p>
              <p className="mt-1 text-sm font-medium text-[#ffc181]">{artwork.dna.mood}</p>
            </div>
            <span className="rounded-full border border-[#ff9a3d]/20 bg-[#ff9a3d]/10 px-2.5 py-1 text-[10px] font-bold text-[#ffb56f]">
              {artwork.dna.temperature}
            </span>
          </div>
          <p className="mt-3 text-xs leading-5 text-white/48">{artwork.dna.summary}</p>
          <div className="mt-4 space-y-3">
            <DnaMetric label="Sıcaklık" value={artwork.dna.warmth} />
            <DnaMetric label="Görsel enerji" value={artwork.dna.energy} />
            <DnaMetric label="Işık değeri" value={artwork.dna.luminosity} />
          </div>
        </div>

        {artwork.code && (
          <button
            type="button"
            onClick={() => onOpenTicket(artwork)}
            className="mt-6 flex w-full items-center justify-between gap-4 border-y border-white/8 py-4 text-left transition hover:text-[#ffc181]"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.055]">
                <QrCode className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-xs font-semibold">Eser kimliği</span>
                <span className="mt-0.5 block font-mono text-[11px] text-white/42">{artwork.code}</span>
              </span>
            </span>
            <ArrowUpRight className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onOpenArtwork(artwork)}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#f38324] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_36px_rgba(243,131,36,0.25)] transition hover:bg-[#ff9b44]"
        >
          Eseri ayrıntılı aç
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}
