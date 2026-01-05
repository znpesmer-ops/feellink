'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { initSocket, initPostsSocket } from '@/lib/socket'
import { AuthGuard } from '@/lib/auth-guard'
import HighlightsRow from '@/components/highlights-row'
import PostCard from '@/components/PostCard'
import { PostModal } from '@/components/post-modal'
import api from '@/lib/api'

function FeedContentInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { accessToken, user } = useAuthStore()
  const [feedPosts, setFeedPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [highlightCommentId, setHighlightCommentId] = useState<string | null>(null)

  // URL'den post ve comment parametrelerini oku
  useEffect(() => {
    const postId = searchParams.get('post')
    const commentId = searchParams.get('comment')
    
    if (postId) {
      setSelectedPostId(postId)
      if (commentId) {
        setHighlightCommentId(commentId)
      }
    }
  }, [searchParams])

  useEffect(() => {
    // Token kontrolü - localStorage'dan da kontrol et
    const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    const hasToken = accessToken || tokenFromStorage

    if (!hasToken) {
      router.push('/login')
      return
    }

    // Fetch feed posts with retry mechanism
    const fetchFeed = async () => {
      let retryCount = 0
      const maxRetries = 3
      
      const fetchWithRetry = async (): Promise<void> => {
        try {
          setIsLoading(true)
          const res = await api.get('/feed')
          
          // API direkt array döndürüyor (NextResponse.json(posts))
          let posts: any[] = []
          if (Array.isArray(res.data)) {
            posts = res.data
          } else if (res.data && Array.isArray(res.data.posts)) {
            posts = res.data.posts
          } else if (res.data && Array.isArray(res.data)) {
            posts = res.data
          }
          
          // Transform backend post format to PostCard format
          const transformedPosts = posts
            .filter((post: any) => post && post.id)
            .map((post: any) => {
              // Check if current user liked this post
              const isLiked = post.likes?.some((like: any) => like.userId === user?.id) || false
              
              return {
                id: post.id,
                title: post.caption || 'Gönderi',
                content: post.caption || '',
                cover: post.media?.[0]?.url || null,
                author: post.user?.fullName || post.user?.username || 'Kullanıcı',
                authorUsername: post.user?.username,
                authorAvatar: post.user?.avatar,
                authorId: post.user?.id,
                userId: post.userId || post.user?.id,
                likes: post._count?.likes ?? 0,
                likedBy: isLiked ? [user?.id || ''] : [],
                date: post.createdAt,
                createdAt: post.createdAt,
                _count: {
                  comments: post._count?.comments ?? 0,
                  likes: post._count?.likes ?? 0,
                },
              }
            })
          
          setFeedPosts(transformedPosts)
        } catch (error: any) {
          // Network error ise retry yap
          if ((error?.code === 'ERR_NETWORK' || !error?.response) && retryCount < maxRetries) {
            retryCount++
            const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 4000)
            await new Promise(resolve => setTimeout(resolve, delay))
            return fetchWithRetry()
          }
          
          setFeedPosts([])
        } finally {
          setIsLoading(false)
        }
      }
      
      await fetchWithRetry()
    }

    // Fetch feed immediately
    fetchFeed().catch(() => {
      setIsLoading(false)
    })

    // Initialize socket for notifications and new posts (skip in production if socket.io not available)
    const tokenToUse = accessToken || tokenFromStorage
    let socket: ReturnType<typeof initSocket> | null = null
    let postsSocket: ReturnType<typeof initPostsSocket> | null = null
    
    if (tokenToUse) {
      try {
        socket = initSocket(tokenToUse)
        postsSocket = initPostsSocket(tokenToUse)

        socket.on('notification', () => {})

        postsSocket.on('newPost', (post: any) => {
          const transformedPost = {
            id: post.id,
            title: post.caption || 'Gönderi',
            content: post.caption || '',
            cover: post.media?.[0]?.url || null,
            author: post.user?.fullName || post.user?.username || 'Kullanıcı',
            authorUsername: post.user?.username,
            authorAvatar: post.user?.avatar,
            likes: post._count?.likes || 0,
            likedBy: [],
            date: post.createdAt,
            createdAt: post.createdAt,
            _count: {
              comments: post._count?.comments || 0,
              likes: post._count?.likes || 0,
            },
          }
          setFeedPosts((prev: any) => [transformedPost, ...prev])
        })

        postsSocket.on('post:comment', (data: { postId: string; comments: number }) => {
          setFeedPosts((prev: any) => 
            prev.map((p: any) => 
              p.id === data.postId 
                ? { ...p, _count: { ...p._count, comments: data.comments } } 
                : p
            )
          )
        })
      } catch (error) {
        // Socket initialization failed, continue without real-time updates
      }
    }

    return () => {
      if (socket) {
        socket.off('notification')
        socket.disconnect()
      }
      if (postsSocket) {
        postsSocket.off('newPost')
        postsSocket.off('post:comment')
        postsSocket.disconnect()
      }
    }
  }, [accessToken, router, user?.id])

  // Token kontrolü - localStorage'dan da kontrol et
  const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const hasToken = accessToken || tokenFromStorage

  if (!hasToken) {
    return null
  }

  const handleCloseModal = () => {
    setSelectedPostId(null)
    setHighlightCommentId(null)
    // URL'yi temizle
    router.replace('/feed', { scroll: false })
  }

  return (
    <div className="w-full feed-content" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* 🔸 Ayın Öne Çıkanları — header'ın hemen altından başlıyor, direkt görünür */}
      <div className="w-full mt-4 md:mt-8 mb-6 md:mb-10" style={{ width: '100%', boxSizing: 'border-box' }}>
        <HighlightsRow />
      </div>
      
      <div className="space-y-6 md:space-y-10" style={{ width: '100%', boxSizing: 'border-box' }}>
        {/* 🔸 Keşfet */}
        <div className="w-full" style={{ width: '100%', boxSizing: 'border-box' }}>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 md:mb-6 tracking-[0.02em]" style={{ fontWeight: 600, letterSpacing: '0.3px' }}>Keşfet</h2>
          
          <div className="w-full" style={{ width: '100%', boxSizing: 'border-box' }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
              </div>
            ) : feedPosts.length === 0 ? (
              <div className="text-center py-12 md:py-20 bg-white dark:bg-gray-950 rounded-2xl border border-black/4 dark:border-white/10 px-4 shadow-[0_6px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8" style={{ width: '100%', boxSizing: 'border-box' }}>
                {feedPosts.map((post: any, index: any) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    variant="explore"
                    index={index}
                    showLike={false} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post Modal - URL'den açılan post için */}
      {selectedPostId && (
        <PostModal 
          postId={selectedPostId} 
          onClose={handleCloseModal}
          highlightCommentId={highlightCommentId || undefined}
        />
      )}
    </div>
  )
}

function FeedContent() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
      </div>
    }>
      <FeedContentInner />
    </Suspense>
  )
}

export default function FeedPage() {
  return (
    <AuthGuard>
      <FeedContent />
    </AuthGuard>
  )
}
