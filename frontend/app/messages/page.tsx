'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { chatKeys, GC_STANDARD, STALE_SHORT } from '@/lib/query-config'
import { initChatSocket } from '@/lib/socket'
import { useAuthStore } from '@/lib/store'
import { ProRoleBadge } from '@/components/ProRoleBadge'
import { Avatar } from '@/components/ui/Avatar'
import { Send, Search, Image as ImageIcon, X, Edit, Trash2, MoreVertical, Paperclip, Download, FileText, Loader2, MessageCircle } from 'lucide-react'
import { NewMessageModal } from '@/components/new-message-modal'
import {
  SharedPostMessageCard,
  type SharedPostPreview,
} from '@/components/share/SharedPostMessageCard'

const formatTimeAgo = (date: string | Date) => {
  const now = new Date()
  const messageDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - messageDate.getTime()) / 1000)

  if (diffInSeconds < 60) return 'şimdi'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dk önce`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} sa önce`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} gün önce`

  return messageDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

const PRESENCE_ONLINE_TTL_MS = 90_000

const parsePresenceDate = (date: string | Date | null | undefined) => {
  if (!date) return null
  const parsed = date instanceof Date ? date : new Date(date)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const isPresenceOnline = (
  isOnline: boolean,
  lastSeen: string | Date | null | undefined,
  nowMs = Date.now()
) => {
  const activityAt = parsePresenceDate(lastSeen)
  if (!isOnline || !activityAt) return false
  return nowMs - activityAt.getTime() <= PRESENCE_ONLINE_TTL_MS
}

const formatLastSeen = (
  date: string | Date | null | undefined,
  nowMs = Date.now()
) => {
  const d = parsePresenceDate(date)
  if (!d) return 'Son aktiflik bilgisi yok'

  const diffInSeconds = Math.max(0, Math.floor((nowMs - d.getTime()) / 1000))
  if (diffInSeconds < 60) return 'az önce aktifti'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dk önce aktifti`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} sa önce aktifti`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} gün önce aktifti`

  return `${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} tarihinde aktifti`
}

const getPresenceLabel = (
  isOnline: boolean,
  lastSeen: string | Date | null | undefined,
  nowMs = Date.now()
) => {
  if (isPresenceOnline(isOnline, lastSeen, nowMs)) return 'Çevrimiçi'
  return formatLastSeen(lastSeen, nowMs)
}

interface Message {
  id: string
  content?: string | null
  imageUrl?: string | null
  fileUrl?: string | null
  fileName?: string | null
  fileType?: string | null
  senderId: string
  conversationId: string
  read: boolean
  isEdited?: boolean
  isDeleted?: boolean
  createdAt: string
  pending?: boolean // Geçici mesaj flag'i
  messageType?: string
  sharedPostId?: string | null
  sharedPostPreview?: SharedPostPreview | null
  sender: {
    id: string
    username: string
    avatar?: string
  }
}

interface Conversation {
  id: string
  context?: 'DIRECT' | 'JOB_APPLICATION' // 🔵 Conversation type
  jobId?: string // 🟠 İlan ID (JOB_APPLICATION için)
  applicationId?: string // 🟠 Başvuru ID
  createdAt: string
  updatedAt: string
  participants: Array<{
    id: string
    userId: string
    user: {
      id: string
      username: string
      avatar?: string
      fullName?: string
      isOnline?: boolean
      lastSeen?: string | Date | null
      lastActiveAt?: string | Date | null
    }
  }>
  messages?: Message[]
  unreadCount?: number
}

