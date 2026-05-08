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
  const EmptyCard = ({ title, index }: { title: string; index: number }) => (
    <div
      className="premium-card-enter relative w-full h-[140px] md:h-[160px] rounded-[14px] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#1a1a1a] dark:to-[#111] border border-[rgba(255,140,0,0.2)] dark:border-[rgba(255,140,0,0.08)] shadow-sm opacity-40"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
        <p className="text-xs font-semibold text-[#ff7b00] mb-1 tracking-wide uppercase">{title}</p>
        <p className="text-sm text-white/60">—</p>
      </div>
    </div>
  )

  return (
    <section className={`w-full ${compactTop ? 'mt-0' : ''}`}>
      <h2 className="flex items-center gap-2 text-lg md:text-xl font-semibold mt-0 mb-4 md:mb-6">
        <Sparkles size={17} className="text-orange-400 flex-shrink-0" />
        <span className="bg-gradient-to-r from-[#fb923c] via-[#ea580c] to-[#7c3aed] bg-clip-text text-transparent tracking-wide">
          Haftanın Öne Çıkanları
        </span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {highlights.map((item) => {
          if (!item.data) {
            return (
              <EmptyCard key={item.id} title={item.title} index={item.id - 1} />
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
            <div className="relative w-full h-[140px] md:h-[160px] rounded-[14px] overflow-hidden bg-gray-900 dark:bg-[#111] border border-[rgba(251,146,60,0.45)] dark:border-[rgba(251,146,60,0.2)] shadow-md hover:shadow-[0_0_28px_rgba(251,146,60,0.35),0_8px_24px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] group cursor-pointer">
              {/* Shimmer sweep on hover */}
              <span className="shimmer-bar" />
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

              {/* Yazılar - En altta overlay içinde */}
              {item.id === 3 ? (
                // Haftanın Yorumu için özel format: Başlık üstte (diğer kartlarla aynı hizada), kullanıcı adı altında, yorum metni ortada
                <>
                  {/* Başlık - Diğer kartlarla birebir aynı bottom padding ve hiza */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                    <p className="text-xs font-semibold text-[#ff7b00] mb-1.5 tracking-wide uppercase">
                      {item.title}
                    </p>
                    {/* Kullanıcı adı - Daha sakin, küratoryal ton */}
                    {item.username && (
                      <p className="text-xs text-white/60 leading-snug line-clamp-1">@{item.username}</p>
                    )}
                  </div>
                  {/* Yorum metni - Kartın optik merkezinde, quote hissi veren stil */}
                  <div className="absolute inset-0 flex items-center justify-center px-3 md:px-4 pb-20 md:pb-24">
                    <p className="relative top-[30px] text-sm text-white/90 font-medium italic leading-snug text-center">
                      {item.subtitle}
                    </p>
                  </div>
                </>
              ) : (
                // Diğer kartlar için normal format (başlık önce, içerik sonra)
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                  <p className="text-xs font-semibold text-[#ff7b00] mb-1.5 tracking-wide uppercase">
                    {item.title}
                  </p>
                  <p className="text-sm text-white font-medium line-clamp-2 leading-snug">
                    {item.subtitle}
                  </p>
                </div>
              )}
            </div>
          )

          // Link varsa kartı Link'e sar, yoksa normal div
          return cardUrl ? (
            <div key={item.id} className="premium-card-enter" style={{ animationDelay: `${(item.id - 1) * 0.08}s` }}>
              <Link href={cardUrl} className="block">
                {CardContent}
              </Link>
            </div>
          ) : (
            <div key={item.id} className="premium-card-enter" style={{ animationDelay: `${(item.id - 1) * 0.08}s` }}>
              {CardContent}
            </div>
          )
        })}
      </div>
    </section>
  )
}

