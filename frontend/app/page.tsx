'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuthStore()
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    // ⛔️ Loading === true ise hiçbir redirect YAPMA
    if (loading) {
      return
    }

    // ⛔️ Zaten redirect yaptıysa tekrar yapma
    if (hasRedirected) {
      return
    }

    // ✅ Backend doğrulaması tamamlandıktan sonra yönlendir
    // Sadece bir kez redirect yap
    setHasRedirected(true)
    if (isAuthenticated) {
      router.replace('/feed')
    } else {
      router.replace('/login')
    }
  }, [loading, isAuthenticated, router, hasRedirected])

  // ⛔️ Loading state EKLENMEDEN redirect YAPILMAYACAK
  if (loading || !hasRedirected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  return null
}
