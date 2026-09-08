'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { Clock, MessageCircle, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import DeleteConfirmModal from '@/components/common/DeleteConfirmModal'

interface ProfileCommentsListProps {
  username: string
  userId?: string
}

interface ProfileComment {
  id: string
  postId: string
  content: string
  createdAt: string
  user?: {
    id: string
    username: string
    avatar?: string | null
  }
  post?: {
    id: string
    caption?: string | null
    isDeleted?: boolean
    deletedAt?: string | null
  } | null
  _count?: {
    likes?: number
  }
}

export function ProfileCommentsList({ username, userId }: ProfileCommentsListProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { accessToken, user } = useAuthStore()
  const [commentToDelete, setCommentToDelete] = useState<ProfileComment | null>(null)

  const { data: comments = [], isLoading } = useQuery<ProfileComment[]>({
    queryKey: ['user-comments', userId],
    queryFn: async () => {
      if (!userId) return []
      try {
        const response = await api.get(`/posts/comments/user/${userId}`)
        return response.data || []
      } catch (error) {
        console.error('Failed to fetch user comments:', error)
        return []
      }
    },
    enabled: !!accessToken && !!userId,
  })

  const deleteCommentMutation = useMutation({
    mutationFn: async (comment: ProfileComment) => {
      await api.delete(`/posts/${comment.postId}/comments/${comment.id}`)
      return comment.id
    },
    onSuccess: (deletedCommentId) => {
      queryClient.setQueryData<ProfileComment[]>(['user-comments', userId], (current = []) =>
        current.filter((comment) => comment.id !== deletedCommentId),
      )
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setCommentToDelete(null)
      toast.success('Yorum silindi')
    },
    onError: () => {
      toast.error('Yorum silinemedi. Lütfen tekrar deneyin.')
    },
  })

  const visibleComments = comments.filter(
    (comment) => comment.post && !comment.post.isDeleted && !comment.post.deletedAt,
  )

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff7b00] mx-auto"></div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Yorumlar yükleniyor...</p>
      </div>
    )
  }

  if (visibleComments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <MessageCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Henüz yorum yapılmamış.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {visibleComments.map((comment) => (
          <div
            key={comment.id}
            className="group cursor-pointer rounded-xl border border-gray-100 bg-white p-4 transition-all hover:border-[#ff7b00]/50 dark:border-gray-800 dark:bg-gray-900"
            onClick={() => comment.postId && router.push(`/posts/${comment.postId}?from=${encodeURIComponent(`/profile/${username}`)}`)}
          >
            <div className="flex items-start gap-3">
              {/* Kullanıcı Avatar */}
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {comment.user?.avatar ? (
                  <img
                    src={resolveImageUrl(comment.user.avatar)}
                    alt={comment.user.username}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                    }}
                  />
                ) : (
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    {comment.user?.username?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>

              {/* Yorum İçeriği */}
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {comment.user?.username || 'Kullanıcı'}
                    </span>
                    {comment.post && (
                      <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                        @ {comment.post.caption ? comment.post.caption.substring(0, 30) + (comment.post.caption.length > 30 ? '...' : '') : 'Gönderi'}
                      </span>
                    )}
                  </div>

                  {user?.id === comment.user?.id && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setCommentToDelete(comment)
                      }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 opacity-100 transition-colors hover:bg-red-500/10 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 dark:text-gray-500 dark:hover:text-red-400"
                      aria-label="Yorumu sil"
                      title="Yorumu sil"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  {comment.content}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>
                      {new Date(comment.createdAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  {(comment._count?.likes ?? 0) > 0 && (
                    <span>❤️ {comment._count?.likes ?? 0} beğeni</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <DeleteConfirmModal
        open={!!commentToDelete}
        onClose={() => {
          if (!deleteCommentMutation.isPending) setCommentToDelete(null)
        }}
        onConfirm={() => {
          if (commentToDelete) deleteCommentMutation.mutate(commentToDelete)
        }}
        title="Yorumu sil"
        message="Bu yorum profilinizden ve gönderiden kalıcı olarak kaldırılacak."
        confirmText="Yorumu Sil"
        loading={deleteCommentMutation.isPending}
      />
    </>
  )
}
