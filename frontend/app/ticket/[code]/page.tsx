'use client'

import Image from 'next/image'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { resolveImageUrl } from '@/lib/resolveImageUrl'

type PublicTicketPayload = {
  ticketCode: string
  artworkTitle: string
  artistName: string
  artistUsername: string
  imageUrl: string | null
  isValid: boolean
}

export default function PublicArtworkTicketPage() {
  const params = useParams()
  const codeRaw = params?.code
  const code = typeof codeRaw === 'string' ? codeRaw : Array.isArray(codeRaw) ? codeRaw[0] : ''

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['public-artwork-ticket', code],
    queryFn: async () => {
      const res = await api.get<PublicTicketPayload>(
        `/posts/public-artwork-ticket/${encodeURIComponent(code)}`,
      )
      return res.data
    },
    enabled: !!code,
    staleTime: 60_000,
    retry: false,
  })

  if (!code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-[#0b1220] px-4">
        <p className="text-gray-600 dark:text-gray-400 text-center">Geçersiz bilet bağlantısı.</p>
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-100 dark:bg-[#0b1220] gap-3">
        <div className="h-9 w-9 border-2 border-[#ff7b00] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Yükleniyor…</p>
      </div>
    )
  }

  if (isError || !data) {
    const status = (error as { response?: { status?: number } })?.response?.status
    const message =
      status === 404
        ? 'Bu bilet kodu ile eşleşen doğrulanmış eser bulunamadı.'
        : 'Bilet bilgisi alınamadı. Lütfen daha sonra tekrar deneyin.'
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-[#0b1220] px-4">
        <div className="max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827] p-6 text-center shadow-sm">
          <p className="text-gray-800 dark:text-gray-100 font-medium">{message}</p>
        </div>
      </div>
    )
  }

  const imgSrc = data.imageUrl ? resolveImageUrl(data.imageUrl) : null

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-[#0b1220] text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-lg rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-[#111827] shadow-lg overflow-hidden">
        <div className="p-4 md:p-6 border-b border-black/6 dark:border-white/8">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#ff7b00]">Feellink · Eser doğrulama</p>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          {imgSrc ? (
            <div className="relative w-full aspect-square max-h-[min(70vh,420px)] mx-auto rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800">
              <Image
                src={imgSrc}
                alt={data.artworkTitle}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 512px"
                priority
              />
            </div>
          ) : (
            <div className="w-full aspect-square max-h-[min(50vh,320px)] rounded-xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              Görsel yok
            </div>
          )}

          <div>
            <h1 className="text-xl md:text-2xl font-semibold leading-snug">{data.artworkTitle}</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">{data.artistName}</p>
            {data.artistUsername ? (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">@{data.artistUsername}</p>
            ) : null}
            <p className="mt-3 font-mono text-sm text-gray-700 dark:text-gray-300">Kod: {data.ticketCode}</p>
          </div>

          {data.isValid ? (
            <div className="inline-flex items-center rounded-full border border-[#ff7b00]/35 bg-[#ff7b00]/10 px-3 py-1.5 text-sm text-[#ff7b00]">
              Feellink üzerinde doğrulandı
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
