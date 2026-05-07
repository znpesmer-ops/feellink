/** @type {import('next').NextConfig} */
// Browser → same-origin /api-proxy → backend (CORS / mixed blocking önler)
const backendRewriteTarget = (
  process.env.BACKEND_REWRITE_TARGET || 'https://feellink-backend.vercel.app'
).replace(/\/$/, '')

const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${backendRewriteTarget}/:path*`,
      },
    ]
  },
  images: {
    domains: [
      'localhost',
      '192.168.1.38',
      '192.168.1.59',
      '127.0.0.1',
      'indirect-shark-waters-titles.trycloudflare.com',
      'previously-willing-cbs-establishing.trycloudflare.com',
    ],
    unoptimized: true, // Production'da görseller için
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.1.38',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.1.38',
        port: '3001',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.1.38',
        port: '3002',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.1.59',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.1.59',
        port: '3001',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.1.59',
        port: '3002',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**', // Tüm HTTPS domain'lere izin ver
      },
      {
        protocol: 'http',
        hostname: '**', // Dev ortamında HTTP için
      },
    ],
  },
}

module.exports = nextConfig



