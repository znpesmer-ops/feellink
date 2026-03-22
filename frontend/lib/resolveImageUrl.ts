import { getAbsoluteBackendBaseUrl } from './api'

const FALLBACK_AVATAR = '/icons/default-user.svg' // ✅ Mevcut dosyayı kullan

// Backend URL - görseller backend'te (3002 portunda) bulunuyor
// Mutlak backend kökü (axios same-origin proxy ile karışmaz)
const getBackendUrl = (): string => {
  // 1. NEXT_PUBLIC_BACKEND_URL varsa onu kullan
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL
  }
  
  // 2. Production'da (Vercel) window.location'dan backend URL'i belirle
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const protocol = window.location.protocol
    
    // Production domain'deyse (feellink.io gibi), backend URL'i otomatik belirle
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.startsWith('192.168.')) {
      // Production'da NEXT_PUBLIC_API_URL kullan (backend ile aynı domain olmalı)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      if (apiUrl) {
        return apiUrl
      }
      
      // Eğer env yoksa, aynı domain'de backend olduğunu varsay (örnek: api.feellink.io veya backend.feellink.io)
      // Veya aynı domain'de farklı path (örnek: feellink.io/api)
    }
  }

  // 3. Mutlak backend kökü (axios /api-proxy ile karışmaz)
  return getAbsoluteBackendBaseUrl()
}

const BACKEND_URL = getBackendUrl()

/**
 * Resolves image URLs for mobile compatibility
 * Backend görselleri 3002 portunda, frontend 3000 portunda
 * Bu yüzden görselleri backend URL'i ile birleştirmeliyiz
 * 
 * @param url - Image URL from backend (can be full URL or relative path)
 * @returns Resolved URL that works on both desktop and mobile
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url || url.trim() === '') return FALLBACK_AVATAR

  const trimmedUrl = url.trim()

  // ✅ KRİTİK: Absolute URL ise (http:// veya https:// ile başlıyorsa) kontrol et
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    // Absolute URL ise - doğru domain'de mi kontrol et
    try {
      const urlObj = new URL(trimmedUrl)
      const backendHost = new URL(BACKEND_URL).hostname
      
      // ✅ Eğer URL zaten doğru backend domain'inde ise path'i kontrol et
      if (urlObj.hostname === backendHost) {
        // ⚠️ KRİTİK: /static/ path'ini /instagram-uploads/ ile değiştir (Backend'de sadece /instagram-uploads/ endpoint'i var)
        let path = urlObj.pathname
        if (path.startsWith('/static/')) {
          path = path.replace('/static/', '/instagram-uploads/')
          return `${urlObj.protocol}//${urlObj.hostname}${path}${urlObj.search}`
        }
        return trimmedUrl
      }
      
      // ✅ Eğer URL localhost/local IP içeriyorsa, path'i çıkar ve backend URL ile birleştir
      if (
        urlObj.hostname === 'localhost' ||
        urlObj.hostname === '127.0.0.1' ||
        urlObj.hostname.startsWith('192.168.') ||
        urlObj.hostname.startsWith('10.') ||
        urlObj.hostname.startsWith('172.') ||
        urlObj.hostname.includes('.mycloudflare.com') ||
        (urlObj.hostname.includes('.trycloudflare.com') && urlObj.hostname !== backendHost)
      ) {
        // Path ve query string'i koru, sadece domain'i değiştir
        return `${BACKEND_URL}${urlObj.pathname}${urlObj.search}`
      }
      
      // ✅ Production'da localhost/local IP içeren URL'leri backend URL ile değiştir
      if (typeof window !== 'undefined') {
        const currentHost = window.location.hostname
        if (currentHost !== 'localhost' && currentHost !== '127.0.0.1' && !currentHost.startsWith('192.168.')) {
          if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1' || urlObj.hostname.startsWith('192.168.')) {
            return `${BACKEND_URL}${urlObj.pathname}${urlObj.search}`
          }
        }
      }
      
      // ✅ Diğer external URL'ler (CDN vs.) için olduğu gibi döndür
      return trimmedUrl
    } catch {
      // URL parse edilemezse, eski Cloudflare URL'si kontrolü yap
      if (trimmedUrl.includes('.mycloudflare.com') || 
          (trimmedUrl.includes('.trycloudflare.com') && !trimmedUrl.includes(new URL(BACKEND_URL).hostname))) {
        const pathMatch = trimmedUrl.match(/https?:\/\/[^\/]+(\/.*)/)
        if (pathMatch) {
          return `${BACKEND_URL}${pathMatch[1]}`
        }
      }
      return trimmedUrl
    }
  }

  // ✅ KRİTİK: Relative path ise (/, /static/, vs.) mutlaka backend URL ile birleştir
  // Backend'den gelen URL'ler genellikle şu formattadır: /static/posts/xxx.jpg, /static/avatars/xxx.jpg
  let cleanPath = trimmedUrl.startsWith('/') ? trimmedUrl : `/${trimmedUrl}`
  
  // ⚠️ BACKEND PATH DÜZELTME: /static/ → /instagram-uploads/ (Backend'de sadece /instagram-uploads/ endpoint'i var)
  if (cleanPath.startsWith('/static/')) {
    cleanPath = cleanPath.replace('/static/', '/instagram-uploads/')
  }
  
  return `${BACKEND_URL}${cleanPath}`
}

/**
 * ✅ YENİ: Basit media URL resolver - sadece relative path'leri backend URL ile birleştirir
 * Bu fonksiyon resolveImageUrl'den daha basit ve özellikle /static/ path'leri için tasarlanmıştır
 */
