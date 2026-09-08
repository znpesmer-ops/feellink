'use client'

import { useRouter } from 'next/navigation'
import { Compass } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import { AuthGuard } from '@/lib/auth-guard'
import HighlightsRow from '@/components/highlights-row'
import PostCard from '@/components/PostCard'
import api from '@/lib/api'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { GC_STANDARD, STALE_SHORT } from '@/lib/query-config'
import { PostCardSkeleton } from '@/components/ui/Skeleton'

type FeedPost = {
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
  _count?: { likes: number; comments: number }
  pinnedComment?: { user: string; text: string } | null
  recentComments?: Array<{
    id: string
    content: string
    isPinned?: boolean
    user?: { username?: string; fullName?: string | null; avatar?: string | null }
  }>
}

function FeedContent() {
  const router = useRouter()
  const { accessToken, user } = useAuthStore()

  const { data: feedData, isLoading } = useQuery({
    queryKey: ['feed', user?.id],
    queryFn: async () => {
      const res = await api.get('/feed')
      return res.data
    },
    enabled: !!accessToken && !!user?.id,
    staleTime: STALE_SHORT,
    gcTime: GC_STANDARD,
  })

  const posts = feedData?.posts ?? feedData ?? []
  const transformedPosts: FeedPost[] = posts.map((post: any) => {
    let mediaUrl: string | null = null
    if (post.media?.length > 0) {
      const first = post.media[0]
      mediaUrl = first.type === 'video'
        ? first.thumbnailUrl || null
        : first.thumbnailUrl || first.url || first.path || first.fileName || null
      if (mediaUrl && !mediaUrl.startsWith('http')) mediaUrl = resolveImageUrl(mediaUrl)
      else if (mediaUrl) mediaUrl = resolveImageUrl(mediaUrl)
    }
    return {
      id: post.id,
      title: post.caption || 'Gönderi',
      content: post.caption || '',
      cover: mediaUrl,
      author: post.user?.fullName || post.user?.username || 'Kullanıcı',
      authorUsername: post.user?.username,
      authorAvatar: post.user?.avatar ? resolveImageUrl(post.user.avatar) : null,
      authorId: post.user?.id,
      userId: post.userId || post.user?.id,
      likes: post._count?.likes ?? 0,
      likedBy: post.isLiked ? [user?.id] : [],
      date: post.createdAt,
      createdAt: post.createdAt,
      _count: {
        likes: post._count?.likes ?? 0,
        comments: post._count?.comments ?? 0,
      },
      pinnedComment: post.pinnedComment ?? null,
      recentComments: post.recentComments ?? [],
    }
  })

  // ✅ Optimistic render - UI hemen görünsün, fetch arkada devam etsin
  return (
    <div className="relative w-full max-w-5xl mx-auto px-4">
      <div className="pointer-events-none absolute -inset-x-8 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_14%_0%,rgba(255,123,0,0.08),transparent_34%),radial-gradient(circle_at_84%_8%,rgba(31,106,225,0.07),transparent_32%)] dark:bg-[radial-gradient(circle_at_14%_0%,rgba(255,123,0,0.12),transparent_34%),radial-gradient(circle_at_84%_8%,rgba(31,106,225,0.10),transparent_32%)]" />
      {/* 🔸 Ayın Öne Çıkanları — header'ın hemen altından başlıyor, direkt görünür */}
      <div className="w-full mt-4 md:mt-8 mb-6 md:mb-10">
        <HighlightsRow />
      </div>

      <div className="space-y-6 md:space-y-10">
        {/* 🔸 Keşfet */}
        <div className="w-full">
          <h2 className="mb-4 md:mb-6 inline-flex items-center gap-2.5 text-lg md:text-xl font-bold tracking-tight text-slate-950 dark:text-slate-100">
            <span className="feellink-section-icon feellink-section-icon--discover" aria-hidden="true">
              <Compass size={15} strokeWidth={2.1} />
            </span>
            Keşfet
          </h2>

          {isLoading ? (
            // ✅ Skeleton loader - UI hemen görünsün
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          ) : transformedPosts.length === 0 ? (
            <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-50/70 px-4 py-12 text-center shadow-[0_24px_80px_rgba(15,23,42,0.07)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035] dark:shadow-black/20 md:py-20">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,123,0,0.10),transparent_32%),radial-gradient(circle_at_54%_74%,rgba(31,106,225,0.08),transparent_34%)] dark:bg-[radial-gradient(circle_at_50%_20%,rgba(255,123,0,0.12),transparent_32%),radial-gradient(circle_at_54%_74%,rgba(31,106,225,0.10),transparent_34%)]" />
              <p className="relative text-base font-semibold text-slate-700 dark:text-slate-200 md:text-lg mb-2">
                Henüz keşfedecek gönderi yok
              </p>
              <p className="relative text-sm text-slate-500 dark:text-slate-400 mb-6">
                Yeni kişileri takip ederek gönderilerini burada görebilirsin
              </p>
              <button
                onClick={() => router.push('/explore')}
                className="relative px-5 py-2.5 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl shadow-[0_14px_36px_rgba(255,123,0,0.24)] transition-all hover:-translate-y-0.5 font-medium"
              >
                Keşfet
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {transformedPosts.map((post) => (
                <PostCard key={post.id} post={post} returnTo="/feed" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function FeedPage() {
  return (
    <AuthGuard>
      <FeedContent />
    </AuthGuard>
  )
}
