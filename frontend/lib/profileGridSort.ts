export type ProfileGridSortMode = 'newest' | 'oldest' | 'custom'

function getCreatedTime(item: { createdAt?: string | Date }): number {
  if (!item.createdAt) return 0
  const t =
    typeof item.createdAt === 'string'
      ? Date.parse(item.createdAt)
      : item.createdAt.getTime()
  return Number.isNaN(t) ? 0 : t
}

/**
 * Profil grid sırası: En Yeni / En Eski veya serbest (custom) + sunucu order birleşimi.
 * Custom modda listede olmayan id'ler önce createdAt desc, sonra custom sıradaki mevcut id'ler.
 */
export function sortProfileItems<T extends { id: string; createdAt?: string | Date }>(
  items: T[],
  mode: ProfileGridSortMode,
  customOrder: string[],
): T[] {
  if (mode === 'newest') {
    return [...items].sort((a, b) => getCreatedTime(b) - getCreatedTime(a))
  }
  if (mode === 'oldest') {
    return [...items].sort((a, b) => getCreatedTime(a) - getCreatedTime(b))
  }

  const byId = new Map(items.map((i) => [i.id, i]))
  const seen = new Set<string>()
  const dedupedOrder: string[] = []
  for (const id of customOrder) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    dedupedOrder.push(id)
  }
  const customSet = new Set(dedupedOrder)
  const notListed = items.filter((i) => !customSet.has(i.id))
  notListed.sort((a, b) => getCreatedTime(b) - getCreatedTime(a))

  const ordered: T[] = []
  for (const id of dedupedOrder) {
    const item = byId.get(id)
    if (item) ordered.push(item)
  }
  return [...notListed, ...ordered]
}

/** user-posts önbelleğinde yalnızca post (artwork olmayan) sırasını günceller; diğer satırlar yerinde kalır. */
export function applyPostReorderInUserPostsCache(full: any[], newPostsOrder: any[]): any[] {
  let pi = 0
  return full.map((p) => {
    if (p?.type === 'artwork') return p
    const next = newPostsOrder[pi++]
    return next ?? p
  })
}

/** user-posts önbelleğinde yalnızca artwork sırasını günceller. */
export function applyArtworkReorderInUserPostsCache(full: any[], newArtworksOrder: any[]): any[] {
  let ai = 0
  return full.map((p) => {
    if (p?.type !== 'artwork') return p
    const next = newArtworksOrder[ai++]
    return next ?? p
  })
}
