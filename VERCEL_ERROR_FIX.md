# 🔧 Vercel Internal Server Error - Çözüm Kılavuzu

## ❌ Sorun
Vercel'de deploy sonrası "Internal Server Error" hatası alınıyor.

## ✅ Çözüm Adımları

### 1. Environment Variable Kontrolü

**Vercel Dashboard → Settings → Environment Variables**

**ZORUNLU Variable:**
```
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

**Kontrol:**
- ✅ Variable adı tam olarak `NEXT_PUBLIC_API_URL` olmalı (büyük/küçük harf önemli)
- ✅ Value backend URL'iniz olmalı (örn: `https://api.feellink.com`)
- ✅ Environment seçenekleri: **Production**, **Preview**, **Development** hepsi için eklenmeli

### 2. Backend URL Formatı

**Doğru:**
```
https://your-app.railway.app
https://your-app.onrender.com
https://api.feellink.com
```

**Yanlış:**
```
http://localhost:3002
http://192.168.1.6:3002
backend-url.com (http/https eksik)
```

### 3. Variable Ekleme Adımları

1. Vercel Dashboard → Projenizi seçin
2. **Settings** → **Environment Variables**
3. **Add New** butonuna tıklayın
4. **Key:** `NEXT_PUBLIC_API_URL`
5. **Value:** Backend URL'iniz (örn: `https://your-app.railway.app`)
6. **Environment:** 
   - ✅ Production
   - ✅ Preview
   - ✅ Development
7. **Save**

### 4. Redeploy

Environment variable ekledikten sonra:
1. **Deployments** sekmesine gidin
2. Son deployment'ın yanındaki **⋮** (üç nokta) menüsüne tıklayın
3. **Redeploy** seçin
4. Build tamamlanana kadar bekleyin

### 5. Backend CORS Kontrolü

Backend'inizin CORS ayarlarında Vercel URL'inizi ekleyin:

**Backend (NestJS) - `main.ts`:**
```typescript
const allowedOrigins = [
  'https://your-app.vercel.app',
  'https://your-app-git-main.vercel.app', // Preview deployments için
  // ... diğer origin'ler
]
```

### 6. Backend Health Check

Backend'inizin çalıştığını kontrol edin:
```bash
curl https://your-backend-url.com/health
```

**Beklenen yanıt:**
```json
{"status":"ok","timestamp":"...","service":"Feellink Backend API"}
```

## 🔍 Debug

### Vercel Logları

1. Vercel Dashboard → **Deployments**
2. Son deployment'a tıklayın
3. **Functions** sekmesine gidin
4. Hata loglarını kontrol edin

### Tarayıcı Console

1. Tarayıcıda F12 → **Console**
2. API çağrılarındaki hataları kontrol edin
3. Network sekmesinde failed request'leri kontrol edin

### Olası Hata Mesajları

**"NEXT_PUBLIC_API_URL is not defined":**
- ✅ Environment variable'ı ekleyin
- ✅ Redeploy yapın

**"Network Error" veya "CORS Error":**
- ✅ Backend CORS ayarlarını kontrol edin
- ✅ Vercel URL'ini backend CORS'a ekleyin

**"502 Bad Gateway":**
- ✅ Backend'inizin çalıştığını kontrol edin
- ✅ Backend URL'inin doğru olduğunu kontrol edin

## ✅ Test

Deploy sonrası test edin:

1. Ana sayfa açılıyor mu?
2. Login sayfası açılıyor mu?
3. API çağrıları çalışıyor mu? (Network sekmesinde kontrol edin)

## 📞 Hala Sorun Var?

1. Vercel loglarını kontrol edin
2. Backend loglarını kontrol edin
3. Environment variable'ların doğru olduğunu tekrar kontrol edin
4. Redeploy yapın

