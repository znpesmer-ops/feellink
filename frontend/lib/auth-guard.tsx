'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from './store'
import api from './api'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { 
    accessToken, 
    user, 
    isAuthenticated, 
    loading,
    setAuth,
    setAuthenticated,
    setLoading,
    clearAuth
  } = useAuthStore()
  const [hasInitialized, setHasInitialized] = useState(false)

  // ✅ Public routes
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/onboarding',
    '/select-role',
    '/posts',
    '/artwork',
  ]

  const isPublicRoute = publicRoutes.some((route) =>
    pathname?.startsWith(route)
  )

  // ✅ İlk mount'ta backend doğrulaması - sadece bir kez
  useEffect(() => {
    // Zaten initialize olduysa tekrar çalışma
    if (hasInitialized) {
      return
    }

    const verifyAuth = async () => {
      // Token kontrolü
      const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
      const hasToken = accessToken || tokenFromStorage

      // Token yoksa direkt authenticated = false
      if (!hasToken) {
        setAuthenticated(false)
        setHasInitialized(true)
        return
      }

      // ✅ Backend /me endpoint'i ile doğrulama
      try {
        setLoading(true)
        const response = await api.get('/auth/me')
        const { user: currentUser, capabilities, sidebar } = response.data
        
        // ✅ Backend Response 200 OK → isAuthenticated = true
        const currentRefreshToken = useAuthStore.getState().refreshToken
        setAuth(
          currentUser,
          tokenFromStorage || accessToken || '',
          currentRefreshToken || '',
          capabilities ?? null,
          sidebar ?? null
        )
        setAuthenticated(true)
      } catch (error: any) {
        // ✅ Backend Response 401/403 → token sil, isAuthenticated = false
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
          }
          clearAuth()
          setAuthenticated(false)
        } else {
          // Network error vs - authenticated = false ama token'ı silme
          setAuthenticated(false)
        }
      } finally {
        setLoading(false)
        setHasInitialized(true)
      }
    }

    verifyAuth()
  }, []) // ✅ Sadece mount'ta bir kez çalış

  // ✅ Redirect kuralları - loading ve initialization tamamlandıktan sonra
  // ⛔️ pathname dependency YOK - sadece auth state değiştiğinde çalışır
  useEffect(() => {
    // ⛔️ Loading === true veya henüz initialize olmadıysa hiçbir redirect YAPMA
    if (loading || !hasInitialized) {
      return
    }

    // ⛔️ Zaten doğru route'daysa redirect yapma
    if (isPublicRoute && !isAuthenticated) {
      // Public route + not authenticated = OK, redirect yapma
      return
    }
    if (!isPublicRoute && isAuthenticated) {
      // Protected route + authenticated = OK, redirect yapma
      return
    }

    // 🔓 Public Routes (/login, /register)
    if (isPublicRoute && isAuthenticated) {
      // Eğer isAuthenticated === true → /feed
      router.replace('/feed')
      return
    }

    // 🔐 Protected Routes (/feed, /profile, /post/*)
    if (!isPublicRoute && !isAuthenticated) {
      // Eğer isAuthenticated === false → /login
      router.replace('/login')
      return
    }
  }, [loading, isAuthenticated, hasInitialized]) // ⛔️ pathname YOK - sonsuz döngüyü önlemek için

  // ⛔️ Loading state EKLENMEDEN redirect YAPILMAYACAK
  if (loading || !hasInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  return <>{children}</>
}
