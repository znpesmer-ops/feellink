'use client'

import { AuthGuard } from '@/lib/auth-guard'

export default function Home() {
  // ✅ AuthGuard backend doğrulaması ve redirect'i yapacak
  return (
    <AuthGuard>
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    </AuthGuard>
  )
}
