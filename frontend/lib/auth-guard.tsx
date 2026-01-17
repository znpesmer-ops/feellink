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
    setUser,
    setAuthenticated,
    setLoading,
    clearAuth
  } = useAuthStore()
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)

  // ✅ Public routes - logout sonrası bu sayfalarda kalınabilir
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

  // ✅ İlk mount'ta backend doğrulaması
  useEffect(() => {
    const verifyAuth = async () => {
      // ⛔️ Loading === true ise hiçbir redirect YAPMA
      if (loading && !hasCheckedAuth) {
        return
      }

      // Token kontrolü
      const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
      const hasToken = accessToken || tokenFromStorage

      // Token yoksa direkt authenticated = false
      if (!hasToken) {
        setAuthenticated(false)
        setHasCheckedAuth(true)
        return
      }

      // ✅ Backend /me endpoint'i ile doğrulama
      try {
        setLoading(true)
        const response = await api.get('/auth/me')
        const { user: currentUser, capabilities, sidebar } = response.data
        
        // ✅ Backend Response 200 OK → isAuthenticated = true
        setAuth(
          currentUser,
          tokenFromStorage || accessToken || '',
          useAuthStore.getState().refreshToken || '',
          capabilities ?? null,
          sidebar ?? null
        )
        setAuthenticated(true)
        setHasCheckedAuth(true)
      } catch (error: any) {
        // ✅ Backend Response 401/403 → token sil, isAuthenticated = false
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
          }
          clearAuth()
          setAuthenticated(false)
          setHasCheckedAuth(true)
        } else {
          // Network error vs - authenticated = false ama token'ı silme
          setAuthenticated(false)
          setHasCheckedAuth(true)
        }
      } finally {
        setLoading(false)
      }
    }

    // İlk mount'ta bir kez çalış
    if (!hasCheckedAuth) {
      verifyAuth()
    }
  }, [hasCheckedAuth, accessToken, setAuth, setAuthenticated, setLoading, clearAuth])

  // ✅ Redirect kuralları
  useEffect(() => {
    // ⛔️ Loading === true ise hiçbir redirect YAPMA
    if (loading || !hasCheckedAuth) {
      return
    }

    // 🔓 Public Routes (/login, /register)
    if (isPublicRoute) {
      // Eğer isAuthenticated === true → /feed
      if (isAuthenticated) {
        router.replace('/feed')
      }
      return
    }

    // 🔐 Protected Routes (/feed, /profile, /post/*)
    if (!isPublicRoute) {
      // Eğer isAuthenticated === false → /login
      if (!isAuthenticated) {
        router.replace('/login')
        return
      }
    }
  }, [loading, isAuthenticated, isPublicRoute, pathname, router, hasCheckedAuth])

  // ⛔️ Loading state EKLENMEDEN redirect YAPILMAYACAK
  if (loading || !hasCheckedAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  return <>{children}</>
}
