import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from './store'
import { CapabilitySummary, SidebarVisibility } from '@/types/capabilities'

let isRefreshing = false
let isLoggingOut = false
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (error?: any) => void
}> = []

export function performForcedLogout() {
  if (isLoggingOut) return
  isLoggingOut = true
  useAuthStore.getState().clearAuth()
  if (typeof window !== 'undefined') {
    window.location.replace('/login')
  }
  // Reset so next 401 can trigger again if user logs in again
  setTimeout(() => { isLoggingOut = false }, 1000)
}

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

/** Client-side only: read tokens from persisted auth-storage when store not yet rehydrated (e.g. after nav). */
function getPersistedAuthState(): { accessToken?: string | null; refreshToken?: string | null } {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem('auth-storage')
    if (!raw) return {}
    const parsed = JSON.parse(raw) as { state?: { accessToken?: string | null; refreshToken?: string | null } }
    return parsed?.state ?? {}
  } catch {
    return {}
  }
}

function getRefreshTokenFromPersistedStorage(): string | null {
  const token = getPersistedAuthState().refreshToken
  return token && typeof token === 'string' ? token : null
}

function getAccessTokenFromPersistedStorage(): string | null {
  const token = getPersistedAuthState().accessToken
  return token && typeof token === 'string' ? token : null
}

// API base URL - dinamik olarak belirle
// Client-side'da window.location'dan, server-side'da env'den al
const getBaseURL = (): string => {
  // Helper: URL'de protocol yoksa ekle
  const ensureProtocol = (url: string): string => {
    if (!url) return url
    // Eğer zaten http:// veya https:// ile başlıyorsa olduğu gibi döndür
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    // Protocol yoksa https:// ekle (production için)
    return `https://${url}`
  }

  // Server-side (SSR)
  if (typeof window === 'undefined') {
    const ssrURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
    return ensureProtocol(ssrURL)
  }
  
  // Client-side - dinamik URL belirleme
  const envURL = process.env.NEXT_PUBLIC_API_URL
  const currentHost = window.location.hostname
  const isHTTPS = window.location.protocol === 'https:'
  
  // ✅ Production feellink.io: her zaman aynı backend (env build'ta yanlış olsa da çalışsın)
  if (currentHost === 'feellink.io' || currentHost.includes('feellink.io')) {
    return 'https://feellink-backend.vercel.app'
  }
  
  // ✅ Vercel preview: aynı backend
  if (currentHost.includes('vercel.app')) {
    return 'https://feellink-backend.vercel.app'
  }
  
  // Eğer env'de IP adresi varsa ve şu anda localhost'tan erişiliyorsa, localhost kullan
  if (envURL && envURL.includes('192.168.')) {
    // Eğer localhost veya 127.0.0.1'den erişiliyorsa, localhost backend kullan
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      return 'http://localhost:3002'
    }
    // Mobil cihazdan erişiliyorsa, IP adresini kullan (http:// olarak)
    return envURL.startsWith('http') ? envURL : `http://${envURL}`
  }
  
  // Localhost / diğer: env varsa kullan, yoksa backend localhost:3002
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    return envURL ? ensureProtocol(envURL) : 'http://localhost:3002'
  }
  const defaultURL = envURL || 'http://localhost:3002'
  return ensureProtocol(defaultURL)
}

const baseURL = getBaseURL()

if (!baseURL) {
  console.error('NEXT_PUBLIC_API_URL tanımlı değil!')
}

// getApiBaseURL fonksiyonunu export et (socket.ts ve diğer dosyalar için)
export const getApiBaseURL = (): string => {
  return baseURL
}

if (typeof window === 'undefined') {
  console.info('[api] base URL:', baseURL)
} else {
  console.info('[api] base URL (client):', baseURL)
}

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30000, // ⚡ 30 saniye (optimistic UI ile kullanıcı beklemez)
  maxContentLength: 100 * 1024 * 1024, // 100MB
  maxBodyLength: 100 * 1024 * 1024, // 100MB
})

// Add token to requests + client-side'da her istekte güncel base URL kullan (SSR'da yanlış baseURL olmasın)
// Store rehydrate olmadan (navigasyon sonrası) token için localStorage, yoksa persist yedeği kullan; istek token'sız giderse 401 → forced logout
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    config.baseURL = getBaseURL()
  }
  const state = useAuthStore.getState()
  const token =
    state.accessToken ??
    (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null) ??
    (typeof window !== 'undefined' ? getAccessTokenFromPersistedStorage() : null)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle empty responses and JSON parse errors
