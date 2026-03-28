'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Sparkles } from 'lucide-react'

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
  low: 'Düşük',
  medium: 'Dengeli',
  high: 'Yüksek',
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
  if (avg >= 20) return 'Görsel dili izleyiciyle buluşuyor'
  if (avg >= 5) return 'Takibe değer'
  return null
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
      <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-orange border-t-transparent mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Analiz yükleniyor...</p>
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
      <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-100 dark:border-gray-900 shadow-sm transition-colors">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-red-500 dark:text-red-400 font-medium">{message}</p>
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

  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-900 shadow-sm transition-colors overflow-hidden">
      {/* Başlık */}
      <div className="p-6 pb-4 border-b border-gray-100 dark:border-gray-800/60">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Sanatsal Analiz</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Üretim dilinizin görsel ve etkileşimsel izlerini bir araya getiren kişisel özet.
        </p>

        {/* Koleksiyoner Özeti */}
        <div className="mt-4 flex gap-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 p-4 border border-gray-100 dark:border-gray-800/60">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{collectorSummary}</p>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Renk İmzası */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Renk İmzası</h3>
          {palette && palette.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {palette.slice(0, 15).map((color, i) => {
                const hexToRgb = (hex: string) => {
                  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
                  return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : null
                }
                const rgb = hexToRgb(color)
                const glow = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)` : `${color}60`
                return (
                  <div
                    key={`${color}-${i}`}
                    className="h-10 w-10 rounded-lg border border-gray-200/80 dark:border-gray-700/80 transition-transform hover:scale-105"
                    style={{
                      backgroundColor: color,
                      boxShadow: `0 0 12px ${glow}`,
                    }}
                    title={color}
                  />
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Henüz yeterli renk verisi yok.</p>
          )}
        </section>

        {/* Görsel Karakter */}
        {colorProfile && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Görsel Karakter</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-gray-50 dark:bg-gray-900/60 p-3 border border-gray-100 dark:border-gray-800/60">
                <p className="text-xs text-gray-500 dark:text-gray-400">Sıcak ton</p>
                <p className="text-lg font-semibold text-brand-orange mt-0.5">
                  {Math.round(colorProfile.warmRatio * 100)}%
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-900/60 p-3 border border-gray-100 dark:border-gray-800/60">
                <p className="text-xs text-gray-500 dark:text-gray-400">Soğuk ton</p>
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                  {Math.round(colorProfile.coolRatio * 100)}%
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-900/60 p-3 border border-gray-100 dark:border-gray-800/60">
                <p className="text-xs text-gray-500 dark:text-gray-400">Parlaklık</p>
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                  {Math.round(colorProfile.avgBrightness * 100)}%
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-900/60 p-3 border border-gray-100 dark:border-gray-800/60">
                <p className="text-xs text-gray-500 dark:text-gray-400">Doygunluk</p>
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                  {Math.round(colorProfile.avgSaturation * 100)}%
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Üslup Profili */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Üslup Profili</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/60 p-3 border border-gray-100 dark:border-gray-800/60">
              <p className="text-xs text-gray-500 dark:text-gray-400">Üslup tutarlılığı</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{styleConsistency}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Son paylaşımlar arasında renk ve estetik dil sürekliliği</p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/60 p-3 border border-gray-100 dark:border-gray-800/60">
              <p className="text-xs text-gray-500 dark:text-gray-400">Görsel imza gücü</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{visualSignature}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Renk ve kompozisyonla ayırt edilebilir dil düzeyi</p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/60 p-3 border border-gray-100 dark:border-gray-800/60">
              <p className="text-xs text-gray-500 dark:text-gray-400">Keşif aşaması</p>
              <p className="text-sm font-semibold text-brand-orange mt-0.5">{discoveryStage}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Üretim olgunluğu hissi</p>
            </div>
          </div>
        </section>

        {/* Üretim Disiplini */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Üretim Disiplini</h3>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-900/60 p-4 border border-gray-100 dark:border-gray-800/60">
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Toplam gönderi</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {productionProfile.totalPosts}
                </p>
              </div>
              {productionProfile.activeMonth && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">En aktif dönem</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {productionProfile.activeMonth}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Üretim yoğunluğu</p>
                <p className="text-lg font-semibold text-brand-orange">
                  {FREQUENCY_LABELS[productionProfile.postingFrequency] ?? productionProfile.postingFrequency}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Paylaşım sıklığı</p>
              </div>
            </div>
          </div>
        </section>

        {/* İzleyici Karşılığı */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">İzleyici Karşılığı</h3>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-900/60 p-4 border border-gray-100 dark:border-gray-800/60">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Toplam beğeni</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {engagement.totalLikes}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Toplam yorum</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {engagement.totalComments}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ort. beğeni / gönderi</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {engagement.avgLikesPerPost.toFixed(1)}
                </p>
              </div>
            </div>
            {engagementTag && (
              <p className="mt-3 text-xs font-medium text-brand-orange">{engagementTag}</p>
            )}
          </div>
        </section>

        {/* Koleksiyoner Notu */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Koleksiyoner Notu</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{summary}</p>
        </section>
      </div>
    </div>
  )
}
