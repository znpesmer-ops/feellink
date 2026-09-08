'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  Compass,
  MessageSquare,
  User,
  Bell,
  Settings,
  Calendar,
  Layers,
  BarChart3,
  Sparkles,
  Shield,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { ROLE_METADATA, normalizeRole } from '@/lib/role-utils'
import { isAdminUser } from '@/lib/admin-utils'
import { SidebarVisibility } from '@/types/capabilities'
import api from '@/lib/api'
import { initSocket, initChatSocket } from '@/lib/socket'
import { AnimatedFeellinkLogo } from '@/components/common/AppLogo'

interface NavItem {
  key: string
  label: string
  href: string
  icon: React.ElementType
  flag?: keyof SidebarVisibility
  badgeCount?: number
  highlight?: boolean
}

interface SidebarProps {
  forceVisible?: boolean
  onLinkClick?: () => void
}

export function Sidebar({ forceVisible = false, onLinkClick }: SidebarProps = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, capabilities, accessToken, sidebar, unreadCount, setUnreadCount, unreadMessageCount, setUnreadMessageCount } = useAuthStore() // ✅ unreadMessageCount ekle
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)

  useEffect(() => {
    if (!accessToken) return

    // ✅ Store'dan unreadCount'ı güncelle (notifications)
    api
      .get('/notifications/unread-count')
      .then((response) => setUnreadCount(response.data.count))
      .catch(() => {})

    // ✅ Store'dan unreadMessageCount'ı güncelle (messages)
    api
      .get('/chat/unread-count')
      .then((response) => setUnreadMessageCount(response.data.count))
      .catch(() => {})

    const socket = initSocket(accessToken)
    socket.on('notification', () => {
      // ✅ Yeni bildirim geldiğinde store'u güncelle
      api
        .get('/notifications/unread-count')
        .then((response) => setUnreadCount(response.data.count))
        .catch(() => {})
    })

    return () => {
      socket.off('notification')
    }
  }, [accessToken, setUnreadCount, setUnreadMessageCount])

  useEffect(() => {
    if (!accessToken) return
    const chatSocket = initChatSocket(accessToken)
    chatSocket.on('new_message', () => {
      // ✅ Yeni mesaj geldiğinde store'u güncelle
      api
        .get('/chat/unread-count')
        .then((response) => setUnreadMessageCount(response.data.count))
        .catch(() => {})
      
      if (pathname !== '/messages') {
        setHasUnreadMessages(true)
      }
    })
    return () => {
      chatSocket.off('new_message')
    }
  }, [accessToken, pathname, setUnreadMessageCount])

  useEffect(() => {
    if (pathname === '/messages') {
      setHasUnreadMessages(false)
    }
  }, [pathname])

  const navItems = useMemo<NavItem[]>(() => {
    if (!user) return []

    // capabilities gecikse bile menüyü göster (LayoutConditional ile tutarlı; boş sol şerit önlenir)
    const sidebarFlags: SidebarVisibility =
      sidebar ??
      (capabilities
        ? {
            showFeed: Boolean(capabilities.sidebar?.home),
            showExplore: Boolean(capabilities.sidebar?.explore),
            showProfile: Boolean(capabilities.sidebar?.profile),
            showMessages: Boolean(capabilities.sidebar?.messages),
            showListings: Boolean(capabilities.sidebar?.listings),
            showAnalytics: Boolean(capabilities.sidebar?.analytics),
            showEvents: Boolean(
              capabilities.sidebar?.myEvents || capabilities.sidebar?.createEvent
            ),
            showCollections: Boolean(
              capabilities.sidebar?.collections ||
                capabilities.sidebar?.manageCollections
            ),
            showTickets: true,
          }
        : {
            showFeed: true,
            showExplore: true,
            showProfile: true,
            showMessages: true,
            showListings: true,
            showAnalytics: true,
            showEvents: true,
            showCollections: true,
            showTickets: true,
          })

    const profileHref = '/profile/me'

    const items: NavItem[] = [
      { key: 'home', label: 'Ana Sayfa', href: '/feed', icon: Home, flag: 'showFeed' },
      { key: 'explore', label: 'Keşfet', href: '/explore', icon: Compass, flag: 'showExplore' },
      {
        key: 'listings',
        label: 'Feellink',
        href: '/fellink',
        icon: Sparkles,
      },
      {
        key: 'messages',
        label: 'Mesajlar',
        href: '/messages',
        icon: MessageSquare,
        flag: 'showMessages',
        badgeCount: unreadMessageCount, // ✅ Badge count ekle
      },
      { key: 'profile', label: 'Profil', href: profileHref, icon: User, flag: 'showProfile' },
      { key: 'analytics', label: 'Analizler', href: '/analytics', icon: BarChart3 },
      {
        key: 'collections',
        label: 'Koleksiyonlar',
        href: '/collections',
        icon: Layers,
        flag: 'showCollections',
      },
      { key: 'events', label: 'Etkinlikler', href: '/events', icon: Calendar },
      // Biletlerim geçici olarak gizlendi (route ve backend korunuyor)
      // { key: 'tickets', label: 'Biletlerim', href: '/my-tickets', icon: Ticket, flag: 'showTickets' },
      { key: 'notifications', label: 'Bildirimler', href: '/notifications', icon: Bell, badgeCount: unreadCount },
      { key: 'settings', label: 'Ayarlar', href: '/settings', icon: Settings },
    ]

    // Admin menüsünü ekle (eğer kullanıcı admin veya superAdmin ise)
    if (isAdminUser(user)) {
      items.push({
        key: 'admin',
        label: 'Admin Paneli',
        href: '/admin',
        icon: Shield,
      })
    }

    return items.filter((item) => {
      if (!item.flag) return true
      return sidebarFlags[item.flag]
    })
  }, [user, capabilities, sidebar, unreadCount, unreadMessageCount, hasUnreadMessages])

  if (!accessToken || !user) {
    return null
  }

  if (pathname === '/select-role') {
    return null
  }

  const activeRoute = pathname
  
  // Admin kontrolü - profesyonel SaaS mantığı
  const isAdmin = isAdminUser(user)
  
  // Plan etiketi kaldırıldı - artık sadece rol gösteriliyor
  
  // Rol etiketi - Admin için özel gösterim
  const resolvedRoles =
    (capabilities?.roles && capabilities.roles.length > 0
      ? capabilities.roles
      : user?.roles) ?? []
  const normalizedRoles = resolvedRoles.map((role) => normalizeRole(role))
  const roleLabels = normalizedRoles
    .map((role) => ROLE_METADATA[role]?.label)
    .filter(Boolean) as string[]
  
  const primaryRoleLabel = isAdmin
    ? 'Admin'
    : roleLabels[0] ?? ROLE_METADATA.art_lover.label

  return (
    <aside className="relative w-full h-full overflow-hidden border-r border-slate-200/80 bg-white text-slate-900 shadow-[12px_0_30px_rgba(15,23,42,0.05)] dark:border-white/[0.08] dark:bg-[#050912] dark:text-white dark:shadow-[18px_0_70px_rgba(0,0,0,0.38)] flex flex-col">
      <div className="pointer-events-none absolute inset-0 opacity-90 dark:opacity-100">
        <div className="absolute -left-20 top-8 h-48 w-48 rounded-full bg-[#ff8a1f]/12 blur-3xl dark:bg-[#ff8a1f]/16" />
        <div className="absolute -right-24 top-1/3 h-56 w-56 rounded-full bg-[#2f6bff]/8 blur-3xl dark:bg-[#2f6bff]/10" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.94)_28%,rgba(255,255,255,1))] dark:bg-[linear-gradient(180deg,rgba(12,18,33,0.64),rgba(5,9,18,0.92)_34%,rgba(5,9,18,1))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(255,138,31,0.12),transparent_28%),radial-gradient(circle_at_72%_34%,rgba(47,107,255,0.07),transparent_38%)] opacity-70 dark:opacity-45" />
      </div>

      {/* LOGO */}
      <div className="relative z-10 flex h-[79px] w-full items-center justify-start px-4 pt-0 pb-0">
        <AnimatedFeellinkLogo
          className="ml-3"
          priority
        />
      </div>

      {/* MENU */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-3 [scrollbar-width:thin] [scrollbar-color:rgba(255,138,31,0.34)_transparent]">
        <ul className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive =
              activeRoute === item.href ||
              activeRoute.startsWith(`${item.href}/`)
            const Icon = item.icon
            const baseClasses =
              'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200'
            const inactiveClasses =
              'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 hover:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.05)] dark:text-slate-300 dark:hover:bg-white/[0.075] dark:hover:text-white dark:hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'

            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  prefetch={true}
                  onClick={(e) => {
                    if (onLinkClick) {
                      e.preventDefault()
                      router.push(item.href)
                      onLinkClick()
                    }
                  }}
                  className={`${baseClasses} ${
                    isActive
                      ? 'bg-[linear-gradient(135deg,rgba(255,138,31,0.18),rgba(255,138,31,0.08)_48%,rgba(45,93,255,0.08))] text-brand-orange shadow-[inset_0_0_0_1px_rgba(255,138,31,0.28),0_14px_34px_rgba(255,122,0,0.10)] dark:bg-[linear-gradient(135deg,rgba(255,138,31,0.22),rgba(255,138,31,0.09)_42%,rgba(45,93,255,0.10))] dark:shadow-[inset_0_0_0_1px_rgba(255,138,31,0.32),0_18px_46px_rgba(255,122,0,0.12)]'
                      : inactiveClasses
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-brand-orange shadow-[0_0_16px_rgba(255,138,31,0.82)]" />
                  )}
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-brand-orange text-white shadow-[0_10px_22px_rgba(255,122,0,0.24)]'
                        : 'bg-slate-100/75 text-slate-500 group-hover:bg-white group-hover:text-brand-orange dark:bg-white/[0.06] dark:text-slate-300 dark:group-hover:bg-white/[0.10] dark:group-hover:text-brand-orange'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>

                  {item.highlight && (
                    <span className="inline-flex h-2 w-2 rounded-full bg-brand-orange shadow-[0_0_12px_rgba(255,138,31,0.8)]"></span>
                  )}

                  {item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <span className="flex min-w-[22px] items-center justify-center rounded-full bg-brand-orange px-1.5 py-0.5 text-[11px] font-bold leading-none text-white shadow-[0_8px_22px_rgba(255,122,0,0.34)] ring-2 ring-white dark:ring-[#050912]">
                      {item.badgeCount > 99 ? '99+' : item.badgeCount}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* ROLE / PLAN */}
      <div className="relative z-10 mx-3 mb-4 rounded-2xl border border-slate-200/80 bg-white/76 px-4 py-4 text-sm text-slate-500 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.045] dark:text-slate-400 dark:shadow-[0_22px_55px_rgba(0,0,0,0.24)]">
        <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-brand-orange/55 to-transparent" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Aktif Rol</p>

        <div className="mt-3 text-slate-950 dark:text-white font-semibold tracking-wide">
          {isAdmin ? (
            <span className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-orange/15 text-brand-orange ring-1 ring-brand-orange/25">
                <Shield className="w-4 h-4" />
              </span>
              <span>Admin</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-orange shadow-[0_0_14px_rgba(255,138,31,0.86)]" />
              <span>{primaryRoleLabel}</span>
            </span>
          )}
        </div>

        {!isAdmin && roleLabels.length > 1 && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {roleLabels.slice(1).join(' • ')}
          </p>
        )}
        
        {isAdmin && (
          <p className="mt-2 text-xs text-[#ff7b00] dark:text-[#ff9500] leading-relaxed font-medium">
            Tüm özelliklere erişim
          </p>
        )}
      </div>
    </aside>
  )
}
