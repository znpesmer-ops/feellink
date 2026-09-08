'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { ProfileSortableThreeColumnGrid } from '@/components/profile/ProfileSortableThreeColumnGrid'
import {
  Bookmark,
  Edit,
  Heart,
  Image as ImageIcon,
  Loader2,
  MoreVertical,
  Play,
  PlusCircle,
  QrCode,
  Trash2,
  MessageCircle,
} from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/lib/store'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { EditArtworkModal } from './EditArtworkModal'

interface ProfileArtworksGridProps {
  username: string
  artworks: any[]
  userId?: string // Kullanıcı ID'si (sahip kontrolü için)
  /** Kart üzerinde renk paleti şeridi; varsayılan kapalı — veri yine de API’de kalır */
  showColorPalette?: boolean
  /** Serbest dizim: sürükle-bırak (yalnızca profil sahibi + custom mod) */
  enableReorder?: boolean
  /** Sürükleme sonrası yeni sıra (tam artwork nesneleri) — önbellek + PATCH üst bileşende */
  onReorder?: (orderedArtworks: any[]) => void
  /** Profil sayfasındaki eser yükleme modalını açar. */
  onCreateArtwork?: () => void
  /** Filtreli koleksiyon gibi farklı boş durumlarda başlığı özelleştirir. */
  emptyTitle?: string
  /** Filtreli koleksiyon gibi farklı boş durumlarda açıklamayı özelleştirir. */
  emptyDescription?: string
}

