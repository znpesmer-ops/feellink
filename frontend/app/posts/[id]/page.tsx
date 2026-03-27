'use client'

import { useState } from 'react'
import Link from 'next/link'
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

  const rawId = params?.id
  const postId =
    typeof rawId === 'string'
      ? rawId.trim()
      : Array.isArray(rawId)
        ? (rawId[0] ?? '').trim()
        : ''
  const from = searchParams.get('from')

  const handleCloseAuthenticated = () => {
    setShowModal(false)
    const returnTo = isSafeReturnPath(from) ? from : '/feed'
    router.push(returnTo)
  }

  const handleClosePublic = () => {
    setShowModal(false)
    const returnTo = isSafeReturnPath(from) ? from : '/'
    router.push(returnTo)
  }

  if (!postId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-gray-500 dark:text-gray-400">Gönderi bulunamadı.</p>
      </div>
    )
  }

  if (!accessToken) {
    const loginFrom = encodeURIComponent(`/posts/${postId}`)
    return (
      <div className="min-h-screen flex flex-col bg-[#fafafa] dark:bg-neutral-950">
        <header className="sticky top-0 z-40 flex h-[54px] shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-black">
          <Link href="/" className="text-lg font-semibold tracking-tight text-brand-orange">
            Feellink
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href={`/login?from=${loginFrom}`}
              className="font-semibold text-brand-orange hover:opacity-90"
            >
              Giriş yap
            </Link>
            <Link
              href={`/register?from=${loginFrom}`}
              className="font-semibold text-neutral-900 hover:opacity-80 dark:text-neutral-100"
            >
              Kayıt ol
            </Link>
          </nav>
        </header>
        <main className="flex flex-1 flex-col items-center px-2 py-6 sm:px-4 sm:py-8">
          {showModal && (
            <PostModal postId={postId} onClose={handleClosePublic} publicShare />
          )}
        </main>
      </div>
    )
  }

  return (
    <AuthGuard>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
        {showModal && (
          <PostModal postId={postId} onClose={handleCloseAuthenticated} />
        )}
      </div>
    </AuthGuard>
  )
}

