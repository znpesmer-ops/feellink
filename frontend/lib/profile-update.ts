import type { QueryClient } from '@tanstack/react-query'

/**
 * Username veya profil güncellendiğinde ilgili tüm query cache'leri invalidate eder.
 * Navbar, profil, feed, bildirimler, kaydedilenler, explore, highlights vb. refetch olur.
 */
export function invalidateAfterUsernameUpdate(queryClient: QueryClient): void {
  const keys: (string | string[])[] = [
    ['user-me'],
    ['profile'],
    ['feed'],
    ['notifications'],
    ['saved-posts'],
    ['explore'],
    ['highlights'],
  ]
  keys.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey })
  })
}
