'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import { AuthGuard } from '@/lib/auth-guard'
import HighlightsRow from '@/components/highlights-row'
import PostCard from '@/components/PostCard'
import api from '@/lib/api'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { PostCardSkeleton } from '@/components/ui/Skeleton'

function FeedContent() {
  const router = useRouter()
  const { accessToken, user } = useAuthStore()

  useEffect(() => {
    if (!accessToken) router.push('/login')
  }, [accessToken, router])

  const { data: feedData, isLoading } = useQuery({
    queryKey: ['feed', user?.id],
    queryFn: async () => {
      const res = await api.get('/feed')
      return res.data
    },
    enabled: !!accessToken && !!user?.id,
  })

  const posts = feedData?.posts ?? feedData ?? []
  const transformedPosts = posts.map((post: any) => {
    let mediaUrl: string | null = null
    if (post.media?.length > 0) {
      const first = post.media[0]
      mediaUrl = first.url || first.path || first.fileName || null
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
    }
  })

  // ✅ Optimistic render - UI hemen görünsün, fetch arkada devam etsin
  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      {/* 🔸 Ayın Öne Çıkanları — header'ın hemen altından başlıyor, direkt görünür */}
      <div className="w-full mt-4 md:mt-8 mb-6 md:mb-10">
        <HighlightsRow />
      </div>

      <div className="space-y-6 md:space-y-10">
        {/* 🔸 Keşfet */}
        <div className="w-full">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 md:mb-6">Keşfet</h2>

          {isLoading ? (
            // ✅ Skeleton loader - UI hemen görünsün
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          ) : transformedPosts.length === 0 ? (
            <div className="text-center py-12 md:py-20 bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-900 px-4">
              <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg mb-2">
                Henüz keşfedecek gönderi yok
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
                Yeni kişileri takip ederek gönderilerini burada görebilirsin
              </p>
              <button
                onClick={() => router.push('/explore')}
                className="px-5 py-2.5 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl shadow-sm transition-colors font-medium"
              >
                Keşfet
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {transformedPosts.map((post) => (
                <PostCard key={post.id} post={post} />
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