export function resolveMediaUrl(url?: string | null): string | null {
  if (!url || url.trim() === '') return null

  const trimmedUrl = url.trim()

  // Absolute URL ise aynen kullan
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    // Doğru domain'de mi kontrol et
    try {
      const urlObj = new URL(trimmedUrl)
      const backendHost = new URL(BACKEND_URL).hostname
      // Zaten doğru domain'de ise path'i kontrol et
      if (urlObj.hostname === backendHost) {
        // ⚠️ KRİTİK: /static/ path'ini /instagram-uploads/ ile değiştir (Backend'de sadece /instagram-uploads/ endpoint'i var)
        let path = urlObj.pathname
        if (path.startsWith('/static/')) {
          path = path.replace('/static/', '/instagram-uploads/')
          return `${urlObj.protocol}//${urlObj.hostname}${path}${urlObj.search}`
        }
        return trimmedUrl
      }
      // Localhost/local IP ise path'i çıkar ve backend URL ile birleştir
      if (
        urlObj.hostname === 'localhost' ||
        urlObj.hostname === '127.0.0.1' ||
        urlObj.hostname.startsWith('192.168.')
      ) {
        return `${BACKEND_URL}${urlObj.pathname}${urlObj.search}`
      }
    } catch {
      // URL parse edilemezse olduğu gibi döndür
      return trimmedUrl
    }
    return trimmedUrl
  }

  // ✅ KRİTİK: Relative path ise backend URL ile birleştir
  let cleanPath = trimmedUrl.startsWith('/') ? trimmedUrl : `/${trimmedUrl}`
  
  // ⚠️ BACKEND PATH DÜZELTME: /static/ → /instagram-uploads/ (Backend'de sadece /instagram-uploads/ endpoint'i var)
  if (cleanPath.startsWith('/static/')) {
    cleanPath = cleanPath.replace('/static/', '/instagram-uploads/')
  }
  
  return `${BACKEND_URL}${cleanPath}`
}

/**
 * ✅ ESKİ FONKSİYON: Geriye uyumluluk için korunuyor
 * Artık resolveImageUrl yerine resolveMediaUrl kullanılmalı
 */
