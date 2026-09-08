'use client'

import { forwardRef } from 'react'
import { ExhibitionRoom, type ExhibitionRoomHandle } from '@/components/ExhibitionRoom'
import type { ExhibitionArtwork, ExhibitionPhase } from './types'

export type ExhibitionGalleryHandle = ExhibitionRoomHandle

type ExhibitionGalleryProps = {
  artworks: ExhibitionArtwork[]
  exhibitionName: string
  autoTour: boolean
  onPhaseChange: (phase: ExhibitionPhase) => void
  onArtworkChange: (index: number) => void
  onArtworkActivate: (index: number) => void
  onReady: () => void
  onError: (message: string) => void
}

export const ExhibitionGallery = forwardRef<ExhibitionGalleryHandle, ExhibitionGalleryProps>(
  function ExhibitionGallery(
    {
      artworks,
      exhibitionName,
      autoTour,
      onPhaseChange,
      onArtworkChange,
      onArtworkActivate,
      onReady,
      onError,
    },
    ref,
  ) {
    return (
      <div className="absolute inset-0 overflow-hidden bg-[#d8d1c7]">
        <ExhibitionRoom
          ref={ref}
          artworks={artworks}
          exhibitionName={exhibitionName}
          autoTour={autoTour}
          onPhaseChange={onPhaseChange}
          onArtworkChange={onArtworkChange}
          onArtworkActivate={onArtworkActivate}
          onReady={onReady}
          onError={onError}
        />
      </div>
    )
  },
)
