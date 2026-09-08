'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthGuard } from '@/lib/auth-guard'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DeleteAccountModal } from '@/components/settings/DeleteAccountModal'
import { invalidateAfterUsernameUpdate } from '@/lib/profile-update'
import {
  ArrowRight,
  Bell,
  Check,
  Clock3,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Shield,
  ShieldAlert,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react'

const panelClass = 'relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 p-5 text-slate-950 shadow-2xl shadow-slate-200/60 backdrop-blur-2xl dark:border-white/[0.12] dark:bg-[linear-gradient(145deg,rgba(12,18,30,0.94),rgba(8,12,21,0.96)_58%,rgba(37,22,18,0.9))] dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:p-6'
const inputClass = 'h-12 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-300/55 focus:bg-white focus:ring-4 focus:ring-orange-400/10 disabled:cursor-not-allowed disabled:text-slate-500 disabled:opacity-80 dark:border-white/[0.12] dark:bg-[rgba(2,6,14,0.48)] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-orange-300/45 dark:focus:bg-[rgba(8,12,20,0.72)] dark:disabled:text-slate-300 dark:disabled:opacity-90'
const secondaryButtonClass = 'inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/75 px-4 text-sm font-black text-slate-700 shadow-sm shadow-slate-200/50 transition hover:-translate-y-0.5 hover:border-orange-300/50 hover:bg-orange-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 dark:border-white/[0.12] dark:bg-[rgba(255,255,255,0.07)] dark:text-slate-200 dark:shadow-none dark:hover:border-orange-300/35 dark:hover:bg-[rgba(255,255,255,0.11)] dark:hover:text-white'
const primaryButtonClass = 'inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand-orange px-4 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0'

function SettingsContent() {
  const { user, setUser } = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()

  const { data: userData } = useQuery({
    queryKey: ['user-me'],
    queryFn: async () => {
      const response = await api.get('/users/me')
      return response.data
    },
    enabled: !!user,
  })

  const displayUser = userData || user
  const profileInitial = displayUser?.username?.charAt(0)?.toUpperCase() || 'F'

  return (
    <div className="mx-auto w-full max-w-[980px] px-4 py-8 sm:px-6">
      <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/92 p-6 text-slate-950 shadow-2xl shadow-slate-200/60 backdrop-blur-2xl dark:border-white/[0.12] dark:bg-[linear-gradient(135deg,rgba(8,12,21,0.98)_0%,rgba(14,22,37,0.94)_52%,rgba(51,27,18,0.88)_100%)] dark:text-white dark:shadow-[0_28px_90px_rgba(0,0,0,0.4)] sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(249,115,22,0.28),transparent_34%),radial-gradient(circle_at_86%_18%,rgba(59,130,246,0.16),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_44%)] dark:bg-[radial-gradient(circle_at_14%_0%,rgba(249,115,22,0.22),transparent_34%),radial-gradient(circle_at_86%_18%,rgba(79,70,229,0.16),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.085),transparent_44%)]" />
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-orange-200/60 to-transparent" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-orange-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-orange-700 dark:border-orange-300/20 dark:text-orange-100">
              <Sparkles className="h-3.5 w-3.5" />
              Feellink ayar merkezi
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Ayarlar</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Profil bilgilerini, güvenlik tercihlerini ve hesap kontrolünü tek panelden yönet.
            </p>
          </div>

          <div className="flex items-center gap-4 rounded-[24px] border border-slate-200/80 bg-white/75 p-3 shadow-inner shadow-slate-200/70 dark:border-white/[0.12] dark:bg-[rgba(2,6,14,0.45)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 dark:border-white/10 dark:bg-slate-950/70">
              {displayUser?.avatar ? (
                <img
                  src={displayUser.avatar.startsWith('http') ? displayUser.avatar : `${process.env.NEXT_PUBLIC_CDN}/${displayUser.avatar}`}
                  alt={displayUser.username || 'Profil'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-lg font-black text-orange-700 dark:text-orange-100">{profileInitial}</span>
              )}
            </div>
            <div className="min-w-0 pr-2">
              <p className="truncate text-sm font-black text-slate-950 dark:text-white">@{displayUser?.username || 'kullanici'}</p>
              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{displayUser?.email || 'E-posta bulunamadı'}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-5">
        <SettingsPanel
          icon={User}
          eyebrow="Kimlik"
          title="Profil Bilgileri"
          description="Kullanıcı adın ve e-posta adresin Feellink üzerindeki ana kimliğini oluşturur."
        >
          <div className="space-y-5">
            <UsernameField
              user={user}
              userData={userData}
              onUpdate={(updatedUser) => {
                setUser(updatedUser)
                invalidateAfterUsernameUpdate(queryClient)
                router.replace('/profile/' + (updatedUser?.username ?? 'me'))
              }}
            />
            <EmailField
              user={user}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['user-me'] })
              }}
            />
          </div>
        </SettingsPanel>

        <SettingsPanel
          icon={Shield}
          eyebrow="Koruma"
          title="Hesap Güvenliği"
          description="Doğrulanmış e-posta hesabını geri kazanma ve güvenlik bildirimleri için kullanılır."
        >
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-sm font-black text-slate-700 dark:text-slate-200">E-posta</label>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/35 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:border-emerald-300/20 dark:text-emerald-200">
                <Check className="h-3.5 w-3.5" />
                Doğrulandı
              </span>
            </div>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className={`${inputClass} pl-11`}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              E-posta adresiniz doğrulanmış durumda.
            </p>
          </div>
        </SettingsPanel>

        <div className="grid gap-5 lg:grid-cols-2">
          <SettingsPanel
            icon={Bell}
            eyebrow="Tercihler"
            title="Bildirimler"
            description="Etiket, takip, beğeni ve yorum bildirimlerini detaylı şekilde yönet."
          >
            <Link href="/settings/notifications" className={`${primaryButtonClass} w-full sm:w-auto`}>
              Bildirim Ayarları
              <ArrowRight className="h-4 w-4" />
            </Link>
          </SettingsPanel>

          <SettingsPanel
            icon={EyeOff}
            eyebrow="Gizlilik"
            title="Engellenenler"
            description="Etkileşim kurmasını istemediğin hesapları buradan kontrol edebilirsin."
          >
            <BlockedUsersButton />
          </SettingsPanel>
        </div>

        <SettingsPanel
          icon={ShieldAlert}
          eyebrow="Dikkat"
          title="Hesap Yönetimi"
          description="Kalıcı hesap işlemleri başlamadan önce ayrıca onay ister."
          danger
        >
          <DeleteAccountSection />
        </SettingsPanel>
      </div>
    </div>
  )
}

