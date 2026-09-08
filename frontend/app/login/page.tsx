'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { FieldErrors } from 'react-hook-form'
import {
  ArrowRight,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import api, { getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { getDashboardRouteFromUser } from '@/lib/role-utils'
import { legalQuickSummary, legalUpdatedAt, termsSections } from '@/lib/legal-content'
import toast from 'react-hot-toast'

const unicodeEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u
const usernameRegex = /^[a-z0-9._]+$/

const sanitizeUsernameInput = (value: string) =>
  value
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'u')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s-]+/g, '.')
    .replace(/[^a-z0-9._]/g, '')
    .replace(/[._]{2,}/g, '.')
    .replace(/^[._]+/g, '')
    .slice(0, 30)

const normalizeUsernameCandidate = (value: string) =>
  sanitizeUsernameInput(value).replace(/[._]+$/g, '')

const normalizeDisplayName = (value?: string) => {
  const normalized = value?.replace(/\s+/g, ' ').trim()
  return normalized || undefined
}

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'E-posta veya kullanıcı adı gerekli'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
})

const registerSchema = z.object({
  username: z
    .string()
    .transform(normalizeUsernameCandidate)
    .pipe(
      z
        .string()
        .min(3, 'Kullanıcı adı en az 3 karakter olmalıdır')
        .max(30, 'Kullanıcı adı en fazla 30 karakter olabilir')
        .regex(usernameRegex, 'Kullanıcı adı sadece harf, rakam, nokta ve alt çizgi içerebilir')
        .refine((value) => !value.startsWith('.') && !value.startsWith('_'), {
          message: 'Kullanıcı adı nokta veya alt çizgi ile başlayamaz',
        })
        .refine((value) => !value.endsWith('.') && !value.endsWith('_'), {
          message: 'Kullanıcı adı nokta veya alt çizgi ile bitemez',
        }),
    ),
  email: z.string().regex(unicodeEmailRegex, 'Lütfen geçerli bir e-posta adresi girin'),
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Şifre en az bir harf ve bir rakam içermelidir'),
  fullName: z
    .string()
    .optional()
    .transform(normalizeDisplayName)
    .refine((value) => !value || value.length <= 70, {
      message: 'Profil adı en fazla 70 karakter olabilir',
    }),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "Kullanıcı Sözleşmesi'ni kabul edip KVKK Aydınlatma Metni'ni okuduğunuzu onaylamalısınız.",
  }),
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

