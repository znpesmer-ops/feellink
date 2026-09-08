'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Compass,
  Eye,
  Flame,
  Heart,
  Lightbulb,
  MessageCircle,
  Palette,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import api from '@/lib/api'

export interface ProfileAnalysisData {
  userId: string
  username: string
  visibility: 'public' | 'private'
  palette: string[]
  colorProfile?: {
    warmRatio: number
    coolRatio: number
    avgBrightness: number
    avgSaturation: number
    dominantMood?: string
  }
  productionProfile: {
    totalPosts: number
    activeMonth: string | null
    postingFrequency: 'low' | 'medium' | 'high'
  }
  engagement: {
    totalLikes: number
    totalComments: number
    avgLikesPerPost: number
    mostEngagedPostId: string | null
  }
  summary: string
}

interface ProfileAnalysisPanelProps {
  username: string
}

const FREQUENCY_LABELS: Record<string, string> = {
  low: 'Sakin',
  medium: 'Dengeli',
  high: 'Yoğun',
}

const FREQUENCY_HINTS: Record<string, string> = {
  low: 'Daha görünür bir ritim için haftalık küçük seri iyi çalışır.',
  medium: 'Ritim oturmuş; aynı kaliteyi koruyarak seçkiyi büyütebilirsin.',
  high: 'Üretim canlı; kürasyon diliyle öne çıkan işleri parlatmak önemli.',
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function percent(value: number) {
  return `${Math.round(clamp(value) * 100)}%`
}

function scoreLabel(score: number) {
  if (score >= 78) return 'Güçlü'
  if (score >= 54) return 'Yükseliyor'
  if (score >= 30) return 'Gelişiyor'
  return 'Başlangıç'
}

function getFrequencyScore(frequency: ProfileAnalysisData['productionProfile']['postingFrequency'], totalPosts: number) {
  const base = frequency === 'high' ? 0.86 : frequency === 'medium' ? 0.66 : 0.38
  return clamp(base + Math.min(totalPosts, 30) / 120)
}

function getSignatureScore(data: ProfileAnalysisData) {
  const { colorProfile, palette } = data
  if (!colorProfile) return palette.length ? 0.34 : 0.18
  const dominantTone = Math.max(colorProfile.warmRatio, colorProfile.coolRatio)
  const paletteDepth = clamp(palette.length / 10)
  return clamp(dominantTone * 0.44 + colorProfile.avgSaturation * 0.28 + colorProfile.avgBrightness * 0.16 + paletteDepth * 0.12)
}

function getAudienceScore(engagement: ProfileAnalysisData['engagement'], totalPosts: number) {
  if (totalPosts === 0) return 0
  const commentWeight = Math.min(engagement.totalComments / Math.max(totalPosts, 1), 8) / 8
  const likeWeight = Math.min(engagement.avgLikesPerPost, 20) / 20
  return clamp(likeWeight * 0.68 + commentWeight * 0.32)
}

/** Koleksiyoner Özeti: tek cümlelik sade yorum (mevcut veriden türetilir) */
function buildCollectorSummary(data: ProfileAnalysisData): string {
  const { colorProfile, productionProfile } = data
  const parts: string[] = []
  if (colorProfile) {
    const warm = colorProfile.warmRatio > 0.55
    const cool = colorProfile.coolRatio > 0.55
    if (warm) parts.push('Sıcak tonlara yaslanan')
    else if (cool) parts.push('Soğuk tonlara eğilimli')
    else parts.push('Dengeli renk diline sahip')
  }
  const freq = productionProfile.postingFrequency
  if (freq === 'low') parts.push('sakin üretim ritmine sahip')
  else if (freq === 'medium') parts.push('düzenli üretim ritmine sahip')
  else parts.push('yoğun üretim ritmine sahip')
  const postCount = productionProfile.totalPosts
  if (postCount < 15) parts.push('erken dönem gelişim potansiyeli taşıyan')
  else if (postCount < 40) parts.push('gelişim aşamasında')
  else parts.push('olgunlaşan')
  if (parts.length === 0) return 'Üretim verisi arttıkça özet güncellenecek.'
  return parts.join(', ') + ' bir profil.'
}

/** Üslup tutarlılığı: renk/kompozisyon sürekliliği hissi (ilk 6 baskın renk; API 15 döndürse bile) */
function getStyleConsistency(data: ProfileAnalysisData): 'Çok tutarlı' | 'Dengeli' | 'Deneysel' | 'Değişken' {
  const { colorProfile, productionProfile, palette } = data
  const p = palette.slice(0, 6)
  if (!colorProfile || p.length < 2) return 'Dengeli'
  const dom = colorProfile.warmRatio > 0.65 || colorProfile.coolRatio > 0.65
  const sat = colorProfile.avgSaturation > 0.5
  if (dom && sat && productionProfile.totalPosts >= 10) return 'Çok tutarlı'
  if (p.length >= 5 && !dom) return 'Deneysel'
  if (productionProfile.postingFrequency === 'high' && p.length >= 4) return 'Değişken'
  return 'Dengeli'
}

/** Görsel imza gücü: ayırt edilebilir dil düzeyi (ilk 6 baskın renk) */
function getVisualSignatureStrength(data: ProfileAnalysisData): 'Belirgin' | 'Gelişiyor' | 'Nötr' {
  const { colorProfile, palette } = data
  const p = palette.slice(0, 6)
  if (!colorProfile) return 'Nötr'
  const strong = colorProfile.warmRatio > 0.7 || colorProfile.coolRatio > 0.7
  const sat = colorProfile.avgSaturation > 0.45
  if (strong && sat && p.length >= 3) return 'Belirgin'
  if (p.length >= 2 && (colorProfile.warmRatio > 0.55 || colorProfile.coolRatio > 0.55)) return 'Gelişiyor'
  return 'Nötr'
}

/** Keşif aşaması: üretim olgunluğu hissi */
function getDiscoveryStage(data: ProfileAnalysisData): 'Erken dönem' | 'Gelişim aşamasında' | 'Olgunlaşan profil' {
  const n = data.productionProfile.totalPosts
  if (n < 15) return 'Erken dönem'
  if (n < 40) return 'Gelişim aşamasında'
  return 'Olgunlaşan profil'
}

/** İzleyici karşılığı için yumuşak etiket */
function getEngagementTag(engagement: ProfileAnalysisData['engagement']): string | null {
  const avg = engagement.avgLikesPerPost
  if (avg >= 20) return 'Görsel dili izleyiciyle güçlü biçimde buluşuyor'
  if (avg >= 5) return 'Takibe değer bir izleyici karşılığı oluşuyor'
  return null
}

function getToneLabel(colorProfile?: ProfileAnalysisData['colorProfile']) {
  if (!colorProfile) return 'Veri bekleniyor'
  if (colorProfile.warmRatio > 0.58) return 'Sıcak ve davetkar'
  if (colorProfile.coolRatio > 0.58) return 'Sakin ve rafine'
  return 'Dengeli ve esnek'
}

function getFocusSuggestions(data: ProfileAnalysisData) {
  const suggestions: string[] = []
  const signatureScore = getSignatureScore(data)
  const audienceScore = getAudienceScore(data.engagement, data.productionProfile.totalPosts)

  if (data.productionProfile.totalPosts < 6) {
    suggestions.push('İlk seri hissini güçlendirmek için aynı konu etrafında 3-5 yeni iş paylaş.')
  } else if (data.productionProfile.postingFrequency === 'low') {
    suggestions.push('Profil ritmini canlı tutmak için ayda en az iki seçili eser yayınla.')
  } else {
    suggestions.push('En güçlü işleri sabitleyerek profil girişinde daha net bir kürasyon oluştur.')
  }

  if (signatureScore < 0.55) {
    suggestions.push('Renk paletini daha seçici kullanarak görsel imzanı hızlıca belirginleştir.')
  } else {
    suggestions.push('Renk dilin oluşuyor; benzer tonlarda küçük bir koleksiyon hikayesi kur.')
  }

  if (audienceScore < 0.35) {
    suggestions.push('Eser açıklamalarına kısa süreç notları eklemek izleyici etkileşimini artırabilir.')
  } else {
    suggestions.push('Etkileşim alan işlerin ortak yönünü yeni paylaşımlarda tekrar et.')
  }

  return suggestions
}

function MetricBar({
  label,
  value,
  icon: Icon,
  tone = 'orange',
}: {
  label: string
  value: number
  icon: typeof Flame
  tone?: 'orange' | 'blue' | 'neutral'
}) {
  const accent = tone === 'blue' ? 'bg-brand-blue' : tone === 'neutral' ? 'bg-slate-400' : 'bg-brand-orange'
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm shadow-slate-900/5 transition-colors dark:border-white/10 dark:bg-white/[0.045] dark:shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</span>
        </div>
        <span className="text-lg font-semibold text-slate-950 dark:text-white">{percent(value)}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-200/80 dark:bg-white/10">
        <div className={`h-full rounded-full ${accent}`} style={{ width: percent(value) }} />
      </div>
    </div>
  )
}

function ScoreCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string
  value: number
  description: string
  icon: typeof Sparkles
}) {
  const score = Math.round(clamp(value) * 100)
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm shadow-slate-900/5 transition-colors dark:border-white/10 dark:bg-white/[0.045]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            <Icon className="h-4 w-4 text-brand-orange" />
            {label}
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">{score}</p>
          <p className="text-xs font-semibold text-brand-orange">{scoreLabel(score)}</p>
        </div>
        <div
          className="grid h-14 w-14 place-items-center rounded-full p-1"
          style={{
            background: `conic-gradient(#ff8a00 ${score * 3.6}deg, rgba(148,163,184,0.18) 0deg)`,
          }}
        >
          <div className="h-full w-full rounded-full bg-white dark:bg-[#101522]" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  )
}

export function ProfileAnalysisPanel({ username }: ProfileAnalysisPanelProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['profile-analysis', username],
    queryFn: async () => {
      const res = await api.get(`/users/profile/${encodeURIComponent(username)}/analysis`)
      return res.data as ProfileAnalysisData
    },
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-8 shadow-2xl shadow-slate-900/5 transition-colors dark:border-white/10 dark:bg-[#070a12] dark:shadow-black/30">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-brand-orange border-t-transparent shadow-lg shadow-brand-orange/20" />
          <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">Analiz hazırlanıyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    const status = (error as { response?: { status?: number } })?.response?.status
    const message =
      status === 403
        ? 'Bu analizi görüntüleme yetkiniz yok.'
        : 'Analiz yüklenirken bir hata oluştu. Lütfen tekrar deneyin.'
    return (
      <div className="rounded-[28px] border border-red-200/80 bg-red-50/90 p-8 shadow-sm transition-colors dark:border-red-500/25 dark:bg-red-950/20">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-semibold text-red-600 dark:text-red-300">{message}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { palette, colorProfile, productionProfile, engagement, summary } = data
  const collectorSummary = buildCollectorSummary(data)
  const styleConsistency = getStyleConsistency(data)
  const visualSignature = getVisualSignatureStrength(data)
  const discoveryStage = getDiscoveryStage(data)
  const engagementTag = getEngagementTag(engagement)
  const signatureScore = getSignatureScore(data)
  const rhythmScore = getFrequencyScore(productionProfile.postingFrequency, productionProfile.totalPosts)
  const audienceScore = getAudienceScore(engagement, productionProfile.totalPosts)
  const creativePulse = Math.round((signatureScore * 0.44 + rhythmScore * 0.34 + audienceScore * 0.22) * 100)
  const suggestions = getFocusSuggestions(data)
  const dominantGradient =
    palette.length > 1
      ? `linear-gradient(90deg, ${palette.slice(0, 7).join(', ')})`
      : 'linear-gradient(90deg, #ff8a00, #1e88e5)'

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white text-slate-950 shadow-2xl shadow-slate-950/5 transition-colors dark:border-white/10 dark:bg-[#070a12] dark:text-white dark:shadow-black/30">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(255,138,0,0.14),transparent_30%),radial-gradient(circle_at_92%_6%,rgba(30,136,229,0.14),transparent_32%)] dark:bg-[radial-gradient(circle_at_16%_0%,rgba(255,138,0,0.18),transparent_28%),radial-gradient(circle_at_92%_6%,rgba(30,136,229,0.18),transparent_32%)]" />

      <div className="relative border-b border-slate-200/70 p-6 sm:p-7 dark:border-white/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-orange/20 bg-brand-orange/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange dark:border-brand-orange/25 dark:bg-brand-orange/15">
              <Sparkles className="h-3.5 w-3.5" />
              Sanatsal DNA
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
              Profil analiz merkezi
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Üretim ritmini, renk imzanı ve izleyici karşılığını tek bir sakin panelde okur. Profilini büyütmek için
              hangi alanın parladığını ve nerede ince ayar gerektiğini gösterir.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-lg shadow-slate-900/5 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/20">
            <div className="flex items-center gap-4">
              <div
                className="grid h-20 w-20 place-items-center rounded-full p-1.5"
                style={{
                  background: `conic-gradient(#ff8a00 ${creativePulse * 3.6}deg, rgba(30,136,229,0.22) 0deg)`,
                }}
              >
                <div className="grid h-full w-full place-items-center rounded-full bg-white text-2xl font-semibold text-slate-950 dark:bg-[#101522] dark:text-white">
                  {creativePulse}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Yaratıcı nabız
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{scoreLabel(creativePulse)}</p>
                <p className="mt-1 max-w-[13rem] text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Renk, ritim ve izleyici sinyallerinin birleşik görünümü.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3 rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-sm shadow-slate-900/5 dark:border-white/10 dark:bg-white/[0.045]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Küratör özeti
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{collectorSummary}</p>
          </div>
        </div>
      </div>

      <div className="relative space-y-8 p-6 sm:p-7">
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <ScoreCard
            label="İmza"
            value={signatureScore}
            icon={Palette}
            description={`${getToneLabel(colorProfile)} bir renk dili algılanıyor.`}
          />
          <ScoreCard
            label="Ritim"
            value={rhythmScore}
            icon={Activity}
            description={FREQUENCY_HINTS[productionProfile.postingFrequency] ?? 'Paylaşım ritmi takip ediliyor.'}
          />
          <ScoreCard
            label="Karşılık"
            value={audienceScore}
            icon={Eye}
            description={engagementTag ?? 'Etkileşim verisi arttıkça bu alan daha anlamlı hale gelir.'}
          />
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm shadow-slate-900/5 dark:border-white/10 dark:bg-white/[0.045]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-950 dark:text-white">Renk imzası</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Profildeki görsel hafızayı oluşturan baskın tonlar.
              </p>
            </div>
            {colorProfile?.dominantMood && (
              <span className="rounded-full border border-brand-orange/20 bg-brand-orange/10 px-3 py-1 text-xs font-semibold text-brand-orange">
                {colorProfile.dominantMood}
              </span>
            )}
          </div>

          {palette && palette.length > 0 ? (
            <>
              <div className="mt-5 h-3 rounded-full border border-white/50 shadow-inner shadow-black/10" style={{ background: dominantGradient }} />
              <div className="mt-4 flex flex-wrap gap-2">
                {palette.slice(0, 15).map((color, i) => (
                  <div
                    key={`${color}-${i}`}
                    className="h-11 w-11 rounded-2xl border border-slate-200/80 shadow-sm transition-transform hover:-translate-y-0.5 hover:scale-105 dark:border-white/15"
                    style={{
                      backgroundColor: color,
                      boxShadow: `0 10px 24px ${color}28`,
                    }}
                    title={color}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Henüz yeterli renk verisi yok.</p>
          )}
        </section>

        {colorProfile && (
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-950 dark:text-white">Görsel karakter</h3>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Renk davranışı</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MetricBar label="Sıcak ton" value={colorProfile.warmRatio} icon={Flame} tone="orange" />
              <MetricBar label="Soğuk ton" value={colorProfile.coolRatio} icon={Target} tone="blue" />
              <MetricBar label="Parlaklık" value={colorProfile.avgBrightness} icon={CheckCircle2} tone="neutral" />
              <MetricBar label="Doygunluk" value={colorProfile.avgSaturation} icon={Award} tone="orange" />
            </div>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-950 dark:text-white">Üslup profili</h3>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Kişisel rota</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.045]">
              <p className="text-xs text-slate-500 dark:text-slate-400">Üslup tutarlılığı</p>
              <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{styleConsistency}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Son paylaşımlar arasında renk ve estetik dil sürekliliği.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.045]">
              <p className="text-xs text-slate-500 dark:text-slate-400">Görsel imza gücü</p>
              <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{visualSignature}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Renk ve kompozisyonla ayırt edilebilir dil düzeyi.
              </p>
            </div>
            <div className="rounded-2xl border border-brand-orange/20 bg-brand-orange/10 p-4 dark:border-brand-orange/25 dark:bg-brand-orange/15">
              <p className="text-xs text-slate-600 dark:text-slate-300">Keşif aşaması</p>
              <p className="mt-1 text-sm font-semibold text-brand-orange">{discoveryStage}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                Üretim olgunluğu ve profilin büyüme hissi.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 dark:border-white/10 dark:bg-white/[0.045]">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand-orange" />
              <h3 className="text-base font-semibold text-slate-950 dark:text-white">Üretim disiplini</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Toplam gönderi</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{productionProfile.totalPosts}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">En aktif dönem</p>
                <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                  {productionProfile.activeMonth ?? 'Henüz oluşmadı'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Üretim yoğunluğu</p>
                <p className="mt-1 text-lg font-semibold text-brand-orange">
                  {FREQUENCY_LABELS[productionProfile.postingFrequency] ?? productionProfile.postingFrequency}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 dark:border-white/10 dark:bg-white/[0.045]">
            <div className="mb-4 flex items-center gap-2">
              <Heart className="h-5 w-5 text-brand-orange" />
              <h3 className="text-base font-semibold text-slate-950 dark:text-white">İzleyici karşılığı</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Beğeni</p>
                <p className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{engagement.totalLikes}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Yorum</p>
                <p className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{engagement.totalComments}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ort.</p>
                <p className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
                  {engagement.avgLikesPerPost.toFixed(1)}
                </p>
              </div>
            </div>
            {engagementTag && (
              <p className="mt-4 rounded-2xl bg-brand-orange/10 px-3 py-2 text-xs font-medium text-brand-orange">
                {engagementTag}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-brand-orange" />
            <h3 className="text-base font-semibold text-slate-950 dark:text-white">Bir sonraki güçlü hamle</h3>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3">
            {suggestions.map((item, index) => (
              <div
                key={item}
                className="flex gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-3 text-sm leading-relaxed text-slate-700 dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-200"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-xs font-semibold text-brand-orange">
                  {index + 1}
                </span>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 dark:border-white/10 dark:bg-white/[0.045]">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-brand-orange" />
              <h3 className="text-base font-semibold text-slate-950 dark:text-white">Profil ritmi</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {FREQUENCY_HINTS[productionProfile.postingFrequency] ?? 'Ritim verisi yeni paylaşımlarla güçlenecek.'}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 dark:border-white/10 dark:bg-white/[0.045]">
            <div className="mb-4 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-brand-orange" />
              <h3 className="text-base font-semibold text-slate-950 dark:text-white">Koleksiyoner notu</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{summary}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-brand-orange/20 bg-gradient-to-r from-brand-orange/10 via-white/70 to-brand-blue/10 p-5 dark:via-white/[0.04]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-brand-orange" />
                <h3 className="text-base font-semibold text-slate-950 dark:text-white">Analiz nasıl güçlenir?</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Daha fazla eser, açıklama ve izleyici etkileşimi geldiğinde panel otomatik olarak daha keskin öneriler
                üretir.
              </p>
            </div>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-200">
              Canlı profil verisi
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}
