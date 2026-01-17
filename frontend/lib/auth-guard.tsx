'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from './store'
import api from './api'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { 
    accessToken, 
    isAuthenticated, 
    loading,
    hasInitialized,
    setAuth,
    setAuthenticated,
    setLoading,
    setHasInitialized,
    clearAuth
  } = useAuthStore()
  const hasRunRef = useRef(false) // ⛔️ Component-level guard - her mount'ta reset

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

  // ✅ Global bir kez backend doğrulaması - store'daki hasInitialized kontrolü ile
  useEffect(() => {
    // ⛔️ Zaten global olarak initialize olduysa tekrar çalışma
    if (hasInitialized) {
      // ⛔️ Ama loading hala true ise force false yap
      if (loading) {
        setLoading(false)
      }
      return
    }

    // ⛔️ Bu component'te zaten çalıştıysa tekrar çalışma
    if (hasRunRef.current) {
      return
    }
    hasRunRef.current = true

    const initAuth = async () => {
      // ⛔️ Timeout guard - 10 saniye içinde bitmezse force false
      const timeoutId = setTimeout(() => {
        console.warn('[AuthGuard] Timeout - forcing loading to false')
        setLoading(false)
        setHasInitialized(true)
        setAuthenticated(false)
      }, 10000) // 10 saniye timeout

      try {
        setLoading(true)

        // Token kontrolü
        const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
        const hasToken = accessToken || tokenFromStorage

        // Token yoksa direkt authenticated = false
        if (!hasToken) {
          setAuthenticated(false)
          clearTimeout(timeoutId)
          setLoading(false)
          setHasInitialized(true)
          return
        }

        // ✅ Backend /me endpoint'i ile doğrulama
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
        clearTimeout(timeoutId)

      } catch (err: any) {
        // ✅ Backend Response 401/403 → token sil, isAuthenticated = false
        if (err?.response?.status === 401 || err?.response?.status === 403) {
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
        clearTimeout(timeoutId)
      } finally {
        // ✅ KRİTİK: HER SENARYODA loading false ve hasInitialized true
        setLoading(false)
        setHasInitialized(true)
      }
    }

    initAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // ✅ Sadece mount'ta bir kez çalış

  // ✅ Redirect kuralları - loading ve initialization tamamlandıktan sonra
  useEffect(() => {
    // ⛔️ Loading === true veya henüz initialize olmadıysa hiçbir redirect YAPMA
    if (loading || !hasInitialized) {
      return
    }

    // Pathname'i useEffect içinde kontrol et
    const currentPathname = pathname
    const currentIsPublicRoute = publicRoutes.some((route) =>
      currentPathname?.startsWith(route)
    )

    // ⛔️ Zaten doğru route'daysa redirect yapma
    if (currentIsPublicRoute && !isAuthenticated) {
      // Public route + not authenticated = OK, redirect yapma
      return
    }
    if (!currentIsPublicRoute && isAuthenticated) {
      // Protected route + authenticated = OK, redirect yapma
      return
    }

    // 🔓 Public Routes (/login, /register)
    if (currentIsPublicRoute && isAuthenticated) {
      // Eğer isAuthenticated === true → /feed
      router.replace('/feed')
      return
    }

    // 🔐 Protected Routes (/feed, /profile, /post/*)
    if (!currentIsPublicRoute && !isAuthenticated) {
      // Eğer isAuthenticated === false → /login
      router.replace('/login')
      return
    }
  }, [loading, isAuthenticated, hasInitialized, router]) // ⛔️ pathname YOK - sonsuz döngüyü önlemek için

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
