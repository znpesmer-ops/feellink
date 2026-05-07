'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Search, Loader2, Link2, Share2 } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { FeellinkRoleBadge } from '@/components/FeellinkRoleBadge'
import toast from 'react-hot-toast'
import { copyPostLinkToClipboard, getPostShareUrl, tryNativeSharePost } from '@/lib/postShare'

interface UserRow {
  id: string
  username: string
  fullName?: string
  avatar?: string
  roles?: string[]
}

export interface SharePostModalProps {
  open: boolean
  onClose: () => void
  postId: string
  shareTitle?: string
  shareCaption?: string
}

export function SharePostModal({ open, onClose, postId, shareTitle, shareCaption }: SharePostModalProps) {
  const { accessToken } = useAuthStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reset = useCallback(() => {
    setQuery('')
    setResults([])
    setSelected(new Set())
    setSending(false)
  }, [])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    } else {
      reset()
    }
  }, [open, reset])

  useEffect(() => {
    if (!open || !accessToken) return

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (query.trim().length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await api.get('/search/users', {
          params: { q: query.trim(), limit: 20 },
        })
        setResults(response.data || [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [query, accessToken, open])

  const toggleUser = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCopyLink = async () => {
    const ok = await copyPostLinkToClipboard(postId)
    if (ok) toast.success('Bağlantı kopyalandı')
    else toast.error('Kopyalanamadı')
  }

  const handleNativeShare = async () => {
    const url = getPostShareUrl(postId)
    const r = await tryNativeSharePost({
      title: shareTitle || 'Feellink gönderisi',
      text: shareCaption?.slice(0, 200) || '',
      url,
    })
    if (r === 'shared') toast.success('Paylaşıldı')
    else if (r === 'unavailable') await handleCopyLink()
    else if (r === 'error') toast.error('Paylaşım başarısız')
  }

  const handleSend = async () => {
    if (selected.size === 0 || sending) return
    setSending(true)
    try {
      await api.post(`/posts/${postId}/share`, {
        recipientIds: Array.from(selected),
      })
      toast.success(
        selected.size === 1 ? 'Gönderi gönderildi' : `${selected.size} kişiye gönderildi`,
      )
      reset()
      onClose()
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Gönderilemedi'
      toast.error(typeof msg === 'string' ? msg : 'Gönderilemedi')
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[250] p-4"
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-xl max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gönderiyi paylaş</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <Link2 className="w-4 h-4" />
            Bağlantıyı kopyala
          </button>
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-brand-orange/15 text-brand-orange hover:bg-brand-orange/25"
            >
              <Share2 className="w-4 h-4" />
              Paylaş
            </button>
          )}
        </div>

        <div className="p-3 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kullanıcı ara..."
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
            />
          </div>
          {selected.size > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Array.from(selected).map((id) => {
                const u = results.find((r) => r.id === id)
                const label = u?.username || id.slice(0, 8)
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-brand-orange/15 text-brand-orange text-xs font-medium"
                  >
                    @{label}
                    <button
                      type="button"
                      className="hover:opacity-70"
                      onClick={() => toggleUser(id)}
                      aria-label="Kaldır"
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[40vh]">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
            </div>
          ) : query.trim().length < 2 ? (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-10 px-4">
              Paylaşmak için en az 2 karakter yazarak kullanıcı ara.
            </p>
          ) : results.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-10">
              Sonuç bulunamadı
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {results.map((u) => {
                const isOn = selected.has(u.id)
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => toggleUser(u.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isOn ? 'bg-brand-orange/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/80'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isOn}
                        onChange={() => toggleUser(u.id)}
                        className="rounded border-gray-300 text-brand-orange focus:ring-brand-orange"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <img
                        src={u.avatar || '/images/avatar-placeholder.png'}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover bg-gray-200 dark:bg-gray-700"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate flex items-center gap-1">
                          @{u.username}
                          <FeellinkRoleBadge roles={u.roles} />
                        </p>
                        {u.fullName && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.fullName}</p>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            type="button"
            disabled={selected.size === 0 || sending}
            onClick={handleSend}
            className="w-full py-3 rounded-xl font-semibold text-white bg-brand-orange hover:bg-[#e36f00] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gönderiliyor...
              </>
            ) : (
              <>Gönder{selected.size > 0 ? ` (${selected.size})` : ''}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
