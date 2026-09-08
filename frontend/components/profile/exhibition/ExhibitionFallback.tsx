'use client'

import type { ExhibitionArtwork, ExhibitionPhase } from './types'

type ExhibitionFallbackProps = {
  artwork: ExhibitionArtwork | null
  phase: ExhibitionPhase
}

export function ExhibitionFallback({ artwork, phase }: ExhibitionFallbackProps) {
  const isGallery = phase === 'gallery'

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#d9d4cc]" aria-label="Sergi güvenli görünümü">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#eeeae3_0%,#ded8ce_55%,#b7aea2_100%)]" />
      <div className="absolute left-1/2 top-0 h-[56%] w-[66%] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,247,232,0.2))] [clip-path:polygon(18%_0,82%_0,100%_100%,0_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[46%] origin-bottom bg-[linear-gradient(180deg,#d5cec4,#a99f94)] [transform:perspective(760px)_rotateX(58deg)_scaleX(1.35)]" />
      <div className="absolute inset-y-0 left-0 w-[29%] origin-left bg-[#eee9e0] shadow-[inset_-36px_0_80px_rgba(80,64,47,0.12)] [transform:perspective(900px)_rotateY(22deg)]" />
      <div className="absolute inset-y-0 right-0 w-[29%] origin-right bg-[#eee9e0] shadow-[inset_36px_0_80px_rgba(80,64,47,0.12)] [transform:perspective(900px)_rotateY(-22deg)]" />

      <div className={`absolute left-1/2 top-[47%] -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ${isGallery ? 'w-[min(34vw,270px)]' : 'w-[min(26vw,210px)]'}`}>
        <div className="absolute -inset-14 bg-[radial-gradient(circle,rgba(255,241,213,0.62),rgba(255,225,177,0.12)_45%,transparent_70%)] blur-xl" />
        <div className="relative aspect-[4/5] border-[10px] border-[#27231f] bg-[#f6f1e8] p-2 shadow-[0_26px_70px_rgba(48,37,26,0.28)]">
          <div
            className="h-full w-full bg-cover bg-center"
            style={
              artwork?.mediaUrl
                ? { backgroundImage: `url("${artwork.mediaUrl.replace(/"/g, '%22')}")` }
                : { background: 'linear-gradient(145deg,#293d68,#c55a6f 54%,#dc9149)' }
            }
          />
        </div>
        <div className="relative mx-auto mt-4 w-[78%] border border-[#a99e90] bg-[#f8f5ef]/92 px-3 py-2 text-center shadow-sm">
          <p className="truncate text-[11px] font-semibold text-[#28231f]">{artwork?.title || 'Feellink seçkisi'}</p>
          <p className="mt-0.5 truncate text-[9px] text-[#766b60]">{artwork?.artistName || 'Dijital sergi'}</p>
        </div>
      </div>

      <div className="absolute bottom-[18%] left-[16%] h-28 w-10 opacity-30">
        <div className="mx-auto h-5 w-5 rounded-full bg-[#31363b]" />
        <div className="mx-auto h-16 w-9 rounded-t-full bg-[#283039]" />
        <div className="mx-auto h-8 w-7 bg-[#283039] [clip-path:polygon(0_0,44%_0,45%_100%,28%_100%,26%_22%,20%_100%,2%_100%)]" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_42%,rgba(48,38,29,0.28)_100%)]" />
    </div>
  )
}
