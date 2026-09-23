'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Palette,
  Building2,
  KeyRound,
  Brush,
  Sparkles,
  Check,
  Moon,
  Sun,
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { useTheme } from '@/lib/theme-context'
import type { CapabilitySummary, SidebarVisibility } from '@/types/capabilities'

type PlanKey = 'free' | 'pro'

type RoleConfig = {
  id: string
  title: string
  subtitle: string
  description: string
  features: string[]
  targetAudience: string
  icon: React.ElementType
  plans: Record<PlanKey, string[]>
  highlights: Record<PlanKey, string>
  pricing: Record<PlanKey, number>
  allowedExtras?: string[]
}

type ExtraPackage = {
  id: string
  label: string
  cta: string
  summary: string
  features: string[]
}

const priceFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 0,
})

const formatPrice = (amount: number) => {
  if (amount <= 0) return 'Ücretsiz'
  return `${priceFormatter.format(amount)} / ay`
}

const ROLE_CONFIG: RoleConfig[] = [
  {
    id: 'art_lover',
    title: 'Sanat Sever',
    subtitle: 'Sanat Sever rolünü seç',
    description: 'Sanatı keşfetmek, duygularını ifade etmek ve dijital sanat dünyasının parçası olmak isteyenler için.',
    features: [
      'Dijital sanat eserlerini keşfet, beğen ve koleksiyonları incele',
      'Eserlere yorum yaparak duygu ve düşüncelerini paylaş',
      'Sergileri, etkinlikleri ve sanatçıları takip et',
      'İlgi alanlarına göre kişiselleştirilmiş içerikler keşfet',
    ],
    targetAudience: 'Sanatla ilgilenen, ilham almak isteyen, üretimden çok keşif ve etkileşime odaklanan herkes için ideal.',
    icon: Palette,
    plans: {
      free: ['Ayda 1 etkinlik', 'Topluluk etkileşimi', 'Temel öneriler'],
      pro: ['Sınırsız etkinlik katılımı', 'Derin analiz ve raporlar', 'Feellink Pro Rozeti'],
    },
    highlights: {
      free: 'Başlangıç için ideal.',
      pro: 'Sınırsız etkileşim ve ileri analizler.',
    },
    pricing: {
      free: 0,
      pro: 49,
    },
  },
  {
    id: 'corporate',
    title: 'Kurumsal',
    subtitle: 'Kurumsal rolünü seç',
    description: 'Sergi, etkinlik ve koleksiyonlarını dijital ortamda profesyonel şekilde yönet.',
    features: [
      'Müze, galeri veya kurum profili oluştur',
      'Ziyaretçi ve etkileşim analizlerini görüntüle',
      'Dijital sergi ve etkinlikleri yönet',
      'Kurumsal koleksiyonlarını düzenle',
    ],
    targetAudience: 'Müze, galeri, sanat inisiyatifi veya kültür-sanat alanında kurumsal üretim yapan yapılar.',
    icon: Building2,
    plans: {
      free: ['Ayda 30 etkinlik', 'Temel analiz paneli', 'Standart raporlama'],
      pro: ['Sınırsız etkinlik oluşturma', 'Özel raporlama & dashboard', 'Turuncu doğrulama tiki'],
    },
    highlights: {
      free: 'Etkinlik yönetimine giriş.',
      pro: 'Profesyonel kurum yönetim araçları.',
    },
    pricing: {
      free: 99,
      pro: 149,
    },
  },
  {
    id: 'collector',
    title: 'Koleksiyoner',
    subtitle: 'Koleksiyoner rolünü seç',
    description: 'Dijital koleksiyonlarını oluştur, yönet ve sanat arşivini büyüt.',
    features: [
      'Kendi dijital sanat koleksiyonlarını oluştur',
      'Farklı sanatçılardan eserleri bir araya getir',
      'Koleksiyonlarını kategorilere ayır ve düzenle',
      'Dijital sanat hafızanı kalıcı hale getir',
    ],
    targetAudience: 'Sanat eserlerini bir araya getirmeyi, arşivlemeyi ve kürasyon yapmayı seven kullanıcılar için.',
    icon: KeyRound,
    plans: {
      free: ['Ayda 5 koleksiyon', 'Koleksiyon yönetim aracı', 'Temel ziyaretçi görüntüleme'],
      pro: ['Sınırsız koleksiyon & eser ekleme', 'Ziyaretçi analitiği ve içgörü', 'Feellink Pro Rozeti'],
    },
    highlights: {
      free: 'Koleksiyonlarını temel seviyede yönet.',
      pro: 'Koleksiyonunuzu profesyonelce vitrine çıkarın.',
    },
    pricing: {
      free: 79,
      pro: 119,
    },
    allowedExtras: ['artist'],
  },
  {
    id: 'artist',
    title: 'Sanatçı',
    subtitle: 'Sanatçı rolünü seç',
    description: 'Eserlerini sergile, görünürlüğünü artır ve izleyicilerinle doğrudan bağ kur.',
    features: [
      'Dijital eserlerini yükle ve sergile',
      'Eserlerinin etkileşimlerini ve geri bildirimlerini takip et',
      'Ziyaretçilerle yorumlar üzerinden iletişim kur',
      'Feellink topluluğu içinde görünürlük kazan',
    ],
    targetAudience: 'Üreten, paylaşan ve sanatını daha geniş kitlelere ulaştırmak isteyen sanatçılar.',
    icon: Brush,
    plans: {
      free: ['Ayda 5 etkinlik/ilan', 'Temel analizler', 'Topluluk etkileşimi'],
      pro: ['Sınırsız sergi & etkinlik', 'İlan açma', 'Pro panel erişimi'],
    },
    highlights: {
      free: 'Kitlenle tanışmaya başla.',
      pro: 'Sanat kariyerini ölçeklendir.',
    },
    pricing: {
      free: 79,
      pro: 119,
    },
    allowedExtras: ['collector'],
  },
]

