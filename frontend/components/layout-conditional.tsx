'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SidebarPersistent } from '@/components/sidebar-persistent'
import { Header } from '@/components/header'
import RightSidebar from '@/components/right-sidebar'
import { useAuthStore } from '@/lib/store'
import { Menu, User, LogOut, X, Moon, Sun, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/lib/theme-context'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import api from '@/lib/api'
import { disconnectChatSocket } from '@/lib/socket'
import { Sidebar } from '@/components/sidebar'
import { AnimatedFeellinkLogo } from '@/components/common/AppLogo'

function LayoutConditionalComponent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, accessToken, refreshToken, clearAuth, hasInitialized, isAuthenticated } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)
  const [showDesktopRightSidebar, setShowDesktopRightSidebar] = useState(false)
  const [mobileProfileMenuOpen, setMobileProfileMenuOpen] = useState(false)
  const mobileProfileMenuRef = useRef<HTMLDivElement>(null)

  const isFeed = pathname.startsWith('/feed')
  const isExplore = pathname === '/explore'
  const isRoleSelection = pathname === '/select-role'

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
  const currentPathname = pathname || ''
  const isPublicRoute = publicRoutes.some((r) => currentPathname.startsWith(r))

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileProfileMenuRef.current && !mobileProfileMenuRef.current.contains(event.target as Node)) {
        setMobileProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(min-width: 1280px)')
    const syncViewport = () => {
      setShowDesktopRightSidebar(mediaQuery.matches)
      if (mediaQuery.matches) {
        setRightSidebarOpen(false)
      }
    }

    syncViewport()
    mediaQuery.addEventListener('change', syncViewport)

    return () => {
      mediaQuery.removeEventListener('change', syncViewport)
    }
  }, [])

  useEffect(() => {
    setRightSidebarOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken })
      }
    } catch (error) {
      console.warn('Logout error:', error)
    } finally {
      disconnectChatSocket()
      clearAuth()
      setMobileProfileMenuOpen(false)
      if (typeof window !== 'undefined') {
        window.location.replace('/login')
      }
    }
  }

  if (isRoleSelection) return <>{children}</>

  // Public route'larda (login, register vb.) asla shell gösterme; rehydration/race'te bile sidebar+header çıkmasın
  if (isPublicRoute) return <>{children}</>

  // Auth çözülmeden veya giriş yoksa shell (sidebar/header) gösterme; sadece children (AuthGuard loader veya login)
  const hasPersistedSession = Boolean(accessToken && user)

  if (!hasPersistedSession && (!hasInitialized || !isAuthenticated)) {
    return <>{children}</>
  }

  return (
    <div className="bg-white dark:bg-gray-950">
      {/* SOL SİDEBAR - Desktop (z-30: modal backdrop’lerin üstüne çıkmaz; overlay tüm shell’e tutarlı uygulanır) */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen w-64 z-30">
        <SidebarPersistent />
      </div>

      {/* HEADER */}
      <div className="fixed top-0 left-0 right-0 lg:left-64 z-[100]">
        <Header />
      </div>

      {/* ANA İÇERİK - flex row min-h ile sağ sidebar sol sidebar altıyla aynı hizada */}
      <div className="pt-[132px] lg:pt-[72px] lg:pl-64">
        <div className="flex min-h-[calc(100vh-72px)] flex-col xl:flex-row">
          <main className="w-full px-4 md:px-10 pb-20 max-w-[900px] xl:max-w-[1100px] mx-auto">
            {children}
          </main>
          {(isFeed || isExplore) && showDesktopRightSidebar && (
            <aside
              className="hidden xl:block xl:h-full xl:w-[400px] xl:flex-shrink-0 xl:px-0 xl:pb-0 xl:pt-4 xl:pr-6"
              aria-label={isExplore ? 'Keşfet içerikleri' : 'Haftanın seçkileri'}
            >
              <RightSidebar mode={isExplore ? 'explore' : 'feed'} variant="rail" />
            </aside>
          )}
        </div>
      </div>

      {/* Mobil Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-[140] bg-[#030712]/76 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className="absolute left-0 top-0 h-full w-[82vw] max-w-[320px] overflow-hidden rounded-r-[28px] border-r border-white/[0.08] bg-white shadow-[28px_0_90px_rgba(0,0,0,0.35)] dark:bg-[#050912]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-xl border border-slate-200/70 bg-white/72 text-slate-600 shadow-[0_12px_28px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-colors hover:text-brand-orange dark:border-white/[0.10] dark:bg-white/[0.07] dark:text-slate-200 dark:shadow-[0_16px_34px_rgba(0,0,0,0.28)]"
              aria-label="Menüyü kapat"
            >
              <X size={18} />
            </button>
            <Sidebar forceVisible={true} onLinkClick={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {(isFeed || isExplore) && (
        <button
          onClick={() => setRightSidebarOpen(true)}
          className="fixed right-4 top-[88px] z-[115] hidden items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/82 px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur-2xl transition-all hover:-translate-y-0.5 hover:border-brand-orange/45 hover:text-brand-orange dark:border-white/[0.10] dark:bg-[#0b1220]/88 dark:text-slate-100 dark:shadow-[0_22px_60px_rgba(0,0,0,0.34)] lg:flex xl:hidden"
          aria-label={isExplore ? 'Keşfet panelini aç' : 'Haftanın seçkilerini aç'}
        >
          <Sparkles className="h-4 w-4 text-brand-orange" />
          <span>{isExplore ? 'Keşfet' : 'Seçkiler'}</span>
        </button>
      )}

      {(isFeed || isExplore) && rightSidebarOpen && (
        <div
          className="fixed inset-0 z-[150] bg-[#030712]/72 backdrop-blur-sm xl:hidden"
          onClick={() => setRightSidebarOpen(false)}
        >
          <div
            className="absolute right-0 top-0 flex h-full w-[min(92vw,430px)] flex-col overflow-hidden rounded-l-[30px] border-l border-white/[0.10] bg-white/94 shadow-[-30px_0_90px_rgba(15,23,42,0.28)] backdrop-blur-2xl dark:bg-[#060b15]/96 dark:shadow-[-30px_0_90px_rgba(0,0,0,0.56)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative border-b border-slate-200/70 px-5 pb-4 pt-5 dark:border-white/[0.08]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(37,99,235,0.12),transparent_36%),radial-gradient(circle_at_90%_10%,rgba(255,122,0,0.16),transparent_34%)]" />
              <div className="relative flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-brand-orange">
                    Feellink
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
                    {isExplore ? 'Keşfet Akışı' : 'Haftanın Seçkileri'}
                  </h2>
                </div>
                <button
                  onClick={() => setRightSidebarOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/80 bg-white/75 text-slate-600 shadow-[0_14px_34px_rgba(15,23,42,0.12)] transition-colors hover:text-brand-orange dark:border-white/[0.10] dark:bg-white/[0.07] dark:text-slate-200"
                  aria-label="Sağ paneli kapat"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <RightSidebar mode={isExplore ? 'explore' : 'feed'} variant="drawer" hideMuseums />
            </div>
          </div>
        </div>
      )}

      {/* Mobil Header */}
      {accessToken && user && (
        <div className="lg:hidden fixed top-0 left-0 right-0 z-[100] border-b border-brand-orange/30 bg-white/88 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-brand-orange/24 dark:bg-[#070b16]/94 dark:shadow-[0_20px_60px_rgba(0,0,0,0.36)]">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-20 -top-20 h-44 w-44 rounded-full bg-brand-blue/10 blur-3xl dark:bg-brand-blue/16" />
            <div className="absolute right-4 -top-20 h-40 w-40 rounded-full bg-brand-orange/12 blur-3xl dark:bg-brand-orange/18" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-orange/75 to-transparent" />
          </div>
          <div className="relative flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white/72 text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-colors hover:text-brand-orange dark:border-white/[0.10] dark:bg-white/[0.07] dark:text-slate-100 dark:shadow-[0_14px_32px_rgba(0,0,0,0.24)]"
                aria-label="Menüyü aç"
              >
                <Menu size={22} />
              </button>
              <AnimatedFeellinkLogo
                className="-ml-1 [--feellink-sidebar-logo-core:30px] [--feellink-sidebar-logo-height:35px] [--feellink-sidebar-logo-width:94px]"
                priority
              />
            </div>
            <div className="flex items-center gap-2 relative" ref={mobileProfileMenuRef}>
              {(isFeed || isExplore) && (
                <button
                  onClick={() => setRightSidebarOpen(true)}
                  className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white/72 text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-brand-orange/40 hover:text-brand-orange dark:border-white/[0.10] dark:bg-white/[0.07] dark:text-slate-100 dark:shadow-[0_14px_32px_rgba(0,0,0,0.24)]"
                  aria-label={isExplore ? 'Keşfet panelini aç' : 'Haftanın seçkilerini aç'}
                >
                  <Sparkles className="h-[18px] w-[18px]" />
                </button>
              )}
              <button
                onClick={toggleTheme}
                className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white/72 text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-brand-orange/40 hover:text-brand-orange dark:border-white/[0.10] dark:bg-white/[0.07] dark:text-slate-100 dark:shadow-[0_14px_32px_rgba(0,0,0,0.24)]"
                aria-label={theme === 'dark' ? 'Light moda geç' : 'Dark moda geç'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-[18px] w-[18px]" />
                ) : (
                  <Moon className="h-[18px] w-[18px]" />
                )}
              </button>
              <div className="relative">
                <button
                  onClick={() => setMobileProfileMenuOpen(!mobileProfileMenuOpen)}
                  className="rounded-2xl p-[2px] bg-gradient-to-br from-brand-blue via-fuchsia-500 to-brand-orange shadow-[0_12px_30px_rgba(255,122,0,0.16)]"
                  aria-label="Profil menüsünü aç"
                >
                  <div className="w-9 h-9 overflow-hidden rounded-[14px] bg-[#ff7b00] flex items-center justify-center text-white text-xs ring-2 ring-white/70 dark:ring-white/[0.12]">
                    {user.avatar ? (
                      <img src={resolveImageUrl(user.avatar)} alt={user.username} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span>{user.username?.charAt(0).toUpperCase() || 'U'}</span>
                    )}
                  </div>
                </button>
                {mobileProfileMenuOpen && (
                  <div className="absolute right-0 z-[160] mt-3 w-56 overflow-hidden rounded-[22px] border border-slate-200/80 bg-white/96 p-1.5 shadow-[0_24px_70px_rgba(15,23,42,0.24)] backdrop-blur-2xl dark:border-white/[0.12] dark:bg-[#070b16]/98 dark:shadow-[0_28px_80px_rgba(0,0,0,0.58)]">
                    <Link href="/profile/me" onClick={() => setMobileProfileMenuOpen(false)} className="block rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-brand-orange/8 hover:text-brand-orange dark:text-slate-200 dark:hover:bg-white/[0.07]">
                      <div className="flex items-center gap-2">
                        <User size={18} />
                        <span>Profilim</span>
                      </div>
                    </Link>
                    <button onClick={handleLogout} className="mt-1 flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
                      <LogOut size={18} />
                      <span>Çıkış Yap</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="relative px-4 pb-4">
            <Header forceMobile={true} />
          </div>
        </div>
      )}
    </div>
  )
}

export const LayoutConditional = memo(LayoutConditionalComponent)
