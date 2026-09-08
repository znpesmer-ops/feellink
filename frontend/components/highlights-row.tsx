'use client'

import { ImageIcon, MessageCircle, Landmark, Palette, Sparkles } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { GC_STANDARD, STALE_LAYOUT, sidebarKeys } from '@/lib/query-config'
import Link from 'next/link'

interface HighlightsRowProps {
  compactTop?: boolean
}

interface FeaturedData {
  museum: { name: string; username: string; imageUrl: string } | null
  artwork: { title: string; postId: string; imageUrl: string } | null
  comment: { text: string; commentId: string; postId: string; username: string; fullName: string } | null
  collector: { name: string; username: string; imageUrl: string } | null
}

const EMPTY_FEATURED: FeaturedData = {
  museum: null,
  artwork: null,
  comment: null,
  collector: null,
}

export default function HighlightsRow({ compactTop = false }: HighlightsRowProps) {
  const { data } = useQuery({
    queryKey: sidebarKeys.featured,
    queryFn: async () => {
      const res = await api.get('/sidebar/featured')
      return res.data as FeaturedData
    },
    staleTime: STALE_LAYOUT,
    gcTime: GC_STANDARD,
    refetchOnWindowFocus: false,
  })

  const featured = data ?? EMPTY_FEATURED

  // Her kart için hedef URL'yi hesapla
  const getCardUrl = (item: any) => {
    if (!item.data) return null

    switch (item.id) {
      case 1: // Haftanın Müzesi
        return featured.museum?.username ? `/profile/${featured.museum.username}` : null
      case 2: // Haftanın Eseri
        return featured.artwork?.postId ? `/feed?post=${featured.artwork.postId}` : null
      case 3: // Haftanın Yorumu
        return featured.comment?.postId && featured.comment?.commentId
          ? `/feed?post=${featured.comment.postId}&comment=${featured.comment.commentId}`
          : null
      case 4: // Haftanın Koleksiyoneri
        return featured.collector?.username ? `/profile/${featured.collector.username}` : null
      default:
        return null
    }
  }

  // Her zaman 4 kart - veri yoksa boş placeholder
  const highlights = [
    {
      id: 1,
      title: 'Haftanın Müzesi',
      subtitle: featured.museum?.name || '—',
      icon: <Landmark size={20} strokeWidth={1.8} />,
      data: featured.museum,
      imageUrl: featured.museum?.imageUrl,
    },
    {
      id: 2,
      title: 'Haftanın Eseri',
      subtitle: featured.artwork?.title || '—',
      icon: <ImageIcon size={20} strokeWidth={1.8} />,
      data: featured.artwork,
      imageUrl: featured.artwork?.imageUrl,
    },
    {
      id: 3,
      title: 'Haftanın Yorumu',
      subtitle: featured.comment
        ? `"${featured.comment.text.length > 30 ? featured.comment.text.substring(0, 30) + '...' : featured.comment.text}"`
        : '—',
      icon: <MessageCircle size={20} strokeWidth={1.8} />,
      data: featured.comment,
      username: featured.comment?.username,
    },
    {
      id: 4,
      title: 'Haftanın Koleksiyoneri',
      subtitle: featured.collector?.name || '—',
      icon: <Palette size={20} strokeWidth={1.8} />,
      data: featured.collector,
      imageUrl: featured.collector?.imageUrl,
    },
  ]

  // Boş placeholder kartı - Modern overlay tasarımı
  const EmptyCard = ({ title }: { title: string }) => (
    <div className="relative h-[132px] w-full overflow-hidden rounded-[20px] border border-slate-200/80 bg-white/82 shadow-[0_16px_42px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_16px_44px_rgba(0,0,0,0.26)] sm:h-[140px] md:h-[160px] md:rounded-[22px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_0%,rgba(255,123,0,0.16),transparent_42%),radial-gradient(circle_at_90%_12%,rgba(31,106,225,0.12),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,250,252,0.42))] dark:bg-[radial-gradient(circle_at_22%_0%,rgba(255,123,0,0.24),transparent_42%),radial-gradient(circle_at_90%_12%,rgba(31,106,225,0.20),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_44%)]" />
      <div className="absolute inset-x-3 top-3 h-px bg-gradient-to-r from-transparent via-slate-300/70 to-transparent dark:via-white/20 sm:inset-x-5 sm:top-4" />
      <div className="absolute inset-0 bg-gradient-to-t from-white/78 via-white/18 to-transparent dark:from-black/70 dark:via-black/18" />
      <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3 md:p-4">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-orange-700 dark:text-orange-200 sm:text-xs sm:tracking-wide">{title}</p>
        <p className="text-xs text-slate-500 dark:text-white/60 sm:text-sm">—</p>
      </div>
    </div>
  )

  return (
    <section className={`w-full ${compactTop ? 'mt-0' : ''}`}>
      <h2 className="mt-0 mb-4 md:mb-6 flex items-center gap-2.5 text-lg md:text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
        <span className="feellink-section-icon feellink-section-icon--featured" aria-hidden="true">
          <Sparkles size={15} strokeWidth={2.1} />
        </span>
        Haftanın Öne Çıkanları
      </h2>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:gap-4 lg:grid-cols-4">
        {highlights.map((item) => {
          if (!item.data) {
            return (
              <EmptyCard key={item.id} title={item.title} />
            )
          }

          // Haftanın Yorumu için özel görsel yoksa placeholder
          const displayImage = item.imageUrl || (item.id === 3 ? null : null)
          const fallbackBg = item.id === 1 
            ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/30'
            : item.id === 2
            ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/30'
            : item.id === 3
            ? 'bg-gradient-to-b from-[rgba(120,80,160,0.15)] to-[rgba(20,20,30,0.85)]'
            : 'bg-gradient-to-br from-pink-500/20 to-pink-600/30'

          const cardUrl = getCardUrl(item)
          
          // Tüm kartlar aynı yapıyı kullanır (Haftanın Yorumu dahil)
          const CardContent = (
            <div className="group relative h-[132px] w-full cursor-pointer overflow-hidden rounded-[20px] border border-slate-200/80 bg-white/86 shadow-[0_16px_42px_rgba(15,23,42,0.09)] transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/55 hover:shadow-[0_24px_70px_rgba(255,123,0,0.16)] dark:border-white/10 dark:bg-[#090f1c] dark:shadow-[0_16px_44px_rgba(0,0,0,0.30)] sm:h-[140px] md:h-[160px] md:rounded-[22px]">
              {/* Görsel veya Gradient Background */}
              {displayImage ? (
                <img
                  src={resolveImageUrl(displayImage)}
                  alt={item.subtitle}
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className={`absolute inset-0 ${fallbackBg}`} />
              )}

              {/* Gradient Overlay - En altta yazı okunurluğu için */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(255,123,0,0.14),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(15,23,42,0.72))] dark:bg-[radial-gradient(circle_at_12%_0%,rgba(255,123,0,0.16),transparent_38%),linear-gradient(180deg,rgba(0,0,0,0.06),rgba(0,0,0,0.82))]" />
              <div className="absolute inset-x-3 top-3 h-px bg-gradient-to-r from-transparent via-white/34 to-transparent opacity-70 dark:via-white/28 sm:inset-x-4 sm:top-4" />

              {/* Yazılar - En altta overlay içinde */}
              {item.id === 3 ? (
                // Haftanın Yorumu için özel format: Başlık üstte (diğer kartlarla aynı hizada), kullanıcı adı altında, yorum metni ortada
                <>
                  {/* Başlık - Diğer kartlarla birebir aynı bottom padding ve hiza */}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3 md:p-4">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-orange-100 dark:text-orange-200 sm:mb-1.5 sm:text-xs sm:tracking-wide">
                      {item.title}
                    </p>
                    {/* Kullanıcı adı - Daha sakin, küratoryal ton */}
                    {item.username && (
                      <p className="line-clamp-1 text-[11px] leading-snug text-white/72 sm:text-xs">@{item.username}</p>
                    )}
                  </div>
                  {/* Yorum metni - Kartın optik merkezinde, quote hissi veren stil */}
                  <div className="absolute inset-0 flex items-center justify-center px-2.5 pb-16 sm:px-3 sm:pb-20 md:px-4 md:pb-24">
                    <p className="relative top-[22px] line-clamp-3 text-center text-[11px] font-medium italic leading-snug text-white/92 sm:text-sm md:top-[30px]">
                      {item.subtitle}
                    </p>
                  </div>
                </>
              ) : (
                // Diğer kartlar için normal format (başlık önce, içerik sonra)
                <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3 md:p-4">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-orange-100 dark:text-orange-200 sm:mb-1.5 sm:text-xs sm:tracking-wide">
                    {item.title}
                  </p>
                  <p className="line-clamp-2 text-xs font-medium leading-snug text-white sm:text-sm">
                    {item.subtitle}
                  </p>
                </div>
              )}
            </div>
          )

          // Link varsa kartı Link'e sar, yoksa normal div
          return cardUrl ? (
            <Link key={item.id} href={cardUrl} className="block">
              {CardContent}
            </Link>
          ) : (
            <div key={item.id}>
              {CardContent}
            </div>
          )
        })}
      </div>
    </section>
  )
}
