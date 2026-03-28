'use client'

import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function ZoomModal({ src, onClose }: { src: string; onClose: () => void }) {
  // ESC tuşu ile kapatma
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 rounded-full p-2 text-white/90 hover:bg-white/10 hover:text-white transition-colors"
        aria-label="Kapat"
      >
        <X className="h-6 w-6" />
      </button>
      <motion.img
        src={src}
        alt="Zoomed profile photo"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="
          w-64 h-64
          rounded-full
          object-cover
          shadow-[0_0_40px_rgba(0,0,0,0.4)]
          cursor-default
          border-4 border-white/30
        "
        onError={(e) => {
          ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
        }}
      />
    </div>
  )
}
