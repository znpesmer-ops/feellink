'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuthStore()

  useEffect(() => {
    // ⛔️ Loading === true ise hiçbir redirect YAPMA
    if (loading) {
      return
    }

    // ✅ Backend doğrulaması tamamlandıktan sonra yönlendir
    // Sadece bir kez redirect yap
    if (isAuthenticated) {
      router.replace('/feed')
    } else {
      router.replace('/login')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // ✅ Sadece mount'ta bir kez çalış - loading ve isAuthenticated değişse bile tekrar redirect yapma

  // ⛔️ Loading state EKLENMEDEN redirect YAPILMAYACAK
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  return null
}
