'use client'

import { useRouter } from 'next/navigation'
import { resolveImageUrl } from '@/lib/resolveImageUrl'

export type SharedPostPreviewState = 'ok' | 'deleted' | 'inaccessible'

export interface SharedPostPreview {
  postId: string
  state: SharedPostPreviewState
  thumbnailUrl?: string | null
  title?: string | null
  username?: string | null
  captionSnippet?: string | null
}

export function SharedPostMessageCard({
  preview,
  isOwnBubble,
}: {
  preview: SharedPostPreview
  isOwnBubble: boolean
}) {
  const router = useRouter()
  const pid = preview.postId

  const go = () => {
    if (preview.state !== 'ok') return
    router.push(`/posts/${pid}`)
  }

  if (preview.state === 'deleted') {
    return (
      <p
        className={`text-sm italic ${
          isOwnBubble ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        Bu gönderi artık mevcut değil
      </p>
    )
  }

  if (preview.state === 'inaccessible') {
    return (
      <p
        className={`text-sm italic ${
          isOwnBubble ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        Bu gönderiyi görüntüleme yetkin yok
      </p>
    )
  }

  const thumb = preview.thumbnailUrl ? resolveImageUrl(preview.thumbnailUrl) : null

  return (
    <button
      type="button"
      onClick={go}
      className={`w-full text-left rounded-xl overflow-hidden border transition-opacity hover:opacity-95 ${
        isOwnBubble
          ? 'border-white/30 bg-white/10'
          : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
      }`}
    >
      <div className="flex gap-2 p-2 max-w-[280px]">
        <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-600">
          {thumb ? (
            <img src={thumb} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">—</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={`text-xs font-semibold truncate ${
              isOwnBubble ? 'text-white' : 'text-gray-900 dark:text-white'
            }`}
          >
            {preview.title || 'Gönderi'}
          </p>
          {preview.username && (
            <p
              className={`text-[11px] truncate ${
                isOwnBubble ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              @{preview.username}
            </p>
          )}
          {preview.captionSnippet && (
            <p
              className={`text-[11px] line-clamp-2 mt-0.5 ${
                isOwnBubble ? 'text-white/70' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {preview.captionSnippet}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}