const PLAN_LABELS: Record<PlanKey, { title: string; tag: string; accent: string }> = {
  free: {
    title: 'Standart Üyelik',
    tag: 'STANDART',
    accent: 'bg-gray-900/5 text-gray-700 dark:bg-white/10 dark:text-gray-100',
  },
  pro: {
    title: 'Profesyonel Üyelik',
    tag: 'PRO',
    accent: 'bg-orange-500 text-white dark:bg-orange-500',
  },
}

const EXTRA_PACKAGES: Record<string, ExtraPackage> = {
  collector: {
    id: 'collector',
    label: 'Koleksiyoner Paketini Ekleyin',
    cta: 'Koleksiyon yönetimi, portföy ve analitik modüllerini açar.',
    summary: 'Koleksiyon Yönetimi, Portföy, Analiz modülleri',
    features: ['Koleksiyon Yönetimi', 'Portföy', 'Analizler'],
  },
  artist: {
    id: 'artist',
    label: 'Sanatçı Paketini Ekleyin',
    cta: 'Etkinlik oluşturma ve ilan açma özelliklerini etkinleştirir.',
    summary: 'Etkinlik Oluşturma, İlan Açma',
    features: ['Etkinlik Oluşturma', 'İlan Açma'],
  },
}

const EXTRA_PACKAGE_PRICING: Record<string, number> = {
  collector: 49,
  artist: 49,
}

const ROLE_MODULES: Record<string, string[]> = {
  art_lover: ['Keşfet', 'Topluluk Etkileşimi', 'Öneriler'],
  corporate: ['Etkinlik Oluştur', 'Etkinliklerim', 'Analizler'],
  collector: ['Koleksiyonlarım', 'Koleksiyon Yönetimi', 'Portföy', 'Analizler'],
  artist: ['Etkinlik Oluştur', 'İlan Aç', 'Analizler'],
}