export function resolveImageUrl_OLD(url?: string | null): string {
  if (!url || url.trim() === '') return FALLBACK_AVATAR

  const trimmedUrl = url.trim()

  // If it's already a full URL with localhost, replace with BACKEND_URL
  if (trimmedUrl.startsWith('http://localhost') || trimmedUrl.startsWith('https://localhost')) {
    return trimmedUrl.replace(/http(s?):\/\/localhost:\d+/, BACKEND_URL)
  }

  // If it's already a full URL with 127.0.0.1, replace with BACKEND_URL
  if (trimmedUrl.startsWith('http://127.0.0.1') || trimmedUrl.startsWith('https://127.0.0.1')) {
    return trimmedUrl.replace(/http(s?):\/\/127\.0\.0\.1:\d+/, BACKEND_URL)
  }

  // If it's already a full URL with 192.168.1.38 but wrong port, fix it
  if (trimmedUrl.startsWith('http://192.168.1.38:3000') || trimmedUrl.startsWith('http://192.168.1.38:3001')) {
    return trimmedUrl.replace(/http:\/\/192\.168\.1\.38:(3000|3001)/, BACKEND_URL)
  }

  // If it's already a full URL with 192.168.1.38:3002, replace with BACKEND_URL (Cloudflare tunnel)
  if (trimmedUrl.includes('192.168.1.38:3002') || trimmedUrl.includes('localhost:3002')) {
    // Extract path from URL
    try {
      const urlObj = new URL(trimmedUrl)
      return `${BACKEND_URL}${urlObj.pathname}${urlObj.search}`
    } catch {
      // If URL parsing fails, try simple replace
      return trimmedUrl.replace(/http:\/\/192\.168\.1\.38:3002/, BACKEND_URL)
                       .replace(/http:\/\/localhost:3002/, BACKEND_URL)
    }
  }

  // If it's already a full URL
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    // Backend hostname'i önceden hesapla (catch bloğunda kullanmak için)
    let backendHost: string
    try {
      backendHost = new URL(BACKEND_URL).hostname
    } catch {
      backendHost = ''
    }
    
    try {
      const urlObj = new URL(trimmedUrl)
      const urlHost = urlObj.hostname
      
      // Eğer URL eski bir Cloudflare URL'si ise (mycloudflare.com veya farklı trycloudflare.com domaini)
      // veya local IP/localhost ise, path'i çıkar ve yeni BACKEND_URL ile birleştir
      if (
        urlHost.includes('.mycloudflare.com') || // Eski Cloudflare URL'leri
        (urlHost.includes('.trycloudflare.com') && urlHost !== backendHost) || // Farklı Cloudflare domaini
        urlHost === 'localhost' ||
        urlHost === '127.0.0.1' ||
        urlHost.startsWith('192.168.') ||
        urlHost.startsWith('10.') ||
        urlHost.startsWith('172.')
      ) {
        // Path ve query string'i koru, sadece domain'i değiştir
        return `${BACKEND_URL}${urlObj.pathname}${urlObj.search}`
      }
      
      // Eğer URL zaten doğru BACKEND_URL ile başlıyorsa, olduğu gibi döndür
      if (urlHost === backendHost) {
        return trimmedUrl
      }
      
      // Production'da (Vercel) eğer URL localhost/local IP içeriyorsa, backend URL ile değiştir
      if (typeof window !== 'undefined') {
        const currentHost = window.location.hostname
        // Production domain'deyse ve URL localhost/local IP içeriyorsa
        if (currentHost !== 'localhost' && currentHost !== '127.0.0.1' && !currentHost.startsWith('192.168.')) {
          if (urlHost === 'localhost' || urlHost === '127.0.0.1' || urlHost.startsWith('192.168.')) {
            return `${BACKEND_URL}${urlObj.pathname}${urlObj.search}`
          }
        }
      }
      
      // Diğer external URL'ler (örneğin CDN, başka servisler) için olduğu gibi döndür
      return trimmedUrl
    } catch {
      // URL parse edilemezse, eski mantığı kullan
      // Eğer eski Cloudflare URL'si içeriyorsa, path'i çıkar ve yeni URL ile birleştir
      if (trimmedUrl.includes('.mycloudflare.com') || 
          (trimmedUrl.includes('.trycloudflare.com') && backendHost && !trimmedUrl.includes(backendHost))) {
        // Path'i bul (domain'den sonraki kısım)
        const pathMatch = trimmedUrl.match(/https?:\/\/[^\/]+(\/.*)/)
        if (pathMatch) {
          return `${BACKEND_URL}${pathMatch[1]}`
        }
      }
      return trimmedUrl
    }
  }

  // If it's a relative path (e.g., /instagram-uploads/posts/...), prepend BACKEND_URL
  // Ensure path starts with /
  const cleanPath = trimmedUrl.startsWith('/') ? trimmedUrl : `/${trimmedUrl}`
  return `${BACKEND_URL}${cleanPath}`
}

