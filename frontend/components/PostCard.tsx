'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Heart, MoreVertical, Trash2, MessageCircle, Image as ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { ProRoleBadge } from './ProRoleBadge'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import toast from 'react-hot-toast'
import { SharePostTrigger } from '@/components/share/SharePostTrigger'

interface PostCardProps {
  post: {
    id: string
    title: string
    content: string
    cover?: string | null
    author: string
    authorUsername?: string
    authorAvatar?: string | null
    authorId?: string
    userId?: string
    likes: number
    likedBy?: string[]
    date: string
    createdAt: string
    pinnedComment?: { user: string; text: string } | null
    recentComments?: Array<{
      id: string
      content: string
      isPinned?: boolean
      user?: { username?: string; fullName?: string | null; avatar?: string | null }
    }>
    _count?: { comments?: number }
    commentCount?: number
  }
  onLike?: (id: string) => void
  onDelete?: (id: string) => void
  returnTo?: string
  /** Keşfet grid: sabit görsel yüksekliği, rezerve metin alanı, mt-auto footer */
  variant?: 'default' | 'explore'
}

export default function PostCard({ post, onLike, onDelete, returnTo, variant = 'default' }: PostCardProps) {
  const isExplore = variant === 'explore'
  const router = useRouter()
  const { user, accessToken } = useAuthStore()
  const queryClient = useQueryClient()
  
  // ✅ Tek kaynaklı state: post prop'undan derive et
  const initialIsLiked = post.likedBy?.includes(user?.id || '') || false
  const initialLikesCount = post.likes || 0
  
  // Local state sadece optimistic update için
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [likesCount, setLikesCount] = useState(initialLikesCount)
  const [animateLike, setAnimateLike] = useState(false)
  const [pingAnimating, setPingAnimating] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // ✅ post prop'u değiştiğinde local state'i sync et
  useEffect(() => {
    const newIsLiked = post.likedBy?.includes(user?.id || '') || false
    const newLikesCount = post.likes || 0
    setIsLiked(newIsLiked)
    setLikesCount(newLikesCount)
  }, [post.likedBy, post.likes, user?.id])

  // Check if current user is the post owner
  const isOwner = user?.id === post.userId || user?.id === post.authorId || user?.username === post.authorUsername

  // ⚠️ Socket.IO devre dışı - Vercel serverless'ta çalışmaz
  // Like işlemleri REST API üzerinden çalışıyor (likeMutation)

  // Like mutation — backend kalıcı yazar; success'te cache invalidate (tek kaynak backend)
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (isLiked) {
        await api.delete(`/posts/${post.id}/like`)
        return { liked: false }
      } else {
        await api.post(`/posts/${post.id}/like`)
        return { liked: true }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', post.id] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['explore'] })
    },
  })

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!accessToken || !user?.id) {
      router.push('/login')
      return
    }

    // ✅ Optimistic update - UI anında güncellenir
    const wasLiked = isLiked
    const originalLikesCount = likesCount
    
    setIsLiked(!wasLiked)
    if (!wasLiked) {
      setLikesCount((prev) => prev + 1)
      setAnimateLike(true)
      setTimeout(() => setAnimateLike(false), 400)
    } else {
      setLikesCount((prev) => Math.max(0, prev - 1))
    }

    // ✅ Backend API çağrısı - context ile orijinal değerleri sakla (rollback için)
    likeMutation.mutate(undefined, {
      onError: () => {
        // Rollback: orijinal değerlere geri dön
        setIsLiked(wasLiked)
        setLikesCount(originalLikesCount)
      },
    })

    // Callback'i çağır
    if (onLike) {
      onLike(post.id)
    }
  }

  const handleCardClick = () => {
    const url = returnTo
      ? `/posts/${post.id}?from=${encodeURIComponent(returnTo)}`
      : `/posts/${post.id}`
    router.push(url)
  }

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/posts/${post.id}`)
    },
    onSuccess: () => {
      toast.success('Gönderi başarıyla silindi')
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['user-posts'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      
      // Call parent callback if provided
      if (onDelete) {
        onDelete(post.id)
      }
      
      setMenuOpen(false)
      setConfirmDelete(false)
    },
    onError: (error: any) => {
      console.error('Delete error:', error)
      toast.error(error.response?.data?.message || 'Gönderi silinirken bir hata oluştu')
      setConfirmDelete(false)
    },
  })

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDelete(true)
    setMenuOpen(false)
  }

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteMutation.mutate()
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDelete(false)
  }

  // Close menu when clicking outside - Only check clicks outside the menu container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      // Use capture phase to check before other handlers
      document.addEventListener('mousedown', handleClickOutside, true)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true)
      }
    }
  }, [menuOpen])

  const hasRealTitle = Boolean(post.title && post.title !== 'Gönderi')
  const captionTrim = (post.content || '').trim()
  const titleTrim = hasRealTitle ? (post.title || '').trim() : ''
  const commentsCount = post._count?.comments || post.commentCount || 0
  const showExploreSummary =
    isExplore && captionTrim.length > 0 && (!titleTrim || captionTrim !== titleTrim)
  const commentHighlights = useMemo(() => {
    const comments = [
      ...(post.pinnedComment?.text
        ? [
            {
              id: `${post.id}-pinned-comment`,
              content: post.pinnedComment.text.trim(),
              isPinned: true,
              user: { username: post.pinnedComment.user },
            },
          ]
        : []),
      ...(post.recentComments || [])
        .filter((comment) => comment.content?.trim())
        .map((comment) => ({
          id: comment.id,
          content: comment.content.trim(),
          isPinned: comment.isPinned,
          user: comment.user,
        })),
    ]

    const seen = new Set<string>()
    return comments
      .filter((comment) => {
        const key = `${comment.user?.username || comment.user?.fullName || 'user'}:${comment.content}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 6)
  }, [post.id, post.pinnedComment, post.recentComments])
  const [activeCommentIndex, setActiveCommentIndex] = useState(0)

  useEffect(() => {
    setActiveCommentIndex(0)
  }, [post.id, commentHighlights.length])

  useEffect(() => {
    if (commentHighlights.length <= 1) return

    const timer = window.setInterval(() => {
      setActiveCommentIndex((current) => (current + 1) % commentHighlights.length)
    }, 3600)

    return () => window.clearInterval(timer)
  }, [commentHighlights.length])

  const activeComment =
    commentHighlights.length > 0
      ? commentHighlights[activeCommentIndex % commentHighlights.length]
      : null
  const hasCommentOverlay = Boolean(activeComment)
  const activeCommenterName =
    activeComment?.user?.fullName || activeComment?.user?.username || 'Feellink yorumu'
  const activeCommenterAvatar = activeComment?.user?.avatar ? resolveImageUrl(activeComment.user.avatar) : null
  const activeCommenterInitial = activeCommenterName.trim().charAt(0).toUpperCase() || 'F'

  const rotatingCommentBubble = activeComment ? (
    <div className="pointer-events-none relative w-full max-w-[84%] overflow-hidden rounded-[26px] bg-[linear-gradient(135deg,rgba(36,54,255,0.78),rgba(255,59,125,0.58)_48%,rgba(255,138,31,0.78))] p-[1px] text-left shadow-[0_30px_80px_rgba(0,0,0,0.46),0_0_34px_rgba(255,122,26,0.16)]">
      <div className="relative overflow-hidden rounded-[25px] border border-white/12 bg-[linear-gradient(145deg,rgba(8,12,24,0.62),rgba(30,16,32,0.42)_52%,rgba(255,122,26,0.12))] p-3.5 backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(255,255,255,0.18),transparent_26%),radial-gradient(circle_at_94%_10%,rgba(255,138,31,0.24),transparent_29%),linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.10)_48%,transparent_62%)] opacity-80" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-20 w-32 rounded-full bg-[#2436ff]/24 blur-2xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-20 w-32 rounded-full bg-[#ff8a1f]/20 blur-2xl" />
        <div className="relative mb-2.5 flex items-center gap-2.5">
          {activeCommenterAvatar ? (
            <span className="rounded-full bg-[linear-gradient(135deg,#2436ff,#ff3b7d_52%,#ff8a1f)] p-[1px] shadow-[0_10px_24px_rgba(255,122,26,0.26)]">
              <img
                src={activeCommenterAvatar}
                alt={activeCommenterName}
                className="h-7 w-7 rounded-full object-cover ring-1 ring-black/30"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </span>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2436ff,#ff3b7d_52%,#ff8a1f)] text-[10px] font-bold text-white shadow-[0_10px_24px_rgba(255,123,0,0.32)] ring-1 ring-white/30">
              {activeCommenterInitial}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-white/96 drop-shadow-sm">
            {activeCommenterName}
          </span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] shadow-[0_0_18px_rgba(255,138,31,0.18)]">
            <span className="h-2.5 w-[3px] rounded-full bg-white/80" />
            <span className="ml-[3px] h-2.5 w-[3px] rounded-full bg-white/80" />
          </span>
        </div>
        <p className="relative line-clamp-3 text-[13px] font-medium leading-snug text-white/95 drop-shadow-sm" title={activeComment.content}>
          {activeComment.content}
        </p>
        <div className="relative mt-3 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.38),rgba(255,138,31,0.42),transparent)] opacity-70" />
      </div>
    </div>
  ) : null

  const hoverOverlayInner = (
    <>{rotatingCommentBubble}</>
  )

  if (isExplore) {
    const artworkCaption = captionTrim || titleTrim || 'Açıklama eklenmemiş'
    const exploreTitle = titleTrim || captionTrim || 'Gönderi'
    const authorHandle = post.authorUsername || post.author

    return (
      <div
        onClick={handleCardClick}
        className="group relative aspect-square w-full cursor-pointer overflow-hidden rounded-[1.15rem] border border-black/5 bg-[#f7f1eb] shadow-[0_12px_30px_rgba(39,27,18,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_46px_rgba(39,27,18,0.16)] focus-within:ring-2 focus-within:ring-[#ff8a1f]/70 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_18px_44px_rgba(0,0,0,0.34)]"
      >
        {post.cover ? (
          <img
            src={resolveImageUrl(post.cover)}
            alt={exploreTitle}
            className="h-full w-full rounded-[1.15rem] object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              const imageUrl = resolveImageUrl(post.cover!)
              if (!target.src.includes('avatar-placeholder') && !target.src.includes('placeholder')) {
                console.warn('PostCard Image 404:', imageUrl)
                target.src = '/images/avatar-placeholder.png'
              }
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-[1.15rem] bg-[radial-gradient(circle_at_30%_20%,rgba(255,138,31,0.18),transparent_34%),linear-gradient(135deg,#f6eee8,#ebe4df)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(255,138,31,0.16),transparent_34%),linear-gradient(135deg,#161a21,#0c0f14)]">
            <ImageIcon className="h-8 w-8 text-[#b47a50] dark:text-[#c5a17d]" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 rounded-[1.15rem] bg-gradient-to-t from-black/78 via-black/16 to-transparent opacity-75 transition-opacity duration-300 group-hover:opacity-90" />
        <div className="pointer-events-none absolute inset-0 rounded-[1.15rem] opacity-0 backdrop-blur-[7px] transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.10),transparent_34%),linear-gradient(180deg,rgba(3,7,18,0.50),rgba(3,7,18,0.72))]" />
        {rotatingCommentBubble && (
          <div className="pointer-events-none absolute inset-0 z-[35] flex translate-y-2 items-center justify-center opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
            {rotatingCommentBubble}
          </div>
        )}

        {isOwner && (
          <div ref={menuRef} className="absolute right-2 top-2 z-[60]">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen(!menuOpen)
              }}
              className="rounded-full border border-white/20 bg-black/55 p-1.5 text-white shadow-lg backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-black/75 pointer-events-auto"
              title="Menü"
            >
              <MoreVertical size={14} strokeWidth={2.5} />
            </button>
            {menuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-10 z-[60] min-w-[120px] overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#151820]/95"
              >
                <button
                  onClick={handleDeleteClick}
                  disabled={deleteMutation.isPending}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 size={16} />
                  Sil
                </button>
              </div>
            )}
          </div>
        )}

        <div className={`absolute inset-x-0 bottom-0 z-[20] p-3.5 transition-all duration-300 ease-out ${hasCommentOverlay ? 'group-hover:pointer-events-none group-hover:translate-y-2 group-hover:opacity-0 group-hover:blur-sm' : ''}`}>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-semibold leading-snug text-white drop-shadow">
                {artworkCaption}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Link
              href={`/profile/${authorHandle}`}
              onClick={(e) => e.stopPropagation()}
              className="flex min-w-0 items-center gap-2 rounded-full border border-white/15 bg-black/28 px-2 py-1.5 text-white shadow-lg backdrop-blur-xl transition hover:bg-black/42"
            >
              {post.authorAvatar ? (
                <img
                  src={resolveImageUrl(post.authorAvatar)}
                  alt={post.author}
                  className="h-6 w-6 rounded-full object-cover ring-1 ring-white/35"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                  }}
                />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold text-white ring-1 ring-white/20">
                  {post.author[0]?.toUpperCase()}
                </span>
              )}
              <span className="truncate text-[11px] font-semibold">{post.author}</span>
              <ProRoleBadge roles={(post as any).authorRoles} plan={(post as any).authorPlan} />
            </Link>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleLike}
                disabled={likeMutation.isPending}
                className={`relative flex h-8 items-center gap-1 rounded-full border border-white/15 px-2.5 text-xs font-semibold shadow-lg backdrop-blur-xl transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isLiked
                    ? 'bg-[#ff7a1a] text-white'
                    : 'bg-black/30 text-white hover:bg-black/45'
                }`}
              >
                <Heart
                  size={14}
                  className={`transition-all duration-300 ${animateLike ? 'scale-125' : 'scale-100'} ${
                    isLiked ? 'fill-current' : ''
                  }`}
                  strokeWidth={isLiked ? 0 : 2}
                />
                {likesCount}
                {(animateLike || pingAnimating) && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-brand-orange/40" />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCardClick()
                }}
                className="flex h-8 items-center gap-1 rounded-full border border-white/15 bg-black/30 px-2.5 text-xs font-semibold text-white shadow-lg backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-black/45"
                aria-label="Yorumları aç"
              >
                <MessageCircle size={14} strokeWidth={2} />
                {commentsCount}
              </button>
            </div>
          </div>
        </div>

        {confirmDelete && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
            <div
              className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-[#1a1a1a]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Gönderiyi Sil</h3>
              <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                Bu gönderiyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  İptal
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteMutation.isPending}
                  className="flex-1 rounded-lg bg-red-500 px-4 py-2 font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={handleCardClick}
      className={`group relative isolate w-full overflow-hidden rounded-[24px] border border-slate-200/85 bg-slate-50/78 shadow-[0_18px_54px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-300/45 hover:bg-white/82 hover:shadow-[0_26px_78px_rgba(15,23,42,0.13)] dark:border-white/10 dark:bg-white/[0.055] dark:shadow-black/22 dark:hover:border-orange-300/30 dark:hover:bg-white/[0.075] ${
        isExplore
          ? 'h-full min-h-[348px] flex flex-col p-3.5 md:p-4'
          : 'p-4 md:p-5'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(255,123,0,0.12),transparent_34%),radial-gradient(circle_at_92%_10%,rgba(31,106,225,0.09),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.62),transparent_34%)] opacity-80 dark:bg-[radial-gradient(circle_at_16%_0%,rgba(255,123,0,0.16),transparent_34%),radial-gradient(circle_at_92%_10%,rgba(31,106,225,0.13),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_34%)]" />
      {/* Menü butonu - Sadece sahip görür, her zaman görünür (görsel olsun ya da olmasın) - Post z-index */}
      {isOwner && (
        <div ref={menuRef} className="absolute top-4 right-4 z-[60]">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen(!menuOpen)
            }}
            className="p-1.5 rounded-full bg-black/55 backdrop-blur-xl text-white shadow-[0_10px_24px_rgba(0,0,0,0.28)] hover:bg-black/80 transition-colors pointer-events-auto"
          >
            <MoreVertical size={16} />
          </button>
          
          {/* Açılır menü - Sadece kartın içinde - Post z-index */}
          {menuOpen && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="absolute top-10 right-0 overflow-hidden rounded-2xl border border-slate-200/85 bg-white/92 shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur-2xl min-w-[120px] z-[60] dark:border-white/10 dark:bg-[#111827]/92"
            >
              <button
                onClick={handleDeleteClick}
                disabled={deleteMutation.isPending}
                className="w-full px-4 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
                Sil
              </button>
            </div>
          )}
        </div>
      )}

      {/* Kapak: explore = sabit yükseklik + kapaksız placeholder; default = yalnızca cover varken kare */}
      {isExplore ? (
        <div className="relative w-full aspect-[4/3] rounded-[22px] overflow-hidden group/image shrink-0 border border-slate-200/80 bg-slate-200/55 shadow-[0_18px_48px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/[0.045] dark:shadow-black/24">
          {post.cover ? (
            <>
              <img
                src={resolveImageUrl(post.cover)}
                alt={hasRealTitle ? post.title : 'Gönderi'}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  const imageUrl = resolveImageUrl(post.cover!)
                  if (!target.src.includes('avatar-placeholder') && !target.src.includes('placeholder')) {
                    console.warn('PostCard Image 404:', imageUrl)
                    target.src = '/icons/default-user.svg'
                    const parent = target.closest('.group\\/image')
                    if (parent) parent.classList.add('opacity-60')
                  }
                }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent_30%),linear-gradient(0deg,rgba(2,6,23,0.62),transparent_52%)] opacity-90" />
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/image:opacity-100 bg-[radial-gradient(circle_at_50%_105%,rgba(255,137,45,0.22),transparent_38%)]" />
              <div className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full border border-white/25 bg-black/32 px-2.5 py-1.5 text-white shadow-[0_10px_26px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
                  <Heart className="h-3.5 w-3.5" fill={isLiked ? 'currentColor' : 'none'} />
                  {likesCount}
                </span>
                <span className="h-3 w-px bg-white/25" />
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {commentsCount}
                </span>
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-[radial-gradient(circle_at_50%_20%,rgba(255,123,0,0.12),transparent_32%),linear-gradient(135deg,rgba(226,232,240,0.88),rgba(241,245,249,0.60))] dark:bg-[radial-gradient(circle_at_50%_20%,rgba(255,123,0,0.12),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(30,41,59,0.55))] flex items-center justify-center">
              <ImageIcon className="w-11 h-11 sm:w-12 sm:h-12 text-slate-400 dark:text-slate-600 opacity-55" strokeWidth={1.25} />
            </div>
          )}
        </div>
      ) : (
        post.cover && (
          <div className="relative w-full aspect-square mb-4 rounded-[22px] overflow-hidden group/image max-h-[400px] border border-white/80 bg-slate-200/55 shadow-inner shadow-white/60 dark:border-white/10 dark:bg-white/[0.045] dark:shadow-black/20">
            <img
              src={resolveImageUrl(post.cover)}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                const imageUrl = resolveImageUrl(post.cover!)
                if (!target.src.includes('avatar-placeholder') && !target.src.includes('placeholder')) {
                  console.warn('PostCard Image 404:', imageUrl)
                  target.src = '/icons/default-user.svg'
                  const parent = target.closest('.group\\/image')
                  if (parent) parent.classList.add('opacity-60')
                }
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.13),transparent_36%),linear-gradient(180deg,rgba(3,7,18,0.18),rgba(3,7,18,0.48))] backdrop-blur-md opacity-0 group-hover/image:opacity-100 transition-all duration-300 flex flex-col items-center justify-center rounded-[22px] z-[5] p-4">
              {hoverOverlayInner}
            </div>
          </div>
        )
      )}
      
      {/* Silme onay modalı - Sadece açıkken görünür, z-index sidebar'dan düşük */}
      {confirmDelete && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-40"
        >
          <div 
            className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Gönderiyi Sil
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Bu gönderiyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isExplore ? (
        <div className="relative z-10 mt-3 min-h-[70px] px-1.5">
          <div className="mb-2 h-px w-full bg-gradient-to-r from-transparent via-orange-300/45 to-transparent dark:via-orange-300/20" />
          <h3 className="text-[15px] md:text-base font-semibold leading-tight text-slate-950 dark:text-white line-clamp-2">
            {hasRealTitle ? post.title : 'Gönderi'}
          </h3>
          {showExploreSummary ? (
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-2">
              {post.content}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          {hasRealTitle && (
            <h3 className="text-base md:text-lg font-semibold text-slate-950 dark:text-white mb-2 line-clamp-2">
              {post.title}
            </h3>
          )}
          {post.content && (
            <p className="text-xs md:text-sm text-slate-600 dark:text-gray-300 leading-snug mb-3 md:mb-4 line-clamp-3">
              {post.content}
            </p>
          )}
        </>
      )}

      {/* Alt bilgi */}
      <div className={`flex justify-between items-center ${isExplore ? 'relative z-10 mt-3 px-1.5 pb-1 shrink-0' : ''}`}>
        <Link
          href={`/profile/${post.authorUsername || post.author}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 hover:opacity-80 transition cursor-pointer"
        >
          {post.authorAvatar ? (
            <img
              src={resolveImageUrl(post.authorAvatar)}
              alt={post.author}
              className={`${isExplore ? 'w-7 h-7 ring-2 ring-white/80 dark:ring-white/10' : 'w-6 h-6'} rounded-full object-cover`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
              }}
            />
          ) : (
            <div className={`${isExplore ? 'w-7 h-7 ring-2 ring-white/80 dark:ring-white/10' : 'w-6 h-6'} rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center`}>
              <span className="text-xs font-semibold text-slate-600 dark:text-gray-300">
                {post.author[0]?.toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className={`${isExplore ? 'text-[11px]' : 'text-xs'} font-medium text-slate-900 dark:text-gray-100 flex items-center gap-1`}>
              {post.author}
              <ProRoleBadge roles={(post as any).authorRoles} plan={(post as any).authorPlan} />
            </p>
            <p className={`${isExplore ? 'text-[11px]' : 'text-xs'} text-slate-500 dark:text-gray-400`}>
              {new Date(post.date || post.createdAt).toLocaleDateString('tr-TR', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          {accessToken && (
            <SharePostTrigger
              postId={post.id}
              shareTitle={hasRealTitle ? post.title : undefined}
              shareCaption={post.content || undefined}
              className={`${isExplore ? 'bg-slate-100/75 dark:bg-white/[0.045]' : ''} relative flex items-center justify-center p-2 rounded-lg transition-all hover:scale-110 active:scale-95 text-slate-500 dark:text-gray-400 hover:text-brand-orange`}
            />
          )}
          {/* Beğeni butonu - Animasyonlu */}
          <button
            onClick={handleLike}
            disabled={likeMutation.isPending}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 ${
              isLiked
                ? 'text-brand-orange bg-brand-blue/10 dark:bg-brand-blue/20'
                : `${isExplore ? 'bg-slate-100/75 dark:bg-white/[0.045]' : ''} text-slate-500 dark:text-gray-400 hover:text-brand-orange`
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Heart
              size={18}
              className={`transition-all duration-300 ${animateLike ? 'scale-125' : 'scale-100'} ${
                isLiked ? 'fill-brand-orange text-brand-orange' : ''
              }`}
              strokeWidth={isLiked ? 0 : 2}
            />
            {(animateLike || pingAnimating) && (
              <span className="absolute inset-0 animate-ping bg-brand-orange/40 rounded-lg"></span>
            )}
            <span className="text-sm font-medium">{likesCount}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
