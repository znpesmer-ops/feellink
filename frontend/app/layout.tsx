import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
// import { Onboarding } from '@/components/Onboarding' // Kaldırıldı - ürün seviyesi için gereksiz

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
    <html lang="tr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <style dangerouslySetInnerHTML={{__html: `
          /* 🔒 CRITICAL: Lock sizes before any CSS loads */
          html, body {
            width: 100% !important;
            overflow-x: hidden !important;
            height: 100% !important;
          }
          main {
            width: 100% !important;
            max-width: 900px !important;
            box-sizing: border-box !important;
            padding-left: 1rem !important;
            padding-right: 1rem !important;
            min-width: 0 !important;
            contain: layout style paint !important;
          }
          .feed-content {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            min-width: 0 !important;
            contain: layout style paint !important;
          }
        `}} />
      </head>
      <body
        suppressHydrationWarning
        className="font-sans antialiased bg-[#f7f8fa] dark:bg-gray-950 text-[#1f1f1f] dark:text-gray-100 transition-colors"
      >
        <Providers>
          {children}
          {/* <Onboarding /> */}
        </Providers>
      </body>
    </html>
  )
}

