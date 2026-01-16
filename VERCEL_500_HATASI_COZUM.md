# Vercel 500 Hatası - Kesin Çözüm ✅

## ✅ Yapılan Düzeltmeler

1. **`backend/api/index.ts`** - Error handling ve module loading iyileştirildi
2. **`backend/vercel.json`** - Build command ve output directory eklendi

## 🚀 Şimdi Yapılacaklar

### 1. GitHub'a Push Yap

```bash
git push
```

Veya Cursor'dan Source Control panelinden "Push" yap.

### 2. Vercel Otomatik Deploy

Push sonrası Vercel otomatik deploy başlatır. Bekle ve deploy'u izle.

### 3. Environment Variables Kontrol Et

Vercel Dashboard → `feellink-backend` → Settings → Environment Variables

**MUTLAKA OLMALI:**
- ✅ `DATABASE_URL` - PostgreSQL connection string
- ✅ `JWT_SECRET` - Güçlü random string (en az 32 karakter)
- ✅ `NODE_ENV` = `production`
- ✅ `FRONTEND_URL` = `https://www.feellink.io`

### 4. Frontend Environment Variables

Vercel Dashboard → `feellink` (frontend) → Settings → Environment Variables

**MUTLAKA OLMALI:**
- ✅ `NEXT_PUBLIC_API_URL` = `https://feellink-backend.vercel.app`
- ✅ `NEXT_PUBLIC_BACKEND_URL` = `https://feellink-backend.vercel.app`
- ✅ `JWT_SECRET` = Backend'deki ile aynı

### 5. Deploy Sonrası Test

1. **Backend Health Check:**
   ```
   https://feellink-backend.vercel.app/health
   ```
   ✅ `{"status":"ok"}` dönmeli

2. **Backend Login Test:**
   ```
   POST https://feellink-backend.vercel.app/auth/login
   ```
   ✅ 200 OK dönmeli

3. **Frontend'den Login:**
   - `https://www.feellink.io/login` sayfasına git
   - Login yap
   - ✅ Hata olmamalı

## 🔍 Sorun Devam Ederse

### Runtime Logs Kontrol Et

Vercel Dashboard → `feellink-backend` → Logs → Runtime Logs

Hata mesajlarını kontrol et:
- ❌ "Cannot find module" → Build hatası
- ❌ "Database connection" → `DATABASE_URL` yanlış
- ❌ "CORS error" → `FRONTEND_URL` yanlış

### Build Logs Kontrol Et

Vercel Dashboard → `feellink-backend` → Deployments → En son deployment → Build Logs

Kontrol et:
- ✅ `pnpm install` başarılı mı?
- ✅ `pnpm build` başarılı mı?
- ✅ `api/index.ts` compile edildi mi?

## 🎯 Önemli Notlar

1. **Build Süreci:**
   - Vercel önce `pnpm install` çalıştırır
   - Sonra `pnpm build` (nest build)
   - Sonra `api/index.ts` compile edilir
   - `dist/` klasörü oluşur

2. **Module Loading:**
   - Önce `dist/` klasöründen yüklemeyi dener
   - Bulamazsa `src/` klasöründen yükler
   - Bu sayede hem dev hem production çalışır

3. **Error Handling:**
   - Tüm hatalar yakalanır ve 500 response döner
   - Console'a loglanır (Vercel Logs'da görünür)

## ✅ Başarı Kriterleri

- ✅ Backend deploy başarılı
- ✅ Health check çalışıyor
- ✅ Login endpoint çalışıyor
- ✅ Frontend'den login başarılı
- ✅ Hata mesajı yok

## 🚨 Hala Çalışmıyorsa

1. Vercel Dashboard → Runtime Logs → Hata mesajını kopyala
2. Build Logs → Hata varsa kopyala
3. Bana gönder, birlikte çözelim
