import { redirect } from 'next/navigation'

function getServerBackendBase(): string {
  const raw =
    process.env.BACKEND_REWRITE_TARGET ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://feellink-backend.vercel.app'
  return String(raw).replace(/\/$/, '')
}

export default async function ArtworkQrResolvePage({
  params,
}: {
  params: { code: string }
}) {
  const raw = params?.code
  const code =
    typeof raw === 'string' ? decodeURIComponent(raw).trim() : ''

  if (!code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-[#0b1220] px-4">
        <p className="text-gray-600 dark:text-gray-400 text-center">
          Geçersiz eser bağlantısı.
        </p>
      </div>
    )
  }

  const base = getServerBackendBase()
  let res: Response | null = null
  try {
    res = await fetch(
      `${base}/posts/qr-resolve/${encodeURIComponent(code)}`,
      {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      },
    )
  } catch {
    res = null
  }

  if (res?.ok) {
    let data: { postId?: string } | null = null
    try {
      data = (await res.json()) as { postId?: string }
    } catch {
      data = null
    }
    if (data?.postId && typeof data.postId === 'string') {
      redirect(`/posts/${data.postId}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-[#0b1220] px-4">
      <div className="max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827] p-6 text-center shadow-sm">
        <p className="text-gray-800 dark:text-gray-100 font-medium">
          Bu eser kodu ile eşleşen görüntülenebilir eser bulunamadı veya kaldırılmış
          olabilir.
        </p>
      </div>
    </div>
  )
}
