'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from './store'
import api from './api'

const publicRoutes = [
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/onboarding',
  '/select-role',
  '/posts',
  '/artwork',
]

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const {
    accessToken,
    isAuthenticated,
    loading,
    hasInitialized,
    setAuth,
    setLoading,
    setHasInitialized,
    clearAuth,
  } = useAuthStore()
  const hasRunRef = useRef(false)
  const lastTokenRef = useRef<string | null>(null)

  const currentPathname = pathname || ''
  const isPublicRoute = publicRoutes.some((r) => currentPathname.startsWith(r))

  // Tek karar noktası: token varsa /me ile doğrula; yoksa resolved = not authenticated
  useEffect(() => {
    const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    const currentToken = accessToken || tokenFromStorage

    if (!currentToken) {
      clearAuth()
      setLoading(false)
      setHasInitialized(true)
      hasRunRef.current = false
      lastTokenRef.current = null
      return
    }

    if (lastTokenRef.current !== currentToken) {
      lastTokenRef.current = currentToken
      hasRunRef.current = false
      setHasInitialized(false)
    }

    if (hasRunRef.current) {
      setLoading(false)
      setHasInitialized(true)
      return
    }
    hasRunRef.current = true

    const initAuth = async () => {
      const timeoutId = setTimeout(() => {
        clearAuth()
        setLoading(false)
        setHasInitialized(true)
      }, 5000)

      try {
        setLoading(true)
        const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
        const response = await api.get('/auth/me')
        const { user: currentUser, capabilities, sidebar } = response.data
        const currentRefreshToken = useAuthStore.getState().refreshToken
        setAuth(
          currentUser,
          tokenFromStorage || accessToken || '',
          currentRefreshToken || '',
          capabilities ?? null,
          sidebar ?? null
        )
        clearTimeout(timeoutId)
        setLoading(false)
        setHasInitialized(true)
      } catch (_err: any) {
        // Her hata (401, 403, network): token + user temizle, tek redirect
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          sessionStorage.removeItem('access_token')
          sessionStorage.removeItem('refresh_token')
        }
        clearAuth()
        clearTimeout(timeoutId)
        setLoading(false)
        setHasInitialized(true)
      }
    }

    initAuth()
  }, [accessToken, setAuth, setLoading, setHasInitialized, clearAuth])

  // Redirect: sadece loading bittikten ve init tamamlandıktan sonra
  useEffect(() => {
    if (loading || !hasInitialized) return

    // Ana sayfa
    if (currentPathname === '/') {
      if (isAuthenticated) router.replace('/feed')
      else router.replace('/login')
      return
    }

    // Public route + giriş yapmış → feed
    if (isPublicRoute && isAuthenticated && (currentPathname === '/login' || currentPathname === '/register')) {
      router.replace('/feed')
      return
    }

    // Korunan route + giriş yok → login
    if (!isPublicRoute && !isAuthenticated) {
      router.replace('/login')
      return
    }
  }, [loading, hasInitialized, isAuthenticated, isPublicRoute, currentPathname, router])

  if (!mounted) return null

  // Loading veya henüz init bitmediyse tek ekran: loader
  if (loading || !hasInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }

  // Korunan sayfadayız ama auth yok → redirect yukarıda tetiklenir, boş render
  if (!isPublicRoute && !isAuthenticated) return null
  // Login/register'dayız ama giriş var → redirect yukarıda tetiklenir
  if ((currentPathname === '/login' || currentPathname === '/register') && isAuthenticated) return null

  return <>{children}</>
}
