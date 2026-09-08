'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import api, { getApiErrorKind } from '@/lib/api'
import { isAxiosError } from 'axios'
import { useAuthStore } from '@/lib/store'
import {
  Heart,
  MessageCircle,
  Bookmark,
  X,
  Send,
  Trash2,
  CornerUpRight,
  Pin,
  PinIcon,
  FolderPlus,
  MoreVertical,
  Sparkles,
  Flag,
  Image as ImageIcon,
  CalendarDays,
} from 'lucide-react'
import MentionInput from './MentionInput'
import { useRouter, usePathname } from 'next/navigation'
import { initCommentsSocket } from '@/lib/socket'
import { FeellinkRoleBadge } from './FeellinkRoleBadge'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { containsBadWord } from '@/lib/utils/containsBadWord'
import Slider from 'react-slick'
import toast from 'react-hot-toast'
import { AddToCollectionModal } from './collections/AddToCollectionModal'
import { ReportModal } from './ReportModal'
import { SharePostTrigger } from '@/components/share/SharePostTrigger'

const CommentLikeButton = dynamic(() => import('@/components/CommentLikeButton'), {
  ssr: false,
  loading: () => null,
})

/** Oturum geçersizken /posts/:id 401 verince public-share yanıtına düşüldüğünü işaretler (salt okunur UI) */
const POST_QUERY_PUBLIC_FALLBACK = '_feellinkPublicFallback' as const

interface PostModalProps {
  postId: string
  onClose: () => void
  highlightCommentId?: string
  /** Doğrudan link / QR — giriş olmadan gönderi görünümü (salt okunur) */
  publicShare?: boolean
}

interface Comment {
  id: string
  content: string
  createdAt: string
  updatedAt?: string
  userId?: string
  isPinned?: boolean
  isLikedByCurrentUser?: boolean
  likesCount?: number
  user: {
    id: string
    username: string
    fullName: string | null
    avatar: string | null
    isVerified: boolean
    role?: string
  }
  replies?: Comment[]
}

function formatArtworkCreatedDateDisplay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Istanbul',
  })
}

interface Post {
  id: string
  caption: string | null
  title?: string | null
  location: string | null
  createdAt: string
  artworkCreatedDate?: string | null
  isLiked: boolean
  isSaved: boolean
  type?: 'post' | 'artwork' | 'article' | 'event'
  user: {
    id: string
    username: string
    fullName: string | null
    avatar: string | null
    isVerified: boolean
    role?: string
  }
  media: Array<{
    id: string
    url: string
    type: string
    order: number
    thumbnailUrl?: string | null
  }>
  comments: Comment[]
  _count: {
    likes: number
    comments: number
  }
  [POST_QUERY_PUBLIC_FALLBACK]?: boolean
}

/** Socket’ten gelen commentLikeUpdated — sadece ilgili yorumun likesCount’u; isLiked yalnızca aksiyonu yapan kullanıcı için */
function patchPostCommentLikeFromSocket(
  oldData: any,
  targetCommentId: string,
  likesCount: number,
  actorUserId: string,
  likedByActor: boolean,
  viewerUserId: string | undefined,
): any {
  if (!oldData) return oldData
  const cid = String(targetCommentId)
  const updateCommentLikes = (comments: any[]): any[] =>
    comments.map((comment: any) => {
      if (String(comment.id) === cid) {
        const isViewerActor = viewerUserId && String(actorUserId) === String(viewerUserId)
        return {
          ...comment,
          likesCount,
          isLikedByCurrentUser: isViewerActor ? likedByActor : comment.isLikedByCurrentUser,
          _count: {
            ...comment._count,
            likes: likesCount,
          },
          likes:
            isViewerActor ? (likedByActor ? [{ id: 'socket' }] : []) : comment.likes,
        }
      }
      if (comment.replies?.length) {
        return { ...comment, replies: updateCommentLikes(comment.replies) }
      }
      return comment
    })
  return {
    ...oldData,
    comments: updateCommentLikes(oldData.comments || []),
  }
}

