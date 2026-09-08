'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, FolderPlus, Image as ImageIcon, Loader2, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'
import api from '@/lib/api'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import toast from 'react-hot-toast'

type ArtworkCollectionItem = {
  id: string
  postId: string
  post?: any
}

type ArtworkCollection = {
  id: string
  title: string
  itemCount?: number
  items?: ArtworkCollectionItem[]
}

interface ProfileArtworkCollectionsProps {
  username: string
  userId?: string
  isOwner: boolean
  artworks: any[]
  selectedCollectionId: string | null
  onSelectionChange: (collectionId: string | null, postIds: string[]) => void
}

function getArtworkTitle(artwork: any, index = 0) {
  return artwork?.title?.trim?.() || artwork?.caption?.trim?.() || `Eser ${index + 1}`
}

function getArtworkImage(artwork: any) {
  const media = Array.isArray(artwork?.media) ? artwork.media[0] : null
  const raw = media?.url || media?.path || media?.fileName || artwork?.imageUrl || artwork?.mediaUrl || artwork?.cover
  return raw ? resolveImageUrl(raw) : ''
}

function collectionPostIds(collection?: ArtworkCollection | null) {
  return (collection?.items || []).map((item) => item.postId).filter(Boolean)
}

function collectionPreviewArtworks(collection: ArtworkCollection, artworks: any[]) {
  const byId = new Map(artworks.map((artwork) => [String(artwork.id), artwork]))
  return collectionPostIds(collection)
    .map((id) => byId.get(String(id)) || collection.items?.find((item) => item.postId === id)?.post)
    .filter(Boolean)
    .slice(0, 4)
}