function LoginPageInner() {
  const router = useRouter()
  // Tüm store'a abone olma: unreadCount vb. her güncellendiğinde re-render → effect/redirect döngüsü riski
  const setAuth = useAuthStore((s) => s.setAuth)
  const user = useAuthStore((s) => s.user)
  const capabilities = useAuthStore((s) => s.capabilities)

  const [error, setError] = useState('')
  const [isChecking, setIsChecking] = useState(true)
  const [isLoginMode, setIsLoginMode] = useState(true)
  const darkMode = false
  const [loginFormEmailKey, setLoginFormEmailKey] = useState(0)
  const [showRestoreScreen, setShowRestoreScreen] = useState(false)
  const [restoreCredentials, setRestoreCredentials] = useState<{ emailOrUsername: string; password: string } | null>(null)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [showRegisterTerms, setShowRegisterTerms] = useState(false)

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      fullName: '',
      termsAccepted: false,
    },
  })
  const usernameRegistration = registerForm.register('username')
  const watchedRegisterUsername = registerForm.watch('username') || ''
  const normalizedUsernamePreview = normalizeUsernameCandidate(watchedRegisterUsername) || 'kullaniciadi'

  const handlePostAuthNavigation = useCallback(
    (
      currentUser = user,
      currentCaps = capabilities,
      needsRoleSelection?: boolean,
    ) => {
      if (!currentUser) {
        setIsChecking(false)
        return
      }

      const shouldSelectRole =
        typeof needsRoleSelection === 'boolean'
          ? needsRoleSelection
          : (currentUser.roles?.length ?? 0) === 0

      if (shouldSelectRole) {
        router.replace('/select-role')
        setIsChecking(false)
        return
      }

      const route =
        getDashboardRouteFromUser({
          roles: currentCaps?.roles ?? currentUser.roles,
          isAdmin: currentUser.isAdmin,
          capabilities: currentCaps ?? undefined,
        }) || '/feed'

      router.replace(route || '/feed')
      setIsChecking(false)
    },
    [router, user, capabilities],
  )

  // Token yoksa hemen formu göster (logout sonrası loading takılmasın)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('access_token')) {
      setIsChecking(false)
    }
  }, [])

  // Forced logout sonrası login sayfasında önceki e-postanın görünmesini engelle: token yokken formu sıfırla ve email input'unu remount et
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('access_token')) return
    loginForm.reset({ emailOrUsername: '', password: '' })
    setLoginFormEmailKey((k) => k + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Oturum yönlendirmesi: AuthGuard + store'da isAuthenticated (persist'ten gelen user tek başına yetmez — login↔feed döngüsü önlenir)

  const onLogin = async (data: LoginForm) => {
    try {
      setError('')
      // Clear any stale auth so reactivation or re-login uses only new tokens/user
      useAuthStore.getState().clearAuth()
      const response = await api.post(
        '/auth/login',
        {
          emailOrUsername: data.emailOrUsername.trim(),
          password: data.password,
        },
        { timeout: 60000 },
      )
      const dataResp = response.data as any
      if (dataResp?.status === 'DELETED_ACCOUNT' && dataResp?.restoreAvailable) {
        setRestoreCredentials({ emailOrUsername: data.emailOrUsername.trim(), password: data.password })
        setShowRestoreScreen(true)
        setError('')
        return
      }
      const {
        user: loggedUser,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        capabilities: caps,
        sidebar,
        needsRoleSelection,
        reactivated,
      } = response.data

      if (!loggedUser || !newAccessToken || !newRefreshToken) {
        setError('Oturum başlatılamadı. Lütfen tekrar deneyin.')
        return
      }

      setAuth(loggedUser, newAccessToken, newRefreshToken, caps ?? null, sidebar ?? null)
      if (reactivated) {
        toast.success('Hesabınız yeniden aktif hale getirildi.')
      }
      handlePostAuthNavigation(loggedUser, caps ?? undefined, needsRoleSelection)
    } catch (err: any) {
      console.error('Login error:', err)
      const data = err?.response?.data
      if (err?.response?.status === 401 && data?.needsEmailVerification && data?.email) {
        setError('E-posta adresinizi doğrulamanız gerekiyor. Lütfen size gönderilen kodu kullanın veya yeni kod isteyin.')
        const verifyUrl = `/verify-email?email=${encodeURIComponent(data.email)}`
        setTimeout(() => {
          router.push(verifyUrl)
        }, 1500)
        return
      }
      setError(getErrorMessage(err))
    }
  }

  const onLoginInvalid = (errors: FieldErrors<LoginForm>) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[login] validation blocked submit', errors)
    }
    const firstMessage =
      errors.emailOrUsername?.message || errors.password?.message || 'Lutfen form alanlarini kontrol edin.'
    setError(String(firstMessage))
  }

  const onRestore = async () => {
    if (!restoreCredentials) return
    try {
      setError('')
      setRestoreLoading(true)
      const response = await api.post(
        '/auth/restore-account',
        {
          emailOrUsername: restoreCredentials.emailOrUsername,
          password: restoreCredentials.password,
        },
        { timeout: 60000 },
      )
      const {
        user: loggedUser,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        capabilities: caps,
        sidebar,
        needsRoleSelection,
      } = response.data
      if (!loggedUser || !newAccessToken || !newRefreshToken) {
        setError('Oturum başlatılamadı. Lütfen tekrar deneyin.')
        return
      }
      setAuth(loggedUser, newAccessToken, newRefreshToken, caps ?? null, sidebar ?? null)
      toast.success('Hesabınız geri yüklendi.')
      setShowRestoreScreen(false)
      setRestoreCredentials(null)
      handlePostAuthNavigation(loggedUser, caps ?? undefined, needsRoleSelection)
    } catch (err: any) {
      setError(getErrorMessage(err))
    } finally {
      setRestoreLoading(false)
    }
  }

  const onRegister = async (data: RegisterForm) => {
    try {
      setError('')
      // Clear any stale auth so new signup uses only new tokens/user
      useAuthStore.getState().clearAuth()
      const payload = {
        email: data.email.trim(),
        username: normalizeUsernameCandidate(data.username),
        password: data.password,
        ...(normalizeDisplayName(data.fullName) ? { fullName: normalizeDisplayName(data.fullName) } : {}),
        termsAccepted: Boolean(data.termsAccepted),
      }
      console.log('[Register] Sending payload (password hidden):', { ...payload, password: '***' })
      const response = await api.post('/auth/register', payload, { timeout: 60000 })
      const resData = response.data

      if (resData?.needsEmailVerification && resData?.email) {
        router.push(`/verify-email?email=${encodeURIComponent(resData.email)}`)
        return
      }

      const {
        user: registeredUser,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        capabilities: caps,
        sidebar,
        needsRoleSelection,
      } = response.data

      setAuth(registeredUser, newAccessToken, newRefreshToken, caps ?? null, sidebar ?? null)
      handlePostAuthNavigation(registeredUser, caps ?? undefined, needsRoleSelection)
    } catch (err: any) {
      const responseData = err?.response?.data
      console.error('Register error:', err)
      console.error('[Register] Backend response (400 body):', {
        statusCode: responseData?.statusCode,
        message: responseData?.message,
        error: responseData?.error,
        fullBody: responseData,
      })
      setError(getErrorMessage(err))
    }
  }


  // Login sayfasında auth spinner gösterme; form her zaman görünsün (flicker/tekrar loading önlenir)
  const showSpinner = false
  const fieldClass = `feellink-login-field w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all focus:border-[#ff8a1f] focus:ring-4 focus:ring-[#ff8a1f]/15 ${
    darkMode
      ? 'border-white/10 bg-white/[0.065] text-white placeholder-gray-500'
      : 'border-white/80 bg-white/92 text-slate-950 placeholder-slate-400 shadow-[0_12px_34px_rgba(43,36,78,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]'
  }`
  const labelClass = `mb-2 flex items-center gap-2 text-sm font-medium ${
    darkMode ? 'text-gray-300' : 'text-slate-800'
  }`
  const errorClass = `rounded-2xl border px-4 py-3 text-sm ${
    darkMode
      ? 'border-red-400/25 bg-red-500/10 text-red-200'
      : 'border-red-200 bg-red-50/90 text-red-700'
  }`
  if (showSpinner) {
    return (
      <div
        className={`fixed inset-0 flex items-center justify-center transition-all duration-500 overflow-hidden ${
          darkMode
            ? 'bg-[#0b0b0b] text-gray-100'
            : 'bg-[#f9f9f9] text-gray-800'
        }`}
      >
        {darkMode && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,122,0,0.04),transparent_80%)] pointer-events-none" />
        )}
        <div className="relative z-10 animate-spin rounded-full h-10 w-10 border-b-2 border-[#ff7b00]"></div>
      </div>
    )
  }

  return (
    <>
      <div
        className={`feellink-login-shell fixed inset-0 flex items-center justify-center overflow-y-auto overflow-x-hidden p-4 transition-all duration-500 ${
          darkMode
            ? 'bg-[#070910] text-gray-100 feellink-login-shell--dark'
            : 'bg-[#f4f7fb] text-slate-900'
        }`}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="feellink-login-wallpaper absolute inset-[-4%]" />
          <div className="feellink-login-spectrum absolute inset-[-14%]" />
          <div className="feellink-login-flow absolute inset-[-16%]" />
          <div className="feellink-login-constellation absolute inset-0" aria-hidden="true">
            <span className="feellink-login-constellation__dot feellink-login-constellation__dot--a" />
            <span className="feellink-login-constellation__dot feellink-login-constellation__dot--b" />
            <span className="feellink-login-constellation__dot feellink-login-constellation__dot--c" />
            <span className="feellink-login-constellation__dot feellink-login-constellation__dot--d" />
            <span className="feellink-login-constellation__dot feellink-login-constellation__dot--e" />
            <span className="feellink-login-constellation__dot feellink-login-constellation__dot--f" />
          </div>
          <div className="feellink-login-lines absolute inset-[-10%]" />
          <div className="feellink-login-aurora absolute inset-[-12%]" />
          <div className="feellink-login-silk absolute inset-[-8%]" />
          <div className="feellink-login-depth absolute inset-0" />
        </div>

        {/* Login/Register Kartı */}
        <div className="feellink-login-stage relative z-10 my-auto">
          <div className="feellink-login-orbit" aria-hidden="true">
            <span className="feellink-login-orbit__ring feellink-login-orbit__ring--a" />
            <span className="feellink-login-orbit__ring feellink-login-orbit__ring--b" />
            <span className="feellink-login-orbit__node feellink-login-orbit__node--a" />
            <span className="feellink-login-orbit__node feellink-login-orbit__node--b" />
            <span className="feellink-login-orbit__node feellink-login-orbit__node--c" />
          </div>
          <div
            className={`feellink-login-card relative overflow-hidden rounded-[34px] border p-6 shadow-2xl backdrop-blur-[30px] transition-all duration-500 sm:p-9 ${
            darkMode
              ? 'border-white/18 bg-[#090d16]/78 shadow-[0_34px_120px_rgba(0,0,0,0.54),0_0_80px_rgba(255,122,0,0.14)]'
              : 'border-white/82 bg-white/70 shadow-[0_36px_120px_rgba(45,32,103,0.26),0_0_90px_rgba(255,111,31,0.24)]'
          }`}
          >
            <div className="feellink-login-card-glass pointer-events-none absolute inset-0 z-0 rounded-[34px]" />
            <div className="feellink-login-card-sheen pointer-events-none absolute inset-0 z-0 rounded-[34px]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
            <div className="pointer-events-none absolute inset-x-8 top-[6.25rem] h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
            <div className="relative z-10">
          {/* Logo */}
          <div className="feellink-login-brand-lockup relative mb-7 flex justify-center">
            <span className="feellink-login-brand-aura" aria-hidden="true" />
            <span className="feellink-login-logo-reveal" aria-label="Feellink" role="img">
              <span className="feellink-login-logo-core" aria-hidden="true">
                <Image
                  src="/logo/feellink-short-mark-transparent.png"
                  alt=""
                  width={512}
                  height={512}
                  className="feellink-login-logo-mark"
                  priority
                  unoptimized
                />
              </span>
              <span className="feellink-login-logo-wing feellink-login-logo-wing--left" aria-hidden="true">
                <Image
                  src="/logo/feellink-login-pill-transparent.png"
                  alt=""
                  width={520}
                  height={192}
                  className="feellink-login-logo"
                  priority
                  unoptimized
                />
              </span>
              <span className="feellink-login-logo-wing feellink-login-logo-wing--right" aria-hidden="true">
                <Image
                  src="/logo/feellink-login-pill-transparent.png"
                  alt=""
                  width={520}
                  height={192}
                  className="feellink-login-logo"
                  priority
                  unoptimized
                />
              </span>
              <span className="feellink-login-logo-bridge" aria-hidden="true" />
              <span className="feellink-login-logo-final" aria-hidden="true">
                <Image
                  src="/logo/feellink-login-pill-transparent.png"
                  alt=""
                  width={520}
                  height={192}
                  className="feellink-login-logo"
                  priority
                  unoptimized
                />
              </span>
              <span className="feellink-login-logo-flare" aria-hidden="true" />
            </span>
          </div>

          {/* Login/Register Toggle */}
          <div
            className={`feellink-login-switch relative mb-7 flex rounded-2xl border p-1 ${
              darkMode ? 'border-white/10 bg-white/[0.045]' : 'border-white/80 bg-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(true)
                setError('')
                setShowRestoreScreen(false)
                setRestoreCredentials(null)
                setShowRegisterTerms(false)
                loginForm.reset()
                registerForm.reset()
              }}
              className={`feellink-login-tab w-1/2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                isLoginMode
                  ? 'bg-[#ff8a1f] text-white shadow-[0_14px_34px_rgba(255,138,31,0.28)]'
                  : darkMode
                    ? 'text-gray-400 hover:text-white'
                    : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(false)
                setError('')
                setShowRestoreScreen(false)
                setRestoreCredentials(null)
                setShowRegisterTerms(false)
                loginForm.reset()
                registerForm.reset()
              }}
              className={`feellink-login-tab w-1/2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                !isLoginMode
                  ? 'bg-[#ff8a1f] text-white shadow-[0_14px_34px_rgba(255,138,31,0.28)]'
                  : darkMode
                    ? 'text-gray-400 hover:text-white'
                    : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Kayıt Ol
            </button>
          </div>

          {/* Form */}
          {isLoginMode ? (
          showRestoreScreen ? (
            <div className="space-y-5">
              {error && (
                <div className={errorClass}>
                  {error}
                </div>
              )}
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Hesabınız silinmiş. 14 gün içinde geri yükleyebilirsiniz.
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Hesabı geri yüklemek ister misiniz?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={onRestore}
                  disabled={restoreLoading}
                  className="w-full py-2.5 rounded-lg font-medium bg-[#ff7a00] text-white hover:bg-[#e66d00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {restoreLoading ? 'Yükleniyor...' : 'Hesabı Geri Yükle'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRestoreScreen(false)
                    setRestoreCredentials(null)
                    setError('')
                  }}
                  className={`w-full py-2.5 rounded-lg font-medium border transition-colors ${
                    darkMode
                      ? 'border-[#2b2b2b] text-gray-300 hover:bg-[#1a1a1a]'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Girişe Dön
                </button>
              </div>
            </div>
          ) : (
          <form
            className="space-y-5"
            onSubmit={loginForm.handleSubmit(onLogin, onLoginInvalid)}
            noValidate
          >
              {error && (
                <div className={errorClass}>
                  {error}
                </div>
              )}

              <div>
                <label className={labelClass}>
                  <Mail className="h-4 w-4 text-[#ff8a1f]" />
                  E-posta veya Kullanıcı Adı
                </label>
                <input
                  key={loginFormEmailKey}
                  {...loginForm.register('emailOrUsername')}
                  type="text"
                  autoComplete="username"
                  placeholder="örnek@feellink.com"
                  className={fieldClass}
                />
                {loginForm.formState.errors.emailOrUsername && (
                  <p
                    className={`mt-1.5 text-sm ${
                      darkMode ? 'text-red-400' : 'text-red-600'
                    }`}
                  >
                    {loginForm.formState.errors.emailOrUsername.message}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  <LockKeyhole className="h-4 w-4 text-[#ff8a1f]" />
                  Şifre
                </label>
                <input
                  {...loginForm.register('password')}
                  type="password"
                  autoComplete="current-password"
                  placeholder="********"
                  className={fieldClass}
                />
                {loginForm.formState.errors.password && (
                  <p
                    className={`mt-1.5 text-sm ${
                      darkMode ? 'text-red-400' : 'text-red-600'
                    }`}
                  >
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
                <div className="flex justify-end mt-2">
                  <a
                    href="/forgot-password"
                    className={`text-xs transition-colors ${
                      darkMode
                        ? 'text-amber-400 hover:text-amber-300'
                        : 'text-[#ff7a00] hover:text-[#ff9500]'
                    }`}
                  >
                    Şifremi Unuttum?
                  </a>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginForm.formState.isSubmitting}
                className="feellink-login-submit relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#ff7a00] via-[#ff8a1f] to-[#ff9f43] py-3 text-sm font-bold text-white shadow-[0_18px_45px_rgba(255,122,0,0.28)] transition-all duration-200 hover:translate-y-[-1px] hover:shadow-[0_22px_55px_rgba(255,122,0,0.34)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loginForm.formState.isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Giriş yapılıyor...</span>
                  </>
                ) : (
                  <>
                    Giriş Yap
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )
          ) : (
            <form
              className="space-y-5"
              onSubmit={registerForm.handleSubmit(onRegister)}
              noValidate
            >
              {error && (
                <div className={errorClass}>
                  {error}
                </div>
              )}

              <div>
                <label className={labelClass}>
                  <Mail className="h-4 w-4 text-[#ff8a1f]" />
                  E-posta
                </label>
                <input
                  {...registerForm.register('email')}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="örnek@feellink.com"
                  className={fieldClass}
                />
                {registerForm.formState.errors.email && (
                  <p
                    className={`mt-1.5 text-sm ${
                      darkMode ? 'text-red-400' : 'text-red-600'
                    }`}
                  >
                    {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  <UserRound className="h-4 w-4 text-[#ff8a1f]" />
                  Kullanıcı Adı (Benzersiz Kimlik)
                </label>
                <input
                  {...usernameRegistration}
                  type="text"
                  value={watchedRegisterUsername}
                  onChange={(event) => {
                    registerForm.setValue('username', sanitizeUsernameInput(event.target.value), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }}
                  autoComplete="username"
                  inputMode="text"
                  placeholder="zeynep.esmer"
                  className={fieldClass}
                />
                <div
                  className={`mt-2 rounded-2xl border px-3 py-2 text-[11px] leading-4 ${
                    darkMode
                      ? 'border-white/10 bg-white/[0.045] text-slate-300'
                      : 'border-white/80 bg-white/58 text-slate-600'
                  }`}
                >
                  <span className="font-bold text-[#ff7a00]">@{normalizedUsernamePreview}</span>
                  <span> profil linkin ve Feellink&apos;teki tekil kimliğin olacak.</span>
                </div>
                {registerForm.formState.errors.username && (
                  <p
                    className={`mt-1.5 text-sm ${
                      darkMode ? 'text-red-400' : 'text-red-600'
                    }`}
                  >
                    {registerForm.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  <Sparkles className="h-4 w-4 text-[#ff8a1f]" />
                  Profil Adı (Görünen İsim)
                </label>
                <input
                  {...registerForm.register('fullName')}
                  type="text"
                  autoComplete="name"
                  placeholder="Zeynep Esmer"
                  className={fieldClass}
                />
                <p className={`mt-2 text-[11px] leading-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Aynı profil adı birden fazla kişide olabilir; ayrıştırma benzersiz kullanıcı adıyla yapılır.
                </p>
                {registerForm.formState.errors.fullName && (
                  <p
                    className={`mt-1.5 text-sm ${
                      darkMode ? 'text-red-400' : 'text-red-600'
                    }`}
                  >
                    {registerForm.formState.errors.fullName.message}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  <LockKeyhole className="h-4 w-4 text-[#ff8a1f]" />
                  Şifre
                </label>
                <input
                  {...registerForm.register('password')}
                  type="password"
                  placeholder="********"
                  className={fieldClass}
                />
                {registerForm.formState.errors.password && (
                  <p
                    className={`mt-1.5 text-sm ${
                      darkMode ? 'text-red-400' : 'text-red-600'
                    }`}
                  >
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div
                className={`space-y-3 rounded-2xl border p-4 ${
                  darkMode ? 'border-white/10 bg-white/[0.045]' : 'border-slate-200 bg-white/70'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="register-termsAccepted"
                    {...registerForm.register('termsAccepted')}
                    className={`mt-1 h-4 w-4 shrink-0 rounded border-2 text-[#ff7a00] focus:ring-[#ff7a00] ${
                      darkMode ? 'border-gray-500 bg-[#1a1a1a]' : 'border-gray-300 bg-white'
                    }`}
                  />
                  <div className={`text-sm leading-6 ${darkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                    <label htmlFor="register-termsAccepted" className="cursor-pointer">
                      Kullanıcı Sözleşmesi&apos;ni kabul ediyor ve KVKK Aydınlatma Metni&apos;ni
                      okuduğumu onaylıyorum.
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRegisterTerms((value) => !value)}
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
                {showRegisterTerms && (
                  <div
                    className={`max-h-56 overflow-y-auto rounded-2xl border p-4 text-sm leading-6 ${
                      darkMode
                        ? 'border-white/10 bg-black/20 text-gray-300'
                        : 'border-slate-200 bg-slate-50/90 text-slate-700'
                    }`}
                  >
                    <div className="mb-3 flex items-center gap-2 font-semibold">
                      <ShieldCheck className="h-4 w-4 text-[#ff8a1f]" />
                      Sözleşme özeti
                    </div>
                    <div className="space-y-2">
                      {legalQuickSummary.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                    </div>
                    <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50/80 p-3 text-xs leading-5 text-orange-900 dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-200">
                      Son güncelleme: {legalUpdatedAt}. Tam metinler kayıt formundan ayrılmadan yeni
                      sekmede açılır.
                    </div>
                    <div className="mt-4 space-y-3">
                      {termsSections.slice(0, 4).map((section) => (
                        <div key={section.title}>
                          <h4 className="font-semibold text-slate-900 dark:text-white">{section.title}</h4>
                          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-gray-400">
                            {section.paragraphs?.[0] ?? section.items?.[0]}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {registerForm.formState.errors.termsAccepted && (
                <p className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                  {registerForm.formState.errors.termsAccepted.message}
                </p>
              )}

              <button
                type="submit"
                disabled={registerForm.formState.isSubmitting}
                className="feellink-login-submit relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#ff7a00] via-[#ff8a1f] to-[#ff9f43] py-3 text-sm font-bold text-white shadow-[0_18px_45px_rgba(255,122,0,0.28)] transition-all duration-200 hover:translate-y-[-1px] hover:shadow-[0_22px_55px_rgba(255,122,0,0.34)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {registerForm.formState.isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Kayıt yapılıyor...</span>
                  </>
                ) : (
                  <>
                    Kayıt Ol
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Alt Kısım */}
          <p
            className={`text-center text-sm mt-6 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            {isLoginMode ? (
              <>
                Hesabınız yok mu?{' '}
                <button
                  onClick={() => {
                    setIsLoginMode(false)
                    setError('')
                    setShowRegisterTerms(false)
                  }}
                  className="text-[#ff7a00] hover:underline transition-colors"
                >
                  Kayıt Ol
                </button>
              </>
            ) : (
              <>
                Zaten hesabınız var mı?{' '}
                <button
                  onClick={() => {
                    setIsLoginMode(true)
                    setError('')
                    setShowRegisterTerms(false)
                  }}
                  className="text-[#ff7a00] hover:underline transition-colors"
                >
                  Giriş Yap
                </button>
              </>
            )}
          </p>
          </div>
          </div>
        </div>
      </div>

    </>
  )
}

export default function LoginPage() {
  return <LoginPageInner />
}
