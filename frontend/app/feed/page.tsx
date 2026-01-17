'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { initSocket, initPostsSocket } from '@/lib/socket'
import { AuthGuard } from '@/lib/auth-guard'
import HighlightsRow from '@/components/highlights-row'
import PostCard from '@/components/PostCard'
import api from '@/lib/api'
import { resolveImageUrl } from '@/lib/resolveImageUrl'

function FeedContent() {
  const router = useRouter()
  const { accessToken, user } = useAuthStore()
  const [feedPosts, setFeedPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!accessToken) {
      router.push('/login')
      return
    }

    // Fetch feed posts
    const fetchFeed = async () => {
      try {
        setIsLoading(true)
        const res = await api.get('/feed')
        const posts = res.data.posts || res.data || []

        // 🔍 DEBUG: Feed response'u logla
        console.log('[FEED] Feed API response:', {
          hasPosts: posts.length > 0,
          postsCount: posts.length,
          responseData: res.data,
          firstPost: posts[0] || null,
        })

        // 🔍 DEBUG: İlk post'un media yapısını logla
        if (posts.length > 0 && posts[0].media) {
          console.log('[FEED] First post media structure:', {
            postId: posts[0].id,
            hasMedia: !!posts[0].media,
            mediaLength: posts[0].media?.length || 0,
            media: posts[0].media,
            firstMediaUrl: posts[0].media?.[0]?.url,
            firstMediaPath: posts[0].media?.[0]?.path,
            firstMediaFileName: posts[0].media?.[0]?.fileName,
          })
        }

        // Transform backend post format to PostCard format
        const transformedPosts = posts.map((post: any) => {
          // ✅ Backend'den gelen media URL'ini resolve et
          // Backend şu alanları döndürebilir: url, path, fileName
          let mediaUrl: string | null = null
          if (post.media && post.media.length > 0) {
            const firstMedia = post.media[0]
            // Önce url field'ını kontrol et, yoksa path veya fileName kullan
            mediaUrl = firstMedia.url || firstMedia.path || firstMedia.fileName || null
            // Relative path ise resolveImageUrl ile absolute URL'e çevir
            if (mediaUrl && !mediaUrl.startsWith('http')) {
              mediaUrl = resolveImageUrl(mediaUrl)
            } else if (mediaUrl) {
              // Zaten absolute URL ise resolveImageUrl ile normalize et
              mediaUrl = resolveImageUrl(mediaUrl)
            }
          }

          return {
            id: post.id,
            title: post.caption || 'Gönderi',
            content: post.caption || '',
            cover: mediaUrl, // ✅ Resolved URL kullan
            author: post.user?.fullName || post.user?.username || 'Kullanıcı',
            authorUsername: post.user?.username,
            authorAvatar: post.user?.avatar ? resolveImageUrl(post.user.avatar) : null,
            authorId: post.user?.id,
            userId: post.userId || post.user?.id,
            likes: post._count?.likes || 0,
            likedBy: post.isLiked ? [user?.id] : [],
            date: post.createdAt,
            createdAt: post.createdAt,
          }
        })

        setFeedPosts(transformedPosts)
      } catch (error) {
        console.error('Feed posts alınamadı:', error)
        setFeedPosts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeed()

    // Initialize socket for notifications and new posts
    const socket = initSocket(accessToken)
    const postsSocket = initPostsSocket(accessToken)

    socket.on('notification', (notification) => {
      console.log('New notification:', notification)
    })

    // Listen for new posts from followed users
    postsSocket.on('newPost', (post: any) => {
      console.log('New post received:', post)
      // Transform and add to feed
      // ✅ Backend'den gelen media URL'ini resolve et
      let mediaUrl: string | null = null
      if (post.media && post.media.length > 0) {
        const firstMedia = post.media[0]
        mediaUrl = firstMedia.url || firstMedia.path || firstMedia.fileName || null
        if (mediaUrl && !mediaUrl.startsWith('http')) {
          mediaUrl = resolveImageUrl(mediaUrl)
        } else if (mediaUrl) {
          mediaUrl = resolveImageUrl(mediaUrl)
        }
      }

      const transformedPost = {
        id: post.id,
        title: post.caption || 'Gönderi',
        content: post.caption || '',
        cover: mediaUrl, // ✅ Resolved URL kullan
        author: post.user?.fullName || post.user?.username || 'Kullanıcı',
        authorUsername: post.user?.username,
        authorAvatar: post.user?.avatar ? resolveImageUrl(post.user.avatar) : null,
        likes: post._count?.likes || 0,
        likedBy: [],
        date: post.createdAt,
        createdAt: post.createdAt,
      }
      setFeedPosts((prev) => [transformedPost, ...prev])
    })

    return () => {
      socket.off('notification')
      postsSocket.off('newPost')
      postsSocket.disconnect()
    }
  }, [accessToken, router, user?.id])

  if (!accessToken) {
    return null
  }

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
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
            </div>
          ) : feedPosts.length === 0 ? (
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
              {feedPosts.map((post) => (
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
