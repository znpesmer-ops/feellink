'use client'

import { useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { AuthGuard } from '@/lib/auth-guard'
import { PostModal } from '@/components/post-modal'

function isSafeReturnPath(path: string | null): path is string {
  if (!path || typeof path !== 'string') return false
  if (!path.startsWith('/')) return false
  if (path.includes('//')) return false
  return true
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { accessToken } = useAuthStore()
  const [showModal, setShowModal] = useState(true)

  const postId = params?.id as string
  const from = searchParams.get('from')

  const handleClose = () => {
    setShowModal(false)
    const returnTo = isSafeReturnPath(from) ? from : '/feed'
    router.push(returnTo)
  }

  if (!postId || !accessToken) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff7b00]"></div>
      </div>
    )
  }

  return (
    <AuthGuard>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
        {showModal && (
          <PostModal postId={postId} onClose={handleClose} />
        )}
      </div>
    </AuthGuard>
  )
}

