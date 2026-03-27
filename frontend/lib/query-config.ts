/** Shared React Query timing + query keys for layout/feed/chat perceived performance. */

export const STALE_SHORT = 30_000
export const STALE_LAYOUT = 90_000
export const GC_STANDARD = 10 * 60_000

export const sidebarKeys = {
  featured: ['sidebar', 'featured'] as const,
  global: ['sidebar', 'global'] as const,
  explorePosts: (limit: number) => ['sidebar', 'explore-posts', limit] as const,
}

export const chatKeys = {
  conversations: (userId: string | undefined) =>
    ['chat', 'conversations', userId] as const,
}
