'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

interface CommentLikeButtonProps {
  commentId: string
  initialLiked: boolean
  initialCount: number
  type?: 'article' | 'post'
  postId?: string // Post ID for query cache update (prefix match all ['post', postId, ...])
  /** TanStack query key for post detail (e.g. includes 'auth' | 'public') */
  cacheKey?: readonly unknown[]
  disabled?: boolean
}

function patchPostCommentLike(
  oldData: any,
  targetCommentId: string,
  liked: boolean,
  likesCount: number,
): any {
  if (!oldData) return oldData
  const cid = String(targetCommentId)
  const updateCommentLikes = (comments: any[]): any[] =>
    comments.map((comment: any) => {
      if (String(comment.id) === cid) {
        return {
          ...comment,
          isLikedByCurrentUser: liked,
          likesCount,
          _count: {
            ...comment._count,
            likes: likesCount,
          },
          likes: liked ? [{ id: 'temp' }] : [],
        }
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentLikes(comment.replies),
        }
      }
      return comment
    })
  return {
    ...oldData,
    comments: updateCommentLikes(oldData.comments || []),
  }
}

export default function CommentLikeButton({
  commentId,
  initialLiked,
  initialCount,
  type = 'article',
  postId,
  cacheKey,
  disabled = false,
}: CommentLikeButtonProps) {
  const safeCount = typeof initialCount === 'number' && !Number.isNaN(initialCount) ? initialCount : 0
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(safeCount)
  const [isToggling, setIsToggling] = useState(false)
  const queryClient = useQueryClient()
  const postCacheKey: readonly unknown[] | null =
    cacheKey ?? (postId ? (['post', postId] as const) : null)

  // Parent / React Query cache güncellenince yerel state props ile senkron kalsın
  useEffect(() => {
    if (isToggling) return
    setLiked(initialLiked)
    setCount(typeof initialCount === 'number' && !Number.isNaN(initialCount) ? initialCount : 0)
  }, [initialLiked, initialCount, commentId, isToggling])

  const toggleLike = async () => {
    if (disabled || isToggling) return

    setIsToggling(true)

    const previousLiked = liked
    const previousCount = count
    setLiked(!previousLiked)
    setCount(previousLiked ? Math.max(0, count - 1) : count + 1)

    try {
      const endpoint =
        type === 'post'
          ? `/posts/comments/${commentId}/like`
          : `/articles/comments/${commentId}/like`
      const res = await api.post(endpoint)

      const nextLiked = !!res.data?.liked
      const nextCount =
        typeof res.data?.likesCount === 'number' && !Number.isNaN(res.data.likesCount)
          ? res.data.likesCount
          : previousCount

      setLiked(nextLiked)
      setCount(nextCount)

      if (type === 'post') {
        const updater = (oldData: any) =>
          patchPostCommentLike(oldData, commentId, nextLiked, nextCount)

        if (postId) {
          queryClient.setQueriesData({ queryKey: ['post', postId] }, updater)
        } else if (postCacheKey) {
          queryClient.setQueryData(postCacheKey, updater)
        }
      }
    } catch (err) {
      console.error('Like error:', err)
      setLiked(previousLiked)
      setCount(previousCount)
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggleLike}
      disabled={disabled || isToggling}
      className={`flex items-center gap-1 transition-colors ${
        liked
          ? 'text-orange-500'
          : 'text-gray-400 hover:text-orange-500'
      } ${disabled || isToggling ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <Heart
        className={`w-3.5 h-3.5 transition-all duration-200 ${
          liked ? 'fill-orange-500 text-orange-500' : ''
        }`}
      />
      {count > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          {count}
        </span>
      )}
    </button>
  )
}