export function PostModal({
  postId,
  onClose,
  highlightCommentId,
  publicShare = false,
}: PostModalProps) {
  const { accessToken, user, capabilities } = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const resolvedPostId = typeof postId === 'string' ? postId.trim() : postId
  const postQueryKey = useMemo(
    () => ['post', resolvedPostId, publicShare ? 'public' : 'auth'] as const,
    [resolvedPostId, publicShare],
  )
  const [commentText, setCommentText] = useState('')
  const [isPostingComment, setIsPostingComment] = useState(false)
  const [animateLike, setAnimateLike] = useState(false)
  const [pingAnimating, setPingAnimating] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ commentId: string; x: number; y: number } | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState<string>('')
  const [commentMenuOpen, setCommentMenuOpen] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ commentId: string } | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const sliderRef = useRef<Slider | null>(null)
  const [showAddToCollectionModal, setShowAddToCollectionModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState<{ contentType: 'post' | 'comment'; contentId: string } | null>(null)
  
  const roles = capabilities?.roles ?? user?.roles ?? []
  const canManageCollections = roles.includes('corporate') || roles.includes('collector')

  const guestReturnPath =
    pathname?.startsWith('/') && !pathname.includes('//') ? pathname : `/posts/${resolvedPostId}`
  const loginHrefWithFrom = `/login?from=${encodeURIComponent(guestReturnPath)}`

  const promptGuestLogin = (message: string) => {
    toast(message, { duration: 2800 })
    router.push(loginHrefWithFrom)
  }

  // Modal açıkken body'ye class ekle (arka plan UI elementlerini gizlemek için)
  useEffect(() => {
    if (resolvedPostId) {
      document.body.classList.add('modal-open')
    } else {
      document.body.classList.remove('modal-open')
    }

    // Cleanup: Modal kapandığında class'ı kaldır
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [resolvedPostId])

  // Menüyü dışarı tıklanınca kapat
  useEffect(() => {
    const handleClickOutside = () => {
      setCommentMenuOpen(null)
    }
    if (commentMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [commentMenuOpen])

  // ESC tuşu ile delete modal'ı kapat
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDeleteConfirm) {
        setShowDeleteConfirm(null)
      }
    }
    if (showDeleteConfirm) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [showDeleteConfirm])

  // Post detay — tek istek (post + yorumlar); staleTime ile gereksiz refetch azaltılır, like sonrası refetch yok
  const { data: post, isLoading, isError, error: postQueryError } = useQuery<Post>({
    queryKey: postQueryKey,
    queryFn: async () => {
      if (publicShare) {
        const response = await api.get<Post>(`/posts/public-share/${resolvedPostId}`)
        return response.data
      }
      try {
        const response = await api.get<Post>(`/posts/${resolvedPostId}`)
        return response.data
      } catch (err) {
        if (
          isAxiosError(err) &&
          (err.response?.status === 401 || err.response?.status === 403)
        ) {
          const response = await api.get<Post>(`/posts/public-share/${resolvedPostId}`)
          return { ...response.data, [POST_QUERY_PUBLIC_FALLBACK]: true }
        }
        throw err
      }
    },
    enabled: !!resolvedPostId && (!!accessToken || publicShare),
    staleTime: 60 * 1000, // 1 dk cache — like/comment mutation cache'i günceller, sayfa geç yüklenmez
    // Başka kullanıcı / sekme beğenilerini görmek: odakta taze veri (staleTime bypass)
    refetchOnWindowFocus: publicShare ? false : 'always',
    // Production'da socket kapalı — açık modalda periyodik tazeleme (localhost'ta socket yeter)
    refetchInterval: (q) => {
      if (publicShare || typeof window === 'undefined') return false
      const h = window.location.hostname
      if (h === 'localhost' || h === '127.0.0.1') return false
      return q.state.data ? 20000 : false
    },
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status != null) return false
      return failureCount < 1
    },
  })

  // Gerçek zamanlı yorum beğenisi (localhost / socket açık); diğer kullanıcıların cache'ini günceller
  useEffect(() => {
    if (!accessToken || publicShare || !resolvedPostId) return

    const commentsSocket = initCommentsSocket(accessToken)
    const join = () => {
      commentsSocket.emit('joinPostRoom', resolvedPostId)
    }

    const onCommentLikeUpdated = (data: {
      commentId: string
      postId: string
      liked: boolean
      likesCount: number
      userId: string
    }) => {
      if (String(data.postId) !== String(resolvedPostId)) return
      const applyLikePatch = (old: any) =>
        patchPostCommentLikeFromSocket(
          old,
          data.commentId,
          data.likesCount,
          data.userId,
          data.liked,
          user?.id,
        )
      queryClient.setQueryData(postQueryKey, applyLikePatch)
      queryClient.setQueriesData({ queryKey: ['post', resolvedPostId] }, applyLikePatch)
      queryClient.invalidateQueries({ queryKey: ['user-comments'] })
    }

    commentsSocket.on('connect', join)
    if (commentsSocket.connected) join()
    commentsSocket.on('commentLikeUpdated', onCommentLikeUpdated)

    return () => {
      commentsSocket.off('connect', join)
      commentsSocket.off('commentLikeUpdated', onCommentLikeUpdated)
      commentsSocket.emit('leavePostRoom', resolvedPostId)
    }
  }, [accessToken, publicShare, resolvedPostId, postQueryKey, queryClient, user?.id])

  const isReadOnly = publicShare || Boolean(post?.[POST_QUERY_PUBLIC_FALLBACK])

  // Yorum odaklaması - highlightCommentId varsa yorumu scroll et
  useEffect(() => {
    if (highlightCommentId && post?.comments) {
      // Post yüklendikten sonra kısa bir gecikme ile scroll et
      const timer = setTimeout(() => {
        const commentElement = document.getElementById(`comment-${highlightCommentId}`)
        if (commentElement) {
          commentElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          })
          // Hafif highlight efekti
          commentElement.classList.add('ring-2', 'ring-brand-orange', 'ring-opacity-50')
          setTimeout(() => {
            commentElement.classList.remove('ring-2', 'ring-brand-orange', 'ring-opacity-50')
          }, 2000)
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [highlightCommentId, post?.comments])

  // Like mutation — tıklanma anındaki state ile toggle (stale closure yok), backend tek kaynak
  const likeMutation = useMutation<
    { liked: boolean; likeCount: number },
    Error,
    { currentIsLiked: boolean; currentCount: number }
  >({
    mutationFn: async ({ currentIsLiked, currentCount }) => {
      const res = currentIsLiked
        ? await api.delete<{ liked?: boolean; likeCount?: number }>(`/posts/${resolvedPostId}/like`)
        : await api.post<{ liked?: boolean; likeCount?: number }>(`/posts/${resolvedPostId}/like`)
      const likeCount = typeof res.data?.likeCount === 'number' ? res.data.likeCount : (currentCount + (currentIsLiked ? -1 : 1))
      return {
        liked: currentIsLiked ? false : true,
        likeCount: Math.max(0, likeCount),
      }
    },
    onMutate: async ({ currentIsLiked, currentCount }) => {
      const newLiked = !currentIsLiked
      const newCount = Math.max(0, currentCount + (newLiked ? 1 : -1))
      queryClient.setQueryData(postQueryKey, (old: any) => {
        if (!old) return old
        return {
          ...old,
          isLiked: newLiked,
          _count: { ...old._count, likes: newCount },
        }
      })
    },
    onSuccess: (data) => {
      queryClient.setQueryData(postQueryKey, (old: any) => {
        if (!old) return old
        const safeCount = typeof data.likeCount === 'number' ? data.likeCount : (old._count?.likes ?? 0)
        return {
          ...old,
          isLiked: data.liked,
          _count: { ...old._count, likes: Math.max(0, safeCount) },
        }
      })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['explore'] })
    },
    onError: (error: any) => {
      console.error(`❌ [PostModal] ========== LIKE MUTATION ERROR ==========`);
      console.error(`❌ [PostModal] Error:`, error?.message);
      console.error(`❌ [PostModal] Status:`, error?.response?.status);
      console.error(`❌ [PostModal] Data:`, error?.response?.data);
      
      // ❌ KULLANICIYA HATA BİLDİRİMİ GÖSTER!
      const errorMsg = error?.response?.data?.message || error?.message || 'Bir hata oluştu'
      toast.error(`❌ Beğeni kaydedilemedi: ${errorMsg}`)
      
      // ✅ ROLLBACK: POST CACHE'İNİ INVALIDATE ET (optimistic update iptal)
      queryClient.invalidateQueries({ queryKey: postQueryKey })
    },
  })

  // Save mutation (works for both posts and artworks)
  const saveMutation = useMutation<
    { saved: boolean; response: any },
    Error,
    void
  >({
    mutationFn: async () => {
      const isArtwork = post?.type === 'artwork'
      const endpoint = isArtwork ? `/posts/${resolvedPostId}/save-artwork` : `/posts/${resolvedPostId}/save`
      
      console.log(`💾 [PostModal] Saving post ${postId}:`, {
        isArtwork,
        endpoint,
        isSaved: post?.isSaved,
        baseURL: api.defaults.baseURL,
        fullURL: `${api.defaults.baseURL}${endpoint}`,
      });
      
      if (post?.isSaved) {
        console.log(`🗑️ [PostModal] Unsaving → DELETE ${endpoint}`);
        const response = await api.delete(endpoint)
        console.log(`✅ [PostModal] Unsaved successfully:`, response.data);
        return { saved: false, response: response.data }
      } else {
        console.log(`💾 [PostModal] Saving → POST ${endpoint}`);
        const response = await api.post(endpoint)
        console.log(`✅ [PostModal] Saved successfully:`, response.data);
        return { saved: true, response: response.data }
      }
    },
    onMutate: async () => {
      // ✅ OPTIMISTIC UPDATE - ANINDA UI güncelle (Instagram mantığı)
      console.log(`⚡ [PostModal] OPTIMISTIC UPDATE - UI anında güncelleniyor...`);
      
      // ❗ ESKİ STATE'İ KAYDET (rollback için)
      const previousPost = queryClient.getQueryData(postQueryKey);
      const previousSavedState = (previousPost as any)?.isSaved || false;
      
      // UI'ı anında güncelle
      const newSavedState = !previousSavedState;
      queryClient.setQueryData(postQueryKey, (old: any) => {
        if (!old) return old
        return {
          ...old,
          isSaved: newSavedState,
        }
      })
      
      console.log(`✅ [PostModal] UI updated instantly: ${previousSavedState} → ${newSavedState}`);
      
      // ✅ Context return et (onError için)
      return { previousSavedState };
    },
    onSuccess: (data) => {
      console.log(`✅ [PostModal] ========== BACKEND BAŞARILI ==========`);
      console.log(`✅ [PostModal] Backend response:`, data);
      console.log(`✅ [PostModal] Post ${data.saved ? 'KAYDEDİLDİ' : 'KALDIRILDI'}`);
      
      // ✅ Kullanıcıya BAŞARILI bildirimi göster!
      if (data.saved) {
        toast.success('Gönderi kaydedildi! ✅')
        console.log('✅ [PostModal] Şimdi Profil → Kaydedilenler kısmında gözükmeli!');
        
        // 🔥 OPTIMISTIC UPDATE: saved-posts query'sine direkt ekle!
        // Query henüz mount olmamışsa bile cache'e ekle, sonra görünecek!
        queryClient.setQueryData(['saved-posts'], (oldData: any[] | undefined) => {
          if (!oldData) {
            // Query henüz mount olmamış, post'u fetch et ve ekle
            console.log('🔄 [PostModal] saved-posts query henüz yok, post fetch ediliyor...');
            // Post'u cache'den al (zaten var)
            const currentPost = queryClient.getQueryData(postQueryKey) as Post | undefined;
            if (currentPost) {
              console.log('✅ [PostModal] Post cache\'den alındı, saved-posts\'a eklendi!');
              const newData = [{
                ...currentPost,
                savedAt: new Date().toISOString(),
              }];
              
              // ✅ KRİTİK: localStorage'a da kaydet!
              if (typeof window !== 'undefined' && user?.id) {
                try {
                  const localStorageKey = `saved-posts-${user.id}`;
                  localStorage.setItem(localStorageKey, JSON.stringify(newData));
                  console.log('✅ [PostModal] localStorage\'a kaydedildi!');
                } catch (e) {
                  console.warn('⚠️ [PostModal] localStorage kaydetme hatası:', e);
                }
              }
              
              return newData;
            }
            return [];
          }
          
          // Query zaten var, post'u ekle (eğer yoksa)
          const existingIndex = oldData.findIndex((item: any) => {
            const itemPost = item.post || item;
            return itemPost?.id === resolvedPostId;
          });
          
          if (existingIndex >= 0) {
            console.log('⚠️ [PostModal] Post zaten saved-posts\'ta var, skip');
            return oldData;
          }
          
          // Post'u cache'den al ve ekle
          const currentPost = queryClient.getQueryData(postQueryKey) as Post | undefined;
          if (currentPost) {
            console.log('✅ [PostModal] Post saved-posts\'a eklendi!');
            const newData = [{
              ...currentPost,
              savedAt: new Date().toISOString(),
            }, ...oldData];
            
            // ✅ KRİTİK: localStorage'a da kaydet!
            if (typeof window !== 'undefined' && user?.id) {
              try {
                const localStorageKey = `saved-posts-${user.id}`;
                localStorage.setItem(localStorageKey, JSON.stringify(newData));
                console.log('✅ [PostModal] localStorage\'a kaydedildi!');
              } catch (e) {
                console.warn('⚠️ [PostModal] localStorage kaydetme hatası:', e);
              }
            }
            
            return newData;
          }
          
          return oldData;
        });
      } else {
        toast.success('Kayıtlılardan kaldırıldı')
        
        // 🔥 OPTIMISTIC UPDATE: saved-posts query'sinden çıkar!
        queryClient.setQueryData(['saved-posts'], (oldData: any[] | undefined) => {
          if (!oldData) return [];
          const newData = oldData.filter((item: any) => {
            const itemPost = item.post || item;
            return itemPost?.id !== resolvedPostId;
          });
          
          // ✅ KRİTİK: localStorage'dan da sil!
          if (typeof window !== 'undefined' && user?.id) {
            try {
              const localStorageKey = `saved-posts-${user.id}`;
              localStorage.setItem(localStorageKey, JSON.stringify(newData));
              console.log('✅ [PostModal] localStorage güncellendi (post kaldırıldı)!');
            } catch (e) {
              console.warn('⚠️ [PostModal] localStorage güncelleme hatası:', e);
            }
          }
          
          return newData;
        });
      }
      
      // ✅ SADECE PROFILE CACHE'İNİ INVALIDATE ET
      // ❌ saved-posts query'sini invalidate/refetch ETME!
      // Çünkü: Optimistic update zaten cache'e ekledi!
      // Refetch backend'den eski data çekip optimistic update'i overwrite ediyor! ❌
      console.log('🔄 [PostModal] Profile cache invalidate ediliyor...');
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      
      // ❌ REFETCH YOK! Optimistic update yeterli!
      // Query refetchOnMount: false olduğu için otomatik refetch OLMAYACAK
      // Backend zaten kaydetti, optimistic update cache'de kalacak
      
      console.log('✅ [PostModal] ========== İŞLEM TAMAMLANDI ==========');
      console.log('✅ [PostModal] Optimistic update cache\'de! Kalıcı olacak!');
      // ✅ POST CACHE KORUMALI! Like state kaybolmamalı!
    },
    onError: (error: any, variables: any, context: any) => {
      console.error(`❌ [PostModal] Backend FAILED - ROLLBACK!`, {
        error: error?.message,
        status: error?.response?.status,
        previousState: context?.previousSavedState,
      });
      
      // ❌ KULLANICIYA HATA BİLDİRİMİ GÖSTER! (ÇOK ÖNEMLİ!)
      const errorMsg = error?.response?.data?.message || error?.message || 'Bir hata oluştu'
      toast.error(`❌ Kaydedilemedi: ${errorMsg}`)
      
      // ❌ UI'ı eski haline döndür (ROLLBACK - context'ten al!)
      if (context?.previousSavedState !== undefined) {
        queryClient.setQueryData(postQueryKey, (old: any) => {
          if (!old) return old
          return {
            ...old,
            isSaved: context.previousSavedState, // ✅ Context'ten eski state
          }
        })
        console.error(`🔄 [PostModal] UI rolled back to: isSaved = ${context.previousSavedState}`);
      } else {
        // Fallback: invalidate query
        queryClient.invalidateQueries({ queryKey: postQueryKey })
        console.error(`🔄 [PostModal] Context missing - invalidating query instead`);
      }
    },
  })

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const endpoint = `/posts/${resolvedPostId}/comments`
      console.log(`💬 [PostModal] Comment mutation:`, {
        postId,
        contentLength: content.length,
        hasParent: !!parentId,
        fullURL: `${api.defaults.baseURL}${endpoint}`,
      });
      
      const response = await api.post(endpoint, { content, parentId })
      console.log(`✅ [PostModal] Comment successful:`, response.data);
      return response.data
    },
    onSuccess: (newComment) => {
      toast.success('Yorum eklendi! ✅')
      // Optimistic: en yeni üstte (backend ile aynı sıra — pinned sonra createdAt DESC)
      queryClient.setQueryData(postQueryKey, (old: any) => {
        if (!old) return old
        const list = old.comments || []
        const pinned = list.filter((c: any) => c.isPinned)
        const rest = list.filter((c: any) => !c.isPinned)
        const nextComments = [...pinned, newComment, ...rest]
        return {
          ...old,
          comments: nextComments,
          _count: {
            ...old._count,
            comments: (old._count?.comments || 0) + 1,
          },
        }
      })
      setCommentText('')
      setReplyingTo(null)
      setIsPostingComment(false)
      // Backend'e kalıcı yazıldı; sunucu verisiyle senkronize et
      queryClient.invalidateQueries({ queryKey: postQueryKey })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['explore'] })
    },
    onError: (error: any) => {
      // ❌ KULLANICIYA HATA BİLDİRİMİ GÖSTER!
      const errorMsg = error?.response?.data?.message || error?.message || 'Bir hata oluştu'
      toast.error(`❌ Yorum eklenemedi: ${errorMsg}`)
      
      setIsPostingComment(false)
    },
  })

  const handleLike = () => {
    if (isReadOnly) {
      toast.error('Beğenmek için giriş yapın')
      router.push('/login')
      return
    }
    likeMutation.mutate({
      currentIsLiked: !!post?.isLiked,
      currentCount: post?._count?.likes ?? 0,
    })
    if (!post?.isLiked) {
      setAnimateLike(true)
      setTimeout(() => setAnimateLike(false), 400)
    }
  }

  const handleSave = () => {
    if (isReadOnly) {
      toast.error('Kaydetmek için giriş yapın')
      router.push('/login')
      return
    }
    console.log('🖱️ [PostModal] BOOKMARK BUTTON TIKLANDI!', {
      postId,
      isSaved: post?.isSaved,
      isPending: saveMutation.isPending,
    });
    saveMutation.mutate(undefined)
  }

  // Küfür kontrolü
  const hasBadWord = containsBadWord(commentText)

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isReadOnly) return
    if (!commentText.trim() || isPostingComment || hasBadWord) return
    
    setIsPostingComment(true)
    commentMutation.mutate({ content: commentText.trim(), parentId: replyingTo || undefined })
  }

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      await api.patch(`/posts/${resolvedPostId}/comments/${commentId}`, { content })
      return { commentId, content }
    },
    onSuccess: ({ commentId, content }) => {
      // ✅ SADECE İLGİLİ COMMENT'İ GÜNCELLE
      // ❌ POST CACHE'İNİ INVALIDATE ETME! (Like/Save kaybolur)
      queryClient.setQueryData(postQueryKey, (old: any) => {
        if (!old) return old
        return {
          ...old, // ✅ Like/Save korunuyor!
          comments: old.comments?.map((c: any) => 
            c.id === commentId ? { ...c, content } : c
          ),
        }
      })
      setEditingCommentId(null)
      setEditedContent('')
    },
  })

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await api.delete(`/posts/${resolvedPostId}/comments/${commentId}`)
      const deletedCount =
        typeof res.data?.deletedCount === 'number' && res.data.deletedCount > 0
          ? res.data.deletedCount
          : 1
      return { commentId, deletedCount }
    },
    onSuccess: ({ commentId, deletedCount }) => {
      // ✅ SADECE SİLİNEN COMMENT'İ KALDIR
      // ❌ POST CACHE'İNİ INVALIDATE ETME! (Like/Save kaybolur)
      queryClient.setQueryData(postQueryKey, (old: any) => {
        if (!old) return old
        return {
          ...old, // ✅ Like/Save korunuyor!
          comments: old.comments?.filter((c: any) => c.id !== commentId),
          _count: {
            ...old._count,
            comments: Math.max(0, (old._count?.comments || 0) - deletedCount),
          },
        }
      })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['explore'] })
      setCommentMenuOpen(null)
    },
    onError: (err: unknown) => {
      const msg =
        isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Yorum silinemedi'
      toast.error(msg)
    },
  })

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditedContent(comment.content)
    setCommentMenuOpen(null)
  }

  const handleSaveEdit = (commentId: string) => {
    if (!editedContent.trim()) return
    updateCommentMutation.mutate({ commentId, content: editedContent.trim() })
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditedContent('')
  }

  const handleDeleteComment = (commentId: string) => {
    setShowDeleteConfirm({ commentId })
    setCommentMenuOpen(null)
  }

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      deleteCommentMutation.mutate(showDeleteConfirm.commentId)
      setShowDeleteConfirm(null)
    }
  }

  // Gönderi beğenisi: REST. Yorum beğenisi: localhost’ta /comments socket + production’da refetchInterval / refetchOnWindowFocus.

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null)
    }
    if (contextMenu) {
      window.addEventListener('click', handleClickOutside)
      return () => window.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu])

  // Handle pin/unpin comment
  const handlePinComment = async (commentId: string, currentPinned: boolean) => {
    if (isReadOnly) return
    try {
      const newPinnedState = !currentPinned
      
      // ✅ Optimistic Update - UI'ı hemen güncelle
      queryClient.setQueryData<Post>(postQueryKey, (oldData) => {
        if (!oldData) return oldData
        
        return {
          ...oldData,
          comments: oldData.comments?.map((comment: any) => {
            // Eğer bu yorum sabitleniyorsa, diğer tüm yorumların isPinned'ini false yap
            if (newPinnedState && comment.id === commentId) {
              return { ...comment, isPinned: true }
            }
            // Eğer bu yorum sabitleniyorsa, diğer yorumların isPinned'ini false yap
            if (newPinnedState && comment.id !== commentId) {
              return { ...comment, isPinned: false }
            }
            // Eğer bu yorum sabitlenmesi kaldırılıyorsa
            if (!newPinnedState && comment.id === commentId) {
              return { ...comment, isPinned: false }
            }
            return comment
          }) || [],
        }
      })
      
      setContextMenu(null)
      
      // API isteği
      await api.post(`/posts/comments/${commentId}/pin`, { pinned: newPinnedState })
      
      // ✅ POST CACHE'İNİ INVALIDATE ETME! (optimistic update yeterli, Like/Save kaybolur)
      
      // Başarı mesajı
      toast.success(newPinnedState ? 'Yorum sabitlendi' : 'Sabitleme kaldırıldı', {
        duration: 2000,
        icon: '📌',
      })
    } catch (error: any) {
      console.error('Error pinning comment:', error)
      
      // ❌ Hata durumunda optimistic update'i geri al (ROLLBACK)
      queryClient.invalidateQueries({ queryKey: postQueryKey }) // ✅ Sadece error durumunda
      
      const errorMessage = error?.response?.data?.message || error?.message || 'Yorum sabitlenemedi'
      toast.error(errorMessage, {
        duration: 3000,
      })
    }
  }

  const publicViewOuter =
    'relative z-[1] mx-auto flex w-full max-w-[1180px] justify-center px-0 sm:px-3'
  const modalViewOuter =
    'fixed inset-0 z-[200] flex items-center justify-center bg-[radial-gradient(circle_at_50%_48%,rgba(255,138,31,0.10),transparent_25%),rgba(0,0,0,0.86)] p-3 backdrop-blur-[10px] sm:p-5'

  const cardShellPublic =
    'w-full max-w-6xl rounded-[2rem] border border-[#ead7c8]/70 bg-[#fffaf5] shadow-[0_32px_100px_rgba(36,24,15,0.14)] dark:border-white/10 dark:bg-[#0b0e14] dark:shadow-[0_40px_120px_rgba(0,0,0,0.50)]'
  const cardShellModal =
    'w-full max-w-6xl rounded-[2rem] border border-white/10 bg-[#0b0e14] shadow-[0_42px_130px_rgba(0,0,0,0.68)] ring-1 ring-[#ff8a1f]/10'

  if (isError) {
    const kind = getApiErrorKind(postQueryError)
    const postLoadErrorMessage =
      kind === 'network' || kind === 'timeout'
        ? 'Şu an sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edip tekrar deneyin.'
        : kind === 'server'
          ? 'Sunucu geçici olarak yanıt vermiyor. Lütfen kısa süre sonra tekrar deneyin.'
          : 'Bu gönderi görüntülenemiyor veya kaldırılmış olabilir.'

    return (
      <div
        className={publicShare ? publicViewOuter : modalViewOuter}
      >
        <div
          className={`${publicShare ? cardShellPublic : 'bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-xl'} text-center`}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-gray-800 dark:text-gray-100 mb-4 px-6 pt-6">
            {postLoadErrorMessage}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mb-6 px-4 py-2 rounded-lg bg-brand-orange text-white text-sm font-medium"
          >
            Kapat
          </button>
        </div>
      </div>
    )
  }

  if (isLoading || !post) {
    return (
      <div
        className={publicShare ? publicViewOuter : modalViewOuter}
      >
        <div
          className={`${publicShare ? cardShellPublic : cardShellModal} flex animate-in fade-in slide-in-from-bottom-4 duration-300`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center w-full h-96 min-h-[320px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
          </div>
        </div>
      </div>
    )
  }

  const mediaArray = post.media && post.media.length > 0 ? post.media : []
  const hasMultipleMedia = mediaArray.length > 1

  const artworkCreatedDateLabel =
    post.type === 'artwork' && post.artworkCreatedDate
      ? formatArtworkCreatedDateDisplay(post.artworkCreatedDate)
      : ''
  const isArtwork = post.type === 'artwork'
  const postKindLabel = isArtwork ? 'Feellink eser vitrini' : 'Feellink gönderi'
  const authorName = post.user.fullName || post.user.username
  const commentCount = post._count?.comments || post.comments?.length || 0

  // Slider settings
  const sliderSettings = {
    dots: hasMultipleMedia,
    infinite: false,
    speed: 300,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: hasMultipleMedia,
    swipe: hasMultipleMedia,
    touchMove: hasMultipleMedia,
    beforeChange: (current: number, next: number) => setCurrentSlide(next),
    className: 'slick-custom',
  }

  return (
    <div
      className={publicShare ? publicViewOuter : modalViewOuter}
    >
      <div
        className={`${
          publicShare ? cardShellPublic : cardShellModal
        } relative flex max-h-[92vh] flex-col overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300 transition-colors md:flex-row md:overflow-hidden`}
        style={{ height: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,138,31,0.12),transparent_28%),radial-gradient(circle_at_85%_100%,rgba(64,90,255,0.10),transparent_30%)]" aria-hidden />

        {/* Left side - Media */}
        <div className="relative flex h-[42vh] min-h-[280px] w-full flex-shrink-0 items-center justify-center overflow-hidden bg-[#05070c] md:h-[720px] md:min-h-[430px] md:w-[63%] [&_.slick-slider]:pointer-events-auto">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,138,31,0.06),transparent_42%),radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.04),transparent_32%)]" aria-hidden />
          <div className="pointer-events-none absolute inset-x-8 top-5 z-10 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70 backdrop-blur-xl">
              <Sparkles className="h-3.5 w-3.5 text-[#ff9a3c]" />
              {postKindLabel}
            </span>
            {hasMultipleMedia && (
              <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-semibold text-white/70 backdrop-blur-xl">
                {currentSlide + 1} / {mediaArray.length}
              </span>
            )}
          </div>
          {mediaArray.length > 0 ? (
            hasMultipleMedia ? (
              /* Çoklu görsel - Slider */
              <Slider ref={sliderRef} {...sliderSettings} className="w-full h-full">
                {mediaArray.map((media, index) => (
                  <div key={media.id || index} className="relative flex h-full w-full items-center justify-center p-4 pointer-events-auto md:p-8">
                    {media.type === 'video' ? (
                      <video
                        src={resolveImageUrl(media.url)}
                        poster={media.thumbnailUrl ? resolveImageUrl(media.thumbnailUrl) : undefined}
                        className="h-full max-h-[82vh] w-full rounded-[1.35rem] object-contain shadow-[0_26px_80px_rgba(0,0,0,0.42)]"
                        controls
                        autoPlay={index === 0}
                        onError={(e) => {
                          console.error('PostModal Video Error:', resolveImageUrl(media.url))
                        }}
                      />
                    ) : (
                      <img
                        src={resolveImageUrl(media.url)}
                        alt={post.caption || `Post ${index + 1}`}
                        className="h-full max-h-[82vh] w-full rounded-[1.35rem] object-contain shadow-[0_26px_80px_rgba(0,0,0,0.42)]"
                        onError={(e) => {
                          console.error('PostModal Media Error:', resolveImageUrl(media.url))
                          ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                        }}
                      />
                    )}
                  </div>
                ))}
              </Slider>
            ) : (
              /* Tek görsel - Slider yok */
              <div className="flex h-full w-full items-center justify-center p-4 md:p-8">
                {mediaArray[0].type === 'video' ? (
                  <video
                    src={resolveImageUrl(mediaArray[0].url)}
                    poster={mediaArray[0].thumbnailUrl ? resolveImageUrl(mediaArray[0].thumbnailUrl) : undefined}
                    className="h-full max-h-full w-full rounded-[1.35rem] object-contain shadow-[0_26px_80px_rgba(0,0,0,0.42)]"
                    controls
                    autoPlay
                    onError={(e) => {
                      console.error('PostModal Video Error:', resolveImageUrl(mediaArray[0].url))
                    }}
                  />
                ) : (
                  <img
                    src={resolveImageUrl(mediaArray[0].url)}
                    alt={post.caption || 'Post'}
                    className="h-full max-h-full w-full rounded-[1.35rem] object-contain shadow-[0_26px_80px_rgba(0,0,0,0.42)]"
                    onError={(e) => {
                      console.error('PostModal Media Error:', resolveImageUrl(mediaArray[0].url))
                      ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                    }}
                  />
                )}
              </div>
            )
          ) : (
            <div className="relative flex flex-col items-center gap-3 text-white/60">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                <ImageIcon className="h-7 w-7 text-[#ff9a3c]" />
              </span>
              <span className="text-sm font-medium">Medya bulunamadı</span>
            </div>
          )}
          
          {/* Thumbnail önizlemeleri - Çoklu görsel varsa göster */}
          {hasMultipleMedia && (
            <div className="absolute bottom-5 left-1/2 z-20 flex max-w-[84%] -translate-x-1/2 gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/25 p-2 backdrop-blur-xl">
              {mediaArray.map((media, index) => (
                <button
                  key={media.id || index}
                  type="button"
                  onClick={() => {
                    if (sliderRef.current) {
                      sliderRef.current.slickGoTo(index)
                    }
                  }}
                  className={`h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border transition-all pointer-events-auto ${
                    currentSlide === index
                      ? 'border-[#ff8a1f] opacity-100 shadow-[0_0_18px_rgba(255,138,31,0.34)]'
                      : 'border-white/20 opacity-60 hover:border-white/50 hover:opacity-100'
                  }`}
                >
                  {media.type === 'video' ? (
                    media.thumbnailUrl ? (
                      <img
                        src={resolveImageUrl(media.thumbnailUrl)}
                        alt={`Video kapağı ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={resolveImageUrl(media.url)}
                        className="w-full h-full object-cover"
                        muted
                      />
                    )
                  ) : (
                    <img
                      src={resolveImageUrl(media.url)}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right side - Details */}
        <div className="relative flex h-[440px] max-h-[60vh] flex-col border-t border-white/10 bg-[linear-gradient(180deg,rgba(20,25,35,0.98),rgba(10,13,20,0.98))] md:h-[720px] md:max-h-[90vh] md:w-[37%] md:border-l md:border-t-0">
          {/* Header */}
          <div className="flex flex-shrink-0 items-start gap-3 border-b border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
            <div
              className="flex h-11 w-11 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_12px_30px_rgba(0,0,0,0.26)] ring-2 ring-[#ff8a1f]/20"
              onClick={() => {
                if (isReadOnly) {
                  promptGuestLogin('Profili görmek için giriş yapın.')
                  return
                }
                onClose()
                router.push(`/profile/${post.user.username}`)
              }}
            >
              {post.user.avatar ? (
                <img
                  src={resolveImageUrl(post.user.avatar)}
                  alt={post.user.username}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    console.error('PostModal Post User Avatar Error:', resolveImageUrl(post.user.avatar))
                    ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                  }}
                />
              ) : (
                <span className="text-sm font-semibold text-white/75">
                  {post.user.username[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold text-white">
                      {authorName}
                    </span>
                    <FeellinkRoleBadge roles={(post.user as any).roles} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium text-white/40">
                    <span>@{post.user.username}</span>
                    <span className="h-1 w-1 rounded-full bg-[#ff8a1f]/70" />
                    <span>{new Date(post.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isReadOnly && user?.id !== post.user.id && (
                    <button
                      type="button"
                      onClick={() => setShowReportModal({ contentType: 'post', contentId: post.id })}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/60 transition hover:border-[#ff8a1f]/30 hover:bg-[#ff8a1f]/10 hover:text-[#ff9a3c]"
                      title="Raporla"
                    >
                      <Flag className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/60 transition hover:bg-white/[0.10] hover:text-white"
                    aria-label="Kapat"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              {post.caption && (
                <p className="mt-3 whitespace-pre-wrap break-words rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-sm leading-relaxed text-white/80">
                  {post.caption}
                </p>
              )}
              {artworkCreatedDateLabel ? (
                <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#ff8a1f]/20 bg-[#ff8a1f]/10 px-3 py-1.5 text-xs font-medium text-[#ffb066]">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {artworkCreatedDateLabel}
                </p>
              ) : null}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0d1119]/[0.92] px-4 py-3">
            <div className="flex min-w-0 items-center gap-2 text-white/70">
              <button
                type="button"
                onClick={
                  isReadOnly
                    ? () => promptGuestLogin('Beğenmek için giriş yapın.')
                    : handleLike
                }
                disabled={likeMutation.isPending && !isReadOnly}
                className={`group relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-full border px-3 text-sm font-semibold transition-all ${
                  post.isLiked
                    ? 'border-[#ff8a1f]/[0.55] bg-[#ff8a1f]/[0.16] text-[#ffb066] shadow-[0_0_22px_rgba(255,138,31,0.16)]'
                    : 'border-white/10 bg-white/[0.045] text-white/70 hover:border-[#ff8a1f]/[0.35] hover:bg-[#ff8a1f]/10 hover:text-[#ffb066]'
                } ${isReadOnly ? 'opacity-70' : ''}`}
              >
                <span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.16),transparent_38%)]" aria-hidden />
                <Heart
                  size={18}
                  className={`transition-all duration-300 ${
                    animateLike ? 'scale-125 rotate-[-8deg]' : 'scale-100'
                  } ${
                    post.isLiked
                      ? 'fill-[#ff8a1f] text-[#ff8a1f]'
                      : 'text-current'
                  }`}
                />
                {(animateLike || pingAnimating) && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-[#ff8a1f]/25 animate-ping" />
                    <span className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.9),rgba(255,138,31,0.32)_30%,transparent_65%)] opacity-80" />
                  </>
                )}
                <span className="relative">{post._count.likes || 0}</span>
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 text-sm font-semibold text-white/70 transition hover:border-[#ff8a1f]/[0.35] hover:bg-[#ff8a1f]/10 hover:text-[#ffb066]"
                onClick={
                  isReadOnly
                    ? () => promptGuestLogin('Yorum yapmak için giriş yapın.')
                    : undefined
                }
              >
                <MessageCircle size={18} />
                <span>{commentCount}</span>
              </button>
              {!isReadOnly && (
                <SharePostTrigger
                  postId={post.id}
                  shareTitle={post.title?.trim() || undefined}
                  shareCaption={post.caption || undefined}
                  stopPropagation={false}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-white/70 transition hover:border-[#ff8a1f]/[0.35] hover:bg-[#ff8a1f]/10 hover:text-[#ffb066] [&_svg]:text-current"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={
                  isReadOnly
                    ? () => promptGuestLogin('Kaydetmek için giriş yapın.')
                    : handleSave
                }
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                  post.isSaved
                    ? 'border-[#ff8a1f]/50 bg-[#ff8a1f]/[0.15] text-[#ffb066]'
                    : 'border-white/10 bg-white/[0.045] text-white/70 hover:border-[#ff8a1f]/[0.35] hover:bg-[#ff8a1f]/10 hover:text-[#ffb066]'
                } ${isReadOnly ? 'opacity-70' : ''}`}
                title={post.isSaved ? 'Kaydedildi' : 'Kaydet'}
              >
                <Bookmark
                  size={18}
                  className={`transition-all duration-200 ${
                    post.isSaved
                      ? 'fill-current scale-110'
                      : 'scale-100'
                  }`}
                />
              </button>
              {!isReadOnly && canManageCollections && (
                <button
                  type="button"
                  onClick={() => setShowAddToCollectionModal(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-white/70 transition hover:border-[#ff8a1f]/[0.35] hover:bg-[#ff8a1f]/10 hover:text-[#ffb066]"
                  title="Koleksiyona Ekle"
                >
                  <FolderPlus size={18} />
                </button>
              )}
            </div>
          </div>


          {/* Comments Section */}
          <div className="comments-scroll min-h-0 flex-1 space-y-3 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))] p-4 pr-2">
            {/* ✅ SABİTLENEN YORUM ALANI - Özel Banner */}
            {(() => {
              const pinnedComment = post.comments?.find((c: any) => c.isPinned);
              if (!pinnedComment) return null;
              
              const isHighlighted = highlightCommentId === pinnedComment.id
              const isPostOwnerBanner = user?.id === post.user.id
              const isPinnedCommentOwner =
                pinnedComment.userId === user?.id || pinnedComment.user?.id === user?.id
              const showPinnedActions =
                !isReadOnly && (isPostOwnerBanner || isPinnedCommentOwner)
              const showDeleteOnBanner =
                isPinnedCommentOwner || (isPostOwnerBanner && !isPinnedCommentOwner)
              
              return (
                <div 
                  id={`comment-${pinnedComment.id}`}
                  className={`mb-4 flex items-start gap-3 rounded-2xl border border-[#ff8a1f]/30 bg-[#ff8a1f]/10 px-4 py-3 shadow-[0_14px_34px_rgba(255,138,31,0.08)] ${isHighlighted ? 'ring-2 ring-brand-orange ring-opacity-50' : ''}`}
                >
                  <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-[#ff8a1f]/25 bg-[#ff8a1f]/[0.12]">
                    <Pin className="h-4 w-4 fill-[#ff8a1f]/80 text-[#ff8a1f]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-[#ffb066]">
                        Sabitlenen yorum
                      </span>
                      <span className="text-[10px] text-white/40">
                        @{pinnedComment.user.username}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-white/80">
                      {pinnedComment.content}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0 items-end pt-0.5">
                    <CommentLikeButton
                      commentId={pinnedComment.id}
                      initialLiked={pinnedComment.isLikedByCurrentUser || false}
                      initialCount={pinnedComment.likesCount || 0}
                      type="post"
                      postId={resolvedPostId}
                      cacheKey={postQueryKey}
                      disabled={isReadOnly}
                    />
                  {showPinnedActions && (
                    <>
                      {isPostOwnerBanner && (
                        <button
                          type="button"
                          onClick={() => handlePinComment(pinnedComment.id, true)}
                      className="whitespace-nowrap text-xs font-medium text-[#ffb066] hover:underline"
                        >
                          Sabitlemeyi kaldır
                        </button>
                      )}
                      {showDeleteOnBanner && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(pinnedComment.id)}
                      className="whitespace-nowrap text-xs font-medium text-red-300 hover:text-red-200"
                        >
                          {isPinnedCommentOwner ? 'Sil' : 'Yorumu Sil'}
                        </button>
                      )}
                    </>
                  )}
                  </div>
                </div>
              );
            })()}

            {/* Comments */}
            {post.comments && post.comments.length > 0 ? (
              <>
                {(() => {
                  // Sabitlenen yorumlar hariç, sadece normal yorumları göster
                  const normalComments = post.comments.filter((c: any) => !c.isPinned);
                  
                  return normalComments.map((comment: any) => {
                    const isCommentOwner = comment.userId === user?.id || comment.user.id === user?.id
                    const isPostOwner = post.user.id === user?.id
                    const isEdited = comment.updatedAt && new Date(comment.updatedAt).getTime() > new Date(comment.createdAt).getTime()
                    const isEditing = editingCommentId === comment.id
                    const isHighlighted = highlightCommentId === comment.id

                    return (
                      <div 
                        key={comment.id}
                        id={`comment-${comment.id}`}
                        className={isHighlighted ? 'ring-2 ring-brand-orange ring-opacity-50 rounded-2xl p-1 -m-1 transition-all' : ''}
                      >
                      {/* Ana yorum */}
                      <div
                        className="group relative flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 transition hover:border-white/[0.14] hover:bg-white/[0.055]"
                        onContextMenu={(e) => {
                          e.preventDefault()
                          // Sadece gönderi sahibi pin yapabilir
                          if (!isReadOnly && user?.id === post.user.id) {
                            setContextMenu({
                              commentId: comment.id,
                              x: e.pageX,
                              y: e.pageY,
                            })
                          }
                        }}
                      >
                        {/* Sol taraf avatar */}
                        <Link
                          href={
                            isReadOnly
                              ? loginHrefWithFrom
                              : `/profile/${comment.user.username}`
                          }
                          onClick={
                            isReadOnly
                              ? () => toast('Profili görmek için giriş yapın.', { duration: 2800 })
                              : undefined
                          }
                          className="flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] transition hover:opacity-80"
                        >
                          {comment.user.avatar ? (
                            <img
                              src={resolveImageUrl(comment.user.avatar)}
                              alt={comment.user.username}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                              }}
                            />
                          ) : (
                            <span className="text-xs font-semibold text-white/60">
                              {comment.user.username[0].toUpperCase()}
                            </span>
                          )}
                        </Link>
                        
                        <div className="flex-1 min-w-0">
                          {/* Kullanıcı Bilgisi */}
                          <div className="flex items-center gap-2 mb-2">
                            <Link
                              href={
                                isReadOnly
                                  ? loginHrefWithFrom
                                  : `/profile/${comment.user.username}`
                              }
                              onClick={
                                isReadOnly
                                  ? () => toast('Profili görmek için giriş yapın.', { duration: 2800 })
                                  : undefined
                              }
                              className="inline-block cursor-pointer text-sm font-semibold text-white transition hover:opacity-80"
                            >
                              {comment.user.username}
                            </Link>
                            <FeellinkRoleBadge
                              roles={(comment.user as any).roles}
                              className="!ml-0 !text-[10px] !px-1.5 !py-0"
                            />
                          </div>
                          
                          {/* Yorum metni - Düzenleme modu */}
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editedContent}
                                    onChange={(e) => setEditedContent(e.target.value)}
                                    className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-orange/50"
                                    rows={3}
                                    autoFocus
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleSaveEdit(comment.id)}
                                      disabled={updateCommentMutation.isPending || !editedContent.trim()}
                                      className="rounded-full bg-brand-orange px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-orange/90 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      Kaydet
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      disabled={updateCommentMutation.isPending}
                                      className="px-3 py-1 text-xs font-medium text-white/40 transition-colors hover:text-white/75"
                                    >
                                      İptal
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <span className="block text-sm leading-relaxed text-white/80">
                                  {comment.content}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Alt satır - tarih, (düzenlendi) ve yanıtla */}
                          {!isEditing && (
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-xs text-white/40">
                                {new Date(comment.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                {isEdited && (
                                  <span className="ml-1 opacity-60">(düzenlendi)</span>
                                )}
                              </p>
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingTo(comment.id)
                                    setTimeout(() => {
                                      const input = document.querySelector('input[placeholder*="Yorum"]') as HTMLInputElement
                                      input?.focus()
                                    }, 100)
                                  }}
                                  className="text-xs font-medium text-[#ffb066] transition-colors hover:underline"
                                >
                                  Yanıtla
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Kalp + 3 Nokta Menü - Sağ üst köşede, yan yana */}
                        {!isEditing && (
                          <div className="absolute right-3 top-3 z-10 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            {/* Beğeni butonu */}
                            <div className="flex-shrink-0">
                              <CommentLikeButton
                                commentId={comment.id}
                                initialLiked={comment.isLikedByCurrentUser || false}
                                initialCount={comment.likesCount || 0}
                                type="post"
                                postId={resolvedPostId}
                                cacheKey={postQueryKey}
                                disabled={isReadOnly}
                              />
                            </div>
                            
                            {/* 3 Nokta Menü - Sadece yetkisi olanlara görünür */}
                            {!isReadOnly && (isCommentOwner || isPostOwner) && (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setCommentMenuOpen(commentMenuOpen === comment.id ? null : comment.id)
                                  }}
                                  className="rounded-full border border-white/10 bg-black/25 p-1.5 text-white/60 transition-all hover:bg-white/10 hover:text-white"
                                >
                                  <MoreVertical size={16} />
                                </button>

                                {/* Menü Dropdown */}
                                {commentMenuOpen === comment.id && (
                                  <div className="absolute right-0 top-8 z-50 min-w-[160px] animate-in rounded-2xl border border-white/10 bg-[#121722] shadow-xl duration-150 fade-in zoom-in-95">
                                    {isCommentOwner && (
                                      <>
                                        <button
                                          onClick={() => handleEditComment(comment)}
                                          className="w-full rounded-t-2xl px-4 py-2.5 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06]"
                                        >
                                          Düzenle
                                        </button>
                                        <button
                                          onClick={() => handleDeleteComment(comment.id)}
                                          className="w-full px-4 py-2.5 text-left text-sm text-red-300 transition-colors hover:bg-red-500/10"
                                        >
                                          Sil
                                        </button>
                                      </>
                                    )}
                                    {!isCommentOwner && isPostOwner && (
                                      <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        className="w-full px-4 py-2.5 text-left text-sm text-red-300 transition-colors hover:bg-red-500/10"
                                      >
                                        Yorumu Sil
                                      </button>
                                    )}
                                    {!isCommentOwner && (
                                      <button
                                        onClick={() => {
                                          setShowReportModal({ contentType: 'comment', contentId: comment.id })
                                          setCommentMenuOpen(null)
                                        }}
                                        className="w-full rounded-b-2xl px-4 py-2.5 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06]"
                                      >
                                        🚩 Raporla
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Raporla butonu - Yorum sahibi değilse */}
                            {!isReadOnly && !isCommentOwner && !isPostOwner && (
                              <button
                                type="button"
                                onClick={() => setShowReportModal({ contentType: 'comment', contentId: comment.id })}
                                className="rounded-full border border-white/10 bg-black/25 p-1.5 text-white/60 transition-all hover:bg-white/10 hover:text-white"
                                title="Raporla"
                              >
                                <Flag className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      
                      {/* Context Menu - Sadece gönderi sahibine göster */}
                      {contextMenu?.commentId === comment.id && !isReadOnly && user?.id === post.user.id && contextMenu && (
                        <div
                          className="fixed z-50 animate-in rounded-2xl border border-white/10 bg-[#121722]/95 text-sm text-white/80 shadow-[0_24px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl duration-150 fade-in zoom-in-95"
                          style={{
                            top: `${contextMenu.y - 80}px`,
                            left: `${contextMenu.x - 180}px`,
                            width: '180px',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handlePinComment(comment.id, comment.isPinned || false)}
                            className="flex w-full items-center gap-2 rounded-t-2xl px-4 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
                          >
                            <Pin size={14} className={comment.isPinned ? 'fill-[#ff8a1f] text-[#ff8a1f]' : 'text-white/40'} />
                            <span className={comment.isPinned ? 'text-[#ffb066]' : ''}>
                              {comment.isPinned ? 'Sabitlemeyi Kaldır' : 'Yorumu Sabitle'}
                            </span>
                          </button>
                          <button
                            onClick={() => setContextMenu(null)}
                            className="w-full rounded-b-2xl px-4 py-2.5 text-left text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80"
                          >
                            İptal
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Emoji Tepkileri kaldırıldı */}
                    {/* <div className="ml-11 mt-1">
                      <CommentReactions commentId={comment.id} postId={resolvedPostId} />
                    </div> */}

                    {/* Yanıtlar (Replies) */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-10 mt-2 space-y-2 border-l border-white/[0.08] pl-3">
                        {comment.replies.map((reply: any) => {
                          const isReplyHighlighted = highlightCommentId === reply.id
                          return (
                            <div 
                              key={reply.id}
                              id={`comment-${reply.id}`}
                              className={isReplyHighlighted ? 'ring-2 ring-brand-orange ring-opacity-50 rounded-lg p-2 -m-2 transition-all' : ''}
                            >
                            <div className="flex gap-2 rounded-2xl border border-white/[0.07] bg-black/[0.15] px-3 py-2">
                              <CornerUpRight size={12} className="mt-1 flex-shrink-0 text-[#ffb066]/70" />
                              <Link
                                href={
                                  isReadOnly
                                    ? loginHrefWithFrom
                                    : `/profile/${reply.user.username}`
                                }
                                onClick={
                                  isReadOnly
                                    ? () => toast('Profili görmek için giriş yapın.', { duration: 2800 })
                                    : undefined
                                }
                                className="flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.055] transition hover:opacity-80"
                              >
                                {reply.user.avatar ? (
                                  <img
                                    src={resolveImageUrl(reply.user.avatar)}
                                    alt={reply.user.username}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      console.error('PostModal Reply Avatar Error:', resolveImageUrl(reply.user.avatar))
                                      ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                                    }}
                                  />
                                ) : (
                                  <span className="text-xs font-semibold text-white/60">
                                    {reply.user.username[0].toUpperCase()}
                                  </span>
                                )}
                              </Link>
                              <div className="flex-1 min-w-0">
                                <p className="flex items-center gap-1 text-sm leading-relaxed text-white/80">
                                  <Link
                                    href={
                                      isReadOnly
                                        ? loginHrefWithFrom
                                        : `/profile/${reply.user.username}`
                                    }
                                    onClick={
                                      isReadOnly
                                        ? () => toast('Profili görmek için giriş yapın.', { duration: 2800 })
                                        : undefined
                                    }
                                    className="cursor-pointer font-semibold text-white transition hover:opacity-80"
                                  >
                                    {reply.user.username}
                                  </Link>
                                  <FeellinkRoleBadge
                                    roles={(reply.user as any).roles}
                                    className="!ml-0 !text-[10px] !px-1.5 !py-0"
                                  />
                                  <span className="text-white/70">{reply.content}</span>
                                </p>
                                <p className="mt-0.5 text-xs text-white/40">
                                  {new Date(reply.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              {/* Beğeni butonu - her zaman görünür */}
                              <div className="flex-shrink-0">
                                <CommentLikeButton
                                  commentId={reply.id}
                                  initialLiked={reply.isLikedByCurrentUser || false}
                                  initialCount={reply.likesCount || 0}
                                  type="post"
                                  postId={resolvedPostId}
                                  cacheKey={postQueryKey}
                                  disabled={isReadOnly}
                                />
                              </div>
                            </div>

                            {/* Yanıt için Emoji Tepkileri kaldırıldı */}
                            {/* <div className="ml-9 mt-1">
                              <CommentReactions commentId={reply.id} postId={resolvedPostId} />
                            </div> */}
                          </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                    )
                  })
                })()}
              </>
            ) : (
              <div className="mt-10 flex flex-col items-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-[#ffb066] shadow-[0_14px_35px_rgba(0,0,0,0.18)]">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-white/60">Henüz yorum yok</p>
                <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-white/40">
                  İlk yorum bu vitrinin etrafında küçük bir sohbet başlatabilir.
                </p>
              </div>
            )}
          </div>

          {/* Comment Input */}
          <div className="flex-shrink-0 border-t border-white/10 bg-[#0b0f17]/[0.96]">
            {isReadOnly ? (
              <div className="px-4 py-4 text-center">
                <p className="mb-2.5 text-xs text-white/40">
                  Beğenmek veya yorum yapmak için Feellink&apos;te oturum açın.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                  <Link
                    href={loginHrefWithFrom}
                    className="rounded-full bg-[#ff8a1f] px-4 py-2 font-semibold text-white shadow-[0_10px_24px_rgba(255,138,31,0.25)] transition hover:bg-[#ff9a3c]"
                  >
                    Giriş yap
                  </Link>
                  <Link
                    href={`/register?from=${encodeURIComponent(guestReturnPath)}`}
                    className="rounded-full border border-white/10 px-4 py-2 font-semibold text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    Hesap oluştur
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {replyingTo && (
                  <div className="flex items-center gap-2 px-4 pb-1 pt-3">
                    <span className="rounded-full border border-[#ff8a1f]/25 bg-[#ff8a1f]/10 px-3 py-1 text-xs font-medium text-[#ffb066]">
                      Yanıt veriliyor...
                    </span>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <form onSubmit={handleComment} className="px-4 py-3">
                  <div className="flex items-center rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-[#ff8a1f]/40 focus-within:bg-white/[0.075]">
                    <MentionInput
                      value={commentText}
                      setValue={setCommentText}
                      placeholder={replyingTo ? 'Yanıt yaz...' : 'Yorum ekle...'}
                      disabled={isPostingComment}
                      className="flex-1 bg-transparent text-sm text-white/80 outline-none placeholder:text-white/40"
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim() || isPostingComment || hasBadWord}
                      className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#ff8a1f] text-white shadow-[0_10px_22px_rgba(255,138,31,0.24)] transition-all hover:bg-[#ff9a3c] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPostingComment ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      ) : (
                        <Send size={16} />
                      )}
                    </button>
                  </div>
                  {hasBadWord && (
                    <p className="mt-2 px-3 text-xs text-[#ffb066]">
                      Bu yorum Feellink topluluk kurallarına uygun değil.
                    </p>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add to Collection Modal */}
      {showAddToCollectionModal && (
        <AddToCollectionModal
          postId={resolvedPostId}
          open={showAddToCollectionModal}
          onClose={() => setShowAddToCollectionModal(false)}
        />
      )}

      {/* Delete Comment Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
        >
          <div
            className="w-[360px] max-w-[90vw] animate-in rounded-3xl border border-white/10 bg-[#111722]/95 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.5)] duration-200 fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-300">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 className="mb-2 text-base font-semibold text-white">
              Yorumu sil?
            </h3>

            <p className="mb-6 text-sm leading-relaxed text-white/50">
              Bu yorumu sildiğinizde geri alınamaz.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                İptal
              </button>

              <button
                onClick={confirmDelete}
                disabled={deleteCommentMutation.isPending}
                className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteCommentMutation.isPending ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          isOpen={!!showReportModal}
          onClose={() => setShowReportModal(null)}
          contentType={showReportModal.contentType}
          contentId={showReportModal.contentId}
        />
      )}
    </div>
  )
}
