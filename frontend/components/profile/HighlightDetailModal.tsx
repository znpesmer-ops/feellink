'use client'

import Link from 'next/link'
import { resolveImageUrl } from '@/lib/resolveImageUrl'

// Simple cn utility for className merging
const cn = (...classes: (string | undefined | false)[]) => {
  return classes.filter(Boolean).join(' ')
}

interface Highlight {
  id: string
  title: string
  items?: Array<{
    id: string
    post?: {
      id: string
      media?: Array<{
        url: string
        type: string
      }>
      caption: string | null
      title: string | null
    } | null
  }> | null
}

interface HighlightDetailModalProps {
  highlight: Highlight
  onClose: () => void
  returnTo?: string
}

export function HighlightDetailModal({ highlight, onClose, returnTo = '/feed' }: HighlightDetailModalProps) {
  const rawItems = Array.isArray(highlight.items) ? highlight.items : []
  const displayItems = rawItems.filter((i) => i?.post?.id)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[85vh] bg-[#111] dark:bg-gray-900 rounded-2xl p-6 flex flex-col gap-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-100 dark:text-gray-100">{highlight.title}</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 dark:text-neutral-500 dark:hover:text-neutral-300"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
          {/* 🔥 DEBUG: Highlight items kontrolü */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-2 text-xs text-neutral-500">
              Items: {displayItems.length} gösteriliyor (ham: {rawItems.length})
            </div>
          )}
          
          {displayItems.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-1">
              {displayItems.map((item) => {
              const post = item.post!
              // ✅ Backend'den media array geliyor, ilk media'nın URL'ini al
              const imageUrl = post.media && post.media.length > 0 
                ? post.media[0].url 
                : null
              
              // Güvenli başlık çıkarma - title öncelikli, sonra caption
              const artworkTitle = (
                (post.title && typeof post.title === 'string' && post.title.trim().length > 0)
                  ? post.title.trim()
                  : (post.caption && typeof post.caption === 'string' && post.caption.trim().length > 0)
                  ? post.caption.trim()
                  : 'İsimsiz Eser'
              )

              return (
                <Link
                  key={item.id}
                  href={`/posts/${post.id}?from=${encodeURIComponent(returnTo)}`}
                  prefetch={false}
                  className="relative aspect-[3/4] rounded-xl overflow-hidden bg-neutral-800 dark:bg-gray-800 group cursor-pointer hover:scale-[1.02] transition-transform block"
                  onClick={(e) => {
                    // Modal'ın kapanmasını engelle
                    e.stopPropagation()
                  }}
                >
                  {imageUrl ? (
                    <>
                      <img
                        src={resolveImageUrl(imageUrl)}
                        alt={artworkTitle}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('❌ [HighlightDetailModal] Image load error:', imageUrl);
                          (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                        }}
                      />

                      {/* Hover Overlay - Eser adı */}
                      <div
                        className={cn(
                          'absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl flex items-end pointer-events-none'
                        )}
                      >
                        <div className="p-3 w-full">
                          <p className="text-white text-sm font-medium line-clamp-1 leading-tight">
                            {artworkTitle}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-neutral-500 text-xs">Görsel</span>
                    </div>
                  )}
                </Link>
              )
            })}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-400 dark:text-neutral-500">
              <p className="text-sm mb-2">Bu temada henüz eser bulunmuyor.</p>
              {process.env.NODE_ENV === 'development' && (
                <p className="text-xs text-neutral-600">
                  Debug: ham kayıt {rawItems.length}, geçerli post {displayItems.length}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}




