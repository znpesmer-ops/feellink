'use client'

import { useEffect, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { initSocket } from '@/lib/socket'
import { AuthGuard } from '@/lib/auth-guard'
import {
  ArrowUpRight,
  Bell,
  BellOff,
  BellRing,
  Calendar,
  Check,
  CheckCheck,
  CircleDot,
  Clock3,
  CornerDownRight,
  Heart,
  Inbox,
  Loader2,
  MessageCircle,
  MessageSquare,
  Sparkles,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react'
import { FeellinkRoleBadge } from '@/components/FeellinkRoleBadge'

type NotificationFilter = 'all' | 'unread' | 'comment' | 'reply'

type NotificationRecord = {
  id: string
  type: string
  message?: string | null
  isRead: boolean
  createdAt: string
  fromUserId?: string
  targetPath?: string
  targetUrl?: string
  articleId?: string
  postId?: string
  commentId?: string
  sender?: {
    username?: string | null
    fullName?: string | null
    avatar?: string | null
    roles?: string[] | null
  } | null
}

function NotificationsContent() {
  const router = useRouter()
  const { accessToken, user, unreadCount, setUnreadCount } = useAuthStore()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<NotificationFilter>('all')

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      params.append('limit', '20')
      if (pageParam) {
        params.append('offset', pageParam.toString())
      }

      const response = await api.get(`/notifications?${params.toString()}`)
      const result = response.data
      if (result.unreadCount !== undefined) {
        setUnreadCount(result.unreadCount)
      }

      return result.notifications || result
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const list = Array.isArray(lastPage) ? lastPage : (lastPage.notifications || [])
      if (list.length < 20) return undefined
      return allPages.length * 20
    },
    enabled: !!accessToken,
  })

  useEffect(() => {
    if (accessToken && data) {
      const firstPage = data.pages[0]
      if (firstPage?.unreadCount !== undefined) {
        setUnreadCount(firstPage.unreadCount)
      } else {
        api.get('/notifications/unread-count')
          .then((response) => setUnreadCount(response.data.count))
          .catch((error) => console.error('Failed to fetch unread count:', error))
      }
    }
  }, [accessToken, data, setUnreadCount])

  useEffect(() => {
    if (!accessToken) {
      router.push('/login')
      return
    }

    const socket = initSocket(accessToken)

    socket.on('notification', (notification) => {
      if (notification.type === 'follow_request_cancelled') {
        queryClient.setQueryData(['notifications'], (old: any) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page: any) => {
              const list = Array.isArray(page) ? page : (page.notifications || [])
              const nextList = list.filter((item: any) =>
                !(item.type === 'follow_request' && item.fromUserId === notification.fromUserId)
              )
              return Array.isArray(page) ? nextList : { ...page, notifications: nextList }
            }),
          }
        })
        setUnreadCount(Math.max(0, useAuthStore.getState().unreadCount - 1))
        return
      }

      queryClient.setQueryData(['notifications'], (old: any) => {
        if (!old) return old
        const pages = old.pages || []
        if (pages.length === 0) {
          return { ...old, pages: [[notification]] }
        }

        const [firstPage, ...restPages] = pages
        if (Array.isArray(firstPage)) {
          return { ...old, pages: [[notification, ...firstPage], ...restPages] }
        }

        return {
          ...old,
          pages: [
            {
              ...firstPage,
              notifications: [notification, ...(firstPage.notifications || [])],
            },
            ...restPages,
          ],
        }
      })

      setUnreadCount(useAuthStore.getState().unreadCount + 1)
    })

    socket.on('connect', () => {
      console.log('Socket connected for notifications')
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    return () => {
      socket.off('notification')
      socket.off('connect')
      socket.off('disconnect')
    }
  }, [accessToken, router, queryClient, setUnreadCount])

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const markAsRead = async (notificationId: string) => {
    try {
      await api.put(`/notifications/${notificationId}/read`)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setUnreadCount(Math.max(0, useAuthStore.getState().unreadCount - 1))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await api.put('/notifications/read-all')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      if (response.data?.unreadCount !== undefined) {
        setUnreadCount(response.data.unreadCount)
      } else {
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const handleAcceptFollowRequest = async (fromUserId?: string) => {
    if (!fromUserId) return
    try {
      await api.post(`/follow/request/${fromUserId}/accept`)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setUnreadCount(Math.max(0, useAuthStore.getState().unreadCount - 1))
    } catch (error) {
      console.error('Failed to accept follow request:', error)
      alert('İstek kabul edilemedi. Tekrar deneyin.')
    }
  }

  const handleRejectFollowRequest = async (fromUserId?: string) => {
    if (!fromUserId) return
    try {
      await api.post(`/follow/request/${fromUserId}/reject`)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setUnreadCount(Math.max(0, useAuthStore.getState().unreadCount - 1))
    } catch (error) {
      console.error('Failed to reject follow request:', error)
      alert('İstek reddedilemedi. Tekrar deneyin.')
    }
  }

  const notifications: NotificationRecord[] = data?.pages.flatMap((page: any) => {
    return Array.isArray(page) ? page : (page.notifications || [])
  }) || []

  const visibleNotifications = notifications.filter((notification) => notification.type !== 'profile_incomplete')

  const filteredNotifications = visibleNotifications.filter((notification) => {
    if (filter === 'all') return true
    if (filter === 'unread') return !notification.isRead
    if (filter === 'comment') return notification.type === 'comment'
    if (filter === 'reply') return notification.type === 'reply'
    return true
  })

  const todayCount = visibleNotifications.filter((notification) => {
    const created = new Date(notification.createdAt)
    const now = new Date()
    return (
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth() &&
      created.getDate() === now.getDate()
    )
  }).length

  const actionCount = visibleNotifications.filter((notification) =>
    notification.type === 'follow_request' && !notification.isRead
  ).length

  const filterOptions: Array<{
    key: NotificationFilter
    label: string
    count: number
    icon: typeof Bell
  }> = [
    { key: 'all', label: 'Tümü', count: visibleNotifications.length, icon: Bell },
    { key: 'unread', label: 'Okunmamış', count: visibleNotifications.filter((n) => !n.isRead).length, icon: CircleDot },
    { key: 'comment', label: 'Yorumlar', count: visibleNotifications.filter((n) => n.type === 'comment').length, icon: MessageCircle },
    { key: 'reply', label: 'Yanıtlar', count: visibleNotifications.filter((n) => n.type === 'reply').length, icon: CornerDownRight },
  ]

  const getDateGroupLabel = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const diffDays = Math.round((todayStart - dateStart) / 86400000)

    if (diffDays === 0) return 'Bugün'
    if (diffDays === 1) return 'Dün'
    if (diffDays > 1 && diffDays < 7) return `${diffDays} gün önce`

    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const groupedNotifications = filteredNotifications.reduce<Record<string, NotificationRecord[]>>((acc, notification) => {
    const label = getDateGroupLabel(notification.createdAt)
    if (!acc[label]) acc[label] = []
    acc[label].push(notification)
    return acc
  }, {})

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'şimdi'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dk önce`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} sa önce`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} gün önce`

    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
      case 'comment_like':
        return <Heart className="h-4 w-4" />
      case 'comment':
        return <MessageCircle className="h-4 w-4" />
      case 'reply':
        return <CornerDownRight className="h-4 w-4" />
      case 'follow':
        return <UserPlus className="h-4 w-4" />
      case 'follow_request':
      case 'follow_accept':
        return <UserCheck className="h-4 w-4" />
      case 'event_join':
        return <Calendar className="h-4 w-4" />
      case 'event_comment':
        return <MessageSquare className="h-4 w-4" />
      case 'job_application_received':
      case 'job_application_status_changed':
        return <Inbox className="h-4 w-4" />
      case 'profile_incomplete':
        return <BellRing className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getNotificationTheme = (type: string) => {
    switch (type) {
      case 'like':
      case 'comment_like':
        return {
          icon: 'text-rose-600 dark:text-rose-300',
          iconBg: 'bg-rose-50 dark:bg-rose-500/[0.15]',
          ring: 'ring-rose-400/20',
          glow: 'from-rose-50 dark:from-rose-500/[0.18]',
          rail: 'bg-rose-400',
        }
      case 'comment':
        return {
          icon: 'text-sky-600 dark:text-sky-300',
          iconBg: 'bg-sky-50 dark:bg-sky-500/[0.15]',
          ring: 'ring-sky-400/20',
          glow: 'from-sky-50 dark:from-sky-500/[0.18]',
          rail: 'bg-sky-400',
        }
      case 'reply':
        return {
          icon: 'text-violet-600 dark:text-violet-300',
          iconBg: 'bg-violet-50 dark:bg-violet-500/[0.15]',
          ring: 'ring-violet-400/20',
          glow: 'from-violet-50 dark:from-violet-500/[0.18]',
          rail: 'bg-violet-400',
        }
      case 'follow':
      case 'follow_request':
      case 'follow_accept':
        return {
          icon: 'text-emerald-600 dark:text-emerald-300',
          iconBg: 'bg-emerald-50 dark:bg-emerald-500/[0.15]',
          ring: 'ring-emerald-400/20',
          glow: 'from-emerald-50 dark:from-emerald-500/[0.18]',
          rail: 'bg-emerald-400',
        }
      case 'event_join':
      case 'event_comment':
        return {
          icon: 'text-amber-700 dark:text-amber-200',
          iconBg: 'bg-amber-50 dark:bg-amber-500/[0.15]',
          ring: 'ring-amber-400/20',
          glow: 'from-amber-50 dark:from-amber-500/[0.18]',
          rail: 'bg-amber-300',
        }
      default:
        return {
          icon: 'text-orange-700 dark:text-orange-200',
          iconBg: 'bg-orange-50 dark:bg-orange-500/[0.15]',
          ring: 'ring-orange-400/20',
          glow: 'from-orange-50 dark:from-orange-500/[0.18]',
          rail: 'bg-brand-orange',
        }
    }
  }

  const getNotificationText = (notification: NotificationRecord) => {
    switch (notification.type) {
      case 'like':
        return 'gönderini beğendi'
      case 'comment_like':
        return 'yorumunu beğendi'
      case 'comment':
        return 'gönderine yorum yaptı'
      case 'reply':
        return 'yorumuna yanıt verdi'
      case 'follow':
        return 'seni takip etti'
      case 'follow_request':
        return 'takip isteği gönderdi'
      case 'follow_accept':
        return 'takip isteğini kabul etti'
      case 'event_join':
        return notification.message || 'etkinliğinize katıldı'
      case 'event_comment':
        return notification.message || 'etkinliğinize yorum yaptı'
      case 'job_application_received':
        return notification.message || 'ilanına başvuru yapıldı'
      case 'job_application_status_changed':
        return notification.message || 'başvuru durumu güncellendi'
      case 'profile_incomplete':
        return notification.message || 'Feellink’i tam kullanabilmek için bazı bilgilerin eksik.'
      default:
        return notification.message || 'yeni bildirim gönderdi'
    }
  }

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return null
    if (avatar.startsWith('http')) return avatar
    return `${process.env.NEXT_PUBLIC_CDN}/${avatar}`
  }

  const openNotification = async (notification: NotificationRecord) => {
    if (!notification.isRead) {
      await markAsRead(notification.id)
    }

    if (notification.targetPath) {
      router.push(notification.targetPath)
      return
    }

    if (notification.targetUrl) {
      router.push(notification.targetUrl)
      return
    }

    if (notification.type === 'job_application_received') {
      router.push('/fellink/public')
      return
    }

    if (notification.type === 'job_application_status_changed') {
      router.push('/fellink/my-applications')
      return
    }

    if (notification.articleId) {
      const url = `/articles/${notification.articleId}${notification.commentId ? `#cmt-${notification.commentId}` : ''}`
      router.push(url)
      return
    }

    if (notification.postId) {
      router.push(`/posts/${notification.postId}?from=${encodeURIComponent('/notifications')}`)
      return
    }

    if (notification.sender?.username) {
      router.push(`/profile/${notification.sender.username}`)
      return
    }

    router.push('/fellink/public')
  }

  if (!accessToken) {
    return null
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[980px] px-4 py-8 sm:px-6">
        <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/[0.85] p-6 shadow-2xl shadow-slate-200/60 backdrop-blur-2xl dark:border-slate-700/[0.45] dark:bg-[rgba(17,24,36,0.82)] dark:shadow-black/25">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(249,115,22,0.22),transparent_38%),radial-gradient(circle_at_78%_12%,rgba(59,130,246,0.16),transparent_32%)]" />
          <div className="relative space-y-5">
            <div className="h-5 w-44 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
            <div className="h-10 w-64 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-white/10" />
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-white/[0.08]" />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-center rounded-[28px] border border-slate-200/80 bg-white/70 py-24 shadow-xl shadow-slate-200/50 dark:border-slate-700/40 dark:bg-white/[0.03] dark:shadow-black/10">
          <Loader2 className="h-7 w-7 animate-spin text-brand-orange" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[980px] px-4 py-8 sm:px-6">
      <section className="relative overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/[0.88] p-5 text-slate-950 shadow-2xl shadow-slate-200/70 backdrop-blur-2xl sm:p-7 dark:border-slate-700/[0.45] dark:bg-[rgba(15,23,36,0.88)] dark:text-white dark:shadow-black/25">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(249,115,22,0.18),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(59,130,246,0.16),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.34),transparent_44%)] dark:bg-[radial-gradient(circle_at_12%_0%,rgba(249,115,22,0.22),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(59,130,246,0.16),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_44%)]" />
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/[0.45] to-transparent dark:via-orange-200/[0.35]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/70 bg-orange-50/[0.85] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-orange-700 shadow-sm shadow-orange-100/60 dark:border-orange-300/[0.18] dark:bg-orange-400/10 dark:text-orange-100 dark:shadow-none">
              <Sparkles className="h-3.5 w-3.5" />
              Feellink bildirim merkezi
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl dark:text-white">
              Bildirimler
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">
              Takip istekleri, yorumlar, etkinlikler ve Feellink hareketlerin tek, sakin ve okunabilir bir merkezde.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
            {[
              { label: 'Okunmamış', value: unreadCount, icon: BellRing },
              { label: 'Bugün', value: todayCount, icon: Clock3 },
              { label: 'Aksiyon', value: actionCount, icon: CheckCheck },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-inner shadow-white/60 backdrop-blur dark:border-slate-700/[0.45] dark:bg-white/[0.06] dark:shadow-white/5"
                >
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100/80 text-orange-700 dark:bg-white/10 dark:text-orange-100">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-black text-slate-950 dark:text-white">{stat.value}</div>
                  <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="relative mt-6 flex flex-col gap-3 border-t border-slate-200/75 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700/[0.45]">
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((tab) => {
              const Icon = tab.icon
              const isActive = filter === tab.key

              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-bold transition-all ${
                    isActive
                      ? 'border-orange-300/50 bg-brand-orange text-white shadow-lg shadow-orange-500/25'
                      : 'border-slate-200/75 bg-white/[0.72] text-slate-600 shadow-sm shadow-slate-200/[0.45] hover:border-orange-300/[0.45] hover:bg-orange-50/80 hover:text-slate-950 dark:border-slate-700/[0.45] dark:bg-white/[0.055] dark:text-slate-300 dark:shadow-none dark:hover:border-orange-300/25 dark:hover:bg-white/[0.085] dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${isActive ? 'bg-white/[0.18] text-white' : 'bg-slate-100 text-slate-500 dark:bg-white/[0.08] dark:text-slate-400'}`}>
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          <button
            onClick={markAllAsRead}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold transition-all ${
              unreadCount > 0
                ? 'bg-white text-slate-950 shadow-xl shadow-white/10 hover:-translate-y-0.5 hover:bg-orange-50'
                : 'cursor-not-allowed border border-slate-200/75 bg-slate-100/80 text-slate-400 dark:border-slate-700/[0.45] dark:bg-white/[0.04] dark:text-slate-500'
            }`}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-4 w-4" />
            Tümünü okundu yap
          </button>
        </div>
      </section>

      {user && user.profileCompleted !== true && (
        <section className="mt-5 overflow-hidden rounded-[26px] border border-orange-200/70 bg-[linear-gradient(135deg,rgba(255,247,237,0.94),rgba(255,255,255,0.88)_44%,rgba(239,246,255,0.88))] p-5 text-slate-950 shadow-xl shadow-orange-100/[0.65] dark:border-orange-300/[0.18] dark:bg-[linear-gradient(135deg,rgba(249,115,22,0.14),rgba(15,23,42,0.82)_44%,rgba(59,130,246,0.09))] dark:text-white dark:shadow-orange-950/[0.15]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-100 text-orange-700 shadow-lg shadow-orange-100 dark:border-orange-300/20 dark:bg-orange-400/[0.15] dark:text-orange-100 dark:shadow-orange-500/10">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-950 dark:text-white">Profilini tamamla</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Feellink deneyiminin tüm kapıları açılması için profilindeki eksik bilgileri tamamlayabilirsin.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/profile/edit?required=true')}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand-orange px-5 text-sm font-black text-white shadow-lg shadow-orange-500/25 transition hover:-translate-y-0.5 hover:bg-orange-500"
            >
              Profili Düzenle
            </button>
          </div>
        </section>
      )}

      <section className="mt-6">
        {filteredNotifications.length > 0 ? (
          <div className="space-y-7">
            {Object.entries(groupedNotifications).map(([date, dateNotifications]) => (
              <div key={date}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700/[0.45]" />
                  <h2 className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm shadow-slate-200/[0.55] dark:border-slate-700/[0.45] dark:bg-white/[0.04] dark:text-slate-400 dark:shadow-none">
                    {date}
                  </h2>
                  <span className="h-px flex-1 bg-gradient-to-l from-slate-200 to-transparent dark:from-slate-700/[0.45]" />
                </div>

                <div className="space-y-3">
                  {dateNotifications.map((notification) => {
                    const theme = getNotificationTheme(notification.type)
                    const avatarUrl = getAvatarUrl(notification.sender?.avatar)

                    return (
                      <article
                        key={notification.id}
                        onClick={() => openNotification(notification)}
                        className={`group relative overflow-hidden rounded-[24px] border p-4 transition-all duration-300 ${
                          !notification.isRead
                            ? `border-orange-200/60 bg-gradient-to-br ${theme.glow} to-white/90 shadow-xl shadow-slate-200/70 ring-1 ${theme.ring} dark:border-slate-700/40 dark:to-white/[0.04] dark:shadow-black/[0.14]`
                            : 'border-slate-200/80 bg-white/[0.84] shadow-lg shadow-slate-200/[0.65] hover:bg-white dark:border-slate-700/[0.35] dark:bg-white/[0.03] dark:shadow-black/[0.08] dark:hover:bg-white/[0.05]'
                        } cursor-pointer backdrop-blur-xl hover:-translate-y-0.5 hover:border-orange-300/[0.55] dark:hover:border-orange-300/[0.18]`}
                      >
                        {!notification.isRead && (
                          <div className={`absolute left-0 top-5 h-12 w-1 rounded-r-full ${theme.rail} shadow-[0_0_18px_rgba(249,115,22,0.45)]`} />
                        )}
                        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-orange-200/[0.65] to-transparent opacity-0 transition group-hover:opacity-100 dark:via-white/[0.12]" />

                        <div className="flex gap-4">
                          {notification.sender?.username ? (
                            <Link
                              href={`/profile/${notification.sender.username}`}
                              onClick={(event) => event.stopPropagation()}
                              className="relative h-12 w-12 shrink-0 rounded-2xl transition hover:scale-[1.03]"
                            >
                              <div className="h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/60 dark:border-slate-700/[0.45] dark:bg-slate-900/80 dark:shadow-black/20">
                                {avatarUrl ? (
                                  <img
                                    src={avatarUrl}
                                    alt={notification.sender.username || 'Kullanıcı'}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center text-base font-black text-slate-600 dark:text-slate-300">
                                    {notification.sender?.username?.charAt(0).toUpperCase() || 'U'}
                                  </span>
                                )}
                              </div>
                              <span className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-xl border border-white/80 ${theme.iconBg} ${theme.icon} shadow-lg shadow-slate-300/60 dark:border-slate-700/60 dark:shadow-black/25`}>
                                {getNotificationIcon(notification.type)}
                              </span>
                            </Link>
                          ) : (
                            <div className="relative h-12 w-12 shrink-0 rounded-2xl">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-md shadow-slate-200/60 dark:border-slate-700/[0.45] dark:bg-slate-900/80 dark:text-slate-300 dark:shadow-black/20">
                                <Bell className="h-5 w-5" />
                              </div>
                              <span className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-xl border border-white/80 ${theme.iconBg} ${theme.icon} shadow-lg shadow-slate-300/60 dark:border-slate-700/60 dark:shadow-black/25`}>
                                {getNotificationIcon(notification.type)}
                              </span>
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="flex flex-wrap items-center gap-1.5 text-sm leading-6 text-slate-700 dark:text-slate-200">
                                  {notification.sender?.username ? (
                                    <Link
                                      href={`/profile/${notification.sender.username}`}
                                      onClick={(event) => event.stopPropagation()}
                                      className="font-black text-slate-950 transition hover:text-orange-600 dark:text-white dark:hover:text-orange-200"
                                    >
                                      {notification.sender?.fullName || notification.sender?.username || 'Sistem'}
                                    </Link>
                                  ) : (
                                    <span className="font-black text-slate-950 dark:text-white">Sistem</span>
                                  )}
                                  <FeellinkRoleBadge
                                    roles={notification.sender?.roles as any}
                                    className="!ml-0 !text-[10px] !px-1.5 !py-0"
                                  />
                                  <span className="text-slate-600 dark:text-slate-300">{getNotificationText(notification)}</span>
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50/90 px-2 py-1 text-slate-600 dark:border-slate-700/40 dark:bg-white/[0.04] dark:text-slate-400">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    {formatTimeAgo(notification.createdAt)}
                                  </span>
                                  {!notification.isRead && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-orange-300/20 bg-orange-400/10 px-2 py-1 font-bold text-orange-200">
                                      <CircleDot className="h-3.5 w-3.5" />
                                      Yeni
                                    </span>
                                  )}
                                </div>
                              </div>

                              {notification.type !== 'follow_request' && (
                                <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/70 text-slate-400 transition group-hover:border-orange-300/[0.45] group-hover:text-orange-600 sm:flex dark:border-slate-700/40 dark:bg-white/[0.04] dark:text-slate-500 dark:group-hover:border-orange-300/20 dark:group-hover:text-orange-100">
                                  <ArrowUpRight className="h-4 w-4" />
                                </div>
                              )}
                            </div>

                            {notification.type === 'follow_request' && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    handleAcceptFollowRequest(notification.fromUserId)
                                  }}
                                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-brand-orange px-4 text-xs font-black text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-500"
                                >
                                  <Check className="h-4 w-4" />
                                  Kabul Et
                                </button>
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    handleRejectFollowRequest(notification.fromUserId)
                                  }}
                                  className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/75 px-4 text-xs font-black text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:text-slate-950 dark:border-slate-700/[0.45] dark:bg-white/[0.055] dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-white/[0.085] dark:hover:text-white"
                                >
                                  <X className="h-4 w-4" />
                                  Reddet
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/[0.86] px-6 py-20 text-center text-slate-950 shadow-2xl shadow-slate-200/70 dark:border-slate-700/40 dark:bg-[rgba(16,23,35,0.82)] dark:text-white dark:shadow-black/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(249,115,22,0.16),transparent_36%),radial-gradient(circle_at_20%_15%,rgba(59,130,246,0.1),transparent_34%)]" />
            <div className="relative mx-auto flex max-w-md flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-orange-200/80 bg-orange-50 text-orange-700 shadow-xl shadow-orange-100/70 dark:border-slate-700/[0.45] dark:bg-white/[0.06] dark:text-orange-200 dark:shadow-black/[0.18]">
                <BellOff className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-xl font-black text-slate-950 dark:text-white">
                {filter === 'all' ? 'Yeni bildirimin yok' : 'Bu filtrede bildirim yok'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Beğeni, yorum, takip ve etkinlik hareketleri geldiğinde burada şık bir akış olarak görünecek.
              </p>
            </div>
          </div>
        )}
      </section>

      {isFetchingNextPage && (
        <div className="flex justify-center py-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-bold text-slate-600 shadow-sm shadow-slate-200/60 dark:border-slate-700/[0.45] dark:bg-white/[0.04] dark:text-slate-300 dark:shadow-none">
            <Loader2 className="h-4 w-4 animate-spin text-brand-orange" />
            Yükleniyor
          </div>
        </div>
      )}

      {!hasNextPage && filteredNotifications.length > 0 && (
        <div className="py-8 text-center text-sm font-medium text-slate-500 dark:text-slate-500">
          Tüm bildirimleri gördün.
        </div>
      )}
    </div>
  )
}

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <NotificationsContent />
    </AuthGuard>
  )
}