const COMBO_FEATURES: Record<string, string[]> = {
  'artist+collector': ['Koleksiyon Yönetimi', 'Portföy', 'Analizler'],
  'collector+artist': ['Etkinlik Oluştur', 'İlan Aç'],
}

export default function SelectRolePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const setUser = useAuthStore((state: any) => state.setUser)
  const setCapabilities = useAuthStore((state: any) => state.setCapabilities)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [selectedExtra, setSelectedExtra] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const activeRole = useMemo(
    () => ROLE_CONFIG.find((role: any) => role.id === selectedRoleId) ?? null,
    [selectedRoleId]
  )

  const handleRoleSelect = (roleId: string) => {
    setSelectedRoleId(roleId)
    setSelectedExtra(null)
    setMutationError(null)
    setIsProcessing(false)
  }

  const handleExtraToggle = (extraId: string) => {
    setSelectedExtra((prev: any) => (prev === extraId ? null : extraId))
    setMutationError(null)
  }

  const computeModules = useMemo(() => {
    if (!selectedRoleId) return []
    const baseModules = ROLE_MODULES[selectedRoleId] ?? []
    if (!selectedExtra) return [...baseModules]

    const comboKey = `${selectedRoleId}+${selectedExtra}`
    const comboModules = COMBO_FEATURES[comboKey] ?? []
    return Array.from(new Set([...baseModules, ...comboModules]))
  }, [selectedRoleId, selectedExtra])

  const handleConfirm = async () => {
    if (!activeRole) return

    setMutationError(null)

    const rolesPayload = Array.from(
      new Set([activeRole.id, ...(selectedExtra ? [selectedExtra] : [])]),
    )

    const extrasPayload: string[] = []
    if (selectedExtra === 'collector') {
      extrasPayload.push('koleksiyoner-extra')
    } else if (selectedExtra === 'artist') {
      extrasPayload.push('sanatci-extra')
    } else if (selectedExtra) {
      extrasPayload.push(selectedExtra)
    }

    if (!user?.id) {
      router.push('/login')
      return
    }

    try {
      setIsProcessing(true)

      const response = await api.patch('/users/me/roles', {
        roles: rolesPayload,
        extras: extrasPayload,
      })

      const responseData = response.data as any
      type ResponseData = {
        user?: any
        capabilities?: CapabilitySummary
        sidebar?: SidebarVisibility
      }
      const typedData = responseData as ResponseData
      const { user: updatedUser, capabilities, sidebar } = typedData

      if (updatedUser) {
        setUser(updatedUser, capabilities ?? null, sidebar ?? null)
      } else if (capabilities) {
        setCapabilities(capabilities, sidebar ?? null)
      }

      // 🎯 Rol seçildikten sonra ana sayfaya yönlendir (onboarding akışı tamamlandı)
      router.push('/feed')
    } catch (error) {
      console.error('[SelectRole] Rol güncellemesi başarısız:', error)
      setMutationError('Rol seçiminiz kaydedilemedi. Lütfen tekrar deneyin.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070910] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#5415ff]/25 blur-[120px]" />
        <div className="absolute -right-24 top-0 h-[32rem] w-[32rem] rounded-full bg-[#ff7518]/20 blur-[120px]" />
        <div className="absolute bottom-[-18rem] left-1/3 h-[36rem] w-[36rem] rounded-full bg-[#d92f87]/15 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_42%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="relative z-10 mx-auto w-full max-w-6xl"
      >
        <div className="flex items-center justify-between">
          <div className="w-10" />
          <div className="relative flex h-16 items-center justify-center sm:h-20">
            <span className="absolute h-16 w-44 rounded-full bg-[#ff6b2c]/20 blur-2xl" />
            <Image
              src="/logo/feellink-login-pill-transparent.png"
              alt="Feellink"
              width={260}
              height={96}
              className="relative h-12 w-auto object-contain sm:h-14"
              priority
              unoptimized
            />
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/70 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            aria-label="Temayı değiştir"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        <section className="mx-auto mt-5 max-w-3xl text-center sm:mt-7">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-orange-300/15 bg-orange-400/[0.08] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-200">
            <Sparkles className="h-3.5 w-3.5" />
            Sana özel bir başlangıç
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
            Feellink deneyimini sana göre şekillendirelim
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">
            Seni en iyi anlatan rolü seç. Bu seçim yalnızca deneyimini kişiselleştirir ve daha sonra değiştirilebilir.
          </p>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ROLE_CONFIG.map((role: any, index: number) => {
            const Icon = role.icon
            const isActive = role.id === selectedRoleId
            return (
              <motion.button
                key={role.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + index * 0.05 }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => handleRoleSelect(role.id)}
                aria-pressed={isActive}
                className={`group relative min-h-[168px] overflow-hidden rounded-[24px] border p-5 text-left backdrop-blur-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                  isActive
                    ? 'border-orange-300/45 bg-gradient-to-br from-orange-500/30 via-[#ca4a2f]/20 to-violet-600/20 shadow-[0_22px_70px_rgba(255,103,31,0.22)]'
                    : 'border-white/[0.09] bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-white/20 hover:bg-white/[0.085]'
                }`}
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.07] to-transparent opacity-0 transition group-hover:opacity-100" />
                <div className="relative flex items-start justify-between gap-3">
                  <span className={`grid h-11 w-11 place-items-center rounded-2xl border transition ${
                    isActive
                      ? 'border-orange-200/30 bg-orange-400 text-white shadow-[0_10px_30px_rgba(255,122,0,0.32)]'
                      : 'border-white/10 bg-white/[0.07] text-orange-300'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  {isActive && (
                    <span className="grid h-7 w-7 place-items-center rounded-full border border-white/20 bg-white/15">
                      <Check className="h-4 w-4 text-white" />
                    </span>
                  )}
                </div>
                <div className="relative mt-5">
                  <h2 className="text-base font-semibold tracking-tight text-white">{role.title}</h2>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-white/50">
                    {role.description}
                  </p>
                </div>
              </motion.button>
            )
          })}
        </section>

        <AnimatePresence mode="wait">
          {activeRole ? (
            <motion.section
              key={activeRole.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28 }}
              className="relative mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#11131c]/80 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-7"
            >
              <div className="pointer-events-none absolute right-[-8rem] top-[-10rem] h-80 w-80 rounded-full bg-orange-500/15 blur-[100px]" />
              <div className="relative grid gap-7 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
                <div className="text-left">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">Seçtiğin rol</span>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">{activeRole.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-white/60">{activeRole.description}</p>

                  <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Kimler için?</p>
                    <p className="mt-2 text-sm leading-6 text-white/70">{activeRole.targetAudience}</p>
                  </div>
                </div>

                <div className="text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Deneyiminde neler var?</p>
                  <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {activeRole.features.map((feature: string) => (
                      <li key={feature} className="flex min-h-[58px] items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-3.5 py-3 text-sm leading-5 text-white/70">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-orange-400/15 text-orange-300">
                          <Check className="h-3 w-3" />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {mutationError && (
                <div className="relative mt-5 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100">
                  {mutationError}
                </div>
              )}

              <div className="relative mt-6 flex flex-col gap-4 border-t border-white/[0.08] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-left text-xs leading-5 text-white/40">
                  Rolün kullanım odağını belirler; Feellink içindeki yaratıcı alanları keşfetmeye devam edebilirsin.
                </p>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className="inline-flex min-w-[240px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff681f] via-[#ff7f20] to-[#ff9e3d] px-6 py-3.5 text-sm font-bold text-white shadow-[0_16px_42px_rgba(255,105,31,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(255,105,31,0.38)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {isProcessing ? 'Rol atanıyor...' : 'Bu rolle devam et'}
                  {!isProcessing && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </motion.section>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-5 rounded-[24px] border border-dashed border-white/10 bg-white/[0.025] px-5 py-6 text-center text-sm text-white/40"
            >
              Devam etmek için yukarıdaki rollerden birini seç.
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  )
}