export function ProfileArtworkCollections({
  username,
  userId,
  isOwner,
  artworks,
  selectedCollectionId,
  onSelectionChange,
}: ProfileArtworkCollectionsProps) {
  const queryClient = useQueryClient()
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [editingCollection, setEditingCollection] = useState<ArtworkCollection | null>(null)
  const [title, setTitle] = useState('')
  const [selectedArtworkIds, setSelectedArtworkIds] = useState<Set<string>>(new Set())

  const collectionsQueryKey = useMemo(
    () => ['profile-artwork-collections', username, userId],
    [username, userId],
  )

  const { data: collections = [], isLoading } = useQuery({
    queryKey: collectionsQueryKey,
    queryFn: async () => {
      const response = await api.get(`/collections/profile/${encodeURIComponent(username)}`)
      return Array.isArray(response.data) ? response.data : []
    },
    enabled: Boolean(username && userId),
    staleTime: 30_000,
  })

  const activeCollection = useMemo(
    () => collections.find((collection: ArtworkCollection) => collection.id === selectedCollectionId) || null,
    [collections, selectedCollectionId],
  )

  useEffect(() => {
    if (!selectedCollectionId) return
    if (!collections.some((collection: ArtworkCollection) => collection.id === selectedCollectionId)) {
      onSelectionChange(null, [])
    }
  }, [collections, onSelectionChange, selectedCollectionId])

  const openCreate = () => {
    setEditingCollection(null)
    setTitle('')
    setSelectedArtworkIds(new Set())
    setModalMode('create')
  }

  const openEdit = (collection: ArtworkCollection) => {
    setEditingCollection(collection)
    setTitle(collection.title || '')
    setSelectedArtworkIds(new Set(collectionPostIds(collection)))
    setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingCollection(null)
    setTitle('')
    setSelectedArtworkIds(new Set())
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const cleanTitle = title.trim()
      if (!cleanTitle) throw new Error('Koleksiyon adı yazmalısın')

      const nextSelectedIds = Array.from(selectedArtworkIds)

      if (modalMode === 'edit' && editingCollection) {
        await api.put(`/collections/${editingCollection.id}`, { title: cleanTitle })

        const currentItems = editingCollection.items || []
        const currentPostIds = new Set(currentItems.map((item) => item.postId))
        const nextPostIds = new Set(nextSelectedIds)
        const itemsToRemove = currentItems.filter((item) => !nextPostIds.has(item.postId))
        const postIdsToAdd = nextSelectedIds.filter((postId) => !currentPostIds.has(postId))

        await Promise.all([
          ...itemsToRemove.map((item) => api.delete(`/collections/${editingCollection.id}/items/${item.id}`)),
          ...postIdsToAdd.map((postId) => api.post(`/collections/${editingCollection.id}/items`, { postId })),
        ])

        return { collectionId: editingCollection.id, postIds: nextSelectedIds, mode: 'edit' as const }
      }

      const response = await api.post('/collections', { title: cleanTitle })
      const created = response.data
      await Promise.all(nextSelectedIds.map((postId) => api.post(`/collections/${created.id}/items`, { postId })))
      return { collectionId: created.id, postIds: nextSelectedIds, mode: 'create' as const }
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: collectionsQueryKey })
      onSelectionChange(result.collectionId, result.postIds)
      toast.success(result.mode === 'create' ? 'Koleksiyon oluşturuldu' : 'Koleksiyon güncellendi')
      closeModal()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Koleksiyon kaydedilemedi')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      await api.delete(`/collections/${collectionId}`)
      return collectionId
    },
    onSuccess: async (collectionId) => {
      await queryClient.invalidateQueries({ queryKey: collectionsQueryKey })
      if (selectedCollectionId === collectionId) onSelectionChange(null, [])
      toast.success('Koleksiyon silindi')
      closeModal()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Koleksiyon silinemedi')
    },
  })

  const toggleArtwork = (artworkId: string) => {
    setSelectedArtworkIds((prev) => {
      const next = new Set(prev)
      if (next.has(artworkId)) next.delete(artworkId)
      else next.add(artworkId)
      return next
    })
  }

  const shouldShow = isOwner || isLoading || collections.length > 0
  if (!shouldShow) return null

  return (
    <>
      <section className="relative overflow-hidden rounded-[1.6rem] border border-[#ead7c8] bg-[#fffaf5] p-4 shadow-[0_18px_54px_rgba(42,28,18,0.08)] dark:border-white/10 dark:bg-[#101318] dark:shadow-[0_22px_70px_rgba(0,0,0,0.30)]">
        <div className="absolute -right-14 top-0 h-24 w-40 rounded-full bg-[#ff8a1f]/10 blur-3xl dark:bg-[#ff8a1f]/8" aria-hidden />
        <div className="relative mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#241a14] dark:text-white">Eser koleksiyonları</p>
            <p className="mt-0.5 text-xs text-[#7a6658] dark:text-gray-400">
              Seriler, dönemler ve özel seçkiler.
            </p>
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#ff7a1a] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_12px_28px_rgba(255,122,26,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[#e96e16]"
            >
              <Plus className="h-3.5 w-3.5" />
              Yeni
            </button>
          )}
        </div>

        <div className="relative -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => onSelectionChange(null, [])}
            className={`group flex h-[86px] w-[158px] shrink-0 flex-col justify-between overflow-hidden rounded-[1.35rem] border p-3 text-left transition-all sm:w-[176px] ${
              selectedCollectionId === null
                ? 'border-[#ff8a1f]/70 bg-[#ff8a1f]/12 shadow-[0_16px_34px_rgba(255,138,31,0.14)] dark:bg-[#ff8a1f]/14'
                : 'border-[#ead7c8] bg-white/60 hover:border-[#ff8a1f]/45 hover:bg-white dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ff8a1f] text-white shadow-[0_10px_22px_rgba(255,138,31,0.22)]">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-bold text-[#c36b1e] dark:text-[#ffb066]">
                {artworks.length}
              </span>
            </div>
            <div>
              <p className="truncate text-sm font-semibold text-[#241a14] dark:text-white">Tüm eserler</p>
              <p className="text-[11px] text-[#7a6658] dark:text-gray-400">Ana galeri</p>
            </div>
          </button>

          {isLoading ? (
            <div className="flex h-[86px] w-[176px] shrink-0 items-center justify-center rounded-[1.35rem] border border-[#ead7c8] bg-white/50 dark:border-white/10 dark:bg-white/[0.05]">
              <Loader2 className="h-5 w-5 animate-spin text-[#ff8a1f]" />
            </div>
          ) : (
            collections.map((collection: ArtworkCollection) => {
              const preview = collectionPreviewArtworks(collection, artworks)
              const isActive = selectedCollectionId === collection.id
              return (
                <div key={collection.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onSelectionChange(collection.id, collectionPostIds(collection))}
                    className={`relative flex h-[86px] w-[158px] shrink-0 overflow-hidden rounded-[1.35rem] border text-left transition-all sm:w-[176px] ${
                      isActive
                        ? 'border-[#ff8a1f]/75 shadow-[0_18px_38px_rgba(255,138,31,0.16)] ring-2 ring-[#ff8a1f]/20'
                        : 'border-[#ead7c8] hover:-translate-y-0.5 hover:border-[#ff8a1f]/45 dark:border-white/10'
                    }`}
                  >
                    <div className="absolute inset-0 grid grid-cols-2">
                      {preview.length > 0 ? (
                        preview.map((artwork, index) => {
                          const image = getArtworkImage(artwork)
                          return image ? (
                            <img
                              key={`${collection.id}-${artwork.id || index}`}
                              src={image}
                              alt={getArtworkTitle(artwork, index)}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div key={`${collection.id}-${index}`} className="bg-[#f2e6dc] dark:bg-white/[0.06]" />
                          )
                        })
                      ) : (
                        <div className="col-span-2 flex items-center justify-center bg-[radial-gradient(circle_at_20%_0%,rgba(255,138,31,0.18),transparent_34%),linear-gradient(135deg,#fff7ee,#eaded5)] dark:bg-[radial-gradient(circle_at_20%_0%,rgba(255,138,31,0.14),transparent_34%),linear-gradient(135deg,#171a22,#0d1016)]">
                          <ImageIcon className="h-6 w-6 text-[#b57a4e] dark:text-[#d5a273]" />
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/20 to-transparent" />
                    <div className="relative z-10 mt-auto min-w-0 p-3 text-white">
                      <p className="truncate text-sm font-semibold">{collection.title}</p>
                      <p className="text-[11px] text-white/70">{collection.itemCount || 0} eser</p>
                    </div>
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => openEdit(collection)}
                      className="absolute right-2 top-2 hidden h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-lg backdrop-blur-md transition hover:bg-black/65 group-hover:flex"
                      aria-label="Koleksiyonu düzenle"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )
            })
          )}

          {isOwner && (
            <button
              type="button"
              onClick={openCreate}
              className="flex h-[86px] w-[158px] shrink-0 flex-col items-center justify-center gap-2 rounded-[1.35rem] border border-dashed border-[#ff8a1f]/45 bg-[#ff8a1f]/8 text-[#c36b1e] transition-all hover:-translate-y-0.5 hover:bg-[#ff8a1f]/12 dark:text-[#ffb066] sm:w-[176px]"
            >
              <FolderPlus className="h-5 w-5" />
              <span className="text-xs font-semibold">Koleksiyon ekle</span>
            </button>
          )}
        </div>

        {activeCollection && (
          <div className="relative mt-3 flex flex-col gap-2 rounded-2xl border border-[#ead7c8] bg-white/60 px-3 py-2 text-xs text-[#7a6658] dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
            <span>
              <strong className="text-[#241a14] dark:text-white">{activeCollection.title}</strong> koleksiyonu gösteriliyor.
            </span>
            {isOwner && (
              <button
                type="button"
                onClick={() => openEdit(activeCollection)}
                className="inline-flex items-center gap-1.5 font-semibold text-[#ff7a1a]"
              >
                <Pencil className="h-3.5 w-3.5" />
                Düzenle
              </button>
            )}
          </div>
        )}
      </section>

      {modalMode && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.7rem] border border-white/15 bg-[#101318] shadow-[0_32px_90px_rgba(0,0,0,0.48)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#ffb066]">
                  Feellink koleksiyon
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  {modalMode === 'create' ? 'Yeni eser koleksiyonu' : 'Koleksiyonu düzenle'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white transition hover:bg-white/[0.1]"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              <label className="block">
                <span className="text-xs font-semibold text-white/70">Koleksiyon adı</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={42}
                  placeholder="Örn. Mavi dönem, Portreler, İlk seri..."
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-medium text-white outline-none transition placeholder:text-white/30 focus:border-[#ff8a1f]/60 focus:bg-white/[0.1]"
                />
              </label>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Eser seç</p>
                  <p className="text-xs text-white/45">Koleksiyon vitrini için eserleri seç.</p>
                </div>
                <span className="rounded-full border border-[#ff8a1f]/25 bg-[#ff8a1f]/12 px-3 py-1 text-xs font-bold text-[#ffb066]">
                  {selectedArtworkIds.size} seçili
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {artworks.map((artwork, index) => {
                  const image = getArtworkImage(artwork)
                  const selected = selectedArtworkIds.has(artwork.id)
                  return (
                    <button
                      key={artwork.id}
                      type="button"
                      onClick={() => toggleArtwork(artwork.id)}
                      className={`group relative aspect-square overflow-hidden rounded-2xl border text-left transition-all ${
                        selected
                          ? 'border-[#ff8a1f] ring-2 ring-[#ff8a1f]/35'
                          : 'border-white/10 hover:border-white/25'
                      }`}
                    >
                      {image ? (
                        <img src={image} alt={getArtworkTitle(artwork, index)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-white/[0.06]">
                          <ImageIcon className="h-7 w-7 text-white/35" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-3">
                        <p className="line-clamp-2 text-xs font-semibold text-white">{getArtworkTitle(artwork, index)}</p>
                      </div>
                      <span className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border transition ${
                        selected
                          ? 'border-[#ff8a1f] bg-[#ff8a1f] text-white'
                          : 'border-white/25 bg-black/25 text-white/60'
                      }`}>
                        {selected && <Check className="h-4 w-4" />}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              {modalMode === 'edit' && editingCollection ? (
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(editingCollection.id)}
                  disabled={deleteMutation.isPending || saveMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/15 disabled:cursor-wait disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Sil
                </button>
              ) : (
                <span className="hidden sm:block" />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/75 transition hover:bg-white/[0.06] sm:flex-none"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || deleteMutation.isPending}
                  className="flex-1 rounded-2xl bg-[#ff7a1a] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(255,122,26,0.24)] transition hover:bg-[#e96e16] disabled:cursor-wait disabled:opacity-70 sm:flex-none"
                >
                  {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
