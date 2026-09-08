'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Maximize2, Play, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { ExhibitionRoom, type ExhibitionRoomHandle } from '@/components/ExhibitionRoom'
import type { ExhibitionArtwork } from '@/components/profile/exhibition/types'

const mockArtworks: ExhibitionArtwork[] = [
  {
    id: 'showcase-1',
    title: 'Istanbul Layers',
    artistName: 'Feellink Studio',
    description: 'Bogaz isigi ve sehir hafizasindan ilham alan dijital bir kompozisyon.',
    mediaUrl: null,
    mediaType: 'image',
    palette: ['#1b2637', '#d98b45', '#ece1cd', '#4d6475'],
    code: 'FL-001',
    createdAt: null,
    likesCount: 0,
    commentsCount: 0,
    dna: {
      mood: 'Sinematik',
      temperature: 'Dengeli',
      signature: 'Rafine ve katmanli',
      summary: 'Sicak vurgu ve soguk derinlikleri birlikte tasiyan premium bir galeri dili.',
      warmth: 58,
      energy: 64,
      luminosity: 62,
    },
  },
  {
    id: 'showcase-2',
    title: 'Greige Silence',
    artistName: 'Feellink Studio',
    description: 'Modern galeri sessizligini tasiyan soyut yuzey calismasi.',
    mediaUrl: null,
    mediaType: 'image',
    palette: ['#b9935d', '#332b23', '#f0e8db', '#8f7558'],
    code: 'FL-002',
    createdAt: null,
    likesCount: 0,
    commentsCount: 0,
    dna: {
      mood: 'Derin ve sakin',
      temperature: 'Sicak',
      signature: 'Katmanli',
      summary: 'Toprak tonlari, sakin ve luks bir izleme ritmi kurar.',
      warmth: 72,
      energy: 48,
      luminosity: 54,
    },
  },
  {
    id: 'showcase-3',
    title: 'Warm Current',
    artistName: 'Feellink Studio',
    description: 'Spot isiginda parlayan akiskan bir duygu haritasi.',
    mediaUrl: null,
    mediaType: 'image',
    palette: ['#e58d36', '#f3d9ae', '#141923', '#b55234'],
    code: 'FL-003',
    createdAt: null,
    likesCount: 0,
    commentsCount: 0,
    dna: {
      mood: 'Canli',
      temperature: 'Sicak',
      signature: 'Belirgin',
      summary: 'Enerjik sicak alanlar, dengeli karanlik zeminle one cikar.',
      warmth: 82,
      energy: 76,
      luminosity: 66,
    },
  },
  {
    id: 'showcase-4',
    title: 'Quiet Figure',
    artistName: 'Feellink Studio',
    description: 'Sag duvar perspektifinde portre ve sessiz form iliskisini kuran calisma.',
    mediaUrl: null,
    mediaType: 'image',
    palette: ['#e7ddcf', '#1e1c18', '#bf8a43', '#755735'],
    code: 'FL-004',
    createdAt: null,
    likesCount: 0,
    commentsCount: 0,
    dna: {
      mood: 'Sessiz',
      temperature: 'Notr',
      signature: 'Minimal',
      summary: 'Portre algisini yalın galeri atmosferiyle birlestiren dengeli bir kompozisyon.',
      warmth: 55,
      energy: 42,
      luminosity: 59,
    },
  },
  {
    id: 'showcase-5',
    title: 'Boğaz Trace',
    artistName: 'Feellink Studio',
    description: 'Istanbul silueti ve su yansimasini soyut bir ritme tasiyan dijital eser.',
    mediaUrl: null,
    mediaType: 'image',
    palette: ['#223044', '#6f8aa0', '#d8b16c', '#f4eadc'],
    code: 'FL-005',
    createdAt: null,
    likesCount: 0,
    commentsCount: 0,
    dna: {
      mood: 'Akiskan',
      temperature: 'Dengeli',
      signature: 'Sinematik',
      summary: 'Soguk mavi tonlar ve sicak isik dokusu Istanbul hafizasini tasir.',
      warmth: 61,
      energy: 52,
      luminosity: 68,
    },
  },
  {
    id: 'showcase-6',
    title: 'Soft Rupture',
    artistName: 'Feellink Studio',
    description: 'Krem zemin uzerinde kontrollu gerilim ve yumuşak renk katmanlari.',
    mediaUrl: null,
    mediaType: 'image',
    palette: ['#f1e6d6', '#ad7b42', '#27201a', '#d9c4a5'],
    code: 'FL-006',
    createdAt: null,
    likesCount: 0,
    commentsCount: 0,
    dna: {
      mood: 'Gerilimli sakin',
      temperature: 'Sicak',
      signature: 'Rafine',
      summary: 'Yumusak yuzeyler ve koyu izler galeri isiginda katmanli bir okuma olusturur.',
      warmth: 69,
      energy: 57,
      luminosity: 63,
    },
  },
  {
    id: 'showcase-7',
    title: 'Muted Window',
    artistName: 'Feellink Studio',
    description: 'Sol duvarda sergi metniyle birlikte mimari denge kuran buyuk eser.',
    mediaUrl: null,
    mediaType: 'image',
    palette: ['#d8c5ac', '#23211d', '#8b6139', '#f5efe7'],
    code: 'FL-007',
    createdAt: null,
    likesCount: 0,
    commentsCount: 0,
    dna: {
      mood: 'Derin',
      temperature: 'Sicak',
      signature: 'Mimari',
      summary: 'Buyuk olcekli sakin yüzey, salondaki premium ritmi tamamlar.',
      warmth: 65,
      energy: 45,
      luminosity: 58,
    },
  },
]

