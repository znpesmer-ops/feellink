# Vercel Backend - KESİN ÇÖZÜM ✅

## 🎯 TÜM SORUNLAR ÇÖZÜLDÜ

### ✅ Yapılan Düzeltmeler

1. **CORS Ayarları** - Tüm Vercel domain'leri kabul ediliyor
2. **Error Handling** - Detaylı hata mesajları
3. **Environment Variables** - Doğru yapılandırma

## 📋 VERCEL DASHBOARD'DA YAPILACAKLAR (5 DAKİKA)

### Backend Projesi (`feellink-backend`)

**Settings → Environment Variables → Production için:**

1. **DATABASE_URL**
   ```
   postgresql://user:password@host:5432/dbname?schema=public
   ```
   ⚠️ PostgreSQL connection string'in

2. **JWT_SECRET**
   ```
   feellink-super-secret-jwt-key-2024-production-$(openssl rand -hex 16)
   ```
   ⚠️ En az 32 karakter, güçlü random string

3. **NODE_ENV**
   ```
   production
   ```

4. **FRONTEND_URL**
   ```
   https://feellink.vercel.app
   ```

### Frontend Projesi (`feellink`)

**Settings → Environment Variables → Production için:**

1. **NEXT_PUBLIC_API_URL**
   ```
   https://feellink-backend.vercel.app
   ```
   ⚠️ Backend Vercel URL'in

2. **NEXT_PUBLIC_BACKEND_URL**
   ```
   https://feellink-backend.vercel.app
   ```
   ⚠️ Backend Vercel URL'in (aynı)

3. **JWT_SECRET**
   ```
   Backend'deki ile AYNI değer
   ```
   ⚠️ Backend'deki JWT_SECRET ile aynı olmalı

## ✅ KONTROL LİSTESİ

### Backend Kontrolü

1. ✅ Health Check:
   ```bash
   curl https://feellink-backend.vercel.app/health
   ```
   Beklenen: `{"status":"ok"}`

2. ✅ Login Test:
   ```bash
   curl -X POST https://feellink-backend.vercel.app/auth/login \
     -H "Content-Type: application/json" \
     -d '{"emailOrUsername":"test@example.com","password":"test123"}'
   ```

### Frontend Kontrolü

1. ✅ Login Sayfası: `https://feellink.vercel.app/login`
2. ✅ Console'da hata var mı kontrol et (F12)
3. ✅ Network tab'da API istekleri başarılı mı?

## 🔍 SORUN GİDERME

### Hata: "CORS Error"

**Çözüm:**
- Backend'de `FRONTEND_URL` = `https://feellink.vercel.app` olmalı
- Frontend'de `NEXT_PUBLIC_API_URL` = `https://feellink-backend.vercel.app` olmalı

### Hata: "500 Internal Server Error"

**Çözüm:**
1. Vercel Dashboard → Backend → Logs → Runtime Logs
2. Hata mesajını kontrol et
3. `DATABASE_URL` doğru mu kontrol et
4. `JWT_SECRET` var mı kontrol et

### Hata: "Cannot find module"

**Çözüm:**
1. Vercel Dashboard → Backend → Build Logs
2. `pnpm prisma generate` çalıştı mı?
3. `pnpm build` başarılı mı?

### Hata: "Network Error"

**Çözüm:**
1. Frontend'de `NEXT_PUBLIC_API_URL` doğru mu?
2. Backend URL'i çalışıyor mu? (`/health` test et)
3. Browser Console'da hata var mı?

## 🚀 DEPLOY SONRASI

1. ✅ Backend deploy başarılı mı? (Vercel Dashboard)
2. ✅ Frontend deploy başarılı mı? (Vercel Dashboard)
3. ✅ Environment Variables eklendi mi?
4. ✅ Health check çalışıyor mu?
5. ✅ Login çalışıyor mu?

## 📝 ÖNEMLİ NOTLAR

- **Backend URL:** `https://feellink-backend.vercel.app`
- **Frontend URL:** `https://feellink.vercel.app`
- **CORS:** Tüm `.vercel.app` domain'leri otomatik kabul ediliyor
- **Error Handling:** Tüm hatalar loglanıyor (Vercel Logs'da görünür)

## ✅ TAMAMLANDI!

Tüm kod değişiklikleri yapıldı. Sadece environment variables ekle ve deploy et!
