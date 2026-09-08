'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Building2, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import api, { getErrorMessage } from '@/lib/api'
import { AppLogo } from '@/components/common/AppLogo'
import { legalQuickSummary, legalUpdatedAt, termsSections } from '@/lib/legal-content'
import { useAuthStore } from '@/lib/store'
import { getDashboardRouteFromUser } from '@/lib/role-utils'

const unicodeEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

const registerSchema = z.object({
  username: z.string().min(3, 'Kullanıcı adı en az 3 karakter olmalıdır'),
  email: z.string().regex(unicodeEmailRegex, 'Lütfen geçerli bir e-posta adresi girin'),
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Şifre en az bir harf ve bir rakam içermelidir'),
  fullName: z.string().optional(),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "Kullanıcı Sözleşmesi'ni kabul edip KVKK Aydınlatma Metni'ni okuduğunuzu onaylamalısınız.",
  }),
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const capabilities = useAuthStore((s) => s.capabilities)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setLoading = useAuthStore((s) => s.setLoading)
  const setHasInitialized = useAuthStore((s) => s.setHasInitialized)

  const [error, setError] = useState('')
  const [isChecking, setIsChecking] = useState(true)
  const [mode, setMode] = useState<'user' | 'corporate'>('user')
  const [showTerms, setShowTerms] = useState(false) // ✅ Sözleşme alanını göster/gizle

  useEffect(() => {
    setLoading(false)
    setHasInitialized(true)
  }, [setLoading, setHasInitialized])

  // Sadece backend doğrulanmış oturumda yönlendir (persist'teki user+token ama isAuthenticated false → döngü yapma)
  useEffect(() => {
    if (accessToken && user && isAuthenticated) {
      const roles = capabilities?.roles?.length ? capabilities.roles : user.roles ?? []
      if (roles.length === 0) {
        router.push('/select-role')
      } else {
        const route = getDashboardRouteFromUser({
          roles,
          isAdmin: user.isAdmin,
          capabilities: capabilities ?? undefined,
        })
        router.push(route || '/feed')
      }
    } else if ((accessToken && !user) || (!accessToken && user)) {
      clearAuth()
    }
    setIsChecking(false)
  }, [accessToken, user?.id, capabilities, isAuthenticated, router, clearAuth])


  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      termsAccepted: false,
    },
  })

  // ✅ termsAccepted değerini watch ile izle
  const termsAccepted = watch('termsAccepted')
  const fieldClass =
    'mt-2 block w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm text-slate-950 placeholder-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition-all focus:border-[#ff8a1f] focus:ring-4 focus:ring-[#ff8a1f]/15 dark:border-white/10 dark:bg-white/[0.065] dark:text-white dark:placeholder-gray-500'
  const labelClass =
    'flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300'
  const errorTextClass = 'mt-1.5 text-sm text-red-600 dark:text-red-400'

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError('')
      const endpoint = mode === 'corporate' ? '/auth/register-corporate' : '/auth/register'
      
      // ✅ Kullanıcı sözleşmesi kontrolü (zod validation zaten yapıyor ama ekstra güvenlik)
      if (!data.termsAccepted) {
        setError("Kullanıcı Sözleşmesi'ni kabul edip KVKK Aydınlatma Metni'ni okuduğunuzu onaylamalısınız.")
        return
      }

      // Boş string'leri undefined'a çevir (backend @IsOptional için)
      const payload = {
        email: data.email.trim(),
        username: data.username.trim(),
        password: data.password,
        ...(data.fullName && data.fullName.trim() ? { fullName: data.fullName.trim() } : {}),
        termsAccepted: data.termsAccepted, // ✅ Form'dan gelen değer
      }
      
      // Debug: Gönderilen datayı logla
      console.log('REGISTER DATA:', payload)
      console.log('Endpoint:', endpoint)
      
      const response = await api.post(endpoint, payload)
      const resData = response.data

      if (resData.needsEmailVerification && resData.email) {
        router.push(`/verify-email?email=${encodeURIComponent(resData.email)}`)
        return
      }

      const {
        user: registeredUser,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        capabilities: caps,
        sidebar,
      } = resData
      setAuth(registeredUser, newAccessToken, newRefreshToken, caps ?? null, sidebar ?? null)

      if (!caps || !caps.roles || caps.roles.length === 0) {
        router.push('/select-role')
      } else {
        const route = getDashboardRouteFromUser({
          roles: caps.roles,
          isAdmin: registeredUser.isAdmin,
          capabilities: caps,
        })
        router.push(route)
      }
    } catch (err: any) {
      // Debug: Hata detaylarını logla
      console.error('REGISTER ERROR:', err)
      console.error('Error response:', err?.response?.data)
      console.error('Error status:', err?.response?.status)
      
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
      
      // Validation hatalarını daha detaylı göster
      if (err?.response?.data?.message && Array.isArray(err.response.data.message)) {
        const validationErrors = err.response.data.message.map((msg: string) => msg).join(', ')
        setError(`Validation hatası: ${validationErrors}`)
      }
    }
  }

  // Auth kontrolü yapılırken loading göster
  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] dark:bg-[#070910]">
        <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-[#ff8a1f]"></div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-y-auto overflow-x-hidden bg-[#f4f7fb] px-4 py-10 text-slate-900 transition-colors dark:bg-[#070910] dark:text-gray-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,138,31,0.20),transparent_32%),radial-gradient(circle_at_30%_18%,rgba(31,106,225,0.14),transparent_28%),linear-gradient(135deg,#f8fbff_0%,#eef3fb_48%,#fff4ea_100%)] dark:bg-[radial-gradient(circle_at_50%_42%,rgba(255,122,0,0.13),transparent_34%),radial-gradient(circle_at_34%_18%,rgba(43,120,255,0.11),transparent_26%),linear-gradient(135deg,#070910_0%,#0b0f19_48%,#120d09_100%)]" />
      <div className="relative z-10 w-full max-w-[460px] overflow-hidden rounded-[32px] border border-white/85 bg-white/82 p-8 shadow-[0_34px_100px_rgba(15,23,42,0.16),0_0_80px_rgba(255,138,31,0.13)] backdrop-blur-2xl transition-colors dark:border-white/10 dark:bg-[#0d1119]/82 dark:shadow-[0_34px_120px_rgba(0,0,0,0.46),0_0_80px_rgba(255,122,0,0.08)] sm:p-10">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#ff8a1f]/70 to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#ff8a1f]/16 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-56 w-56 rounded-full bg-[#1f6ae1]/12 blur-3xl" />
        <div className="relative">
          <div className="mb-5 flex justify-center">
            <AppLogo width={130} height={50} className="object-contain" priority />
          </div>
          <h2 className="text-center text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            Hesabını oluştur
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500 dark:text-gray-400">
            Feellink deneyimine premium bir başlangıç yap.
          </p>
          {/* Mode Tabs */}
          <div className="mt-6 flex rounded-2xl border border-slate-200/80 bg-slate-950/[0.035] p-1 dark:border-white/10 dark:bg-white/[0.045]">
            <button
              type="button"
              onClick={() => setMode('user')}
              className={`flex w-1/2 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                mode === 'user'
                  ? 'bg-[#ff8a1f] text-white shadow-[0_14px_34px_rgba(255,138,31,0.28)]'
                  : 'text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <UserRound className="h-4 w-4" />
              Kullanıcı Kaydı
            </button>
            <button
              type="button"
              onClick={() => setMode('corporate')}
              className={`flex w-1/2 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                mode === 'corporate'
                  ? 'bg-[#ff8a1f] text-white shadow-[0_14px_34px_rgba(255,138,31,0.28)]'
                  : 'text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <Building2 className="h-4 w-4" />
              Kurumsal Kayıt
            </button>
          </div>
        </div>
        <form className="relative mt-7 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className={labelClass}>
                <Mail className="h-4 w-4 text-[#ff8a1f]" />
                E-posta
              </label>
              <input
                {...registerField('email')}
                type="email"
                inputMode="email"
                autoComplete="email"
                className={fieldClass}
                placeholder="ornek@feellink.com"
              />
              {errors.email && (
                <p className={errorTextClass}>{errors.email.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="username" className={labelClass}>
                <UserRound className="h-4 w-4 text-[#ff8a1f]" />
                Kullanıcı adı
              </label>
              <input
                {...registerField('username')}
                type="text"
                className={fieldClass}
                placeholder="kullaniciadi"
              />
              {errors.username && (
                <p className={errorTextClass}>{errors.username.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="fullName" className={labelClass}>
                <Sparkles className="h-4 w-4 text-[#ff8a1f]" />
                Ad soyad (isteğe bağlı)
              </label>
              <input
                {...registerField('fullName')}
                type="text"
                className={fieldClass}
                placeholder="Ad Soyad"
              />
            </div>
            <div>
              <label htmlFor="password" className={labelClass}>
                <LockKeyhole className="h-4 w-4 text-[#ff8a1f]" />
                Şifre
              </label>
              <input
                {...registerField('password')}
                type="password"
                className={fieldClass}
                placeholder="********"
              />
              {errors.password && (
                <p className={errorTextClass}>{errors.password.message}</p>
              )}
            </div>
          </div>

          {/* Kullanıcı Sözleşmesi ve KVKK onayı */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.045]">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="termsAccepted"
                {...registerField('termsAccepted')}
                className="mt-1 h-4 w-4 shrink-0 rounded border-2 border-gray-300 bg-white text-[#ff7b00] focus:ring-[#ff7b00] dark:border-gray-500 dark:bg-[#1a1a1a]"
              />
              <div className="text-sm leading-6 text-slate-600 dark:text-gray-300">
                <label htmlFor="termsAccepted" className="cursor-pointer">
                  Kullanıcı Sözleşmesi&apos;ni kabul ediyor ve KVKK Aydınlatma Metni&apos;ni
                  okuduğumu onaylıyorum.
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTerms(!showTerms)}
                    className="rounded-full border border-[#ff8a1f]/30 px-3 py-1 text-xs font-bold text-[#ff7a00] transition hover:bg-[#ff8a1f]/10"
                  >
                    Sözleşme özeti
                  </button>
                  <a
                    href="/privacy#kullanici-sozlesmesi"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-[#ff7a00] transition hover:bg-[#ff8a1f]/10 dark:border-white/10"
                  >
                    Kullanıcı Sözleşmesi
                  </a>
                  <a
                    href="/privacy#kvkk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-[#ff7a00] transition hover:bg-[#ff8a1f]/10 dark:border-white/10"
                  >
                    KVKK metni
                  </a>
                </div>
              </div>
            </div>
            {errors.termsAccepted && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.termsAccepted.message}
              </p>
            )}

            {showTerms && (
              <div
                className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 text-slate-700 dark:border-white/10 dark:bg-black/20 dark:text-gray-300"
                style={{ maxHeight: '280px', overflowY: 'auto' }}
              >
                <div className="space-y-4 text-sm">
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 font-semibold text-slate-950 dark:text-gray-100">
                      <ShieldCheck className="h-4 w-4 text-[#ff8a1f]" />
                      Sözleşme özeti
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Son güncelleme tarihi: {legalUpdatedAt}
                    </p>
                  </div>

                  <div className="space-y-2 text-gray-600 dark:text-gray-400">
                    {legalQuickSummary.map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-400/20 dark:bg-orange-400/10">
                    <p className="text-xs leading-5 text-orange-900 dark:text-orange-200">
                      Tam metinler yeni sekmede açılır. Hesap oluşturduğunuzda Kullanıcı
                      Sözleşmesi&apos;ni kabul etmiş ve KVKK Aydınlatma Metni&apos;ni okuduğunuzu
                      onaylamış olursunuz.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {termsSections.slice(0, 4).map((section) => (
                      <div key={section.title}>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                          {section.title}
                        </h4>
                        <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-400">
                          {section.paragraphs?.[0] ?? section.items?.[0]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting || !termsAccepted}
              className="group relative flex w-full items-center justify-center gap-2 rounded-2xl border border-transparent bg-gradient-to-r from-[#ff7a00] via-[#ff8a1f] to-[#ff9f43] px-4 py-3 text-sm font-bold text-white shadow-[0_18px_45px_rgba(255,122,0,0.28)] transition-all hover:translate-y-[-1px] hover:shadow-[0_22px_55px_rgba(255,122,0,0.34)] focus:outline-none focus:ring-4 focus:ring-[#ff8a1f]/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Kayıt oluşturuluyor...' : mode === 'corporate' ? 'Kurumsal Kayıt Oluştur' : 'Kayıt Ol'}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm font-semibold text-[#ff7b00] hover:text-[#e36f00]"
            >
              Zaten hesabınız var mı? Giriş yap
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