export function ProfileArtworksGrid({
  artworks,
  username,
  userId,
  showColorPalette = false,
  enableReorder = false,
  onReorder,
  onCreateArtwork,
  emptyTitle = 'Henüz eser yok',
  emptyDescription = 'İlk eser yüklendiğinde bu alan galeri düzeniyle kendini kuracak.',
}: ProfileArtworksGridProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  
  // Sahip kontrolü: user store'dan veya userId prop'undan
  const isOwner = user?.username === username || (userId && user?.id === userId)
  const [downloadingQr, setDownloadingQr] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [editingArtwork, setEditingArtwork] = useState<any | null>(null)
  const [savedArtworks, setSavedArtworks] = useState<Set<string>>(new Set())
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  const getArtworkMedia = (artwork: any) => {
    const media = Array.isArray(artwork?.media) ? artwork.media[0] : null
    const rawUrl = media?.url || media?.path || media?.fileName || artwork?.imageUrl || artwork?.mediaUrl || artwork?.cover
    if (!rawUrl) return null
    return {
      type: media.type || 'image',
      url: resolveImageUrl(rawUrl),
      thumbnailUrl: media?.thumbnailUrl ? resolveImageUrl(media.thumbnailUrl) : undefined,
    }
  }

  const goToArtwork = (artworkId: string) => {
    router.push(`/posts/${artworkId}?from=${encodeURIComponent(`/profile/${username}`)}`)
  }

  // Fetch saved items for current user (to check if artworks are saved)
  const { data: savedItemsData } = useQuery({
    queryKey: ['saved', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const response = await api.get(`/users/${user.id}/saved`)
      return response.data || []
    },
    enabled: !!user?.id && !isOwner, // Only fetch if not owner (owner doesn't need to see save button on own artworks)
  })

  // Update saved artworks set when data changes (filter only artworks)
  useEffect(() => {
    if (savedItemsData) {
      const artworkIds = savedItemsData
        .filter((item: any) => item.type === 'artwork')
        .map((item: any) => item.id)
      setSavedArtworks(new Set(artworkIds))
    }
  }, [savedItemsData])

  // Save/Unsave mutation
  const saveMutation = useMutation({
    mutationFn: async ({ postId, isSaved }: { postId: string; isSaved: boolean }) => {
      console.log('🔍 Save mutation called:', { postId, isSaved })
      if (isSaved) {
        const response = await api.delete(`/posts/${postId}/save-artwork`)
        console.log('✅ Unsave response:', response.data)
        return response.data
      } else {
        const response = await api.post(`/posts/${postId}/save-artwork`)
        console.log('✅ Save response:', response.data)
        return response.data
      }
    },
    onSuccess: async (_, { postId, isSaved }) => {
      // Optimistic UI update
      setSavedArtworks(prev => {
        const newSet = new Set(prev)
        if (isSaved) {
          newSet.delete(postId)
        } else {
          newSet.add(postId)
        }
        return newSet
      })
      toast.success(isSaved ? 'Eser kaydedilenlerden kaldırıldı' : 'Eser kaydedildi')
      
      // 🔥 KRİTİK: Query'leri invalidate et VE explicit refetch yap
      queryClient.invalidateQueries({ queryKey: ['saved', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['saved-artworks', user?.id] })
      
      // Explicit refetch to ensure UI updates immediately
      await queryClient.refetchQueries({ queryKey: ['saved', user?.id] })
      await queryClient.refetchQueries({ queryKey: ['saved-artworks', user?.id] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'İşlem sırasında bir hata oluştu')
    },
  })

  const handleSaveToggle = (e: React.MouseEvent, artworkId: string) => {
    e.stopPropagation()
    const isSaved = savedArtworks.has(artworkId)
    saveMutation.mutate({ postId: artworkId, isSaved })
  }

  const handleDownloadQr = async (e: React.MouseEvent, artworkId: string, artwork: any) => {
    e.stopPropagation() // Card click'i engelle

    try {
      setDownloadingQr(artworkId)
      
      // PDF'i indir - Yeni QR Label endpoint'i
      const response = await api.get(`/posts/${artworkId}/qr-label`, {
        responseType: 'blob',
      })

      // Sabit dosya adı - kullanıcı verisine bağlı değil
      const fileName = `Feellink_Eser_Bileti_${artworkId}.pdf`

      // Blob'dan URL oluştur ve indir
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success('🎟️ QR kod etiketi başarıyla indirildi!')
    } catch (error: any) {
      console.error('QR PDF indirme hatası:', error)
      toast.error(error.response?.data?.message || 'QR kod etiketi indirilemedi. Lütfen tekrar deneyin.')
    } finally {
      setDownloadingQr(null)
    }
  }

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (artworkId: string) => {
      await api.delete(`/posts/${artworkId}`)
    },
    onSuccess: (_, artworkId) => {
      toast.success('Eser başarıyla silindi')
      queryClient.invalidateQueries({ queryKey: ['user-artworks', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['user-artworks', username] })
      queryClient.invalidateQueries({ queryKey: ['user-posts'] })
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      
      setMenuOpen(null)
      setConfirmDelete(null)
    },
    onError: (error: any) => {
      console.error('Delete error:', error)
      toast.error(error.response?.data?.message || 'Eser silinirken bir hata oluştu')
      setConfirmDelete(null)
    },
  })

  const handleDeleteClick = (e: React.MouseEvent, artworkId: string) => {
    e.stopPropagation()
    setConfirmDelete(artworkId)
    setMenuOpen(null)
  }

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmDelete) {
      deleteMutation.mutate(confirmDelete)
    }
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDelete(null)
  }

  // Close menu when clicking outside - Only check clicks outside the menu container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen) {
        const menuElement = menuRefs.current[menuOpen]
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setMenuOpen(null)
        }
      }
    }
    if (menuOpen) {
      // Use capture phase to check before other handlers
      document.addEventListener('mousedown', handleClickOutside, true)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true)
      }
    }
  }, [menuOpen])

  if (!artworks || artworks.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-[1.75rem] border border-[#f0d8c8] bg-[#fffaf5] px-6 py-12 text-center shadow-[0_20px_60px_rgba(34,25,16,0.08)] dark:border-white/10 dark:bg-[#111318] dark:shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
        <div className="absolute left-1/2 top-0 h-32 w-72 -translate-x-1/2 rounded-full bg-[#ff8a1f]/15 blur-3xl dark:bg-[#ff8a1f]/10" aria-hidden />
        <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/70 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
          <ImageIcon className="h-7 w-7 text-[#c36b1e] dark:text-[#ffb066]" />
        </div>
        <h3 className="relative text-base font-semibold text-[#221914] dark:text-white">
          {emptyTitle}
        </h3>
        <p className="relative mx-auto mt-2 max-w-sm text-sm leading-6 text-[#7a6658] dark:text-gray-400">
          {emptyDescription}
        </p>
        {isOwner && onCreateArtwork && (
          <button
            type="button"
            onClick={onCreateArtwork}
            className="relative mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#ff7a1a] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(255,122,26,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e96e16] focus:outline-none focus:ring-2 focus:ring-[#ffb066] focus:ring-offset-2 focus:ring-offset-[#fffaf5] dark:focus:ring-offset-[#111318]"
          >
            <PlusCircle className="h-4 w-4" />
            Eser yükle
          </button>
        )}
      </div>
    )
  }

  const renderArtworkCard = (artwork: any, index: number, isDragging: boolean) => {
    const media = getArtworkMedia(artwork)
    const caption = artwork.caption || artwork.title || 'Eser'
    const cardClass = 'exhibition-artwork-card aspect-square relative cursor-pointer group overflow-hidden rounded-[1.15rem] border border-black/5 bg-[#f7f1eb] shadow-[0_12px_30px_rgba(39,27,18,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_46px_rgba(39,27,18,0.16)] focus-within:ring-2 focus-within:ring-[#ff8a1f]/70 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_18px_44px_rgba(0,0,0,0.34)]'

    return (
      <div
        className={`${cardClass}${isDragging ? ' z-50 scale-[1.015] ring-2 ring-[#ff8a1f] ring-offset-2 ring-offset-white dark:ring-offset-[#0b0c0f]' : ''}`}
        style={{ animationDelay: `${Math.min(index, 9) * 45}ms` }}
        onClick={() => goToArtwork(artwork.id)}
      >
        <div className="h-full w-full overflow-hidden rounded-[1.15rem]">
          {media ? (
            <>
              {media.type === 'video' ? (
                <video
                  src={media.url}
                  poster={media.thumbnailUrl}
                  className="h-full w-full rounded-[1.15rem] object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  muted
                />
              ) : (
                <img
                  src={media.url}
                  alt={caption}
                  className="h-full w-full rounded-[1.15rem] object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = '/images/avatar-placeholder.png'
                  }}
                />
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-[1.15rem] bg-[radial-gradient(circle_at_30%_20%,rgba(255,138,31,0.18),transparent_34%),linear-gradient(135deg,#f6eee8,#ebe4df)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(255,138,31,0.16),transparent_34%),linear-gradient(135deg,#161a21,#0c0f14)]">
              <ImageIcon className="h-8 w-8 text-[#b47a50] dark:text-[#c5a17d]" />
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-0 rounded-[1.15rem] bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-65 transition-opacity duration-300 group-hover:opacity-85" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[8] p-3 opacity-0 translate-y-2 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-white drop-shadow">
            {caption}
          </p>
        </div>

        {media?.type === 'video' && (
          <div className="absolute right-2 top-2 z-[20] flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/45 text-white backdrop-blur-md">
            <Play className="h-3.5 w-3.5" fill="currentColor" />
          </div>
        )}

        {isOwner ? (
          <>
            <button
              onClick={(e) => handleDownloadQr(e, artwork.id, artwork)}
              disabled={downloadingQr === artwork.id}
              className="absolute top-2 left-2 rounded-full border border-white/25 bg-[#ff7a1a] p-1.5 text-white shadow-lg shadow-black/15 transition-all hover:-translate-y-0.5 hover:bg-[#e96e16] disabled:cursor-not-allowed disabled:opacity-50 z-[115] pointer-events-auto"
              title="QR Kod Etiketi İndir"
            >
              {downloadingQr === artwork.id ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <QrCode size={14} strokeWidth={2.5} />
              )}
            </button>
            <div
              ref={(el) => {
                menuRefs.current[artwork.id] = el
              }}
              className="absolute bottom-2 right-2 z-[120]"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(menuOpen === artwork.id ? null : artwork.id)
                }}
                className="rounded-full border border-white/20 bg-black/55 p-1.5 text-white shadow-lg backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-black/75 pointer-events-auto"
                title="Menü"
              >
                <MoreVertical size={14} strokeWidth={2.5} />
              </button>
              {menuOpen === artwork.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-10 right-0 min-w-[128px] overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#151820]/95 z-[120]"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingArtwork(artwork)
                      setMenuOpen(null)
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-[#fff3e8] dark:text-gray-300 dark:hover:bg-white/[0.06]"
                  >
                    <Edit size={16} />
                    Düzenle
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(e, artwork.id)}
                    disabled={deleteMutation.isPending}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 size={16} />
                    Sil
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={(e) => handleSaveToggle(e, artwork.id)}
            className="absolute top-2 left-2 rounded-full border border-white/20 bg-black/55 p-1.5 text-white shadow-lg backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-black/75 z-[115]"
            title={savedArtworks.has(artwork.id) ? 'Kaydedilenlerden kaldır' : 'Kaydet'}
          >
            <Bookmark
              size={14}
              strokeWidth={2.5}
              fill={savedArtworks.has(artwork.id) ? 'currentColor' : 'none'}
            />
          </button>
        )}

        {artwork.media && artwork.media.length > 0 && (
          <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center rounded-[1.15rem] bg-black/30 opacity-0 backdrop-blur-[2px] transition-all duration-300 group-hover:opacity-100">
            <div className="flex items-center gap-5 rounded-full border border-white/20 bg-black/35 px-4 py-2 text-white shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <Heart className="h-4 w-4" fill="currentColor" />
                <span>{artwork._count?.likes || artwork.likeCount || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <MessageCircle className="h-4 w-4" />
                <span>{artwork._count?.comments || artwork.commentCount || 0}</span>
              </div>
            </div>
          </div>
        )}

        {showColorPalette &&
          artwork.colorPalette &&
          Array.isArray(artwork.colorPalette) &&
          artwork.colorPalette.length > 0 && (
            <div className="absolute bottom-2 left-2 z-[50] flex gap-1 rounded-full border border-white/20 bg-black/30 p-1 opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100">
              {artwork.colorPalette.slice(0, 5).map((hex: string, idx: number) => (
                <div
                  key={idx}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    backgroundColor: hex,
                    border: '1px solid rgba(255,255,255,0.55)',
                  }}
                  title={hex}
                />
              ))}
            </div>
          )}
      </div>
    )
  }

  const grid = (
    <ProfileSortableThreeColumnGrid
      items={artworks}
      disabled={!enableReorder || !onReorder}
      onReorder={(items) => onReorder?.(items)}
      renderItem={(artwork, index, { isDragging }) =>
        renderArtworkCard(artwork, index, isDragging)
      }
      mobileColumns={2}
      gridClassName="gap-3 sm:gap-3"
    />
  )

  return (
    <>
      <div className="space-y-3">
        {grid}
      </div>
      {editingArtwork && (
        <EditArtworkModal
          artwork={editingArtwork}
          open={!!editingArtwork}
          onClose={() => setEditingArtwork(null)}
          onSuccess={() => {
            setEditingArtwork(null)
          }}
        />
      )}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-40"
        >
          <div
            className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Eseri Sil</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Bu eseri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
