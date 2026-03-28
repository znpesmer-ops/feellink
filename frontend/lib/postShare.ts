/**
 * Gönderi paylaşım linki ve yardımcılar (client-only güvenli).
 */

export function getPostShareUrl(postId: string): string {
  if (typeof window === 'undefined') return ''
  const base =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')) ||
    window.location.origin
  return `${base}/posts/${postId}`
}

export async function copyPostLinkToClipboard(postId: string): Promise<boolean> {
  const url = getPostShareUrl(postId)
  if (!url) return false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return true
    }
  } catch {
    /* fallback below */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = url
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export async function tryNativeSharePost(opts: {
  title?: string
  text?: string
  url: string
}): Promise<'shared' | 'unavailable' | 'cancelled' | 'error'> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return 'unavailable'
  }
  try {
    await navigator.share({
      title: opts.title || 'Feellink',
      text: opts.text || '',
      url: opts.url,
    })
    return 'shared'
  } catch (e: any) {
    if (e?.name === 'AbortError') return 'cancelled'
    return 'error'
  }
}
