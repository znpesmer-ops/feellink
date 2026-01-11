import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { LayoutConditional } from '@/components/layout-conditional'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'Feellink',
  description: 'A full-featured social platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-[#f7f8fa] dark:bg-gray-950 text-[#1f1f1f] dark:text-gray-100 transition-colors`}>
        <Providers>
          {children}
          {/* <Onboarding /> */}
        </Providers>
      </body>
    </html>
  )
}

