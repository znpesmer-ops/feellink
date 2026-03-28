'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { SharePostModal } from './SharePostModal'

export interface SharePostTriggerProps {
  postId: string
  shareTitle?: string
  shareCaption?: string
  /** Tailwind classes for the icon button */
  className?: string
  /** Stop card click when used inside PostCard */
  stopPropagation?: boolean
}

export function SharePostTrigger({
  postId,
  shareTitle,
  shareCaption,
  className = '',
  stopPropagation = true,
}: SharePostTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation()
          setOpen(true)
        }}
        className={className}
        title="Paylaş"
        aria-label="Gönderiyi paylaş"
      >
        <Send size={18} className="text-gray-600 dark:text-gray-400" />
      </button>
      <SharePostModal
        open={open}
        onClose={() => setOpen(false)}
        postId={postId}
        shareTitle={shareTitle}
        shareCaption={shareCaption}
      />
    </>
  )
}
