'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from './store'
import api from './api'

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
    setAuthenticated,
    setLoading,
    setHasInitialized,
    clearAuth
  } = useAuthStore()
  const hasRunRef = useRef(false)

  // ✅ Public routes
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

  const isPublicRoute = publicRoutes.some((route) =>
    pathname?.startsWith(route)
  )

  // ✅ Global bir kez backend doğrulaması
  useEffect(() => {
    // ⛔️ Eğer hasInitialized = false ise hasRunRef'i sıfırla (logout sonrası)
    if (!hasInitialized && hasRunRef.current) {
      console.log('[AuthGuard] hasInitialized = false, resetting hasRunRef')
      hasRunRef.current = false
    }

    if (hasInitialized) {
      if (loading) {
        setLoading(false)
      }
      return
    }

    if (hasRunRef.current) {
      return
    }
    hasRunRef.current = true

    const initAuth = async () => {
      // ⛔️ Timeout guard - 5 saniye içinde bitmezse force false
      const timeoutId = setTimeout(() => {
        console.warn('[AuthGuard] Timeout (5s) - forcing loading to false')
        setLoading(false)
        setHasInitialized(true)
        setAuthenticated(false)
      }, 5000)

      try {
        setLoading(true)
        console.log('[AuthGuard] Starting auth verification...')
        console.log('[AuthGuard] API base URL:', api.defaults.baseURL)

        // Token kontrolü
        const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
        const hasToken = accessToken || tokenFromStorage

        console.log('[AuthGuard] Token check:', {
          hasToken: !!hasToken,
          accessToken: !!accessToken,
          tokenFromStorage: !!tokenFromStorage,
        })

        // Token yoksa direkt authenticated = false
        if (!hasToken) {
          console.log('[AuthGuard] No token - setting authenticated to false')
          setAuthenticated(false)
          clearTimeout(timeoutId)
          setLoading(false)
          setHasInitialized(true)
          return
        }

        // ✅ Backend /me endpoint'i ile doğrulama
        console.log('[AuthGuard] Calling /auth/me...')
        const response = await api.get('/auth/me')
        console.log('[AuthGuard] /auth/me response:', response.status)
        
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
        console.log('[AuthGuard] Auth verified successfully')

      } catch (err: any) {
        console.error('[AuthGuard] Auth verification failed:', {
          message: err?.message,
          code: err?.code,
          response: err?.response?.status,
          url: err?.config?.url,
          baseURL: err?.config?.baseURL,
        })

        // ✅ Backend Response 401/403 → token sil, isAuthenticated = false
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          console.log('[AuthGuard] 401/403 - clearing tokens')
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
          }
          clearAuth()
          setAuthenticated(false)
        } else {
          // Network error vs - authenticated = false ama token'ı silme
          console.log('[AuthGuard] Network/other error - setting authenticated to false')
          setAuthenticated(false)
        }
        clearTimeout(timeoutId)
      } finally {
        // ✅ KRİTİK: HER SENARYODA loading false ve hasInitialized true
        console.log('[AuthGuard] Finally block - setting loading to false, hasInitialized to true')
        setLoading(false)
        setHasInitialized(true)
      }
    }

    initAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ✅ Redirect kuralları - network hatası sonrası da çalışmalı
  useEffect(() => {
    if (loading || !hasInitialized) {
      return
    }

    const currentPathname = pathname || ''
    const currentIsPublicRoute = publicRoutes.some((route) =>
      currentPathname.startsWith(route)
    )

    // ⛔️ Zaten doğru route'daysa redirect yapma
    if (currentIsPublicRoute && !isAuthenticated) {
      // Public route + not authenticated = OK (login page'de kal)
      return
    }
    if (!currentIsPublicRoute && isAuthenticated) {
      // Protected route + authenticated = OK (feed page'de kal)
      // ⛔️ KRİTİK: Zaten doğru route'daysa redirect yapma
      if (currentPathname === '/feed' || currentPathname.startsWith('/feed')) {
        return // Zaten /feed'deyiz, redirect yapma
      }
      return
    }

    // 🔓 Public Routes (/login, /register) - authenticated ise feed'e git
    if (currentIsPublicRoute && isAuthenticated) {
      // ⛔️ Sadece gerçekten public route'daysa redirect yap (loop önleme)
      if (currentPathname === '/login' || currentPathname === '/register') {
        console.log('[AuthGuard] Redirecting authenticated user from public route to /feed')
        router.replace('/feed')
      }
      return
    }

    // 🏠 Ana sayfa (/) - authenticated değilse login'e, authenticated ise feed'e git
    if (currentPathname === '/') {
      if (isAuthenticated) {
        console.log('[AuthGuard] Redirecting authenticated user from / to /feed')
        router.replace('/feed')
      } else {
        console.log('[AuthGuard] Redirecting unauthenticated user from / to /login')
        router.replace('/login')
      }
      return
    }

    // 🔐 Protected Routes (/feed, /profile, /post/*) - NOT authenticated ise login'e git
    if (!currentIsPublicRoute && !isAuthenticated) {
      // ⛔️ Sadece gerçekten protected route'daysa redirect yap (loop önleme)
      if (currentPathname && currentPathname !== '/login' && currentPathname !== '/register') {
        console.log('[AuthGuard] Redirecting unauthenticated user from protected route to /login')
        router.replace('/login')
      }
      return
    }
  }, [loading, isAuthenticated, hasInitialized, router]) // ⛔️ pathname dependency kaldırıldı - loop önleme

  // Token varsa içeriği hemen göster (sadece client mount sonrası, hydration uyumu için)
  const hasToken = mounted && !!(accessToken || (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null))
  if (hasToken) return <>{children}</>

  // Token yoksa sadece ilk doğrulama bitene kadar spinner
  if (loading || !hasInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  return <>{children}</>
}
