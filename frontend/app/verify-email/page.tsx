'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api, { getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { getDashboardRouteFromUser } from '@/lib/role-utils'

const RESEND_COOLDOWN_SEC = 60

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const { setAuth } = useAuthStore()

  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const startCooldown = useCallback(() => {
    setResendCooldown(RESEND_COOLDOWN_SEC)
  }, [])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown((c) => (c <= 0 ? 0 : c - 1)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  useEffect(() => {
    if (!email) {
      router.replace('/register')
    }
  }, [email, router])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const trimmed = code.replace(/\D/g, '').slice(0, 6)
    if (trimmed.length !== 6) {
      setError('Lütfen 6 haneli kodu girin.')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await api.post('/auth/verify-signup-otp', { email: email.trim(), code: trimmed })
      const { user: u, accessToken, refreshToken, capabilities, sidebar } = res.data
      setAuth(u, accessToken, refreshToken, capabilities ?? null, sidebar ?? null)
      if (!capabilities?.roles?.length) {
        router.push('/select-role')
      } else {
        const route = getDashboardRouteFromUser({
          roles: capabilities.roles,
          isAdmin: u?.isAdmin,
          capabilities: capabilities,
        })
        router.push(route)
      }
    } catch (err: any) {
      setError(getErrorMessage(err) || 'Kod geçersiz veya süresi dolmuş. Lütfen yeniden deneyin veya yeni kod isteyin.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setError('')
    try {
      await api.post('/auth/send-signup-otp', { email: email.trim() })
      startCooldown()
    } catch (err: any) {
      setError(getErrorMessage(err) || 'Kod gönderilemedi. Lütfen tekrar deneyin.')
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(v)
  }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff7b00]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center mb-1">
          E-posta doğrulama
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
          <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span> adresine gönderilen 6 haneli kodu girin.
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-900/20 border border-red-500/50 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Doğrulama kodu
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={handleCodeChange}
              placeholder="000000"
              className="w-full px-4 py-3 text-center text-lg tracking-[0.5em] font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#ff7b00] focus:border-[#ff7b00]"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || code.length !== 6}
            className="w-full py-2.5 rounded-lg bg-[#ff7b00] hover:bg-[#e36f00] text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Doğrulanıyor...' : 'Doğrula'}
          </button>
          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="text-sm text-[#ff7b00] hover:text-[#e36f00] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendCooldown > 0 ? `Yeni kod (${resendCooldown}s)` : 'Kodu tekrar gönder'}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          Kodu almadıysanız spam klasörünü kontrol edin. Kod 10 dakika geçerlidir.
        </p>
        <p className="mt-2 text-center">
          <Link href="/login" className="text-sm text-[#ff7b00] hover:text-[#e36f00]">
            Giriş sayfasına dön
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff7b00]" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
