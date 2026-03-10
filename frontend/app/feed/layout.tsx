// Build sırasında sayfa verisi toplanmasını atla (Vercel/Next.js next-url hatası önlemi)
export const dynamic = 'force-dynamic'

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
