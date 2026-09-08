'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Search } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { FeellinkRoleBadge } from '@/components/FeellinkRoleBadge'

interface User {
  id: string
  username: string
  fullName?: string
  avatar?: string
  isVerified?: boolean
  roles?: string[]
}

interface NewMessageModalProps {
  onClose: () => void
  onSelect: (conversationId: string) => void
}

export function NewMessageModal({ onClose, onSelect }: NewMessageModalProps) {
  const { accessToken } = useAuthStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.trim().length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await api.get(`/users/search?q=${encodeURIComponent(query.trim())}`)
        setResults(response.data || [])
      } catch (error) {
        console.error('Failed to search users:', error)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, accessToken])

  const startConversation = async (recipientId: string) => {
    if (starting) return

    setStarting(recipientId)
    try {
      console.log('🔵 [NewMessage] Creating DIRECT conversation with user:', recipientId)
      const response = await api.post('/chat/conversations', {
        participantIds: [recipientId],
        context: 'DIRECT', // 🔵 Normal DM - ilan değil!
      })
      console.log('✅ [NewMessage] DIRECT conversation created:', response.data.id)
      onSelect(response.data.id)
      onClose()
    } catch (error: any) {
      console.error('Failed to start conversation:', error)
      alert(error.response?.data?.message || 'Konuşma başlatılamadı')
    } finally {
      setStarting(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/[0.55] p-4 backdrop-blur-sm dark:bg-black/75"
    >
      <div
        className="relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-gray-200/80 bg-white/[0.92] shadow-[0_32px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0d1422]/[0.94]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-52 w-52 rounded-full bg-brand-orange/[0.16] blur-3xl" />
          <div className="absolute -bottom-28 left-0 h-56 w-56 rounded-full bg-[#2f7cff]/[0.12] blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-orange/[0.55] to-transparent" />
        </div>
        {/* Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-gray-200/80 bg-white/[0.55] p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-orange/80">
              Feellink
            </p>
            <h2 className="text-xl font-semibold text-gray-950 dark:text-white">
              Yeni Mesaj
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-gray-200/80 bg-white/70 p-2 text-gray-500 shadow-sm transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative z-10 border-b border-gray-200/80 bg-white/[0.45] p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.025]">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kullanıcı ara..."
              className="w-full rounded-2xl border border-gray-200/90 bg-white/75 py-2.5 pl-10 pr-4 text-sm text-gray-900 shadow-inner shadow-gray-200/40 outline-none transition-all placeholder:text-gray-400 focus:border-brand-orange/[0.45] focus:ring-4 focus:ring-brand-orange/[0.12] dark:border-white/10 dark:bg-white/[0.065] dark:text-white dark:shadow-none"
            />
          </div>
        </div>

        {/* Results */}
        <div className="relative z-10 flex-1 overflow-y-auto p-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="rounded-full border border-gray-200/80 bg-white/[0.65] px-4 py-2 text-sm text-gray-500 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-400">Aranıyor...</div>
            </div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <div className="rounded-3xl border border-gray-200/80 bg-white/[0.65] px-6 py-5 text-center text-sm text-gray-500 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-400">
                <p>Kullanıcı bulunamadı</p>
                <p className="text-xs mt-1">Farklı bir arama terimi deneyin</p>
              </div>
            </div>
          )}

          {!loading && query.trim().length < 2 && (
            <div className="flex items-center justify-center py-8">
              <div className="rounded-3xl border border-gray-200/80 bg-white/[0.65] px-6 py-5 text-center text-sm text-gray-500 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-400">
                <p>Kullanıcı adı veya isim yazın</p>
              </div>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-1">
              {results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => startConversation(user.id)}
                  disabled={starting === user.id}
                  className="flex w-full items-center gap-3 rounded-2xl border border-transparent p-3 transition-all hover:border-gray-200/80 hover:bg-white/75 hover:shadow-[0_14px_34px_rgba(15,23,42,0.07)] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:border-white/10 dark:hover:bg-white/[0.055]"
                >
                  <div className="relative flex-shrink-0 rounded-full bg-gradient-to-br from-brand-orange/60 via-white/60 to-[#2f7cff]/[0.35] p-[1.5px] dark:via-white/[0.15]">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-white/[0.85] dark:ring-[#0b1020]"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 ring-2 ring-white/[0.85] dark:bg-white/10 dark:ring-[#0b1020]">
                        <span className="text-gray-600 dark:text-gray-300 font-semibold">
                          {user.username[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="truncate font-semibold text-gray-950 dark:text-white">
                        {user.fullName || user.username}
                      </p>
                      <FeellinkRoleBadge
                        roles={user.roles}
                        className="!ml-0 !text-[10px] !px-1.5 !py-0"
                      />
                    </div>
                    {user.fullName && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        @{user.username}
                      </p>
                    )}
                  </div>
                  {starting === user.id && (
                    <div className="flex-shrink-0">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
