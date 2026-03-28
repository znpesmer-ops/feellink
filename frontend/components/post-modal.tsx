'use client'

import { useEffect, useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import api, { getApiErrorKind } from '@/lib/api'
import { isAxiosError } from 'axios'
import { useAuthStore } from '@/lib/store'
import { Heart, MessageCircle, Bookmark, X, Send, Trash2, CornerUpRight, Pin, PinIcon, FolderPlus, MoreVertical } from 'lucide-react'
import MentionInput from './MentionInput'
import { useRouter, usePathname } from 'next/navigation'
// ⚠️ Socket.IO devre dışı - Vercel serverless'ta çalışmaz
import { FeellinkRoleBadge } from './FeellinkRoleBadge'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { containsBadWord } from '@/lib/utils/containsBadWord'
import Slider from 'react-slick'
import toast from 'react-hot-toast'
import { AddToCollectionModal } from './collections/AddToCollectionModal'
import { ReportModal } from './ReportModal'

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
  }>
  comments: Comment[]
  _count: {
    likes: number
    comments: number
  }
  [POST_QUERY_PUBLIC_FALLBACK]?: boolean
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
  const postQueryKey = ['post', resolvedPostId, publicShare ? 'public' : 'auth'] as const
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
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status != null) return false
      return failureCount < 1
    },
  })

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
      await api.delete(`/posts/${resolvedPostId}/comments/${commentId}`)
      return commentId
    },
    onSuccess: (commentId) => {
      // ✅ SADECE SİLİNEN COMMENT'İ KALDIR
      // ❌ POST CACHE'İNİ INVALIDATE ETME! (Like/Save kaybolur)
      queryClient.setQueryData(postQueryKey, (old: any) => {
        if (!old) return old
        return {
          ...old, // ✅ Like/Save korunuyor!
          comments: old.comments?.filter((c: any) => c.id !== commentId),
          _count: {
            ...old._count,
            comments: Math.max(0, (old._count?.comments || 0) - 1),
          },
        }
      })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['explore'] })
      setCommentMenuOpen(null)
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

  // ⚠️ Socket.IO devre dışı - Vercel serverless'ta çalışmaz
  // Like/Comment işlemleri REST API üzerinden çalışıyor
  // Query invalidation ile state güncelleniyor

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
    'relative z-[1] w-full max-w-[935px] mx-auto flex justify-center px-0 sm:px-2'
  const modalViewOuter =
    'fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[200] p-4'

  const cardShellPublic =
    'rounded-sm border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-gray-900 shadow-sm w-full max-w-5xl overflow-hidden'
  const cardShellModal =
    'rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900'

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
        onClick={publicShare ? undefined : onClose}
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
        onClick={publicShare ? undefined : onClose}
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
      onClick={publicShare ? undefined : onClose}
    >
      <div
        className={`${
          publicShare ? cardShellPublic : cardShellModal
        } max-h-[90vh] overflow-y-auto flex flex-col md:flex-row animate-in fade-in slide-in-from-bottom-4 duration-300 transition-colors`}
        style={{ height: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left side - Media - Sabit yükseklik */}
        <div className="md:w-3/5 bg-black dark:bg-gray-950 flex items-center justify-center h-[520px] md:h-[600px] min-h-full relative w-full overflow-hidden [&_.slick-slider]:pointer-events-auto flex-shrink-0">
          {mediaArray.length > 0 ? (
            hasMultipleMedia ? (
              /* Çoklu görsel - Slider */
              <Slider ref={sliderRef} {...sliderSettings} className="w-full h-full">
                {mediaArray.map((media, index) => (
                  <div key={media.id || index} className="relative w-full h-full flex items-center justify-center pointer-events-auto">
                    {media.type === 'video' ? (
                      <video
                        src={resolveImageUrl(media.url)}
                        className="w-full h-full max-h-[90vh] object-contain"
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
                        className="w-full h-full max-h-[90vh] object-contain"
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
              <div className="w-full h-full flex items-center justify-center">
                {mediaArray[0].type === 'video' ? (
                  <video
                    src={resolveImageUrl(mediaArray[0].url)}
                    className="w-full h-full object-contain max-h-full"
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
                    className="w-full h-full object-contain max-h-full"
                    onError={(e) => {
                      console.error('PostModal Media Error:', resolveImageUrl(mediaArray[0].url))
                      ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                    }}
                  />
                )}
              </div>
            )
          ) : (
            <div className="text-gray-400">No media available</div>
          )}
          
          {/* Thumbnail önizlemeleri - Çoklu görsel varsa göster */}
          {hasMultipleMedia && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 justify-center overflow-x-auto pb-2 z-20">
              {mediaArray.map((media, index) => (
                <button
                  key={media.id || index}
                  type="button"
                  onClick={() => {
                    if (sliderRef.current) {
                      sliderRef.current.slickGoTo(index)
                    }
                  }}
                  className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors pointer-events-auto ${
                    currentSlide === index
                      ? 'border-white ring-2 ring-brand-orange/50'
                      : 'border-white/50 hover:border-white/80 opacity-70 hover:opacity-100'
                  }`}
                >
                  {media.type === 'video' ? (
                    <video
                      src={resolveImageUrl(media.url)}
                      className="w-full h-full object-cover"
                      muted
                    />
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
        <div className="md:w-2/5 flex flex-col h-[520px] md:h-[600px] max-h-[90vh]">
          {/* Header - Instagram Style: User + Caption */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-start gap-3 flex-shrink-0">
            <div
              className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer"
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
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('PostModal Post User Avatar Error:', resolveImageUrl(post.user.avatar))
                    ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                  }}
                />
              ) : (
                <span className="text-gray-500 dark:text-gray-300 text-sm">
                  {post.user.username[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-black dark:text-white font-semibold text-sm">
                    {post.user.fullName || post.user.username}
                  </span>
                  <FeellinkRoleBadge roles={(post.user as any).roles} />
                </div>
                <div className="flex items-center gap-2">
                  {!isReadOnly && user?.id !== post.user.id && (
                    <button
                      onClick={() => setShowReportModal({ contentType: 'post', contentId: post.id })}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                      title="Raporla"
                    >
                      <span className="text-sm">🚩</span>
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  >
                    <X size={20} className="text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
              {post.caption && (
                <p className="text-black dark:text-white text-sm mt-[2px] leading-snug whitespace-pre-wrap break-words">
                  {post.caption}
                </p>
              )}
              {artworkCreatedDateLabel ? (
                <p className="text-gray-600 dark:text-gray-400 text-xs mt-2 leading-snug">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Eserin Oluşturulduğu Tarih:{' '}
                  </span>
                  {artworkCreatedDateLabel}
                </p>
              ) : null}
            </div>
          </div>

          {/* Action buttons - Instagram Style: Like count next to icon */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4 text-gray-700 dark:text-gray-400">
              <button
                type="button"
                onClick={
                  isReadOnly
                    ? () => promptGuestLogin('Beğenmek için giriş yapın.')
                    : handleLike
                }
                disabled={likeMutation.isPending && !isReadOnly}
                className={`relative flex items-center gap-1 hover:text-brand-orange transition-colors ${isReadOnly ? 'opacity-70' : ''}`}
              >
                <Heart
                  size={24}
                  className={`transition-all duration-300 ${
                    animateLike ? 'scale-125' : 'scale-100'
                  } ${
                    post.isLiked
                      ? 'fill-brand-orange text-brand-orange'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                />
                {(animateLike || pingAnimating) && (
                  <span className="absolute inset-0 animate-ping bg-brand-orange/40 rounded-full"></span>
                )}
                {post._count.likes > 0 && (
                  <span className="text-sm font-medium">{post._count.likes}</span>
                )}
              </button>
              <button
                type="button"
                className="hover:text-brand-orange transition-colors"
                onClick={
                  isReadOnly
                    ? () => promptGuestLogin('Yorum yapmak için giriş yapın.')
                    : undefined
                }
              >
                <MessageCircle size={24} className="text-gray-700 dark:text-gray-300" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={
                  isReadOnly
                    ? () => promptGuestLogin('Kaydetmek için giriş yapın.')
                    : handleSave
                }
                className={`hover:text-brand-orange transition-colors ${isReadOnly ? 'opacity-70' : ''}`}
              >
                <Bookmark
                  size={24}
                  className={`transition-all duration-200 ${
                    post.isSaved
                      ? 'fill-brand-orange text-brand-orange scale-110'
                      : 'text-gray-700 dark:text-gray-300 scale-100'
                  }`}
                />
              </button>
              {!isReadOnly && canManageCollections && (
                <button
                  type="button"
                  onClick={() => setShowAddToCollectionModal(true)}
                  className="hover:text-brand-orange transition-colors"
                  title="Koleksiyona Ekle"
                >
                  <FolderPlus size={24} className="text-gray-700 dark:text-gray-300" />
                </button>
              )}
            </div>
          </div>


          {/* Comments Section - Instagram Style - Scroll */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 comments-scroll pr-2 min-h-0">
            {/* ✅ SABİTLENEN YORUM ALANI - Özel Banner */}
            {(() => {
              const pinnedComment = post.comments?.find((c: any) => c.isPinned);
              if (!pinnedComment) return null;
              
              const isHighlighted = highlightCommentId === pinnedComment.id
              
              return (
                <div 
                  id={`comment-${pinnedComment.id}`}
                  className={`flex items-start gap-2 mb-4 px-4 py-3 rounded-xl bg-brand-orange/5 dark:bg-brand-orange/10 border border-brand-orange/30 dark:border-brand-orange/40 ${isHighlighted ? 'ring-2 ring-brand-orange ring-opacity-50' : ''}`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <Pin className="w-4 h-4 text-brand-orange fill-brand-orange/80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-brand-orange">
                        Sabitlenen yorum
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        @{pinnedComment.user.username}
                      </span>
                    </div>
                    <p className="text-sm text-black dark:text-white mt-1 line-clamp-2 leading-relaxed">
                      {pinnedComment.content}
                    </p>
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
                        className={isHighlighted ? 'ring-2 ring-brand-orange ring-opacity-50 rounded-lg p-2 -m-2 transition-all' : ''}
                      >
                      {/* Ana yorum */}
                      <div
                        className="flex gap-2 items-start group relative"
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
                          className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0 hover:opacity-80 transition cursor-pointer"
                        >
                          {comment.user.avatar ? (
                            <img
                              src={resolveImageUrl(comment.user.avatar)}
                              alt={comment.user.username}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                              }}
                            />
                          ) : (
                            <span className="text-gray-500 dark:text-gray-300 text-xs">
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
                              className="text-sm text-black dark:text-white font-semibold hover:opacity-80 transition cursor-pointer inline-block"
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
                                    className="w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-black dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                                    rows={3}
                                    autoFocus
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleSaveEdit(comment.id)}
                                      disabled={updateCommentMutation.isPending || !editedContent.trim()}
                                      className="px-3 py-1 text-xs font-medium bg-brand-orange text-white rounded-lg hover:bg-brand-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      Kaydet
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      disabled={updateCommentMutation.isPending}
                                      className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                                    >
                                      İptal
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-sm text-black dark:text-white block leading-relaxed">
                                  {comment.content}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Alt satır - tarih, (düzenlendi) ve yanıtla */}
                          {!isEditing && (
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-xs text-[#444] dark:text-gray-400">
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
                                  className="text-xs text-brand-orange hover:underline font-medium transition-colors"
                                >
                                  Yanıtla
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Kalp + 3 Nokta Menü - Sağ üst köşede, yan yana */}
                        {!isEditing && (
                          <div className="absolute top-3 right-3 flex items-center gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Beğeni butonu */}
                            <div className="flex-shrink-0">
                              <CommentLikeButton
                                commentId={comment.id}
                                initialLiked={comment.isLikedByCurrentUser || false}
                                initialCount={comment.likesCount || 0}
                                type="post"
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
                                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                                >
                                  <MoreVertical size={16} className="text-gray-600 dark:text-gray-400" />
                                </button>

                                {/* Menü Dropdown */}
                                {commentMenuOpen === comment.id && (
                                  <div className="absolute top-8 right-0 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 min-w-[160px] animate-in fade-in zoom-in-95 duration-150">
                                    {isCommentOwner && (
                                      <>
                                        <button
                                          onClick={() => handleEditComment(comment)}
                                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-t-lg transition-colors"
                                        >
                                          Düzenle
                                        </button>
                                        <button
                                          onClick={() => handleDeleteComment(comment.id)}
                                          className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                          Sil
                                        </button>
                                      </>
                                    )}
                                    {!isCommentOwner && isPostOwner && (
                                      <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-b-lg transition-colors"
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
                                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                                title="Raporla"
                              >
                                <span className="text-xs">🚩</span>
                              </button>
                            )}
                          </div>
                        )}
                      
                      {/* Context Menu - Sadece gönderi sahibine göster */}
                      {contextMenu?.commentId === comment.id && !isReadOnly && user?.id === post.user.id && contextMenu && (
                        <div
                          className="fixed z-50 bg-gray-900 dark:bg-[#1a1a1a] text-gray-200 text-sm rounded-lg shadow-xl border border-gray-700 dark:border-gray-600 animate-in fade-in zoom-in-95 duration-150"
                          style={{
                            top: `${contextMenu.y - 80}px`,
                            left: `${contextMenu.x - 180}px`,
                            width: '180px',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handlePinComment(comment.id, comment.isPinned || false)}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-800 dark:hover:bg-gray-700 rounded-t-lg flex items-center gap-2 transition-colors"
                          >
                            <Pin size={14} className={comment.isPinned ? 'text-brand-orange fill-brand-orange' : 'text-gray-400'} />
                            <span className={comment.isPinned ? 'text-brand-orange' : ''}>
                              {comment.isPinned ? 'Sabitlemeyi Kaldır' : 'Yorumu Sabitle'}
                            </span>
                          </button>
                          <button
                            onClick={() => setContextMenu(null)}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-800 dark:hover:bg-gray-700 rounded-b-lg text-gray-400 hover:text-gray-200 transition-colors"
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
                      <div className="ml-10 mt-2 space-y-2">
                        {comment.replies.map((reply: any) => {
                          const isReplyHighlighted = highlightCommentId === reply.id
                          return (
                            <div 
                              key={reply.id}
                              id={`comment-${reply.id}`}
                              className={isReplyHighlighted ? 'ring-2 ring-brand-orange ring-opacity-50 rounded-lg p-2 -m-2 transition-all' : ''}
                            >
                            <div className="flex gap-2">
                              <CornerUpRight size={12} className="text-gray-400 dark:text-gray-500 mt-1 flex-shrink-0" />
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
                                className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0 hover:opacity-80 transition cursor-pointer"
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
                                  <span className="text-gray-500 dark:text-gray-300 text-xs">
                                    {reply.user.username[0].toUpperCase()}
                                  </span>
                                )}
                              </Link>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-black dark:text-white flex items-center gap-1 leading-relaxed">
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
                                    className="font-semibold hover:opacity-80 transition cursor-pointer"
                                  >
                                    {reply.user.username}
                                  </Link>
                                  <FeellinkRoleBadge
                                    roles={(reply.user as any).roles}
                                    className="!ml-0 !text-[10px] !px-1.5 !py-0"
                                  />
                                  <span>{reply.content}</span>
                                </p>
                                <p className="text-xs text-[#444] dark:text-gray-400 mt-0.5">
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
              <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-10">Henüz yorum yok.</p>
            )}
          </div>

          {/* Comment Input */}
          <div className="border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            {isReadOnly ? (
              <div className="px-4 py-3.5 text-center border-t border-neutral-200 dark:border-neutral-800 bg-[#fafafa] dark:bg-neutral-900/50">
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2.5">
                  Beğenmek veya yorum yapmak için Feellink&apos;te oturum açın.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                  <Link
                    href={loginHrefWithFrom}
                    className="font-semibold text-brand-orange hover:opacity-90"
                  >
                    Giriş yap
                  </Link>
                  <span className="text-neutral-300 dark:text-neutral-600">·</span>
                  <Link
                    href={`/register?from=${encodeURIComponent(guestReturnPath)}`}
                    className="font-semibold text-neutral-800 dark:text-neutral-200 hover:opacity-90"
                  >
                    Hesap oluştur
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {replyingTo && (
                  <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                    <span className="text-xs text-brand-orange bg-brand-blue/10 dark:bg-brand-blue/20 px-2 py-1 rounded-lg font-medium">
                      Yanıt veriliyor...
                    </span>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <form onSubmit={handleComment} className="px-4 py-3">
                  <div className="flex items-center">
                    <MentionInput
                      value={commentText}
                      setValue={setCommentText}
                      placeholder={replyingTo ? 'Yanıt yaz...' : 'Yorum ekle...'}
                      disabled={isPostingComment}
                      className="flex-1 bg-transparent text-gray-300 dark:text-gray-300 text-sm outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim() || isPostingComment || hasBadWord}
                      className="ml-2 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-full p-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPostingComment ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Send size={16} />
                      )}
                    </button>
                  </div>
                  {hasBadWord && (
                    <p className="text-xs text-orange-500 mt-1 px-1">
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
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            className="bg-white dark:bg-[#0f172a] rounded-xl w-[360px] max-w-[90vw] p-6 shadow-xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-black dark:text-white text-base font-semibold mb-2">
              Yorumu sil?
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Bu yorumu sildiğinizde geri alınamaz.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
              >
                İptal
              </button>

              <button
                onClick={confirmDelete}
                disabled={deleteCommentMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