api.interceptors.response.use(
  (response) => {
    // Boş response'ları güvenli bir şekilde handle et
    // Axios bazen boş string veya null döndürebilir
    if (response.data === '' || response.data === null || response.data === undefined) {
      // DELETE, PATCH gibi istekler için varsayılan success response
      if (['delete', 'patch', 'post', 'put'].includes(response.config?.method?.toLowerCase() || '')) {
        response.data = { success: true }
      } else {
        response.data = {}
      }
    }
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Network/Connection errors - daha anlaşılır hata mesajı ver
    if (!error.response) {
      // Network hatası (bağlantı yok, timeout, vs.)
      // Sadece development modunda logla
      const baseURL = (originalRequest?.baseURL ?? getBaseURL?.() ?? '') as string
      if (process.env.NODE_ENV === 'development') {
        console.warn('Network error (backend erişilemiyor):', {
          code: error.code,
          message: error.message,
          url: originalRequest?.url,
          baseURL,
        })
      }

      const networkError: AxiosError = {
        ...error,
        response: {
          data: {
            message: error.code === 'ECONNABORTED' || error.message?.includes('timeout')
              ? 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.'
              : error.code === 'ERR_NETWORK' || error.message === 'Network Error'
              ? 'Sunucuya ulaşılamadı. Backend adresini (NEXT_PUBLIC_API_URL) kontrol edin.'
              : 'Bağlantı hatası oluştu. Lütfen tekrar deneyin.',
          },
          status: 0,
          statusText: 'Network Error',
          headers: {},
          config: error.config || {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
      }
      return Promise.reject(networkError)
    }

    // 403 (e.g. ACCOUNT_SUSPENDED from /auth/me) → forced logout so user is sent to login
    if (error.response?.status === 403) {
      const url = (originalRequest?.url ?? '') as string
      const data = error.response?.data as { message?: string } | undefined
      if (url.includes('/auth/me') || data?.message === 'ACCOUNT_SUSPENDED') {
        performForcedLogout()
      }
      return Promise.reject(error)
    }

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return api(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      const state = useAuthStore.getState()
      const refreshToken = state.refreshToken ?? getRefreshTokenFromPersistedStorage()

      if (!refreshToken) {
        performForcedLogout()
        return Promise.reject(error)
      }

      try {
        // api instance'ını kullan (baseURL zaten ayarlı)
        const response = await api.post(
          '/auth/refresh',
          { refreshToken }
        )

        const { accessToken, refreshToken: newRefreshToken, user, capabilities, sidebar } = response.data as {
          accessToken: string
          refreshToken: string
          user: any
          capabilities?: CapabilitySummary
          sidebar?: SidebarVisibility
        }

        // Update tokens and user in store
        useAuthStore.getState().setAuth(user, accessToken, newRefreshToken, capabilities ?? null, sidebar ?? null)

        // Update authorization header
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
        }

        processQueue(null, accessToken)

        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        performForcedLogout()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // JSON parse hatası durumunda (boş response veya invalid JSON)
    if (error.message?.includes('JSON') || error.message?.includes('Unexpected end')) {
      // Eğer status başarılıysa (200-299), response'u success olarak kabul et
      if (error.response && error.response.status >= 200 && error.response.status < 300) {
        return Promise.resolve({
          ...error.response,
          data: { success: true },
        })
      }
    }

    return Promise.reject(error)
  }
)

// Utility function to extract user-friendly error messages
export const getErrorMessage = (error: any): string => {
  console.log('🔍 [getErrorMessage] Analyzing error:', {
    hasResponse: !!error?.response,
    status: error?.response?.status,
    message: error?.message,
    code: error?.code,
    backendMessage: error?.response?.data?.message,
  });

  // Network/Connection errors
  if (!error?.response) {
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return 'İstek zaman aşımına uğradı. Dosya çok büyük olabilir, lütfen tekrar deneyin.'
    }
    if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
      return 'Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin veya tekrar deneyin.'
    }
    return 'Bağlantı hatası oluştu. Lütfen tekrar deneyin.'
  }

  // Backend error responses
  const responseData = error.response?.data
  if (!responseData) {
    return 'Bir hata oluştu. Lütfen tekrar deneyin.'
  }

  // Handle NestJS format: message can be string, array of strings, or nested object
  const msg = responseData?.message
  let errorMessage: string | null = null
  if (Array.isArray(msg)) {
    errorMessage = msg.filter(Boolean).join('. ')
  } else if (typeof msg === 'string') {
    errorMessage = msg
  } else if (msg && typeof msg === 'object' && typeof (msg as any).message === 'string') {
    errorMessage = (msg as any).message
  }
  const finalMessage = errorMessage ?? responseData?.error ?? 'Bir hata oluştu. Lütfen tekrar deneyin.'

  // Teknik / iç sistem mesajları kullanıcıya gösterme (güvenlik ve UX)
  const technicalTerms = [
    'internet server error',
    'internal server error',
    'DATABASE_URL',
    'MongoDB',
    'Vercel',
    'URL-encode',
    'connection string',
    'SCRAM',
    'authentication failed',
    'bad auth',
    'ConnectorError',
    'Prisma',
    'env',
    'Environment variable',
  ]
  const isTechnical = technicalTerms.some(term =>
    finalMessage.toLowerCase().includes(term.toLowerCase()),
  )
  if (isTechnical) {
    return 'Kayıt işlemi şu anda tamamlanamıyor. Lütfen daha sonra tekrar deneyin.'
  }

  // Eski genel filtre
  const unwantedMessages = [
    'internet server error',
    'Internet Server Error',
    'INTERNET SERVER ERROR',
    'Internal Server Error',
    'internal server error',
  ]
  if (unwantedMessages.some(m => finalMessage.toLowerCase().includes(m.toLowerCase()))) {
    return 'Bir hata oluştu. Lütfen tekrar deneyin.'
  }

  return finalMessage
}

export { api }
export default api