function MessagesContent() {
  const { user, accessToken, setUnreadMessageCount } = useAuthStore()
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<{ name: string; type: string } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewMessageModal, setShowNewMessageModal] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({})
  const [userLastSeen, setUserLastSeen] = useState<Record<string, string>>({})
  const [presenceNow, setPresenceNow] = useState(() => Date.now())
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState<string>('')
  const [showMenuForId, setShowMenuForId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'chat' | 'media' | 'files'>('chat')
  const [media, setMedia] = useState<Array<{ id: string; imageUrl: string; createdAt: string; senderId: string }>>([])
  const [jobApplications, setJobApplications] = useState<Record<string, { listingTitle: string; company?: string }>>({})
  const [jobContext, setJobContext] = useState<{ id: string; title: string } | null>(null) // ✅ Aktif sohbet için ilan bağlamı
  const [files, setFiles] = useState<Array<{ id: string; fileUrl: string; fileName: string | null; fileType: string | null; createdAt: string; senderId: string }>>([])
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null)
  const desktopMessagesEndRef = useRef<HTMLDivElement>(null)
  const mobileMessagesEndRef = useRef<HTMLDivElement>(null)
  const chatSocketRef = useRef<any>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const activeConversationRef = useRef<Conversation | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const isSendingRef = useRef(false) // ✅ Mesaj çift gönderme koruması
  const hasInitializedConversationRef = useRef<string | null>(null) // ✅ Conversation oluşturma tek seferlik koruması (userId saklar)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const scroll = () => {
      const target = [desktopMessagesEndRef.current, mobileMessagesEndRef.current].find(
        (element) => element && element.getClientRects().length > 0
      )

      target?.scrollIntoView({ behavior, block: 'end' })
    }

    window.requestAnimationFrame(() => {
      scroll()
      window.requestAnimationFrame(scroll)
    })
    window.setTimeout(scroll, 180)
  }, [])

  const lastMessageId = messages.length > 0 ? messages[messages.length - 1]?.id : null

  const syncConversationUrl = useCallback((conversationId: string) => {
    const nextParams = new URLSearchParams(searchParams?.toString())
    nextParams.set('conversation', conversationId)
    nextParams.delete('user')
    nextParams.delete('jobId')

    router.replace(`/messages?${nextParams.toString()}`, { scroll: false })
  }, [router, searchParams])

  useEffect(() => {
    if (!activeConversation || activeTab !== 'chat' || !lastMessageId) return
    scrollToBottom('auto')
  }, [activeConversation?.id, activeTab, lastMessageId, scrollToBottom])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPresenceNow(Date.now())
    }, 30_000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  const getOtherParticipant = useCallback((conversation: Conversation) => {
    const participant = conversation.participants?.find((p) => p.userId !== user?.id)
    return participant ? { ...participant, user: participant.user } : null
  }, [user?.id])

  const getLastMessage = useCallback((conversation: Conversation) => {
    if (conversation.messages && conversation.messages.length > 0) {
      return conversation.messages[0]
    }
    return null
  }, [])

  const { data: conversationsData, isPending: conversationsPending } = useQuery({
    queryKey: chatKeys.conversations(user?.id),
    queryFn: async () => {
      const response = await api.get('/chat/conversations')
      return response.data as Conversation[]
    },
    enabled: !!accessToken && !!user?.id,
    staleTime: STALE_SHORT,
    gcTime: GC_STANDARD,
    refetchOnWindowFocus: false,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })

  const conversations = conversationsData ?? []
  const conversationsBootstrapLoading =
    conversationsPending && conversationsData === undefined

  const refreshConversations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: chatKeys.conversations(user?.id) })
  }, [queryClient, user?.id])

  const syncUnreadMessageCount = useCallback(async () => {
    try {
      const response = await api.get('/chat/unread-count')
      const nextCount = Number(response.data?.count ?? 0)
      setUnreadMessageCount(Number.isFinite(nextCount) ? Math.max(0, nextCount) : 0)
    } catch (error) {
      console.warn('Unread message count could not be refreshed:', error)
    }
  }, [setUnreadMessageCount])

  const clearConversationUnreadLocally = useCallback((conversationId: string) => {
    queryClient.setQueryData<Conversation[]>(chatKeys.conversations(user?.id), (current) => {
      if (!current) return current
      return current.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation
      )
    })

    setActiveConversation((current) =>
      current?.id === conversationId ? { ...current, unreadCount: 0 } : current
    )
  }, [queryClient, user?.id])

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    clearConversationUnreadLocally(conversationId)

    try {
      const response = await api.put(`/chat/conversations/${conversationId}/read`)
      const nextCount = Number(response.data?.unreadCount)

      if (Number.isFinite(nextCount)) {
        setUnreadMessageCount(Math.max(0, nextCount))
      } else {
        await syncUnreadMessageCount()
      }

      refreshConversations()
    } catch (error) {
      console.error('Failed to mark messages as read:', error)
    }
  }, [clearConversationUnreadLocally, refreshConversations, setUnreadMessageCount, syncUnreadMessageCount])

  useEffect(() => {
    if (!conversations.length) return
    conversations.forEach((conv: Conversation) => {
      const otherUser = getOtherParticipant(conv)
      if (otherUser?.user?.id) {
        const userPresence = otherUser.user

        if (userPresence.isOnline !== undefined) {
          const isOnline = Boolean(userPresence.isOnline)
          setOnlineUsers((prev) => ({
            ...prev,
            [otherUser.user.id]: isOnline,
          }))
        }

        const activityAt = userPresence.lastActiveAt ?? userPresence.lastSeen
        if (activityAt) {
          const lastSeenString =
            typeof activityAt === 'string'
              ? activityAt
              : activityAt instanceof Date
                ? activityAt.toISOString()
                : String(activityAt)
          setUserLastSeen((prev) => ({
            ...prev,
            [otherUser.user.id]: lastSeenString,
          }))
        }
      }
    })
  }, [conversations, getOtherParticipant])

  // Socket bağlantısı - sadece bir kez kurulmalı
  useEffect(() => {
    if (!accessToken || !user) return

    const socket = initChatSocket(accessToken)
    chatSocketRef.current = socket

    socket.on('connect', () => {
      console.log('✅ Chat socket connected:', socket.id)
      socket.emit('get_active_users')
    })

    socket.on('disconnect', () => {
      console.log('❌ Chat socket disconnected')
    })

    const presencePingInterval = setInterval(() => {
      if (socket.connected) socket.emit('presence:ping')
    }, 20_000)

    const handleBeforeUnload = () => {
      if (chatSocketRef.current?.connected) chatSocketRef.current.emit('presence:offline')
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handleBeforeUnload)

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })

    // Receive message handler - aktif konuşma için
    const handleReceiveMessage = (message: Message) => {
      console.log('📨 Received message:', message)

      // Aktif konuşmaya ait mesajsa ekle
      if (message.conversationId === activeConversationRef.current?.id) {
        setMessages((prev) => {
          // Duplicate kontrolü - aynı ID'ye sahip mesaj varsa ekleme
          const exists = prev.find((m) => m.id === message.id)
          if (exists) return prev

          // Normal mesaj ekleme
          return [...prev, message]
        })
        setTimeout(() => scrollToBottom(), 0)

        const mt = (message as Message).messageType || 'TEXT'
        if (
          mt === 'POST_SHARE' &&
          (message as Message).sharedPostId &&
          !(message as Message).sharedPostPreview
        ) {
          const convId = message.conversationId
          setTimeout(() => {
            if (convId !== activeConversationRef.current?.id) return
            api
              .get(`/chat/conversations/${convId}/messages`)
              .then((res) => {
                const loaded = res.data.messages || []
                setMessages(loaded)
                setTimeout(() => scrollToBottom(), 0)
              })
              .catch(() => {})
          }, 0)
        }

        // Karşı taraftan gelen yeni mesajı otomatik okundu işaretle
        if (message.senderId !== user.id && !message.read) {
          // Socket ile okundu işaretle (anlık bildirim için)
          if (chatSocketRef.current?.connected) {
            chatSocketRef.current.emit('mark_message_read', {
              messageId: message.id,
              conversationId: message.conversationId,
            })
          }

          // REST API ile de işaretle (kalıcılık + sidebar rozeti için)
          void markConversationAsRead(message.conversationId)
        }
      }

      // Konuşma listesini güncelle
      refreshConversations()
    }

    // New message notification - başka bir konuşmadan
    const handleNewMessage = (data: { conversationId: string; message: Message }) => {
      console.log('📬 New message notification:', data)

      // Eğer aktif konuşma değilse, konuşma listesini ve global rozeti güncelle
      if (data.conversationId !== activeConversationRef.current?.id) {
        refreshConversations()
        void syncUnreadMessageCount()
      } else if (data.message.senderId !== user.id && !data.message.read) {
        void markConversationAsRead(data.conversationId)
      }
    }

    // Typing indicator - eski sistem (uyumluluk için)
    const handleUserTyping = (data: { userId: string; conversationId: string; isTyping: boolean }) => {
      if (data.conversationId === activeConversationRef.current?.id && data.userId !== user.id) {
        setIsTyping(data.isTyping)
      }
    }

    // Typing start - yeni sistem
    const handleTypingStart = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === activeConversationRef.current?.id && data.userId !== user.id) {
        setIsTyping(true)
      }
    }

    // Typing stop - yeni sistem
    const handleTypingStop = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === activeConversationRef.current?.id && data.userId !== user.id) {
        setIsTyping(false)
      }
    }

    // User status update - çevrim içi durumu
    const handleUserStatusUpdate = (data: {
      userId: string
      isOnline: boolean
      lastSeen?: string | Date | null
      lastActiveAt?: string | Date | null
    }) => {
      console.log('🟢 User status update:', data)
      setOnlineUsers((prev) => ({
        ...prev,
        [data.userId]: data.isOnline,
      }))

      const activityAt = data.lastActiveAt ?? data.lastSeen ?? (data.isOnline ? new Date() : null)
      if (activityAt) {
        const lastSeenString = typeof activityAt === 'string' ? activityAt : activityAt.toISOString()
        setUserLastSeen((prev) => ({
          ...prev,
          [data.userId]: lastSeenString,
        }))
      }

      setPresenceNow(Date.now())
    }

    // Aktif kullanıcı listesi - ilk bağlantıda
    const handleActiveUsersList = (userIds: string[]) => {
      console.log('👥 Active users list:', userIds)
      const nowIso = new Date().toISOString()
      const onlineMap: Record<string, boolean> = {}
      userIds.forEach((userId) => {
        onlineMap[userId] = true
      })
      setOnlineUsers((prev) => ({
        ...prev,
        ...onlineMap,
      }))
      setUserLastSeen((prev) => {
        const next = { ...prev }
        userIds.forEach((userId) => {
          if (!next[userId]) next[userId] = nowIso
        })
        return next
      })
      setPresenceNow(Date.now())
    }

    // Messages read - tüm mesajlar okundu (konuşma açıldığında)
    const handleMessagesRead = (data: { conversationId: string; userId: string; count?: number }) => {
      if (data.conversationId === activeConversationRef.current?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.senderId !== user.id ? { ...m, read: true } : m))
        )
      }

      clearConversationUnreadLocally(data.conversationId)
      void syncUnreadMessageCount()
    }

    // Message read update - tek mesaj okundu
    const handleMessageReadUpdate = (data: { messageId: string; conversationId: string; readBy: string }) => {
      if (data.conversationId === activeConversationRef.current?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.messageId ? { ...m, read: true } : m))
        )
      }
    }

    // Message edited - mesaj düzenlendi
    const handleMessageEdited = (message: Message) => {
      if (message.conversationId === activeConversationRef.current?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? message : m))
        )
      }
    }

    // Message deleted - mesaj silindi
    const handleMessageDeleted = (data: { id: string; conversationId: string }) => {
      if (data.conversationId === activeConversationRef.current?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.id ? { ...m, isDeleted: true, content: null, imageUrl: null } : m))
        )
      }
    }

    socket.on('receive_message', handleReceiveMessage)
    socket.on('new_message', handleNewMessage)
    socket.on('user_typing', handleUserTyping)
    socket.on('typing_start', handleTypingStart)
    socket.on('typing_stop', handleTypingStop)
    socket.on('messages_read', handleMessagesRead)
    socket.on('message_read_update', handleMessageReadUpdate)
    socket.on('messageEdited', handleMessageEdited)
    socket.on('messageDeleted', handleMessageDeleted)
    socket.on('user_status_update', handleUserStatusUpdate)
    socket.on('active_users_list', handleActiveUsersList)

    return () => {
      clearInterval(presencePingInterval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handleBeforeUnload)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }

      socket.off('connect')
      socket.off('disconnect')
      socket.off('connect_error')
      socket.off('receive_message', handleReceiveMessage)
      socket.off('new_message', handleNewMessage)
      socket.off('user_typing', handleUserTyping)
      socket.off('typing_start', handleTypingStart)
      socket.off('typing_stop', handleTypingStop)
      socket.off('messages_read', handleMessagesRead)
      socket.off('message_read_update', handleMessageReadUpdate)
      socket.off('messageEdited', handleMessageEdited)
      socket.off('messageDeleted', handleMessageDeleted)
      socket.off('user_status_update', handleUserStatusUpdate)
      socket.off('active_users_list', handleActiveUsersList)
    }
  }, [
    accessToken,
    user,
    refreshConversations,
    markConversationAsRead,
    syncUnreadMessageCount,
    clearConversationUnreadLocally,
  ])

  // Medya ve dosyaları yükle
  useEffect(() => {
    if (!activeConversation) {
      setMedia([])
      setFiles([])
      return
    }

    if (activeTab === 'media') {
      setLoadingMedia(true)
      api
        .get(`/chat/conversations/${activeConversation.id}/media`)
        .then((res) => {
          setMedia(res.data)
        })
        .catch((err) => {
          console.error('Failed to load media:', err)
          setMedia([])
        })
        .finally(() => {
          setLoadingMedia(false)
        })
    } else if (activeTab === 'files') {
      setLoadingFiles(true)
      api
        .get(`/chat/conversations/${activeConversation.id}/files`)
        .then((res) => {
          setFiles(res.data)
        })
        .catch((err) => {
          console.error('Failed to load files:', err)
          setFiles([])
        })
        .finally(() => {
          setLoadingFiles(false)
        })
    }
  }, [activeTab, activeConversation])

  // Yeni mesaj geldiğinde medya/dosya listelerini güncelle
  useEffect(() => {
    if (!chatSocketRef.current || !activeConversation) return

    const socket = chatSocketRef.current

    const handleNewMessage = (message: Message) => {
      if (message.conversationId !== activeConversation?.id) return

      // Eğer görsel mesaj ise medya listesine ekle
      if (message.imageUrl && !message.isDeleted) {
        setMedia((prev) => {
          // Zaten varsa ekleme
          if (prev.some((m) => m.id === message.id)) return prev
          return [{ id: message.id, imageUrl: message.imageUrl!, createdAt: message.createdAt, senderId: message.senderId }, ...prev]
        })
      }

      // Eğer dosya mesajı ise dosya listesine ekle
      if (message.fileUrl && !message.isDeleted) {
        setFiles((prev) => {
          // Zaten varsa ekleme
          if (prev.some((f) => f.id === message.id)) return prev
          return [
            {
              id: message.id,
              fileUrl: message.fileUrl!,
              fileName: message.fileName || null,
              fileType: message.fileType || null,
              createdAt: message.createdAt,
              senderId: message.senderId,
            },
            ...prev,
          ]
        })
      }

      // Mesaj silindiğinde listelerden çıkar
      if (message.isDeleted) {
        setMedia((prev) => prev.filter((m) => m.id !== message.id))
        setFiles((prev) => prev.filter((f) => f.id !== message.id))
      }
    }

    socket.on('receive_message', handleNewMessage)

    return () => {
      socket.off('receive_message', handleNewMessage)
    }
  }, [activeConversation])

  // ACCEPTED başvuruları yükle (ilan üzerinden etiketi için)
  useEffect(() => {
    if (!accessToken || !user?.id) return

    async function loadAcceptedApplications() {
      try {
        const response = await api.get('/jobs/me/applications')
        const applications = response.data || []
        const acceptedMap: Record<string, { listingTitle: string; company?: string }> = {}

        applications.forEach((app: any) => {
          if (app.status === 'ACCEPTED' && app.jobListing?.createdBy?.id) {
            // İlan sahibinin ID'si ile eşleştir
            acceptedMap[app.jobListing.createdBy.id] = {
              listingTitle: app.jobListing.title,
              company: app.jobListing.company,
            }
          }
        })

        setJobApplications(acceptedMap)
      } catch (error) {
        console.error('Failed to load accepted applications:', error)
      }
    }

    loadAcceptedApplications()
  }, [accessToken, user?.id])

  // ✅ İlan bağlamını çek (sadece jobId query parametresi varsa)
  useEffect(() => {
    const jobId = searchParams?.get('jobId')
    if (!jobId) {
      setJobContext(null)
      return
    }

    // İlan bilgisini çek
    const fetchJobContext = async () => {
      try {
        const response = await api.get(`/jobs/public`)
        const jobs = response.data || []
        const job = jobs.find((j: any) => j.id === jobId)

        if (job) {
          setJobContext({
            id: job.id,
            title: job.title,
          })
        }
      } catch (error) {
        console.error('Failed to fetch job context:', error)
        setJobContext(null)
      }
    }

    fetchJobContext()
  }, [searchParams?.get('jobId'), accessToken])

  // URL'den gelen conversation ID ile otomatik açma
  useEffect(() => {
    const conversationId = searchParams?.get('conversation')
    if (!conversationId || !accessToken || !user?.id || activeConversation?.id === conversationId) {
      return
    }

    let cancelled = false

    const openConversationFromUrl = async () => {
      const conversation = conversations.find((c) => c.id === conversationId)
      if (conversation) {
        if (cancelled) return
        openConversation(conversation, { syncUrl: false })
        return
      }

      try {
        const response = await api.get(`/chat/conversations/${conversationId}`)
        const loadedConversation = response.data as Conversation

        if (cancelled) return

        queryClient.setQueryData<Conversation[]>(
          chatKeys.conversations(user.id),
          (prev) => {
            const list = prev ?? []
            const existsInPrev = list.some((conv) => conv.id === loadedConversation.id)
            return existsInPrev ? list : [loadedConversation, ...list]
          }
        )

        openConversation(loadedConversation, { syncUrl: false })
      } catch (error) {
        console.error('Failed to open conversation from URL:', error)
      }
    }

    void openConversationFromUrl()

    return () => {
      cancelled = true
    }
  }, [searchParams, conversations, activeConversation?.id, accessToken, user?.id, queryClient])

  // URL'den gelen user ID ile otomatik konuşma açma/başlatma
  useEffect(() => {
    const userId = searchParams?.get('user')

    // ✅ KRİTİK KORUMA: Bu useEffect sadece bir kez çalışmalı (redirect sonrası)
    // Eğer aynı userId için zaten işlem yapıldıysa tekrar yapma
    if (!userId || hasInitializedConversationRef.current === userId || !user?.id || conversationsBootstrapLoading) {
      return
    }

    // ✅ Guard: Bu userId için işlem yapıldığını işaretle
    hasInitializedConversationRef.current = userId

    const initializeConversation = async () => {
      // Önce mevcut konuşmaları kontrol et
      const existingConversation = conversations.find((conv) => {
        const participant = conv.participants?.find((p) => p.userId === userId)
        return participant !== undefined
      })

      if (existingConversation) {
        // Konuşma varsa aç
        openConversation(existingConversation)
        return
      }

      // Konuşma yoksa backend'den get/create iste (backend duplicate kontrolü yapacak)
      try {
        const response = await api.post('/chat/conversations', {
          participantIds: [userId],
        })
        const conversation = response.data

        // Backend duplicate kontrolü yaptığı için, dönen conversation zaten mevcut olabilir
        // Tekrar kontrol et (state güncellemesi sırasında race condition önleme)
        const stillExists = conversations.some((conv) => conv.id === conversation.id)
        if (!stillExists) {
          queryClient.setQueryData<Conversation[]>(
            chatKeys.conversations(user?.id),
            (prev) => {
              const list = prev ?? []
              const existsInPrev = list.some((conv) => conv.id === conversation.id)
              return existsInPrev ? list : [conversation, ...list]
            }
          )
        }

        // Konuşmayı aç
        openConversation(conversation)
      } catch (error: any) {
        console.error('Failed to start conversation:', error)
        // Hata durumunda sessizce devam et (kullanıcı manuel olarak açabilir)
        hasInitializedConversationRef.current = null // Hata durumunda tekrar denemeye izin ver
      }
    }

    // Konuşmalar yüklendikten sonra işlem yap
    initializeConversation()
  }, [searchParams?.get('user'), user?.id, conversationsBootstrapLoading]) // ✅ Sadece userId ve liste ilk yükü değiştiğinde çalış

  // Aktif konuşma değiştiğinde mesajları yükle ve socket room'una join ol
  useEffect(() => {
    // Ref'i güncelle
    activeConversationRef.current = activeConversation

    // Typing durumunu sıfırla
    setIsTyping(false)

    // Typing timeout'unu temizle
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    if (!activeConversation) return

    // İlk mesajları yükle
    void loadMessages(activeConversation.id)

    // 🔄 REST POLLING - Socket yokken mesajları düzenli çek
    const pollingInterval = setInterval(() => {
      if (!chatSocketRef.current?.connected) {
        void loadMessages(activeConversation.id)
      }
    }, 7000)

    // Socket varsa join ol (opsiyonel)
    if (chatSocketRef.current?.connected) {
      chatSocketRef.current.emit('join_conversation', {
        conversationId: activeConversation.id
      }, (response: any) => {
        if (response?.error) {
          console.error('Failed to join conversation:', response.error)
        } else {
          console.log('✅ Joined conversation:', activeConversation.id)
        }
      })

      // Mesajları okundu olarak işaretle
      void markConversationAsRead(activeConversation.id)
    }

    return () => {
      // 🛑 Polling'i durdur
      clearInterval(pollingInterval)

      // Typing timeout'unu temizle
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }

      if (activeConversation && chatSocketRef.current?.connected) {
        chatSocketRef.current.emit('leave_conversation', {
          conversationId: activeConversation.id,
        })
        console.log('👋 Left conversation:', activeConversation.id)
      }
    }
  }, [activeConversation, markConversationAsRead])

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/messages`)
      const loadedMessages = response.data.messages || []

      if (activeConversationRef.current?.id !== conversationId) {
        return
      }
      
      // 🔍 Yeni mesaj var mı kontrol et (duplicate eklemeyi önle)
      let shouldScroll = false
      setMessages((prevMessages) => {
        // Eğer mesaj sayısı değişmediyse ve içerik aynıysa güncelleme yapma
        if (prevMessages.length === loadedMessages.length) {
          const lastPrevId = prevMessages[prevMessages.length - 1]?.id
          const lastLoadedId = loadedMessages[loadedMessages.length - 1]?.id
          if (lastPrevId === lastLoadedId) {
            return prevMessages
          }
        }
        
        shouldScroll = true
        return loadedMessages
      })
      
      if (shouldScroll) {
        scrollToBottom()
      }

      // Mesajlar yüklendiğinde okundu işaretle
      if (loadedMessages.length > 0) {
        // Kendi göndermediğimiz mesajları bul
        const unreadMessages = loadedMessages.filter(
          (m: Message) => m.senderId !== user?.id && !m.read
        )

        if (unreadMessages.length > 0) {
          console.log(`📖 [loadMessages] Marking ${unreadMessages.length} messages as read`)
          // Tüm okunmamış mesajları backend'de okundu işaretle (REST API)
          await markConversationAsRead(conversationId)

          // Socket varsa son mesajı socket ile de okundu işaretle
          if (chatSocketRef.current?.connected) {
            const lastUnreadMessage = unreadMessages[unreadMessages.length - 1]
            chatSocketRef.current?.emit('mark_message_read', {
              messageId: lastUnreadMessage.id,
              conversationId,
            })
          }
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const openConversation = async (
    conversation: Conversation,
    options: { syncUrl?: boolean } = {}
  ) => {
    clearConversationUnreadLocally(conversation.id)
    setActiveConversation(conversation)
    activeConversationRef.current = conversation
    setMessages([])
    if (options.syncUrl !== false) {
      syncConversationUrl(conversation.id)
    }
  }

  // ✅ Sohbet silme (soft delete)
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await api.delete(`/chat/conversations/${conversationId}`)

      queryClient.setQueryData<Conversation[]>(chatKeys.conversations(user?.id), (prev) =>
        (prev ?? []).filter((c) => c.id !== conversationId)
      )

      // Eğer silinen sohbet aktif sohbetse, aktif sohbeti temizle
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null)
        activeConversationRef.current = null
        setMessages([])
      }
    } catch (error: any) {
      console.error('Failed to delete conversation:', error)
      alert(error?.response?.data?.message || 'Sohbet silinirken bir hata oluştu')
    }
  }

  const handleNewMessageSelect = async (conversationId: string) => {
    // Konuşmayı direkt yükle ve aç
    try {
      const response = await api.get(`/chat/conversations/${conversationId}`)
      const conversation = response.data
      openConversation(conversation)

      refreshConversations()
    } catch (error) {
      console.error('Failed to load conversation:', error)
    }
  }

  // Input değişikliği ve typing handler - tek fonksiyon
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMessageText(value)

    if (!activeConversation || !chatSocketRef.current?.connected) return

    // typing_start gönder
    chatSocketRef.current.emit('typing_start', {
      conversationId: activeConversation.id,
    })

    // Önceki timeout'u temizle
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // 2 saniye sonra typing_stop gönder
    typingTimeoutRef.current = setTimeout(() => {
      if (chatSocketRef.current?.connected) {
        chatSocketRef.current.emit('typing_stop', {
          conversationId: activeConversation.id,
        })
      }
    }, 2000)
  }

  // Görsel seçme
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Dosya boyutu kontrolü (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Görsel boyutu 5MB\'dan küçük olmalıdır')
        return
      }

      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Görseli kaldır
  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Dosya seçme
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Dosya boyutu kontrolü (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert('Dosya boyutu 50MB\'dan küçük olmalıdır')
        return
      }

      setSelectedFile(file)
      setFilePreview({
        name: file.name,
        type: file.type || 'application/octet-stream',
      })
    }
  }

  // Dosyayı kaldır
  const removeFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
  }

  // Mesaj gönderme - görsel, dosya ve/veya metin
  const sendMessage = async () => {
    console.log('🚀 [sendMessage] FUNCTION CALLED', {
      messageText: messageText?.substring(0, 20),
      hasActiveConversation: !!activeConversation,
      activeConversationId: activeConversation?.id,
      isSending: isSendingRef.current,
    })

    // ✅ ÇİFT GÖNDERME KORUMASI: Eğer mesaj gönderiliyorsa tekrar gönderme
    if (isSendingRef.current) {
      console.log('⚠️ Mesaj zaten gönderiliyor, çift gönderme engellendi')
      return
    }

    // ✅ Active conversation ve user kontrolü - Socket kontrolü kaldırıldı (REST API fallback var)
    if ((!messageText.trim() && !selectedImage && !selectedFile) || !activeConversation || !user) {
      console.log('⚠️ [sendMessage] Validation failed:', {
        hasText: !!messageText.trim(),
        messageTextLength: messageText?.length,
        hasImage: !!selectedImage,
        hasFile: !!selectedFile,
        hasConversation: !!activeConversation,
        hasUser: !!user,
        activeConversation: activeConversation,
      })
      return
    }

    console.log('📤 [sendMessage] Starting to send message:', {
      conversationId: activeConversation.id,
      hasContent: !!messageText.trim(),
      hasImage: !!selectedImage,
      hasFile: !!selectedFile,
    })

    // Kilit açıldı
    isSendingRef.current = true

    let imageUrl: string | null = null
    let fileUrl: string | null = null
    let fileName: string | null = null
    let fileType: string | null = null

    // Eğer görsel seçildiyse önce yükle
    if (selectedImage) {
      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', selectedImage)

        const uploadResponse = await api.post('/media/upload?type=image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })

        imageUrl = uploadResponse.data.url || uploadResponse.data.imageUrl || uploadResponse.data.path
        console.log('📸 Image uploaded:', imageUrl)
      } catch (error) {
        console.error('Failed to upload image:', error)
        alert('Görsel yüklenirken bir hata oluştu')
        setIsUploading(false)
        return
      } finally {
        setIsUploading(false)
      }
    }

    // Eğer dosya seçildiyse önce yükle
    if (selectedFile) {
      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', selectedFile)

        const uploadResponse = await api.post('/media/upload?type=file', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })

        fileUrl = uploadResponse.data.url
        fileName = uploadResponse.data.fileName || selectedFile.name
        fileType = uploadResponse.data.fileType || selectedFile.type || 'application/octet-stream'
        console.log('📎 File uploaded:', fileUrl)
      } catch (error) {
        console.error('Failed to upload file:', error)
        alert('Dosya yüklenirken bir hata oluştu')
        setIsUploading(false)
        return
      } finally {
        setIsUploading(false)
      }
    }

    const content = messageText.trim() || null
    setMessageText('')
    setSelectedImage(null)
    setImagePreview(null)
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    // Typing timeout'unu temizle
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    // Typing durumunu durdur
    if (chatSocketRef.current?.connected) {
      chatSocketRef.current.emit('typing_stop', {
        conversationId: activeConversation.id,
      })
    }

    // ✅ Optimistic update - Mesajı anında UI'ya ekle
    const tempMessageId = `temp-${Date.now()}-${Math.random()}`
    const tempMessage: Message = {
      id: tempMessageId,
      content,
      imageUrl: imageUrl || null,
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileType: fileType || null,
      senderId: user.id,
      conversationId: activeConversation.id,
      read: false,
      pending: true, // Geçici mesaj flag'i
      createdAt: new Date().toISOString(),
      sender: {
        id: user.id,
        username: user.username || 'Kullanıcı',
        avatar: user.avatar || undefined,
      },
    }

    // Anında UI'ya ekle
    setMessages((prev) => [...prev, tempMessage])
    setTimeout(() => scrollToBottom(), 0)

    // ✅ Mesaj gönderme - Önce REST API dene (Vercel uyumlu), socket opsiyonel
    try {
      console.log('📡 [sendMessage] Sending via REST API...', {
        conversationId: activeConversation.id,
        hasContent: !!content,
        hasImage: !!imageUrl,
        hasFile: !!fileUrl,
      })
      
      const response = await api.post('/chat/messages', {
        conversationId: activeConversation.id,
        content: content || undefined,
        imageUrl: imageUrl || undefined,
        fileUrl: fileUrl || undefined,
        fileName: fileName || undefined,
        fileType: fileType || undefined,
      })

      console.log('✅ [sendMessage] Message sent successfully:', {
        id: response.data.id,
        senderId: response.data.senderId,
        conversationId: response.data.conversationId,
      })

      // Temp mesajı gerçek mesajla değiştir
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMessageId ? response.data : m))
      )

      refreshConversations()
      setTimeout(() => scrollToBottom(), 0)
    } catch (error: any) {
      console.error('❌ [sendMessage] Failed to send message:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      })
      
      // Hata durumunda temp mesajı kaldır
      setMessages((prev) => prev.filter((m) => m.id !== tempMessageId))
      
      // Input'u geri yükle
      setMessageText(content || '')
      
      const backendError = error.response?.data?.message
      const errorMessage = backendError || error.message || 'Mesaj gönderilirken bir hata oluştu'
      alert(errorMessage)
    } finally {
      // ✅ Kilit kaldırıldı (başarılı veya hatalı olsun)
      isSendingRef.current = false
    }
  }

  // Mesaj düzenleme
  const handleEditMessage = async (messageId: string, oldContent: string | null) => {
    const newContent = prompt('Yeni mesaj:', oldContent || '')
    if (newContent && newContent.trim() !== oldContent?.trim()) {
      try {
        await api.put(`/chat/messages/${messageId}/edit`, {
          content: newContent.trim(),
        })
        setEditingMessageId(null)
        setShowMenuForId(null)
      } catch (error) {
        console.error('Failed to edit message:', error)
        alert('Mesaj düzenlenirken bir hata oluştu')
      }
    }
  }

  // Mesaj silme
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) {
      return
    }

    try {
      await api.delete(`/chat/messages/${messageId}`)
      setShowMenuForId(null)
    } catch (error) {
      console.error('Failed to delete message:', error)
      alert('Mesaj silinirken bir hata oluştu')
    }
  }

  // Menü dışına tıklanınca kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenuForId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true
    const otherUser = getOtherParticipant(conv)
    const searchLower = searchQuery.toLowerCase()
    return (
      otherUser?.user?.username?.toLowerCase().includes(searchLower) ||
      otherUser?.user?.fullName?.toLowerCase().includes(searchLower)
    )
  })

  // ✅ Optimistic render - UI hemen görünsün, fetch arkada devam etsin
  return (
    <div className="relative flex h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] overflow-hidden rounded-[28px] border border-gray-200/80 bg-white/[0.85] shadow-[0_28px_90px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#080d18]/[0.88] dark:shadow-[0_32px_110px_rgba(0,0,0,0.38)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-28 -top-24 h-72 w-72 rounded-full bg-brand-orange/[0.16] blur-3xl" />
        <div className="absolute right-10 top-8 h-64 w-64 rounded-full bg-[#2f7cff]/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-orange/[0.55] to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,transparent_28%,rgba(47,124,255,0.05)_100%)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0%,transparent_36%,rgba(255,123,0,0.05)_100%)]" />
      </div>
      {/* Sol Panel - Konuşma Listesi */}
      <div className="relative z-10 flex w-full flex-col border-r border-gray-200/80 bg-white/[0.72] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035] md:w-1/3">
        {/* Başlık ve Arama */}
        <div className="border-b border-gray-200/80 bg-white/60 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-orange/80">
                Feellink
              </p>
              <h1 className="text-xl font-bold text-gray-950 dark:text-white">Mesajlar</h1>
            </div>
            <button
              onClick={() => setShowNewMessageModal(true)}
              className="rounded-full border border-brand-orange/25 bg-brand-orange/10 px-3.5 py-2 text-sm font-semibold text-brand-orange shadow-[0_10px_30px_rgba(255,123,0,0.12)] transition-all hover:-translate-y-0.5 hover:border-brand-orange/[0.45] hover:bg-brand-orange/[0.15] hover:text-[#e26d00] dark:bg-brand-orange/[0.12] dark:text-orange-300"
            >
              + Yeni Mesaj
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-gray-200/90 bg-white/70 py-2.5 pl-10 pr-4 text-sm text-gray-900 shadow-inner shadow-gray-200/40 outline-none transition-all placeholder:text-gray-400 focus:border-brand-orange/[0.45] focus:ring-4 focus:ring-brand-orange/[0.12] dark:border-white/10 dark:bg-white/[0.055] dark:text-white dark:shadow-none dark:placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Konuşma Listesi */}
        <div className="flex-1 overflow-y-auto px-1 py-3">
          {conversationsBootstrapLoading ? (
            // ✅ Skeleton loader - konuşma listesi için
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-gray-200/60 bg-white/50 p-3 animate-pulse dark:border-white/10 dark:bg-white/[0.035]">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-white/10 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex h-full items-center justify-center p-5 text-gray-500 dark:text-gray-400">
              <div className="rounded-3xl border border-gray-200/80 bg-white/[0.65] px-6 py-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.04]">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange dark:bg-brand-orange/[0.15]">
                  <MessageCircle className="h-6 w-6" strokeWidth={1.6} />
                </div>
                <p className="text-sm font-medium">
                {searchQuery ? 'Sonuç bulunamadı' : 'Henüz mesajınız yok'}
              </p>
              </div>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const otherUser = getOtherParticipant(conversation)
              const lastMessage = getLastMessage(conversation)
              const isActive = activeConversation?.id === conversation.id

              if (!otherUser?.user) return null

              const userWithPresence = otherUser.user
              const presenceDate =
                userLastSeen[otherUser.user.id] ??
                userWithPresence.lastActiveAt ??
                userWithPresence.lastSeen
              const rawOnline =
                onlineUsers[otherUser.user.id] ??
                userWithPresence.isOnline ??
                false
              const isOnline = isPresenceOnline(rawOnline, presenceDate, presenceNow)

              return (
                <div
                  key={conversation.id}
                  onClick={() => openConversation(conversation)}
                  className={`group relative mx-2 mb-2 cursor-pointer rounded-2xl border p-3.5 transition-all duration-300 ${isActive
                    ? 'border-brand-orange/[0.45] bg-brand-orange/10 shadow-[0_18px_45px_rgba(255,123,0,0.14)] dark:bg-brand-orange/[0.14]'
                    : 'border-transparent hover:border-gray-200/80 hover:bg-white/80 hover:shadow-[0_14px_38px_rgba(15,23,42,0.07)] dark:hover:border-white/10 dark:hover:bg-white/[0.055]'
                    }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-4 h-10 w-1 rounded-r-full bg-brand-orange shadow-[0_0_22px_rgba(255,123,0,0.75)]" />
                  )}
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-brand-orange/[0.55] via-white/60 to-[#2f7cff]/[0.35] p-[1.5px] dark:via-white/[0.15]">
                      <Avatar
                        src={otherUser?.user?.avatar}
                        alt={otherUser?.user?.username || 'User'}
                        className="h-full w-full rounded-full object-cover ring-2 ring-white/80 dark:ring-[#0b1020]"
                      />
                      {/* Çevrim içi durumu göstergesi */}
                      {isOnline ? (
                        <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.85)] dark:border-[#0b1020]"></div>
                      ) : null}
                      {/* Okunmamış mesaj sayısı */}
                      {conversation.unreadCount && conversation.unreadCount > 0 ? (
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#ffad5f] to-brand-orange px-1 text-[10px] font-black text-white shadow-[0_0_18px_rgba(255,123,0,0.65)]">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="flex items-center gap-1 truncate font-semibold text-gray-950 dark:text-white">
                            {otherUser?.user?.fullName || otherUser?.user?.username || 'Kullanıcı'}
                            <ProRoleBadge roles={(otherUser?.user as any)?.roles} plan={(otherUser?.user as any)?.plan} />
                          </h3>
                          {/* 🔵 CONTEXT'E GÖRE BADGE GÖSTER */}
                          {conversation.context === 'JOB_APPLICATION' ? (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-brand-orange dark:text-orange-300">
                              <span className="text-brand-orange">📌</span>
                              <span>İlan üzerinden mesaj</span>
                              {jobApplications[otherUser?.user?.id || ''] && (
                                <span> • {jobApplications[otherUser.user.id].listingTitle}</span>
                              )}
                            </p>
                          ) : conversation.context === 'DIRECT' ? (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                              </svg>
                              <span>Doğrudan mesaj</span>
                            </p>
                          ) : null}
                        </div>
                        {lastMessage ? (
                          <span className="ml-2 whitespace-nowrap text-[11px] font-medium text-gray-500 dark:text-gray-400">
                            {formatTimeAgo(lastMessage.createdAt)}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        {lastMessage ? (
                          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                            {lastMessage.imageUrl ? (
                              <span className="flex flex-shrink-0 items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                <ImageIcon size={14} className="text-brand-orange/80" />
                                <span>Fotoğraf</span>
                              </span>
                            ) : lastMessage.fileUrl ? (
                              <>
                                <span className="flex flex-shrink-0 items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                  <Paperclip size={14} className="text-brand-orange/80" />
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400 truncate min-w-0">
                                  {lastMessage.fileName || 'Dosya'}
                                </span>
                              </>
                            ) : lastMessage.content ? (
                              <span className="block min-w-0 truncate text-sm text-gray-600 dark:text-gray-400">
                                {lastMessage.content}
                              </span>
                            ) : (
                              <span className="flex-shrink-0 text-sm text-gray-600 dark:text-gray-400">
                                Mesaj
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="flex-1 text-sm italic text-gray-400 dark:text-gray-500">
                            Henüz mesaj yok
                          </p>
                        )}
                        <span className="flex-shrink-0 whitespace-nowrap text-[11px] text-gray-500 dark:text-gray-400">
                          {getPresenceLabel(rawOnline, presenceDate, presenceNow)}
                        </span>
                      </div>
                    </div>
                    {/* ✅ Sohbet Silme Menüsü */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation() // Konuşma açılmasını engelle
                        setDeleteConversationId(conversation.id)
                      }}
                      className="ml-1 rounded-full border border-transparent p-1.5 opacity-0 transition-all hover:border-gray-200 hover:bg-white/80 group-hover:opacity-100 dark:hover:border-white/10 dark:hover:bg-white/10"
                      title="Sohbeti Sil"
                    >
                      <MoreVertical size={16} className="text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Sağ Panel - Aktif Sohbet */}
      <div className="relative z-10 hidden flex-1 flex-col bg-white/[0.45] dark:bg-white/[0.018] md:flex">
        {activeConversation ? (
          <>
            {/* Sohbet Başlığı */}
            <div className="border-b border-gray-200/80 bg-white/[0.58] p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
              {(() => {
                const otherUser = getOtherParticipant(activeConversation)
                if (!otherUser?.user) return null

                const userWithExtras = otherUser.user
                const lastSeenDate =
                  userLastSeen[otherUser.user.id] ??
                  userWithExtras.lastActiveAt ??
                  userWithExtras.lastSeen
                const rawOnline =
                  onlineUsers[otherUser.user.id] ??
                  userWithExtras.isOnline ??
                  false
                const isOnline = isPresenceOnline(rawOnline, lastSeenDate, presenceNow)

                return (
                  <div className="flex items-center gap-3">
                    <div className="relative rounded-full bg-gradient-to-br from-brand-orange/60 via-white/60 to-[#2f7cff]/[0.35] p-[1.5px] dark:via-white/[0.15]">
                      <Avatar
                        src={otherUser?.user?.avatar}
                        alt={otherUser?.user?.username || 'User'}
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-white/[0.85] dark:ring-[#0b1020]"
                      />
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.85)] dark:border-[#0b1020]"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h2 className="flex items-center gap-1 font-semibold text-gray-950 dark:text-white">
                        {otherUser?.user?.fullName || otherUser?.user?.username || 'Kullanıcı'}
                        <ProRoleBadge roles={(otherUser?.user as any)?.roles} plan={(otherUser?.user as any)?.plan} />
                      </h2>
                      {/* ✅ İlan bağlamı göster (sohbet header'ında) */}
                      {jobContext && (
                        <div className="mt-1 inline-flex rounded-full border border-brand-orange/20 bg-brand-orange/10 px-3 py-1 text-xs text-brand-orange dark:bg-brand-orange/[0.15] dark:text-orange-300">
                          İlan: {jobContext.title}
                        </div>
                      )}
                      {/* Eski jobApplications (kabul edilmiş başvurular için) */}
                      {!jobContext && jobApplications[otherUser?.user?.id || ''] && (
                        <p className="text-xs text-brand-orange dark:text-orange-400 mt-1">
                          İlan üzerinden • {jobApplications[otherUser.user.id].listingTitle}
                        </p>
                      )}
                      {isTyping ? (
                        <p className="text-xs font-medium text-brand-orange">Yazıyor...</p>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {getPresenceLabel(rawOnline, lastSeenDate, presenceNow)}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Mesajlar Listesi */}
            {activeTab === 'chat' && (
              <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(255,123,0,0.08),transparent_32%),linear-gradient(180deg,rgba(248,250,252,0.92),rgba(241,245,249,0.68))] p-4 dark:bg-[radial-gradient(circle_at_top_left,rgba(255,123,0,0.09),transparent_34%),linear-gradient(180deg,rgba(4,8,16,0.70),rgba(4,8,16,0.94))]">
                <div className="flex min-h-full flex-col justify-end gap-3">
                  {messages.map((message, index) => {
                    const isOwn = message.senderId === user?.id
                    const showReadReceipt = isOwn && message.read

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex items-start gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                          {!isOwn && (
                            <Avatar
                              src={message.sender.avatar}
                              alt={message.sender.username}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          )}
                          <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} relative`}>
                            <div
                              className={`relative max-w-[400px] rounded-2xl px-3.5 py-2.5 shadow-sm group ${isOwn
                                ? 'bg-gradient-to-br from-[#ff9f48] to-brand-orange text-white shadow-[0_14px_36px_rgba(255,123,0,0.22)]'
                                : 'border border-gray-200/80 bg-white/[0.92] text-gray-900 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/[0.075] dark:text-white'
                                }`}
                            >
                              {/* Silinen mesaj */}
                              {message.isDeleted ? (
                                <p className="text-sm italic text-gray-400 dark:text-gray-500">
                                  Bu mesaj silindi
                                </p>
                              ) : (message.messageType || 'TEXT') === 'POST_SHARE' && message.sharedPostId ? (
                                <SharedPostMessageCard
                                  preview={
                                    message.sharedPostPreview || {
                                      postId: message.sharedPostId,
                                      state: 'ok',
                                    }
                                  }
                                  isOwnBubble={isOwn}
                                />
                              ) : (
                                <>
                                  {/* Görsel mesaj */}
                                  {message.imageUrl && (
                                    <div className="mb-2 rounded-xl overflow-hidden">
                                      <img
                                        src={message.imageUrl}
                                        alt="Mesaj görseli"
                                        className="max-w-full max-h-64 object-cover w-full"
                                      />
                                    </div>
                                  )}
                                  {/* Dosya mesaj */}
                                  {message.fileUrl && (
                                    <a
                                      href={message.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-2 mt-1 mb-2 rounded-xl px-3 py-2 border transition-colors ${isOwn
                                        ? 'bg-white/20 border-white/30 hover:bg-white/30'
                                        : 'bg-gray-50/90 dark:bg-white/[0.06] border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/[0.1]'
                                        }`}
                                    >
                                      <div className={`p-1.5 rounded-lg ${isOwn ? 'bg-white/20' : 'bg-brand-orange/10'
                                        }`}>
                                        <FileText size={16} className={isOwn ? 'text-white' : 'text-brand-orange'} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-medium truncate ${isOwn ? 'text-white' : 'text-gray-900 dark:text-white'
                                          }`}>
                                          {message.fileName || 'Dosya'}
                                        </p>
                                        <p className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                                          }`}>
                                          {message.fileType ? message.fileType.split('/')[1]?.toUpperCase() || 'DOSYA' : 'DOSYA'}
                                        </p>
                                      </div>
                                      <Download size={14} className={isOwn ? 'text-white/70' : 'text-gray-400'} />
                                    </a>
                                  )}
                                  {/* Metin mesaj */}
                                  {message.content && (
                                    <p className="text-sm whitespace-pre-wrap break-words">
                                      {message.content}
                                      {message.isEdited && (
                                        <span className="ml-1 text-xs opacity-70">
                                          (düzenlendi)
                                        </span>
                                      )}
                                    </p>
                                  )}
                                </>
                              )}

                              {/* Menü sadece kendi mesajlarında ve silinmemiş mesajlarda */}
                              {isOwn && !message.isDeleted && (message.messageType || 'TEXT') !== 'POST_SHARE' && (
                                <div className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="relative" ref={menuRef}>
                                    <button
                                      onClick={() => setShowMenuForId(showMenuForId === message.id ? null : message.id)}
                                      className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                      <MoreVertical size={16} className="text-gray-500 dark:text-gray-400" />
                                    </button>

                                    {/* Menü dropdown */}
                                    {showMenuForId === message.id && (
                                      <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[120px]">
                                        <button
                                          onClick={() => handleEditMessage(message.id, message.content || null)}
                                          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                        >
                                          <Edit size={14} />
                                          Düzenle
                                        </button>
                                        <button
                                          onClick={() => handleDeleteMessage(message.id)}
                                          className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                        >
                                          <Trash2 size={14} />
                                          Sil
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                              {showReadReceipt ? (
                              <span className={`text-[11px] font-medium ${isOwn ? 'text-brand-orange/80 dark:text-orange-300/80' : 'text-gray-400 dark:text-gray-500'}`}>
                                  Görüldü
                                </span>
                              ) : null}
                              <p className={`text-xs ${isOwn ? 'text-brand-orange/75 dark:text-orange-300/75' : 'text-gray-500 dark:text-gray-400'}`}>
                                {formatTimeAgo(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={desktopMessagesEndRef} aria-hidden />
                </div>
              </div>
            )}

            {/* Yazıyor... göstergesi */}
            {activeTab === 'chat' && isTyping && (
              <div className="border-t border-gray-200/70 bg-white/[0.55] px-4 py-2 text-sm italic text-gray-500 backdrop-blur dark:border-white/10 dark:bg-white/[0.035] dark:text-gray-400">
                Yazıyor...
              </div>
            )}

            {/* Görsel Önizleme */}
            {imagePreview && (
              <div className="border-t border-gray-200/80 bg-white/[0.65] px-4 py-2 backdrop-blur dark:border-white/10 dark:bg-white/[0.035]">
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Önizleme"
                    className="max-w-xs max-h-40 rounded-xl object-cover"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    type="button"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Dosya Önizleme */}
            {filePreview && (
              <div className="border-t border-gray-200/80 bg-white/[0.65] px-4 py-2 backdrop-blur dark:border-white/10 dark:bg-white/[0.035]">
                <div className="relative inline-flex items-center gap-3 rounded-2xl border border-gray-200/80 bg-white/[0.85] px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                  <div className="p-1.5 rounded-lg bg-brand-orange/10">
                    <FileText size={18} className="text-brand-orange" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {filePreview.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {filePreview.type.split('/')[1]?.toUpperCase() || 'DOSYA'}
                    </p>
                  </div>
                  <button
                    onClick={removeFile}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    type="button"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Mesaj Input - Sadece chat sekmesinde */}
            {activeTab === 'chat' && (
              <div className="border-t border-gray-200/80 bg-white/70 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    sendMessage()
                  }}
                  className="flex gap-2"
                >
                  {/* Görsel Yükleme Butonu */}
                  <label className="cursor-pointer rounded-full border border-gray-200/80 bg-white/75 p-2 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-orange/30 hover:bg-brand-orange/10 dark:border-white/10 dark:bg-white/[0.055] dark:hover:bg-brand-orange/[0.12]">
                    <ImageIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      ref={fileInputRef}
                      className="hidden"
                    />
                  </label>
                  {/* Dosya Yükleme Butonu */}
                  <label className="cursor-pointer rounded-full border border-gray-200/80 bg-white/75 p-2 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-orange/30 hover:bg-brand-orange/10 dark:border-white/10 dark:bg-white/[0.055] dark:hover:bg-brand-orange/[0.12]">
                    <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    value={messageText}
                    onChange={handleChange}
                    onKeyDown={(e) => {
                      // ✅ Enter tuşu form submit'i tetikleyecek, ayrıca sendMessage çağırmaya gerek yok
                      // Form submit zaten sendMessage'ı çağırıyor, çift göndermeyi önlemek için burada çağırmıyoruz
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        // Form submit'i manuel tetikle (sendMessage onSubmit'te zaten çağrılacak)
                        const form = e.currentTarget.closest('form')
                        if (form) {
                          form.requestSubmit()
                        }
                      }
                    }}
                    placeholder="Mesaj yaz..."
                    className="flex-1 rounded-full border border-gray-200/90 bg-white/80 px-4 py-2 text-gray-900 shadow-inner shadow-gray-200/40 outline-none transition-all placeholder:text-gray-400 focus:border-brand-orange/[0.45] focus:ring-4 focus:ring-brand-orange/[0.12] dark:border-white/10 dark:bg-white/[0.065] dark:text-white dark:shadow-none"
                  />
                  <button
                    type="button"
                    disabled={(!messageText.trim() && !selectedImage && !selectedFile) || isUploading}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      console.log('🔵 [BUTTON] Send button clicked directly', {
                        messageText: messageText?.substring(0, 20),
                        hasActiveConversation: !!activeConversation,
                        activeConversationId: activeConversation?.id,
                      })
                      sendMessage()
                    }}
                    className="rounded-full bg-gradient-to-br from-[#ff9f48] to-brand-orange p-2 text-white shadow-[0_14px_34px_rgba(255,123,0,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(255,123,0,0.34)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full min-h-[320px] px-6">
            <div className="max-w-sm rounded-[28px] border border-gray-200/80 bg-white/[0.62] p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
              <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-3xl border border-brand-orange/25 bg-gradient-to-br from-brand-orange/[0.18] to-[#2f7cff]/[0.12] shadow-[0_0_45px_rgba(255,123,0,0.14)]">
                <MessageCircle className="w-8 h-8 text-brand-orange" strokeWidth={1.5} />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-gray-950 dark:text-white">
                Bir sohbet seçin
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Mesajlarınızı görüntülemek veya yeni bir konuşma başlatmak için soldan bir sohbet seçin.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mobil görünüm - Sadece aktif sohbet veya liste */}
      <div className="relative z-10 flex flex-1 flex-col bg-white/[0.45] dark:bg-white/[0.018] md:hidden">
        {activeConversation ? (
          <>
            {/* Mobil başlık */}
            <div className="flex items-center justify-between border-b border-gray-200/80 bg-white/[0.62] p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
              <button
                onClick={() => setActiveConversation(null)}
                className="mr-2 rounded-full border border-gray-200/80 bg-white/75 p-1 shadow-sm transition-all hover:bg-brand-orange/10 dark:border-white/10 dark:bg-white/[0.055]"
              >
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {(() => {
                const otherUser = getOtherParticipant(activeConversation)
                if (!otherUser?.user) return null

                const userWithExtras = otherUser.user
                const lastSeenDate =
                  userLastSeen[otherUser.user.id] ??
                  userWithExtras.lastActiveAt ??
                  userWithExtras.lastSeen
                const rawOnline =
                  onlineUsers[otherUser.user.id] ??
                  userWithExtras.isOnline ??
                  false
                const isOnline = isPresenceOnline(rawOnline, lastSeenDate, presenceNow)

                return (
                  <>
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => setActiveConversation(null)}
                        className="text-gray-600 dark:text-gray-400"
                      >
                        ←
                      </button>
                      <div className="relative rounded-full bg-gradient-to-br from-brand-orange/60 via-white/60 to-[#2f7cff]/[0.35] p-[1.5px] dark:via-white/[0.15]">
                        <Avatar
                          src={otherUser?.user?.avatar}
                          alt={otherUser?.user?.username || 'User'}
                          className="h-10 w-10 rounded-full object-cover ring-2 ring-white/[0.85] dark:ring-[#0b1020]"
                        />
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.85)] dark:border-[#0b1020]"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-semibold text-gray-900 dark:text-white truncate">
                          {otherUser?.user?.fullName || otherUser?.user?.username || 'Kullanıcı'}
                        </h2>
                        {/* ✅ İlan bağlamı göster (mobil header'da) */}
                        {jobContext && (
                          <div className="mt-1 truncate rounded-full border border-brand-orange/20 bg-brand-orange/10 px-2 py-0.5 text-xs text-brand-orange dark:bg-brand-orange/[0.15] dark:text-orange-300">
                            İlan: {jobContext.title}
                          </div>
                        )}
                        {/* Eski jobApplications (kabul edilmiş başvurular için) */}
                        {!jobContext && jobApplications[otherUser?.user?.id || ''] && (
                          <p className="text-xs text-brand-orange dark:text-orange-400 mt-0.5 truncate">
                            İlan üzerinden • {jobApplications[otherUser.user.id].listingTitle}
                          </p>
                        )}
                        {isTyping ? (
                          <p className="text-xs text-brand-orange">Yazıyor...</p>
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {getPresenceLabel(rawOnline, lastSeenDate, presenceNow)}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Tab Bar (Mobil) */}
            <div className="flex items-center justify-around border-b border-gray-200/80 bg-white/[0.58] text-sm font-medium backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
              <button
                className={`relative w-1/3 py-3 transition-colors ${activeTab === 'chat'
                  ? 'text-brand-orange'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                onClick={() => setActiveTab('chat')}
              >
                Mesajlar
                {activeTab === 'chat' && <span className="absolute inset-x-8 bottom-0 h-0.5 rounded-full bg-brand-orange shadow-[0_0_14px_rgba(255,123,0,0.75)]" />}
              </button>
              <button
                className={`relative w-1/3 py-3 transition-colors ${activeTab === 'media'
                  ? 'text-brand-orange'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                onClick={() => setActiveTab('media')}
              >
                Medya
                {activeTab === 'media' && <span className="absolute inset-x-8 bottom-0 h-0.5 rounded-full bg-brand-orange shadow-[0_0_14px_rgba(255,123,0,0.75)]" />}
              </button>
              <button
                className={`relative w-1/3 py-3 transition-colors ${activeTab === 'files'
                  ? 'text-brand-orange'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                onClick={() => setActiveTab('files')}
              >
                Dosyalar
                {activeTab === 'files' && <span className="absolute inset-x-8 bottom-0 h-0.5 rounded-full bg-brand-orange shadow-[0_0_14px_rgba(255,123,0,0.75)]" />}
              </button>
            </div>

            {/* Medya Sekmesi (Mobil) */}
            {activeTab === 'media' && (
              <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(255,123,0,0.08),transparent_32%),linear-gradient(180deg,rgba(248,250,252,0.92),rgba(241,245,249,0.68))] p-4 dark:bg-[radial-gradient(circle_at_top_left,rgba(255,123,0,0.09),transparent_34%),linear-gradient(180deg,rgba(4,8,16,0.70),rgba(4,8,16,0.94))]">
                {loadingMedia ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : media.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400 dark:text-gray-500 text-center">
                      Henüz medya yok
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {media.map((m) => (
                      <a
                        key={m.id}
                        href={m.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative group overflow-hidden rounded-xl"
                      >
                        <img
                          src={m.imageUrl}
                          alt="Medya"
                          className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Dosyalar Sekmesi (Mobil) */}
            {activeTab === 'files' && (
              <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(255,123,0,0.08),transparent_32%),linear-gradient(180deg,rgba(248,250,252,0.92),rgba(241,245,249,0.68))] p-4 dark:bg-[radial-gradient(circle_at_top_left,rgba(255,123,0,0.09),transparent_34%),linear-gradient(180deg,rgba(4,8,16,0.70),rgba(4,8,16,0.94))]">
                {loadingFiles ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : files.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400 dark:text-gray-500 text-center">
                      Henüz dosya yok
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {files.map((f) => (
                      <a
                        key={f.id}
                        href={f.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-2xl border border-gray-200/80 bg-white/[0.82] p-3 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-brand-orange/25 hover:bg-brand-orange/10 dark:border-white/10 dark:bg-white/[0.055] dark:hover:bg-brand-orange/[0.12]"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-lg bg-brand-orange/10 flex-shrink-0">
                            <FileText className="text-brand-orange" size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                              {f.fileName || 'Dosya'}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {f.fileType ? f.fileType.split('/')[1]?.toUpperCase() || 'DOSYA' : 'DOSYA'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <p className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                            {new Date(f.createdAt).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </p>
                          <Download size={16} className="text-gray-400 dark:text-gray-500" />
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mesajlar (mobil) */}
            {activeTab === 'chat' && (
              <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(255,123,0,0.08),transparent_32%),linear-gradient(180deg,rgba(248,250,252,0.92),rgba(241,245,249,0.68))] p-4 dark:bg-[radial-gradient(circle_at_top_left,rgba(255,123,0,0.09),transparent_34%),linear-gradient(180deg,rgba(4,8,16,0.70),rgba(4,8,16,0.94))]">
                <div className="flex min-h-full flex-col justify-end gap-3">
                  {messages.map((message, index) => {
                    const isOwn = message.senderId === user?.id
                    const showReadReceipt = isOwn && message.read

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className="flex flex-col items-end relative">
                          <div
                            className={`relative max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm group ${isOwn
                              ? 'bg-gradient-to-br from-[#ff9f48] to-brand-orange text-white shadow-[0_14px_36px_rgba(255,123,0,0.22)]'
                              : 'border border-gray-200/80 bg-white/[0.92] text-gray-900 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/[0.075] dark:text-white'
                              }`}
                          >
                            {/* Silinen mesaj */}
                            {message.isDeleted ? (
                              <p className="text-sm italic text-gray-400 dark:text-gray-500">
                                Bu mesaj silindi
                              </p>
                            ) : (message.messageType || 'TEXT') === 'POST_SHARE' && message.sharedPostId ? (
                              <SharedPostMessageCard
                                preview={
                                  message.sharedPostPreview || {
                                    postId: message.sharedPostId,
                                    state: 'ok',
                                  }
                                }
                                isOwnBubble={isOwn}
                              />
                            ) : (
                              <>
                                {/* Görsel mesaj */}
                                {message.imageUrl && (
                                  <div className="mb-2 rounded-xl overflow-hidden">
                                    <img
                                      src={message.imageUrl}
                                      alt="Mesaj görseli"
                                      className="max-w-full max-h-64 object-cover w-full"
                                    />
                                  </div>
                                )}
                                {/* Dosya mesaj (mobil) */}
                                {message.fileUrl && (
                                  <a
                                    href={message.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 mt-1 mb-2 rounded-lg px-3 py-2 border transition-colors ${isOwn
                                      ? 'bg-white/20 border-white/30 hover:bg-white/30'
                                      : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                                      }`}
                                  >
                                    <div className={`p-1.5 rounded-lg ${isOwn ? 'bg-white/20' : 'bg-brand-orange/10'
                                      }`}>
                                      <FileText size={16} className={isOwn ? 'text-white' : 'text-brand-orange'} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-medium truncate ${isOwn ? 'text-white' : 'text-gray-900 dark:text-white'
                                        }`}>
                                        {message.fileName || 'Dosya'}
                                      </p>
                                      <p className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                                        }`}>
                                        {message.fileType ? message.fileType.split('/')[1]?.toUpperCase() || 'DOSYA' : 'DOSYA'}
                                      </p>
                                    </div>
                                    <Download size={14} className={isOwn ? 'text-white/70' : 'text-gray-400'} />
                                  </a>
                                )}
                                {/* Metin mesaj */}
                                {message.content && (
                                  <p className="text-sm whitespace-pre-wrap break-words">
                                    {message.content}
                                    {message.isEdited && (
                                      <span className="ml-1 text-xs opacity-70">
                                        (düzenlendi)
                                      </span>
                                    )}
                                  </p>
                                )}
                              </>
                            )}

                            {/* Menü sadece kendi mesajlarında ve silinmemiş mesajlarda (mobil) */}
                            {isOwn && !message.isDeleted && (message.messageType || 'TEXT') !== 'POST_SHARE' && (
                              <div className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="relative" ref={menuRef}>
                                  <button
                                    onClick={() => setShowMenuForId(showMenuForId === message.id ? null : message.id)}
                                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  >
                                    <MoreVertical size={16} className="text-gray-500 dark:text-gray-400" />
                                  </button>

                                  {/* Menü dropdown */}
                                  {showMenuForId === message.id && (
                                    <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[120px]">
                                      <button
                                        onClick={() => handleEditMessage(message.id, message.content || null)}
                                        className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                      >
                                        <Edit size={14} />
                                        Düzenle
                                      </button>
                                      <button
                                        onClick={() => handleDeleteMessage(message.id)}
                                        className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                      >
                                        <Trash2 size={14} />
                                        Sil
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          {showReadReceipt && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 mr-1">
                              Görüldü
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={mobileMessagesEndRef} aria-hidden />
                </div>
              </div>
            )}

            {/* Yazıyor... göstergesi (mobil) */}
            {activeTab === 'chat' && isTyping && (
              <div className="border-t border-gray-200/70 bg-white/[0.55] px-4 py-2 text-sm italic text-gray-500 backdrop-blur dark:border-white/10 dark:bg-white/[0.035] dark:text-gray-400">
                Yazıyor...
              </div>
            )}

            {/* Görsel Önizleme (mobil) */}
            {imagePreview && (
              <div className="border-t border-gray-200/80 bg-white/[0.65] px-4 py-2 backdrop-blur dark:border-white/10 dark:bg-white/[0.035]">
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Önizleme"
                    className="max-w-xs max-h-40 rounded-xl object-cover"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    type="button"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Dosya Önizleme (mobil) */}
            {filePreview && (
              <div className="border-t border-gray-200/80 bg-white/[0.65] px-4 py-2 backdrop-blur dark:border-white/10 dark:bg-white/[0.035]">
                <div className="relative inline-flex items-center gap-3 rounded-2xl border border-gray-200/80 bg-white/[0.85] px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                  <div className="p-1.5 rounded-lg bg-brand-orange/10">
                    <FileText size={18} className="text-brand-orange" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {filePreview.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {filePreview.type.split('/')[1]?.toUpperCase() || 'DOSYA'}
                    </p>
                  </div>
                  <button
                    onClick={removeFile}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    type="button"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Mesaj Input (mobil) - Sadece chat sekmesinde */}
            {activeTab === 'chat' && (
              <div className="border-t border-gray-200/80 bg-white/70 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    sendMessage()
                  }}
                  className="flex gap-2"
                >
                  {/* Görsel Yükleme Butonu */}
                  <label className="cursor-pointer rounded-full border border-gray-200/80 bg-white/75 p-2 shadow-sm transition-all hover:border-brand-orange/30 hover:bg-brand-orange/10 dark:border-white/10 dark:bg-white/[0.055] dark:hover:bg-brand-orange/[0.12]">
                    <ImageIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      ref={fileInputRef}
                      className="hidden"
                    />
                  </label>
                  {/* Dosya Yükleme Butonu */}
                  <label className="cursor-pointer rounded-full border border-gray-200/80 bg-white/75 p-2 shadow-sm transition-all hover:border-brand-orange/30 hover:bg-brand-orange/10 dark:border-white/10 dark:bg-white/[0.055] dark:hover:bg-brand-orange/[0.12]">
                    <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    value={messageText}
                    onChange={handleChange}
                    placeholder="Mesaj yaz..."
                    className="flex-1 rounded-full border border-gray-200/90 bg-white/80 px-4 py-2 text-gray-900 shadow-inner shadow-gray-200/40 outline-none transition-all placeholder:text-gray-400 focus:border-brand-orange/[0.45] focus:ring-4 focus:ring-brand-orange/[0.12] dark:border-white/10 dark:bg-white/[0.065] dark:text-white dark:shadow-none"
                  />
                  <button
                    type="button"
                    disabled={(!messageText.trim() && !selectedImage && !selectedFile) || isUploading}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      console.log('🔵 [BUTTON] Send button clicked directly', {
                        messageText: messageText?.substring(0, 20),
                        hasActiveConversation: !!activeConversation,
                        activeConversationId: activeConversation?.id,
                      })
                      sendMessage()
                    }}
                    className="rounded-full bg-gradient-to-br from-[#ff9f48] to-brand-orange p-2 text-white shadow-[0_14px_34px_rgba(255,123,0,0.28)] transition-all hover:shadow-[0_18px_42px_rgba(255,123,0,0.34)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full min-h-[280px] px-6">
            <div className="max-w-[280px] rounded-[24px] border border-gray-200/80 bg-white/[0.62] p-6 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.045]">
              <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-orange/25 bg-gradient-to-br from-brand-orange/[0.18] to-[#2f7cff]/[0.12]">
                <MessageCircle className="w-7 h-7 text-brand-orange" strokeWidth={1.5} />
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5">
                Bir sohbet seçin
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Başlamak için soldaki listeden bir konuşma açın.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Yeni Mesaj Modal */}
      {showNewMessageModal && (
        <NewMessageModal
          onClose={() => setShowNewMessageModal(false)}
          onSelect={handleNewMessageSelect}
        />
      )}

      {/* ✅ Sohbet Silme Onay Modalı */}
      {deleteConversationId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm dark:bg-black/75"
        >
          <div
            className="w-full max-w-[400px] rounded-[24px] border border-gray-200/80 bg-white/[0.92] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.25)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#111827]/[0.92]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500">
              <Trash2 size={19} />
            </div>
            <h3 className="text-lg font-semibold text-gray-950 dark:text-white mb-2">
              Sohbeti silmek istiyor musunuz?
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Bu işlem geri alınamaz. Sohbet yalnızca sizin için silinecektir.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConversationId(null)}
                className="rounded-full border border-gray-300/80 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/[0.08]"
              >
                İptal
              </button>

              <button
                onClick={async () => {
                  if (deleteConversationId) {
                    await handleDeleteConversation(deleteConversationId)
                    setDeleteConversationId(null)
                  }
                }}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(220,38,38,0.22)] transition-all hover:bg-red-700"
              >
                Sohbeti Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Dynamic export - prerender'i devre dışı bırak (useSearchParams ve socket kullanımı nedeniyle)
export const dynamic = 'force-dynamic';

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  )
}
