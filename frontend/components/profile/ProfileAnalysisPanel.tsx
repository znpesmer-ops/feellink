'use client'

import { useQuery } from '@tanstack/react-query'
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
  medium: 'Düzenli',
  high: 'Yoğun',
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

  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-900 shadow-sm transition-colors overflow-hidden">
      {/* Başlık */}
      <div className="p-6 pb-4 border-b border-gray-100 dark:border-gray-800/60">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Sanatsal Analiz</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Üretim dilinizin görsel ve etkileşimsel izlerini bir araya getiren kişisel özet.
        </p>
      </div>

      <div className="p-6 space-y-8">
        {/* Renk İmzası */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Renk İmzası</h3>
          {palette && palette.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {palette.map((color, i) => {
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

        {/* Üretim Ritmi */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Üretim Ritmi</h3>
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
                <p className="text-xs text-gray-500 dark:text-gray-400">Paylaşım ritmi</p>
                <p className="text-lg font-semibold text-brand-orange">
                  {FREQUENCY_LABELS[productionProfile.postingFrequency] ?? productionProfile.postingFrequency}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Etkileşim Özeti */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Etkileşim Özeti</h3>
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
          </div>
        </section>

        {/* Sanatsal Profil Özeti */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sanatsal Profil</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{summary}</p>
        </section>
      </div>
    </div>
  )
}
