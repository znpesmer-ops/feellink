'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/lib/store'
import { SearchResults } from './search-results'
import api from '@/lib/api'
import { disconnectChatSocket } from '@/lib/socket'
import { useTheme } from '@/lib/theme-context'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { ChevronDown, LogOut, Moon, Search, Sparkles, Sun, User } from 'lucide-react'

interface SearchUser {
  id: string
  username: string
  fullName?: string | null
  avatar?: string | null
  isVerified?: boolean
}

interface HeaderProps {
  forceMobile?: boolean
}

type HeaderUser = {
  username?: string | null
  fullName?: string | null
  email?: string | null
}

const cleanDisplayValue = (value?: string | null) =>
  value?.replace(/\s+/g, ' ').trim() || ''

const getGreetingHandle = (user?: HeaderUser | null) => {
  const username = cleanDisplayValue(user?.username)
  const fullName = cleanDisplayValue(user?.fullName)
  const emailHandle = cleanDisplayValue(user?.email?.split('@')[0])
  const fullNameParts = fullName.split(' ').filter(Boolean)
  const surname = fullNameParts.length > 1 ? fullNameParts[fullNameParts.length - 1] : ''

  if (
    username &&
    emailHandle &&
    surname &&
    username.toLocaleLowerCase('tr-TR') === surname.toLocaleLowerCase('tr-TR')
  ) {
    return emailHandle
  }

  if (username) return username
  if (emailHandle) return emailHandle
  if (fullNameParts[0]) return fullNameParts[0]
  return 'kullanıcı'
}