function SettingsPanel({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
  danger = false,
}: {
  icon: typeof User
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <section className={panelClass}>
      <div className={`absolute inset-0 ${danger ? 'bg-[radial-gradient(circle_at_14%_0%,rgba(239,68,68,0.16),transparent_34%)] dark:bg-[radial-gradient(circle_at_14%_0%,rgba(239,68,68,0.2),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.045),transparent_42%)]' : 'bg-[radial-gradient(circle_at_12%_0%,rgba(249,115,22,0.12),transparent_32%),radial-gradient(circle_at_90%_0%,rgba(59,130,246,0.08),transparent_28%)] dark:bg-[radial-gradient(circle_at_12%_0%,rgba(249,115,22,0.16),transparent_32%),radial-gradient(circle_at_90%_0%,rgba(79,70,229,0.1),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.055),transparent_42%)]'}`} />
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-orange-200/45 to-transparent dark:via-brand-orange/45" />
      <div className="relative">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${danger ? 'border-red-300/35 bg-red-500/10 text-red-600 dark:border-red-300/20 dark:text-red-200' : 'border-orange-300/35 bg-orange-400/10 text-orange-700 dark:border-orange-300/20 dark:text-orange-100'} shadow-lg shadow-slate-200/70 dark:shadow-black/20`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${danger ? 'text-red-600/80 dark:text-red-200/80' : 'text-orange-700/85 dark:text-orange-200/85'}`}>{eyebrow}</p>
              <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
            </div>
          </div>
        </div>
        {children}
      </div>
    </section>
  )
}

function BlockedUsersButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`${secondaryButtonClass} w-full sm:w-auto`}
      >
        <EyeOff className="h-4 w-4" />
        Engellenenleri Görüntüle
      </button>

      {isModalOpen && (
        <BlockedUsersModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  )
}

function BlockedUsersModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()

  const { data: blockedUsers = [], isLoading } = useQuery({
    queryKey: ['blocked-users'],
    queryFn: async () => {
      const response = await api.get('/users/me/blocked')
      return response.data || []
    },
  })

  const unblockMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/users/${userId}/block`)
    },
    onSuccess: () => {
      toast.success('Engel kaldırıldı')
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Engel kaldırılırken bir hata oluştu')
    },
  })

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return null
    if (avatar.startsWith('http')) return avatar
    return `${process.env.NEXT_PUBLIC_CDN}/${avatar}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-xl dark:bg-black/70">
      <div
        className="relative flex max-h-[74vh] w-full max-w-[480px] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/96 text-slate-950 shadow-2xl shadow-slate-300/60 dark:border-white/10 dark:bg-[#101723]/95 dark:text-white dark:shadow-black/40"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-orange-200/60 to-transparent" />
        <div className="flex items-center justify-between border-b border-slate-200/70 p-5 dark:border-white/10">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-700/80 dark:text-orange-200/80">Gizlilik</p>
            <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Engellenenler</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/75 text-slate-500 transition hover:border-orange-300/50 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-400 dark:hover:border-white/20 dark:hover:text-white"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-brand-orange" />
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-5 py-12 text-center dark:border-white/10 dark:bg-white/[0.04]">
              <EyeOff className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />
              <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300">Henüz engellediğiniz kullanıcı yok.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {blockedUsers.map((blockedUser: any) => {
                const avatarUrl = getAvatarUrl(blockedUser.avatar)
                return (
                  <div
                    key={blockedUser.id}
                    className="flex items-center justify-between gap-3 rounded-[22px] border border-slate-200/80 bg-white/80 p-3 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={blockedUser.username}
                          className="h-11 w-11 rounded-2xl object-cover"
                          onError={(event) => {
                            (event.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                          }}
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-100 dark:border-white/10 dark:bg-white/[0.06]">
                          <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                            {blockedUser.username?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950 dark:text-white">@{blockedUser.username}</p>
                        {blockedUser.fullName && (
                          <p className="truncate text-xs text-slate-500 dark:text-slate-500">{blockedUser.fullName}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => unblockMutation.mutate(blockedUser.id)}
                      disabled={unblockMutation.isPending}
                      className="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl border border-orange-300/35 bg-orange-400/10 px-3 text-xs font-black text-orange-700 transition hover:bg-orange-400/15 disabled:cursor-not-allowed disabled:opacity-50 dark:border-orange-300/20 dark:text-orange-200"
                    >
                      {unblockMutation.isPending ? '...' : 'Engeli Kaldır'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function UsernameField({ user, userData, onUpdate }: { user: any; userData: any; onUpdate: (user: any) => void }) {
  const [username, setUsername] = useState(user?.username || '')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const canChangeUsername = useMemo(() => {
    if (!userData?.usernameLastChangedAt) return true
    const diffDays = (Date.now() - new Date(userData.usernameLastChangedAt).getTime()) / (1000 * 60 * 60 * 24)
    return diffDays >= 14
  }, [userData])

  const remainingDays = useMemo(() => {
    if (!userData?.usernameLastChangedAt) return 0
    const diffDays = (Date.now() - new Date(userData.usernameLastChangedAt).getTime()) / (1000 * 60 * 60 * 24)
    return Math.max(0, Math.ceil(14 - diffDays))
  }, [userData])

  const handleSave = async () => {
    if (!username.trim() || username === user?.username) {
      setIsEditing(false)
      return
    }

    if (!canChangeUsername) {
      toast.error(`Kullanıcı adını 14 günde bir değiştirebilirsin.${remainingDays > 0 ? ` Bir sonraki değişiklik: ${remainingDays} gün sonra` : ''}`)
      return
    }

    setIsSaving(true)
    try {
      const response = await api.patch('/users/me/username', { username })
      toast.success('Kullanıcı adı güncellendi')
      onUpdate(response.data)
      setIsEditing(false)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Kullanıcı adı güncellenirken bir hata oluştu')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-sm font-black text-slate-700 dark:text-slate-200">Kullanıcı Adı</label>
        {!canChangeUsername && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/35 bg-amber-400/10 px-2.5 py-1 text-[11px] font-black text-amber-700 dark:border-amber-300/20 dark:text-amber-200">
            <Clock3 className="h-3.5 w-3.5" />
            {remainingDays} gün
          </span>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-3">
          <div className="relative">
            <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isSaving}
              className={`${inputClass} pl-11`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || !username.trim() || username === user?.username}
              className={primaryButtonClass}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isSaving ? 'Kaydediliyor' : 'Kaydet'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                setUsername(user?.username || '')
              }}
              className={secondaryButtonClass}
            >
              İptal
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={user?.username || ''}
              disabled
              className={`${inputClass} pl-11`}
            />
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className={secondaryButtonClass}
          >
            <Pencil className="h-4 w-4" />
            Düzenle
          </button>
        </div>
      )}
    </div>
  )
}

function EmailField({ user, onUpdate }: { user: any; onUpdate: () => void }) {
  const [newEmail, setNewEmail] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleRequestEmailChange = async () => {
    if (!newEmail.trim() || newEmail === user?.email) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await api.post('/email-change/request', { newEmail })
      toast.success('E-posta adresini onaylaman için bir bağlantı gönderdik.')
      setNewEmail('')
      setIsEditing(false)
      onUpdate()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'E-posta değişiklik talebi oluşturulurken bir hata oluştu')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">E-posta</label>
      {isEditing ? (
        <div className="space-y-3">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="Yeni e-posta adresi"
              disabled={isSaving}
              className={`${inputClass} pl-11`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRequestEmailChange}
              disabled={isSaving || !newEmail.trim() || newEmail === user?.email}
              className={primaryButtonClass}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isSaving ? 'Gönderiliyor' : 'Kaydet'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                setNewEmail('')
              }}
              className={secondaryButtonClass}
            >
              İptal
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className={`${inputClass} pl-11`}
            />
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className={secondaryButtonClass}
          >
            <Pencil className="h-4 w-4" />
            Düzenle
          </button>
        </div>
      )}
    </div>
  )
}

function DeleteAccountSection() {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
          <Lock className="mt-1 h-4 w-4 shrink-0 text-red-600/80 dark:text-red-200/80" />
          <p>
            Hesabınızı silme süreci güvenli onay ekranıyla başlar. İşlem sonrası oturum kapatılır.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-red-300/35 bg-red-500/10 px-4 text-sm font-black text-red-600 transition hover:-translate-y-0.5 hover:bg-red-500/15 dark:border-red-300/20 dark:text-red-200"
        >
          <Trash2 className="h-4 w-4" />
          Hesabı Sil
        </button>
      </div>

      {showModal && (
        <DeleteAccountModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  )
}
