'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Calendar,
  Clock3,
  Edit,
  Eye,
  Feather,
  FileText,
  Heart,
  Layers,
  MessageCircle,
  MoreVertical,
  PenLine,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import api from '@/lib/api'
import { initArticlesSocket } from '@/lib/socket'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import toast from 'react-hot-toast'
import DeleteConfirmModal from '@/components/common/DeleteConfirmModal'

interface Article {
  id: string
  title: string
  content: string
  coverImage?: string | null
  excerpt?: string | null
  views?: number
  authorId?: string
  createdAt: string
  scheduledAt?: string | null
  isPublished?: boolean
  _count?: {
    likes: number
    comments: number
  }
}

interface UserArticlesProps {
  authorId?: string
}

const stripHtml = (value?: string | null) =>
  (value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const safeDate = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatShortDate = (value?: string | null) => {
  const date = safeDate(value)
  if (!date) return 'Tarih yok'
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

const formatLongDate = (value?: string | null) => {
  const date = safeDate(value)
  if (!date) return 'Tarih seçilmedi'
  return date.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const estimateReadingMinutes = (article: Article) => {
  const words = stripHtml(article.content).split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 180))
}

const getArticleExcerpt = (article: Article) => {
  const excerpt = stripHtml(article.excerpt || article.content)
  if (!excerpt) return 'Bu yazı için kısa bir giriş metni henüz eklenmemiş.'
  return excerpt.length > 150 ? `${excerpt.slice(0, 150).trim()}...` : excerpt
}

const getArticleScore = (article: Article) =>
  (article.views || 0) + (article._count?.likes || 0) * 3 + (article._count?.comments || 0) * 4

export default function UserArticles({ authorId }: UserArticlesProps) {
  const router = useRouter()
  const { user, accessToken } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'published' | 'scheduled'>('published')
  const [publishedArticles, setPublishedArticles] = useState<Article[]>([])
  const [scheduledArticles, setScheduledArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [openMenuArticleId, setOpenMenuArticleId] = useState<string | null>(null)

  // authorId prop varsa onu kullan, yoksa current user'ın id'sini kullan
  const targetUserId = authorId || user?.id
  const isOwnArticles = targetUserId === user?.id

  useEffect(() => {
    // ✅ Önce state'leri sıfırla
    setPublishedArticles([])
    setScheduledArticles([])
    setLoading(true)

    if (!targetUserId) {
      setLoading(false)
      return
    }

    let isCancelled = false

    const loadArticles = async () => {
      try {
        // Yayınlanan yazıları çek
        const publishedResponse = await api.get(`/articles/user/${targetUserId}`)
        
        // ✅ Cleanup kontrolü: Eğer component unmount olduysa veya targetUserId değiştiyse state güncelleme
        if (isCancelled) return
        
        const allArticles: Article[] = publishedResponse.data || []
        
        // ✅ Duplicate kontrolü: Aynı ID'ye sahip article'ları filtrele
        const uniqueArticles = Array.from(
          new Map(allArticles.map((a: Article) => [a.id, a])).values()
        ) as Article[]
        
        // Yayınlanan ve zamanlanmış yazıları ayır
        const published = uniqueArticles.filter((a: Article) => a.isPublished)
        const scheduled = uniqueArticles.filter((a: Article) => !a.isPublished && a.scheduledAt)
        
        // ✅ Replace yap, append değil (çift render'ı önle)
        if (!isCancelled) {
          setPublishedArticles(published)
          setScheduledArticles(scheduled)
        }
      } catch (error) {
        if (isCancelled) return
        console.error('Failed to load articles:', error)
        if (!isCancelled) {
          setPublishedArticles([])
          setScheduledArticles([])
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    loadArticles()

    // Socket.IO ile gerçek zamanlı güncelleme
    let articlesSocket: any = null
    if (accessToken) {
      articlesSocket = initArticlesSocket(accessToken as string)

      const handleArticleCreated = (article: any) => {
        if (isCancelled) return
        if (article.authorId === targetUserId || article.author?.id === targetUserId) {
          if (article.isPublished) {
            setPublishedArticles((prev) => {
              // ✅ Duplicate kontrolü
              if (prev.some((a) => a.id === article.id)) return prev
              return [article, ...prev]
            })
          } else if (article.scheduledAt) {
            setScheduledArticles((prev) => {
              // ✅ Duplicate kontrolü
              if (prev.some((a) => a.id === article.id)) return prev
              return [article, ...prev]
            })
          }
        }
      }

      const handleArticleUpdated = (updatedArticle: any) => {
        if (isCancelled) return
        setPublishedArticles((prev) =>
          prev.map((a) => 
            a.id === updatedArticle.id 
              ? { ...a, _count: updatedArticle._count || a._count, ...updatedArticle }
              : a
          )
        )
        setScheduledArticles((prev) =>
          prev.map((a) => 
            a.id === updatedArticle.id 
              ? { ...a, _count: updatedArticle._count || a._count, ...updatedArticle }
              : a
          )
        )
      }

      const handleArticleDeleted = ({ id }: { id: string }) => {
        if (isCancelled) return
        setPublishedArticles((prev) => prev.filter((a) => a.id !== id))
        setScheduledArticles((prev) => prev.filter((a) => a.id !== id))
      }

      articlesSocket.on('articleCreated', handleArticleCreated)
      articlesSocket.on('articleUpdated', handleArticleUpdated)
      articlesSocket.on('articleDeleted', handleArticleDeleted)
    }
    
    // ✅ Cleanup: targetUserId değiştiğinde veya component unmount olduğunda
    return () => {
      isCancelled = true
      if (articlesSocket) {
        articlesSocket.off('articleCreated')
        articlesSocket.off('articleUpdated')
        articlesSocket.off('articleDeleted')
      }
    }
  }, [targetUserId, accessToken, user?.id, isOwnArticles])

  // ✅ useMemo ile unique articles hesapla (duplicate kontrolü garantili)
  const uniquePublishedArticles = useMemo(() => {
    return Array.from(
      new Map(publishedArticles.map((a) => [a.id, a])).values()
    ) as Article[]
  }, [publishedArticles])

  const uniqueScheduledArticles = useMemo(() => {
    return Array.from(
      new Map(scheduledArticles.map((a) => [a.id, a])).values()
    ) as Article[]
  }, [scheduledArticles])

  const articleStats = useMemo(() => {
    const totalViews = uniquePublishedArticles.reduce((sum, article) => sum + (article.views || 0), 0)
    const totalLikes = uniquePublishedArticles.reduce((sum, article) => sum + (article._count?.likes || 0), 0)
    const totalComments = uniquePublishedArticles.reduce((sum, article) => sum + (article._count?.comments || 0), 0)
    const totalReadMinutes = uniquePublishedArticles.reduce((sum, article) => sum + estimateReadingMinutes(article), 0)
    const averageRead = uniquePublishedArticles.length
      ? Math.max(1, Math.round(totalReadMinutes / uniquePublishedArticles.length))
      : 0

    return {
      totalViews,
      totalEngagement: totalLikes + totalComments,
      averageRead,
      totalReadMinutes,
    }
  }, [uniquePublishedArticles])

  const nextScheduledArticle = useMemo(() => {
    return [...uniqueScheduledArticles]
      .filter((article) => safeDate(article.scheduledAt))
      .sort((a, b) => (safeDate(a.scheduledAt)?.getTime() || 0) - (safeDate(b.scheduledAt)?.getTime() || 0))[0]
  }, [uniqueScheduledArticles])

  const featuredArticle = useMemo(() => {
    return [...uniquePublishedArticles].sort((a, b) => getArticleScore(b) - getArticleScore(a))[0]
  }, [uniquePublishedArticles])

  const currentArticles = activeTab === 'published' ? uniquePublishedArticles : uniqueScheduledArticles

  const handleCancelSchedule = async (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('Bu yazının zamanlamasını iptal etmek istediğinize emin misiniz? Yazı taslak olarak kalacak.')) {
      return
    }

    try {
      await api.put(`/articles/${articleId}`, { scheduledAt: null })
      toast.success('Zamanlama iptal edildi')
      setScheduledArticles((prev) => prev.filter((a) => a.id !== articleId))
    } catch (error: any) {
      console.error('Failed to cancel schedule:', error)
      toast.error('Zamanlama iptal edilirken bir hata oluştu')
    }
  }

  const handleDeleteClick = (e: React.MouseEvent, article: Article) => {
    e.stopPropagation()
    setOpenMenuArticleId(null)
    setArticleToDelete(article)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!articleToDelete) return
    setIsDeleting(true)
    try {
      await api.delete(`/articles/${articleToDelete.id}`)
      setPublishedArticles((prev) => prev.filter((a) => a.id !== articleToDelete.id))
      setScheduledArticles((prev) => prev.filter((a) => a.id !== articleToDelete.id))
      toast.success('Yazı silindi')
      setDeleteModalOpen(false)
      setArticleToDelete(null)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Yazı silinemedi.')
    } finally {
      setIsDeleting(false)
    }
  }

  const renderArticleCard = (article: Article, isScheduled: boolean = false) => {
    const destination = isScheduled ? `/articles/edit/${article.id}` : `/articles/${article.id}`
    const coverImage = article.coverImage ? resolveImageUrl(article.coverImage) : null
    const scheduledDate = safeDate(article.scheduledAt)
    const isPastSchedule = Boolean(scheduledDate && scheduledDate < new Date())

    return (
      <article
        key={article.id}
        className="group relative overflow-hidden rounded-[1.35rem] border border-[#eadfd5] bg-[#fffaf5] shadow-[0_18px_45px_rgba(54,39,25,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-[#ff8a1f]/45 hover:shadow-[0_22px_70px_rgba(255,138,31,0.16)] dark:border-white/[0.10] dark:bg-[#0b0f16] dark:shadow-[0_24px_80px_rgba(0,0,0,0.42)] dark:hover:border-[#ff9b3d]/45"
      >
        <div className="absolute -right-16 -top-20 h-40 w-40 rounded-full bg-[#ff8a1f]/12 blur-3xl dark:bg-[#ff8a1f]/12" aria-hidden />
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,138,31,0.72),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden />
        <button
          type="button"
          onClick={() => router.push(destination)}
          className="relative block w-full overflow-hidden text-left"
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#fff0df] via-[#f6efe8] to-[#dfe8f5] dark:from-[#1b1110] dark:via-[#121827] dark:to-[#070a10]">
            {coverImage ? (
              <img
                src={coverImage}
                alt={article.title}
                className="h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.045] dark:opacity-[0.72] dark:saturate-[0.82] dark:contrast-[0.96]"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-[#b26a29] dark:text-[#ffb066]">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/70 bg-white/65 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07] dark:shadow-[0_0_30px_rgba(255,138,31,0.10)]">
                  <Feather size={24} />
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Yazı kapağı</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/66 via-black/10 to-transparent opacity-90 dark:from-[#05070d]/96 dark:via-[#05070d]/22 dark:to-transparent" aria-hidden />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(255,138,31,0.20),transparent_34%)] opacity-70 dark:opacity-45" aria-hidden />
            <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/22 bg-black/38 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-xl">
                {isScheduled ? <Calendar size={12} /> : <FileText size={12} />}
                {isScheduled ? 'Planlı' : 'Yayında'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-xl">
                <Clock3 size={12} />
                {estimateReadingMinutes(article)} dk
              </span>
            </div>
            <ArrowUpRight className="absolute bottom-3 right-3 h-5 w-5 text-white/90 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>
        </button>

        <div className="relative border-t border-[#eadfd5]/70 bg-[#fffaf5] p-4 dark:border-white/[0.07] dark:bg-[linear-gradient(180deg,rgba(14,18,27,0.98),rgba(8,11,18,0.98))]">
          <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a7150] dark:text-[#ffbd80]">
            <span>{isScheduled ? 'Yayın planı' : formatShortDate(article.createdAt)}</span>
            {!isScheduled && (
              <span className="rounded-full border border-[#ff8a1f]/15 bg-[#ff8a1f]/10 px-2 py-1 text-[#b45f18] dark:border-[#ff8a1f]/20 dark:bg-[#ff8a1f]/12 dark:text-[#ffb066]">
                Etki {getArticleScore(article)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => router.push(destination)}
            className="block w-full text-left"
          >
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-[#231910] transition-colors group-hover:text-[#d96d13] dark:text-white dark:drop-shadow-[0_1px_18px_rgba(0,0,0,0.35)] dark:group-hover:text-[#ffb066]">
              {article.title}
            </h3>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#6f6258] dark:text-gray-300">
              {getArticleExcerpt(article)}
            </p>
          </button>

          {isScheduled && article.scheduledAt && (
            <div
              className={`mt-4 rounded-2xl border p-3 ${
                isPastSchedule
                  ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'
                  : 'border-[#ffd4aa] bg-[#fff3e8] text-[#a95814] dark:border-[#ff8a1f]/20 dark:bg-[#ff8a1f]/10 dark:text-[#ffbd80]'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Calendar size={14} />
                {isPastSchedule ? 'Geçmiş zamanlama' : 'Yayına hazır'}
              </div>
              <p className="mt-1 text-xs opacity-90">{formatLongDate(article.scheduledAt)}</p>
            </div>
          )}

          {!isScheduled && (
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-[#76685e] dark:text-gray-300">
              <div className="flex items-center gap-1.5 rounded-xl border border-transparent bg-[#f7eee7] px-2.5 py-2 dark:border-white/[0.06] dark:bg-white/[0.055]">
                <Eye size={14} />
                <span>{article.views || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-transparent bg-[#f7eee7] px-2.5 py-2 dark:border-white/[0.06] dark:bg-white/[0.055]">
                <Heart size={14} />
                <span>{article._count?.likes || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-transparent bg-[#f7eee7] px-2.5 py-2 dark:border-white/[0.06] dark:bg-white/[0.055]">
                <MessageCircle size={14} />
                <span>{article._count?.comments || 0}</span>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-[#8a7b70] dark:text-gray-400">
              {isScheduled ? 'Taslak zamanlandı' : 'Yayın tarihi'} · {formatShortDate(article.createdAt)}
            </p>
            {isOwnArticles && (
              <div className="relative flex items-center gap-1">
                {isScheduled && (
                  <button
                    onClick={(e) => handleCancelSchedule(article.id, e)}
                    className="rounded-xl p-2 text-red-500 transition-colors hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                    title="Zamanlamayı iptal et"
                  >
                    <X size={15} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenMenuArticleId((prev) => (prev === article.id ? null : article.id))
                  }}
                  className="rounded-xl p-2 text-[#7d6c5f] transition-colors hover:bg-[#ff8a1f]/10 hover:text-[#d96d13] dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-[#ffb066]"
                  title="Menü"
                >
                  <MoreVertical size={17} />
                </button>
                {openMenuArticleId === article.id && (
                  <>
                    <div
                      className="fixed inset-0 z-[50]"
                      onClick={(e) => { e.stopPropagation(); setOpenMenuArticleId(null) }}
                      aria-hidden
                    />
                    <div className="absolute bottom-full right-0 z-[51] mb-2 min-w-[150px] overflow-hidden rounded-2xl border border-[#eadfd5] bg-white/95 py-1 shadow-[0_18px_40px_rgba(39,28,18,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-[#151821]/95">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuArticleId(null)
                          router.push(`/articles/edit/${article.id}`)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-[#33251c] transition-colors hover:bg-[#fff1e3] dark:text-gray-200 dark:hover:bg-white/[0.06]"
                      >
                        <Edit size={14} /> Düzenle
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(e, article)}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                      >
                        <Trash2 size={14} /> Sil
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </article>
    )
  }

  if (loading) {
    return (
      <div className="rounded-[1.6rem] border border-[#eadfd5] bg-[#fffaf5] p-8 shadow-[0_18px_54px_rgba(42,28,18,0.08)] dark:border-white/[0.08] dark:bg-[#0d1118]">
        <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-4 py-10 text-center">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl border border-[#ff8a1f]/25 bg-[#ff8a1f]/10" />
            <div className="absolute inset-2 rounded-xl border-2 border-[#ff8a1f] border-t-transparent animate-spin" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#2b2119] dark:text-white">Yazılar hazırlanıyor</p>
            <p className="mt-1 text-xs text-[#7b6b5f] dark:text-gray-400">Yayınlar ve planlı içerikler getiriliyor.</p>
          </div>
        </div>
      </div>
    )
  }

  // Sadece kendi yazıları için alt sekmeler göster
  const showTabs = isOwnArticles
  const emptyIdeas = [
    'Sergi notu',
    'Eser hikayesi',
    'Küratöryel düşünce',
  ]

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[1.7rem] border border-[#eadfd5] bg-[#fffaf5] p-5 shadow-[0_20px_60px_rgba(42,28,18,0.09)] dark:border-white/[0.08] dark:bg-[#0d1118] dark:shadow-[0_24px_72px_rgba(0,0,0,0.32)]">
        <div className="absolute -left-20 -top-20 h-44 w-44 rounded-full bg-[#ff8a1f]/16 blur-3xl dark:bg-[#ff8a1f]/10" aria-hidden />
        <div className="absolute right-8 top-0 h-28 w-44 rounded-full bg-[#2f80ed]/10 blur-3xl dark:bg-[#2f80ed]/12" aria-hidden />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ffd4aa] bg-white/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c66a18] shadow-sm backdrop-blur-xl dark:border-[#ff8a1f]/20 dark:bg-white/[0.06] dark:text-[#ffb066]">
              <PenLine size={13} />
              Yazı stüdyosu
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em] text-[#241a12] dark:text-white">
              {isOwnArticles ? 'Fikirlerini koleksiyonluk bir arşive dönüştür' : 'Yazı arşivi'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6f6258] dark:text-gray-400">
              {isOwnArticles
                ? 'Eser hikayeleri, sergi notları ve duyurular profilinde düzenli bir yayın vitrini olarak görünür.'
                : 'Bu profilde yayınlanan yazılar, notlar ve düşünce kayıtları burada toplanır.'}
            </p>
          </div>

          {isOwnArticles && (
            <Link
              href="/articles/new"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff8a1f] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(255,138,31,0.28)] transition hover:-translate-y-0.5 hover:bg-[#f07812] focus:outline-none focus:ring-2 focus:ring-[#ff8a1f]/40"
            >
              <Feather size={16} />
              Yeni Yazı Oluştur
            </Link>
          )}
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Yayında', value: uniquePublishedArticles.length, icon: FileText },
            { label: 'Planlı', value: uniqueScheduledArticles.length, icon: Calendar },
            { label: 'Okunma', value: articleStats.totalViews, icon: Eye },
            { label: 'Ortalama', value: articleStats.averageRead ? `${articleStats.averageRead} dk` : '0 dk', icon: Clock3 },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-[#eadfd5] bg-white/72 p-3 shadow-sm backdrop-blur-xl dark:border-white/[0.07] dark:bg-white/[0.045]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8c796b] dark:text-gray-500">
                    {stat.label}
                  </span>
                  <Icon size={15} className="text-[#d46e18] dark:text-[#ffb066]" />
                </div>
                <p className="mt-2 text-xl font-semibold text-[#241a12] dark:text-white">{stat.value}</p>
              </div>
            )
          })}
        </div>
      </section>

      {isOwnArticles && (featuredArticle || nextScheduledArticle) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.35rem] border border-[#eadfd5] bg-[#fffaf5]/88 p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#0d1118]/90">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2b2119] dark:text-white">
              <BarChart3 size={17} className="text-[#ff8a1f]" />
              Öne çıkan yazı
            </div>
            {featuredArticle ? (
              <button
                type="button"
                onClick={() => router.push(`/articles/${featuredArticle.id}`)}
                className="mt-3 block w-full rounded-2xl bg-white/72 p-3 text-left transition hover:bg-white dark:bg-white/[0.045] dark:hover:bg-white/[0.07]"
              >
                <p className="line-clamp-1 text-sm font-semibold text-[#2b2119] dark:text-white">{featuredArticle.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#7b6b5f] dark:text-gray-400">{getArticleExcerpt(featuredArticle)}</p>
              </button>
            ) : (
              <p className="mt-3 text-sm text-[#7b6b5f] dark:text-gray-400">İlk yazın yayınlandığında burada performans özeti görünecek.</p>
            )}
          </div>

          <div className="rounded-[1.35rem] border border-[#eadfd5] bg-[#fffaf5]/88 p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#0d1118]/90">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2b2119] dark:text-white">
              <Calendar size={17} className="text-[#ff8a1f]" />
              Sıradaki yayın
            </div>
            {nextScheduledArticle ? (
              <button
                type="button"
                onClick={() => router.push(`/articles/edit/${nextScheduledArticle.id}`)}
                className="mt-3 block w-full rounded-2xl bg-white/72 p-3 text-left transition hover:bg-white dark:bg-white/[0.045] dark:hover:bg-white/[0.07]"
              >
                <p className="line-clamp-1 text-sm font-semibold text-[#2b2119] dark:text-white">{nextScheduledArticle.title}</p>
                <p className="mt-1 text-xs text-[#a35b18] dark:text-[#ffbd80]">{formatLongDate(nextScheduledArticle.scheduledAt)}</p>
              </button>
            ) : (
              <p className="mt-3 text-sm text-[#7b6b5f] dark:text-gray-400">Planlı yayın kuyruğun boş. Düzenli akış için yazını ileri tarihe alabilirsin.</p>
            )}
          </div>
        </div>
      )}

      {/* ✅ Alt Sekmeler - Sadece kendi yazıları için */}
      {showTabs && (
        <div className="flex flex-col gap-3 rounded-[1.35rem] border border-[#eadfd5] bg-[#fffaf5]/80 p-2 shadow-sm backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.04] sm:flex-row sm:items-center">
          <button
            onClick={() => setActiveTab('published')}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all sm:flex-none ${
              activeTab === 'published'
                ? 'bg-[#ff8a1f] text-white shadow-[0_12px_26px_rgba(255,138,31,0.24)]'
                : 'text-[#6f6258] hover:bg-white hover:text-[#2b2119] dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-white'
            }`}
          >
            <BookOpen size={15} />
            Yayınlanan
            <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] dark:bg-white/10">{uniquePublishedArticles.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all sm:flex-none ${
              activeTab === 'scheduled'
                ? 'bg-[#ff8a1f] text-white shadow-[0_12px_26px_rgba(255,138,31,0.24)]'
                : 'text-[#6f6258] hover:bg-white hover:text-[#2b2119] dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-white'
            }`}
          >
            <Calendar size={15} />
            Zamanlanmış
            <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] dark:bg-white/10">{uniqueScheduledArticles.length}</span>
          </button>
          <div className="sm:ml-auto">
            <Link
              href="/articles/new"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#ff8a1f]/20 bg-white/80 px-4 py-2.5 text-sm font-semibold text-[#c66a18] transition hover:bg-[#fff1e3] dark:border-[#ff8a1f]/20 dark:bg-white/[0.05] dark:text-[#ffb066] dark:hover:bg-white/[0.08] sm:w-auto"
            >
              <PenLine size={15} />
              Yeni Yazı Oluştur
            </Link>
          </div>
        </div>
      )}

      <section className="relative overflow-hidden rounded-[1.7rem] border border-[#eadfd5] bg-[#fffaf5]/78 p-4 shadow-[0_18px_54px_rgba(42,28,18,0.08)] dark:border-white/[0.08] dark:bg-[#0b0f16]/92 dark:shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-3 border-b border-[#eadfd5] pb-4 dark:border-white/[0.07] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#241a12] dark:text-white">
              <Layers size={17} className="text-[#ff8a1f]" />
              {activeTab === 'published' ? 'Yayın vitrini' : 'Yayın takvimi'}
            </div>
            <p className="mt-1 text-xs text-[#7b6b5f] dark:text-gray-400">
              {activeTab === 'published'
                ? `${currentArticles.length} yazı profil arşivinde görünüyor.`
                : `${currentArticles.length} yazı yayın zamanı bekliyor.`}
            </p>
          </div>
          {isOwnArticles && (
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ffd4aa] bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#b45f18] dark:border-[#ff8a1f]/20 dark:bg-[#ff8a1f]/10 dark:text-[#ffbd80]">
              <Sparkles size={14} />
              {activeTab === 'published' ? 'Okuma etkisi' : 'Editoryal akış'}
              <span>{activeTab === 'published' ? articleStats.totalEngagement : uniqueScheduledArticles.length}</span>
            </div>
          )}
        </div>

        {currentArticles.length === 0 ? (
          <div className="mx-auto flex max-w-xl flex-col items-center justify-center py-14 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-[1.3rem] border border-[#eadfd5] bg-white/76 text-[#d46e18] shadow-sm dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-[#ffb066]">
              {activeTab === 'published' ? <FileText size={30} /> : <Calendar size={30} />}
            </span>
            <h3 className="mt-5 text-lg font-semibold text-[#241a12] dark:text-white">
              {activeTab === 'published'
                ? isOwnArticles ? 'Yazı vitrinin hazır' : 'Henüz yazı yayımlanmamış'
                : 'Planlı yayın kuyruğu boş'}
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-[#7b6b5f] dark:text-gray-400">
              {activeTab === 'published'
                ? isOwnArticles
                  ? 'İlk yazını eklediğinde burada kapaklı, ölçümlü ve profil konseptine uygun bir yayın kartı oluşacak.'
                  : 'Bu kullanıcı henüz profilinde yazı paylaşmamış.'
                : 'Yazı oluştururken yayın zamanını seçerek profil akışını önceden planlayabilirsin.'}
            </p>
            {isOwnArticles && (
              <>
                <button
                  type="button"
                  onClick={() => router.push('/articles/new')}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#ff8a1f] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(255,138,31,0.28)] transition hover:-translate-y-0.5 hover:bg-[#f07812]"
                >
                  <PenLine size={16} />
                  {activeTab === 'published' ? 'İlk yazını oluştur' : 'Planlı yazı hazırla'}
                </button>
                {activeTab === 'published' && (
                  <div className="mt-6 grid w-full gap-2 sm:grid-cols-3">
                    {emptyIdeas.map((idea) => (
                      <div
                        key={idea}
                        className="rounded-2xl border border-[#eadfd5] bg-white/62 px-3 py-3 text-xs font-semibold text-[#7b6b5f] dark:border-white/[0.07] dark:bg-white/[0.045] dark:text-gray-400"
                      >
                        {idea}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 justify-start gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(250px,320px))]">
            {currentArticles.map((article) => renderArticleCard(article, activeTab === 'scheduled'))}
          </div>
        )}
      </section>

      {/* Silme onay modalı */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setArticleToDelete(null) }}
        onConfirm={handleConfirmDelete}
        title="Yazıyı sil"
        message="Bu işlem geri alınamaz. Yazıyı silmek istediğinize emin misiniz?"
        confirmText="Sil"
        cancelText="Vazgeç"
        loading={isDeleting}
      />
    </div>
  )
}
