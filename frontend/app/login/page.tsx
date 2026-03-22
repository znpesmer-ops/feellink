'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sun, Moon } from 'lucide-react'
import api, { getErrorMessage } from '@/lib/api'
import { useTheme } from '@/lib/theme-context'
import { AppLogo } from '@/components/common/AppLogo'
import { useAuthStore } from '@/lib/store'
import { getDashboardRouteFromUser } from '@/lib/role-utils'
import toast from 'react-hot-toast'
import { AuthGuard } from '@/lib/auth-guard'

const unicodeEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'E-posta veya kullanıcı adı gerekli'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const registerSchema = z.object({
  username: z.string().min(3, 'Kullanıcı adı en az 3 karakter olmalıdır'),
  email: z.string().regex(unicodeEmailRegex, 'Lütfen geçerli bir e-posta adresi girin'),
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Şifre en az bir harf ve bir rakam içermelidir'),
  fullName: z.string().optional(),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'Devam etmek için kullanıcı sözleşmesi ve KVKK metnini kabul etmelisiniz.',
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
  const { theme, toggleTheme } = useTheme()
  const darkMode = theme === 'dark'
  const [loginFormEmailKey, setLoginFormEmailKey] = useState(0)
  const [showRestoreScreen, setShowRestoreScreen] = useState(false)
  const [restoreCredentials, setRestoreCredentials] = useState<{ emailOrUsername: string; password: string } | null>(null)
  const [restoreLoading, setRestoreLoading] = useState(false)

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      termsAccepted: false,
    },
  })

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
      const response = await api.post('/auth/login', {
        emailOrUsername: data.emailOrUsername.trim(),
        password: data.password,
      })
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

  const onRestore = async () => {
    if (!restoreCredentials) return
    try {
      setError('')
      setRestoreLoading(true)
      const response = await api.post('/auth/restore-account', {
        emailOrUsername: restoreCredentials.emailOrUsername,
        password: restoreCredentials.password,
      })
      const {
        user: loggedUser,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        capabilities: caps,
        sidebar,
        needsRoleSelection,
      } = response.data
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
        username: data.username.trim(),
        password: data.password,
        ...(data.fullName && data.fullName.trim() ? { fullName: data.fullName.trim() } : {}),
        termsAccepted: Boolean(data.termsAccepted),
      }
      console.log('[Register] Sending payload (password hidden):', { ...payload, password: '***' })
      const response = await api.post('/auth/register', payload)
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
        className={`fixed inset-0 flex items-center justify-center transition-all duration-500 overflow-hidden p-4 ${
          darkMode
            ? 'bg-[#0b0b0b] text-gray-100'
            : 'bg-[#f9f9f9] text-gray-800'
        }`}
      >
        {/* Background Glow sadece DARK modda */}
        {darkMode && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,122,0,0.04),transparent_80%)] pointer-events-none" />
        )}

        {/* Dark Mode Toggle */}
        <button
          onClick={() => toggleTheme()}
          className={`absolute top-6 right-6 p-2.5 rounded-full shadow-md hover:scale-105 hover:shadow-xl transition-all duration-300 z-10 group ${
            darkMode
              ? 'bg-[#1e1e1e]'
              : 'bg-white border border-gray-200'
          }`}
          title={darkMode ? 'Light Mode' : 'Dark Mode'}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? (
            <Sun className="w-5 h-5 text-[#ff9500] transition-all duration-300 group-hover:rotate-90" />
          ) : (
            <Moon className="w-5 h-5 text-[#ff7a00] transition-all duration-300 group-hover:rotate-[-15deg]" />
          )}
        </button>

        {/* Login/Register Kartı */}
        <div
          className={`relative z-10 w-full max-w-md rounded-2xl p-10 transition-all duration-500 ${
            darkMode
              ? 'bg-[#111]/95 backdrop-blur-xl border border-[#1f1f1f] shadow-[0_0_40px_rgba(255,122,0,0.08)]'
              : 'bg-white border border-gray-200 shadow-[0_0_25px_rgba(0,0,0,0.05)]'
          }`}
        >
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <AppLogo width={130} height={50} className="object-contain" priority />
          </div>

          {/* Login/Register Toggle */}
          <div
            className={`flex justify-center mb-6 border-b ${
              darkMode ? 'border-[#1f1f1f]' : 'border-gray-200'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(true)
                setError('')
                setShowRestoreScreen(false)
                setRestoreCredentials(null)
                loginForm.reset()
                registerForm.reset()
              }}
              className={`w-1/2 py-2.5 text-sm font-medium transition-all ${
                isLoginMode
                  ? 'text-[#ff7a00] border-b-2 border-[#ff7a00]'
                  : darkMode
                    ? 'text-gray-400 hover:text-[#ff7a00]'
                    : 'text-gray-500 hover:text-[#ff7a00]'
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
                loginForm.reset()
                registerForm.reset()
              }}
              className={`w-1/2 py-2.5 text-sm font-medium transition-all ${
                !isLoginMode
                  ? 'text-[#ff7a00] border-b-2 border-[#ff7a00]'
                  : darkMode
                    ? 'text-gray-400 hover:text-[#ff7a00]'
                    : 'text-gray-500 hover:text-[#ff7a00]'
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
                <div
                  className={`px-4 py-3 rounded-lg text-sm ${
                    darkMode
                      ? 'bg-red-900/20 border border-red-800 text-red-400'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
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
            onSubmit={loginForm.handleSubmit(onLogin)}
            noValidate
          >
              {error && (
                <div
                  className={`px-4 py-3 rounded-lg text-sm ${
                    darkMode
                      ? 'bg-red-900/20 border border-red-800 text-red-400'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {error}
                </div>
              )}

              <div>
                <label
                  className={`block text-sm mb-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  E-posta veya Kullanıcı Adı
                </label>
                <input
                  key={loginFormEmailKey}
                  {...loginForm.register('emailOrUsername')}
                  type="text"
                  autoComplete="off"
                  placeholder="örnek@feellink.com"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ff7a00] focus:outline-none transition-all ${
                    darkMode
                      ? 'border-[#2b2b2b] bg-[#0d0d0d] text-gray-100 placeholder-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                  }`}
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
                <label
                  className={`block text-sm mb-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  Şifre
                </label>
                <input
                  {...loginForm.register('password')}
                  type="password"
                  placeholder="********"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ff7a00] focus:outline-none transition-all ${
                    darkMode
                      ? 'border-[#2b2b2b] bg-[#0d0d0d] text-gray-100 placeholder-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                  }`}
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
                className="w-full py-2 bg-[#ff7a00] hover:bg-[#ff9500] text-white font-semibold rounded-lg shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loginForm.formState.isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Giriş yapılıyor...</span>
                  </>
                ) : (
                  'Giriş Yap'
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
                <div
                  className={`px-4 py-3 rounded-lg text-sm ${
                    darkMode
                      ? 'bg-red-900/20 border border-red-800 text-red-400'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {error}
                </div>
              )}

              <div>
                <label
                  className={`block text-sm mb-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  E-posta
                </label>
                <input
                  {...registerForm.register('email')}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="örnek@feellink.com"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ff7a00] focus:outline-none transition-all ${
                    darkMode
                      ? 'border-[#2b2b2b] bg-[#0d0d0d] text-gray-100 placeholder-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                  }`}
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
                <label
                  className={`block text-sm mb-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  Kullanıcı Adı
                </label>
                <input
                  {...registerForm.register('username')}
                  type="text"
                  placeholder="kullaniciadi"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ff7a00] focus:outline-none transition-all ${
                    darkMode
                      ? 'border-[#2b2b2b] bg-[#0d0d0d] text-gray-100 placeholder-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                  }`}
                />
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
                <label
                  className={`block text-sm mb-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  Ad Soyad (İsteğe Bağlı)
                </label>
                <input
                  {...registerForm.register('fullName')}
                  type="text"
                  placeholder="Ad Soyad"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ff7a00] focus:outline-none transition-all ${
                    darkMode
                      ? 'border-[#2b2b2b] bg-[#0d0d0d] text-gray-100 placeholder-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-sm mb-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  Şifre
                </label>
                <input
                  {...registerForm.register('password')}
                  type="password"
                  placeholder="********"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ff7a00] focus:outline-none transition-all ${
                    darkMode
                      ? 'border-[#2b2b2b] bg-[#0d0d0d] text-gray-100 placeholder-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                  }`}
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

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="register-termsAccepted"
                  {...registerForm.register('termsAccepted')}
                  className={`mt-1 h-4 w-4 rounded border-2 text-[#ff7a00] focus:ring-[#ff7a00] ${
                    darkMode ? 'border-gray-500 bg-[#1a1a1a]' : 'border-gray-300 bg-white'
                  }`}
                />
                <label
                  htmlFor="register-termsAccepted"
                  className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  <a href="/register" className="text-[#ff7a00] hover:underline">
                    Kullanıcı Sözleşmesi
                  </a>
                  {' ve '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#ff7a00] hover:underline">
                    KVKK Aydınlatma Metni
                  </a>
                  {' '}ni okudum, kabul ediyorum.
                </label>
              </div>
              {registerForm.formState.errors.termsAccepted && (
                <p className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                  {registerForm.formState.errors.termsAccepted.message}
                </p>
              )}

              <button
                type="submit"
                disabled={registerForm.formState.isSubmitting}
                className="w-full py-2 bg-[#ff7a00] hover:bg-[#ff9500] text-white font-semibold rounded-lg shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {registerForm.formState.isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Kayıt yapılıyor...</span>
                  </>
                ) : (
                  'Kayıt Ol'
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

    </>
  )
}

export default function LoginPage() {
  return (
    <AuthGuard>
      <LoginPageInner />
    </AuthGuard>
  )
}
