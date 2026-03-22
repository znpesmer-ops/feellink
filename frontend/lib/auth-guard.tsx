'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from './store'
import api, { performForcedLogout } from './api'
import { getDashboardRouteFromUser } from './role-utils'

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

// Route değişiminde AuthGuard yeniden mount olsa bile aynı token zaten doğrulandıysa tekrar /me çağrılmasın
let lastValidatedToken: string | null = null

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

  const currentPathname = pathname || ''
  const isPublicRoute = publicRoutes.some((r) => currentPathname.startsWith(r))

  // Login/register'da token yoksa hemen resolved yap - loader takılmadan form gösterilsin
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (currentPathname !== '/login' && currentPathname !== '/register') return
    if (localStorage.getItem('access_token')) return
    setLoading(false)
    setHasInitialized(true)
    clearAuth()
    lastValidatedToken = null
  }, [currentPathname, setLoading, setHasInitialized, clearAuth])

  // Tek karar noktası: token varsa /me ile doğrula; yoksa resolved = not authenticated
  // Aynı token zaten doğrulandıysa (navigasyon) tekrar /me çağırma, flicker/loop önlenir
  useEffect(() => {
    const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    const currentToken = accessToken || tokenFromStorage

    // Login/register'da localStorage'da token yoksa initAuth hiç çalıştırma
    if (typeof window !== 'undefined' && (currentPathname === '/login' || currentPathname === '/register') && !tokenFromStorage) {
      clearAuth()
      setLoading(false)
      setHasInitialized(true)
      hasRunRef.current = false
      lastValidatedToken = null
      return
    }

    if (!currentToken) {
      lastValidatedToken = null
      clearAuth()
      setLoading(false)
      setHasInitialized(true)
      hasRunRef.current = false
      return
    }

    // Token zaten bu session'da doğrulandıysa tekrar /me atma (navigasyonda remount'ta hasInitialized/isAuthenticated bazen gecikmeli; sadece lastValidatedToken'a güven)
    if (currentToken === lastValidatedToken) {
      setLoading(false)
      setHasInitialized(true)
      hasRunRef.current = true
      return
    }

    if (hasRunRef.current) {
      setLoading(false)
      setHasInitialized(true)
      return
    }
    hasRunRef.current = true

    const initAuth = async () => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null
      timeoutId = setTimeout(() => {
        setLoading(false)
        setHasInitialized(true)
        hasRunRef.current = false
      }, 8000)

      try {
        setLoading(true)
        const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
        const tokenToUse = tokenFromStorage || accessToken || currentToken
        const response = await api.get('/auth/me', {
          headers: tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : undefined,
        })
        const { user: currentUser, capabilities, sidebar } = response.data
        const currentRefreshToken = useAuthStore.getState().refreshToken
        setAuth(
          currentUser,
          tokenToUse || '',
          currentRefreshToken || '',
          capabilities ?? null,
          sidebar ?? null
        )
        lastValidatedToken = currentToken
      } catch (err: any) {
        const status = err?.response?.status
        if (status === 401 || status === 403) {
          lastValidatedToken = null
          performForcedLogout()
          hasRunRef.current = false
          return
        }
        const state = useAuthStore.getState()
        if (state.isAuthenticated && state.user) {
          lastValidatedToken = currentToken
        } else {
          lastValidatedToken = null
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
        setLoading(false)
        setHasInitialized(true)
        hasRunRef.current = false
      }
    }

    initAuth()
  }, [accessToken, currentPathname, setAuth, setLoading, setHasInitialized, clearAuth])

  // Redirect: sadece loading bittikten ve init tamamlandıktan sonra
  useEffect(() => {
    if (loading || !hasInitialized) return

    // Ana sayfa (pathname bazen '' olabiliyor, tek karar noktası)
    const isRoot = currentPathname === '/' || currentPathname === ''
    if (isRoot) {
      if (isAuthenticated) router.replace('/feed')
      else router.replace('/login')
      return
    }

    // Public route + doğrulanmış oturum → login/register'dan çık (feed değil; rol / select-role ile uyumlu)
    if (isPublicRoute && isAuthenticated && (currentPathname === '/login' || currentPathname === '/register')) {
      const { user: authedUser, capabilities: authedCaps } = useAuthStore.getState()
      if (!authedUser?.id) {
        router.replace('/feed')
        return
      }
      const rolesFromCaps = authedCaps?.roles?.length ? authedCaps.roles : []
      const rolesFromUser = authedUser.roles ?? []
      const effectiveRoles = rolesFromCaps.length > 0 ? rolesFromCaps : rolesFromUser
      if (effectiveRoles.length === 0) {
        router.replace('/select-role')
        return
      }
      const route =
        getDashboardRouteFromUser({
          roles: effectiveRoles,
          isAdmin: authedUser.isAdmin,
          capabilities: authedCaps ?? undefined,
        }) || '/feed'
      if (currentPathname !== route) {
        router.replace(route)
      }
      return
    }

    // Korunan route + giriş yok → login
    if (!isPublicRoute && !isAuthenticated) {
      router.replace('/login')
      return
    }
  }, [loading, hasInitialized, isAuthenticated, isPublicRoute, currentPathname, router])

  if (!mounted) return null

  // Login/register'da localStorage'da token yoksa loader gösterme - rehydration sonrası da form kalsın
  const isLoginOrRegister = currentPathname === '/login' || currentPathname === '/register'
  const noTokenInStorage = typeof window !== 'undefined' && !localStorage.getItem('access_token')
  if (isLoginOrRegister && noTokenInStorage) {
    return <>{children}</>
  }

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