export default function ExhibitionPage() {
  const roomRef = useRef<ExhibitionRoomHandle | null>(null)
  const [ready, setReady] = useState(true)
  const artworks = useMemo(() => mockArtworks, [])

  useEffect(() => {
    const fallbackReady = window.setTimeout(() => setReady(true), 1600)
    return () => window.clearTimeout(fallbackReady)
  }, [])

  return (
    <main className="min-h-screen bg-[#080b10] text-white" style={{ minHeight: '100vh', background: '#080b10', color: '#fff' }}>
      <div
        className="mx-auto flex h-screen max-w-[1600px] flex-col px-4 py-4 sm:px-6"
        style={{
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          height: '100vh',
          margin: '0 auto',
          maxWidth: 1600,
          padding: '16px clamp(12px, 3vw, 24px)',
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Link
            href="/feed"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-white/78 backdrop-blur-xl transition hover:bg-white/[0.1]"
            style={{
              alignItems: 'center',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 999,
              color: 'rgba(255,255,255,0.82)',
              display: 'inline-flex',
              fontSize: 14,
              fontWeight: 700,
              gap: 8,
              minHeight: 40,
              padding: '0 16px',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Feellink
          </Link>
          <div className="flex items-center gap-2" style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => roomRef.current?.enterGallery()} className="grid h-10 w-10 place-items-center rounded-full bg-[#ed842f] text-white shadow-[0_16px_32px_rgba(237,132,47,0.32)]" style={{ background: '#ed842f', border: 0, borderRadius: 999, color: '#fff', display: 'grid', height: 40, placeItems: 'center', width: 40 }} aria-label="Sergiye gir">
              <Play className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => roomRef.current?.resetView()} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white/78 backdrop-blur-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, color: 'rgba(255,255,255,0.82)', display: 'grid', height: 40, placeItems: 'center', width: 40 }} aria-label="Gorunumu sifirla">
              <RotateCcw className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => document.documentElement.requestFullscreen?.()} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white/78 backdrop-blur-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, color: 'rgba(255,255,255,0.82)', display: 'grid', height: 40, placeItems: 'center', width: 40 }} aria-label="Tam ekran">
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <section
          className="relative min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-white/10 bg-[#d8d1c7] shadow-[0_30px_120px_rgba(0,0,0,0.45)]"
          style={{
            background: '#d8d1c7',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 'min(2rem, 28px)',
            boxShadow: '0 30px 120px rgba(0,0,0,0.45)',
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <ExhibitionRoom
            ref={roomRef}
            artworks={artworks}
            exhibitionName="Feellink Modern Gallery"
            autoTour={false}
            onReady={() => setReady(true)}
          />
          {!ready && (
            <div className="absolute inset-0 grid place-items-center bg-[#d8d1c7]" style={{ background: '#d8d1c7', display: 'grid', inset: 0, placeItems: 'center', position: 'absolute' }}>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2d2924]/20 border-t-[#ed842f]" />
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
