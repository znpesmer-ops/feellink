'use client'

import { useState, useEffect } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { PostModal } from '@/components/post-modal'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { AuthGuard } from '@/lib/auth-guard'
import PostCard from '@/components/PostCard'
import { PostCardSkeleton } from '@/components/ui/Skeleton'

function ExploreContent() {
  const router = useRouter()
  const { accessToken, user } = useAuthStore()
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)

  // URL'den post ID'sini oku (sidebar'dan tıklanınca modal açılması için)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const postId = params.get('post')
    if (postId) {
      setSelectedPostId(postId)
      // URL'yi temizle (modal kapandığında geri dönmemek için)
      router.replace('/explore', { scroll: false })
    }
  }, [router])

  // Infinite scroll explore query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['explore'],
    queryFn: async ({ pageParam }) => {
      try {
        const params = new URLSearchParams()
        params.append('limit', '20')
        if (pageParam) {
          params.append('cursor', pageParam)
        }
        const response = await api.get(`/explore?${params.toString()}`)
        
        console.log('[EXPLORE] 📊 Keşfet API yanıtı:', {
          toplam: response.data?.posts?.length || 0,
          rawData: response.data,
        })
        
        if (!response.data?.posts || response.data.posts.length === 0) {
          console.warn('[EXPLORE] ⚠️ KEŞFET BOŞ! Hiç post bulunamadı.')
        }
        
        return response.data
      } catch (err: any) {
        // DETAYLI ERROR LOG - kullanıcının istediği bilgi
        console.error('[EXPLORE] API ERROR:', {
          message: err?.message,
          status: err?.response?.status,
          data: err?.response?.data,
          url: err?.config?.url,
          baseURL: err?.config?.baseURL,
          method: err?.config?.method,
          hasToken: !!err?.config?.headers?.Authorization,
          tokenPreview: err?.config?.headers?.Authorization?.substring(0, 20) + '...' || 'NO_TOKEN',
        })
        // Boş data döndür ki UI patlamasın
        return { posts: [], nextCursor: null, hasMore: false }
      }
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    // Token olmasa bile explore çalışır (public endpoint)
    enabled: true,
  })

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const posts = data?.pages.flatMap((page: any) => page.posts) || []
  
  // Debug: Backend'den gelen veriyi kontrol et
  useEffect(() => {
    if (posts.length > 0) {
      console.log('Explore Posts Sample:', {
        postId: posts[0].id,
        pinnedComment: posts[0].pinnedComment,
        recentComments: posts[0].recentComments,
        commentsCount: posts[0]._count?.comments
      })
    }
  }, [posts])

  // ✅ Optimistic render - UI hemen görünsün, fetch arkada devam etsin
  // Filtre sekmeleri kaldırıldı - sadece varsayılan keşfet akışı gösteriliyor
  // State (activeFilter) korunuyor - ileride tekrar eklenebilir
  // const filters = ['Tümü', 'Sanatçılar', 'Koleksiyonlar', 'Etkinlikler']

  return (
    <>
      <div className="w-full">
        {/* Filtre Barı - KALDIRILDI */}
        {/* 
        <div className="flex items-center justify-center gap-4 mt-6 mb-8">
          {filters.map((filter: any) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                activeFilter === filter
                  ? 'border-brand-orange text-brand-orange bg-brand-orange/10 dark:bg-brand-orange/20'
                  : 'border-brand-blue/30 text-gray-500 dark:text-gray-400 hover:text-brand-orange hover:border-brand-orange'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
        */}

        {/* Düzenli Grid View - PostCard explore variant kullanıyor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 py-8 px-4 items-stretch">
          {isLoading ? (
            // ✅ Skeleton loader - UI hemen görünsün
            Array.from({ length: 6 }).map((_, i) => (
              <PostCardSkeleton key={`skeleton-${i}`} variant="explore" />
            ))
          ) : (
            posts.map((post: any, index: number) => {
            const caption = (post.caption || '').trim()
            const artworkTitle = (post.title || '').trim()
            const useArtworkTitle = post.type === 'artwork' && artworkTitle.length > 0
            const displayTitle = useArtworkTitle ? artworkTitle : caption
            const displayContent =
              useArtworkTitle && caption && caption !== artworkTitle ? caption : useArtworkTitle ? '' : caption

            const postCardData = {
              id: post.id,
              title: displayTitle || 'Gönderi',
              content: displayContent,
              cover:
                post.media?.[0]?.type === 'video'
                  ? post.media?.[0]?.thumbnailUrl || null
                  : post.media?.[0]?.thumbnailUrl || post.media?.[0]?.url || null,
              author: post.user?.fullName || post.user?.username || 'Kullanıcı',
              authorUsername: post.user?.username,
              authorAvatar: post.user?.avatar,
              authorId: post.user?.id,
              userId: post.userId || post.user?.id,
              likes: post._count?.likes ?? 0,
              likedBy: post.isLiked && user?.id ? [user.id] : [],
              date: post.createdAt,
              createdAt: post.createdAt,
              _count: post._count,
              type: post.type,
              pinnedComment: post.pinnedComment ?? null,
              recentComments: post.recentComments ?? [],
            }

            return (
              <motion.div
                key={post.id}
                className="h-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                onClick={() => setSelectedPostId(post.id)}
              >
                <PostCard
                  post={postCardData}
                  returnTo="/explore"
                  variant="explore"
                />
              </motion.div>
            )
            })
          )}
        </div>

        {/* Load More */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-orange"></div>
          </div>
        )}

        {/* End Message */}
        {!hasNextPage && posts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center mt-10"
          >
            <div className="text-gray-400 dark:text-gray-500 text-sm bg-gray-50 dark:bg-[#181818] py-3 rounded-full w-fit mx-auto px-6 border border-gray-200 dark:border-gray-700">
              Tüm paylaşımları gördün — harikasın!
            </div>
          </motion.div>
        )}

        {posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Henüz keşfedilecek paylaşım bulunmuyor.</p>
          </div>
        )}
      </div>

      {/* Post Detail Modal */}
      {selectedPostId && (
        <PostModal
          postId={selectedPostId}
          onClose={() => setSelectedPostId(null)}
        />
      )}
    </>
  )
}

export default function ExplorePage() {
  return (
    <AuthGuard>
      <ExploreContent />
    </AuthGuard>
  )
}