export function Header({ forceMobile = false }: HeaderProps = {}) {
  const router = useRouter()
  const { user, accessToken, refreshToken, clearAuth } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close search and menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])


  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearchOpen(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await api.get<SearchUser[]>('/search/users', {
          params: { q: searchQuery.trim(), limit: 10 },
        })
        setSearchResults(response.data)
        setIsSearchOpen(true)
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleUserSelect = (username: string) => {
    // Sadece dropdown'u kapat ve arama sorgusunu temizle
    // Link component'i zaten navigation yapacak
    setSearchQuery('')
    setIsSearchOpen(false)
  }

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
      setIsMenuOpen(false)
      if (typeof window !== 'undefined') {
        window.location.replace('/login')
      }
    }
  }

  // Token yoksa veya user yoksa header'ı gösterme
  // Bu, login/register sayfalarında header'ın görünmemesini sağlar
  if (!accessToken || !user) {
    return null
  }

  const isDarkMode = theme === 'dark'
  const greetingHandle = getGreetingHandle(user)
  const profileName = cleanDisplayValue(user.fullName) || cleanDisplayValue(user.username) || 'Profil'
  const profileHandle = cleanDisplayValue(user.username) || cleanDisplayValue(user.email?.split('@')[0]) || 'feellink'
  const profileMeta = cleanDisplayValue(user.email) || `@${profileHandle}`

  // Mobil mod: Sadece arama barı
  if (forceMobile) {
    return (
      <div ref={searchRef} className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          placeholder="Kullanıcı ara..."
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => searchQuery && setIsSearchOpen(true)}
          className="w-full rounded-2xl border border-slate-200/80 bg-white/82 px-3 py-2 pl-10 pr-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_12px_30px_rgba(15,23,42,0.08)] outline-none backdrop-blur-xl transition-all placeholder:text-slate-400 focus:border-brand-orange/75 focus:ring-4 focus:ring-brand-orange/15 dark:border-white/[0.10] dark:bg-white/[0.055] dark:text-slate-100 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_34px_rgba(0,0,0,0.22)] dark:placeholder:text-slate-500"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-4 w-4 text-brand-orange/80" />
        </div>
        {isLoading && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <div className="w-3.5 h-3.5 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Search Results Dropdown */}
        {isSearchOpen && (
          <SearchResults
            results={searchResults}
            onSelect={handleUserSelect}
            isLoading={isLoading}
          />
        )}
      </div>
    )
  }

  // Desktop mod: Tam header
  return (
    <header
      className={`relative z-[900] h-[64px] backdrop-blur-2xl transition-colors ${
        isDarkMode
          ? 'border-b border-white/[0.08] bg-[#070b16]/95 text-white shadow-[0_18px_60px_rgba(0,0,0,0.34)]'
          : 'border-b border-slate-200/70 bg-white/86 text-slate-900 shadow-[0_16px_44px_rgba(15,23,42,0.05)]'
      }`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute left-10 top-1/2 h-24 w-52 -translate-y-1/2 rounded-full blur-3xl ${isDarkMode ? 'bg-brand-orange/14' : 'bg-brand-orange/9'}`} />
        <div className={`absolute left-1/2 top-0 h-20 w-[34rem] -translate-x-1/2 rounded-full blur-3xl ${isDarkMode ? 'bg-brand-blue/14' : 'bg-brand-blue/8'}`} />
        <div className={`absolute right-16 top-1/2 h-20 w-44 -translate-y-1/2 rounded-full blur-3xl ${isDarkMode ? 'bg-brand-orange/12' : 'bg-brand-orange/7'}`} />
        {isDarkMode && (
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,39,0.56),rgba(7,11,22,0.94))]" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-orange/75 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-transparent via-brand-orange/20 to-transparent blur-sm" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between w-full h-full px-4 md:px-8 gap-3 md:gap-0">
        {/* Sol taraf - Hoş geldin (mobilde gizli, desktop'ta görünür) */}
        <div
          className={`hidden md:flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_14px_34px_rgba(0,0,0,0.12)] backdrop-blur-xl ${
            isDarkMode
              ? 'border-white/[0.10] bg-white/[0.055] text-slate-300'
              : 'border-slate-200/80 bg-white/72 text-slate-600'
          }`}
        >
          <span
            className={`grid h-6 w-6 place-items-center rounded-full ${
              isDarkMode
                ? 'bg-brand-orange/14 text-orange-200 shadow-[0_0_18px_rgba(255,138,31,0.16)]'
                : 'bg-brand-orange/12 text-brand-orange shadow-[0_8px_20px_rgba(255,138,31,0.12)]'
            }`}
            aria-hidden="true"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Hoş geldin,</span>
          <span className="feellink-greeting-shimmer max-w-[160px] truncate font-semibold text-brand-orange drop-shadow-[0_0_18px_rgba(255,138,31,0.28)]">
            {greetingHandle}
          </span>
        </div>

        {/* Orta - Arama çubuğu */}
        <div className="w-full md:flex-1 md:flex md:justify-center">
          <div ref={searchRef} className="relative w-full max-w-[480px] md:mx-auto">
              <div className="pointer-events-none absolute -inset-1 rounded-[18px] bg-gradient-to-r from-brand-orange/16 via-brand-blue/12 to-brand-orange/10 opacity-70 blur-xl transition-opacity" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Kullanıcı ara..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => searchQuery && setIsSearchOpen(true)}
                className={`relative w-full rounded-2xl border px-4 py-2.5 pl-11 pr-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_14px_34px_rgba(30,64,175,0.07)] outline-none backdrop-blur-xl transition-all placeholder:text-slate-400 focus:border-brand-orange/80 focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_18px_44px_rgba(255,122,0,0.10)] focus:ring-4 focus:ring-brand-orange/16 ${
                  isDarkMode
                    ? 'border-white/[0.12] bg-white/[0.07] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_44px_rgba(0,0,0,0.28)] placeholder:text-slate-500 focus:bg-white/[0.10]'
                    : 'border-brand-blue/28 bg-white/78 text-slate-900 focus:bg-white/92'
                }`}
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <span className={`grid h-7 w-7 place-items-center rounded-lg shadow-[inset_0_0_0_1px_rgba(45,93,255,0.08)] ${isDarkMode ? 'bg-white/[0.075] text-blue-300' : 'bg-brand-blue/8 text-brand-blue'}`}>
                  <Search className="h-4 w-4" />
                </span>
              </div>
              {isLoading && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <div className="w-4 h-4 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Search Results Dropdown */}
              {isSearchOpen && (
                <SearchResults
                  results={searchResults}
                  onSelect={handleUserSelect}
                  isLoading={isLoading}
                />
              )}
          </div>
        </div>

        {/* Sağ taraf - Theme Toggle + Profil */}
        <div className="flex items-center justify-end gap-3 md:gap-4 md:pl-6">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`grid h-9 w-9 place-items-center rounded-xl border shadow-[0_12px_26px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-brand-orange/40 hover:text-brand-orange hover:shadow-[0_16px_34px_rgba(255,122,0,0.11)] ${
              isDarkMode
                ? 'border-white/[0.10] bg-white/[0.07] text-slate-300 shadow-[0_14px_34px_rgba(0,0,0,0.26)] hover:bg-white/[0.10]'
                : 'border-slate-200/70 bg-white/70 text-slate-600'
            }`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-[18px] w-[18px]" />
            ) : (
              <Moon className="h-[18px] w-[18px]" />
            )}
          </button>

          {/* Profile Menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`group flex items-center gap-2 rounded-2xl border border-transparent px-1.5 py-1 transition-all hover:border-brand-orange/25 hover:shadow-[0_16px_34px_rgba(255,122,0,0.10)] focus:outline-none ${
                isDarkMode ? 'hover:bg-white/[0.07]' : 'hover:bg-white/60'
              }`}
              aria-expanded={isMenuOpen}
              aria-label="Profil menüsünü aç"
            >
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-orange text-sm font-semibold text-white shadow-[0_12px_28px_rgba(255,122,0,0.28)] ring-2 ring-white/70 transition-all group-hover:ring-brand-orange/35 dark:ring-white/[0.12]">
                {user?.avatar ? (
                  <img
                    src={resolveImageUrl(user.avatar)}
                    alt={profileName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Silently fallback to placeholder without logging
                      ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                    }}
                  />
                ) : (
                  <span>{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
                )}
              </div>
              <div className="hidden min-w-0 flex-col items-start leading-none xl:flex">
                <span className={`max-w-[92px] truncate text-xs font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                  {profileHandle}
                </span>
                <span className={`mt-1 text-[10px] font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Profil
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform group-hover:text-brand-orange ${isMenuOpen ? 'rotate-180 text-brand-orange' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 z-[9999] mt-3 w-80 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/96 p-2 shadow-[0_28px_90px_rgba(15,23,42,0.22)] backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-200 dark:border-white/[0.12] dark:bg-[#070b16]/98 dark:shadow-[0_32px_96px_rgba(0,0,0,0.64)]">
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-brand-orange/65 to-transparent" />
                <div className={`relative mb-2 overflow-hidden rounded-[20px] border p-3 ${
                  isDarkMode
                    ? 'border-white/[0.10] bg-[#101827]'
                    : 'border-slate-200/80 bg-white'
                }`}>
                  <div className="pointer-events-none absolute -right-10 -top-14 h-24 w-24 rounded-full bg-brand-orange/20 blur-2xl" />
                  <div className="relative flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-blue via-fuchsia-500 to-brand-orange p-[1.5px] shadow-[0_14px_34px_rgba(255,122,0,0.20)]">
                      <div className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full text-sm font-bold ${
                        isDarkMode ? 'bg-[#0b1120] text-white' : 'bg-white text-brand-orange'
                      }`}>
                        {user?.avatar ? (
                          <img
                            src={resolveImageUrl(user.avatar)}
                            alt={profileName}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                            }}
                          />
                        ) : (
                          <span>{profileHandle.charAt(0).toUpperCase() || 'F'}</span>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                        {profileName}
                      </p>
                      <p className={`mt-1 max-w-full break-all text-[11px] leading-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {profileMeta}
                      </p>
                    </div>
                  </div>
                </div>
                <Link
                  href="/profile/me"
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center justify-between rounded-2xl px-3.5 py-3 text-sm font-semibold transition-colors ${
                    isDarkMode
                      ? 'text-slate-200 hover:bg-white/[0.07] hover:text-white'
                      : 'text-slate-700 hover:bg-brand-orange/8 hover:text-brand-orange'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`grid h-9 w-9 place-items-center rounded-xl ${
                      isDarkMode ? 'bg-brand-orange/14 text-orange-200' : 'bg-brand-orange/10 text-brand-orange'
                    }`}>
                      <User className="h-[18px] w-[18px]" />
                    </span>
                    <span>Profilim</span>
                  </div>
                  <ChevronDown className="h-4 w-4 -rotate-90 text-slate-400" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm font-semibold text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-red-500/10 text-red-500 dark:bg-red-500/12 dark:text-red-300">
                    <LogOut className="h-[18px] w-[18px]" />
                  </span>
                  <span>Çıkış Yap</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
