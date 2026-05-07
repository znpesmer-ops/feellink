/** Shared React Query timing + query keys for layout/feed/chat perceived performance. */

export const STALE_SHORT = 3 * 60_000   // 3 dakika — Vercel cold start'ta çok sık refetch'i önler
export const STALE_LAYOUT = 5 * 60_000  // 5 dakika
export const GC_STANDARD = 15 * 60_000  // 15 dakika cache'de tut

export const sidebarKeys = {
  featured: ['sidebar', 'featured'] as const,
  global: ['sidebar', 'global'] as const,
  explorePosts: (limit: number) => ['sidebar', 'explore-posts', limit] as const,
}

export const chatKeys = {
  conversations: (userId: string | undefined) =>
    ['chat', 'conversations', userId] as const,
}
