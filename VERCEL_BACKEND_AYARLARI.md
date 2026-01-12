# Vercel Backend Projesi - Dashboard Ayarları

## ⚠️ ÖNEMLİ: Vercel Dashboard'da Yapılması Gerekenler

Backend klasörünü Vercel'de ayrı bir proje olarak açtıysan, şu ayarları yap:

### 1. Project Settings → General

**Root Directory:** `backend` olarak ayarla
- Vercel Dashboard → Settings → General
- "Root Directory" bölümünde `backend` yaz
- Save

### 2. Project Settings → Build & Development Settings

**Framework Preset:** `Other`
**Build Command:** `pnpm install && pnpm prisma generate && pnpm build`
**Output Directory:** `dist`
**Install Command:** `pnpm install`

### 3. Environment Variables (KRİTİK!)

Settings → Environment Variables → Add New

**Production Environment için ekle:**

1. **DATABASE_URL**
   - Value: PostgreSQL connection string
   - Örnek: `postgresql://user:password@host:5432/dbname?schema=public`
   - Environment: Production ✅

2. **JWT_SECRET**
   - Value: Güçlü random string (en az 32 karakter)
   - Örnek: `your-super-secret-jwt-key-change-in-production-123456789`
   - Environment: Production ✅

3. **NODE_ENV**
   - Value: `production`
   - Environment: Production ✅

4. **FRONTEND_URL**
   - Value: `https://www.feellink.io`
   - Environment: Production ✅

5. **PORT** (opsiyonel)
   - Value: `3002`
   - Environment: Production ✅

### 4. Deploy Ayarları

**Deployments** sekmesinde:
- En son deployment'ı kontrol et
- Build Logs'u aç
- Hata var mı kontrol et

## 🔍 Sorun Giderme

### Build Hatası: "Cannot find module"

**Çözüm:**
1. Build Command'da `pnpm prisma generate` var mı kontrol et
2. `package.json`'da `prisma:generate` script var mı kontrol et
3. Vercel Dashboard → Build Logs → Hata mesajını kontrol et

### Runtime Hatası: "500 Internal Server Error"

**Çözüm:**
1. Vercel Dashboard → Logs → Runtime Logs
2. Hata mesajını kontrol et
3. Environment Variables doğru mu kontrol et
4. `DATABASE_URL` bağlantısı çalışıyor mu test et

### CORS Hatası

**Çözüm:**
1. `FRONTEND_URL` environment variable doğru mu?
2. `api/index.ts` dosyasında CORS ayarlarını kontrol et
3. Frontend URL'i `allowedOrigins` listesinde mi?

## ✅ Başarı Kriterleri

1. ✅ Build başarılı (Build Logs'da yeşil ✅)
2. ✅ Health check çalışıyor: `https://feellink-backend.vercel.app/health`
3. ✅ Login endpoint çalışıyor: `POST https://feellink-backend.vercel.app/auth/login`
4. ✅ Frontend'den login başarılı

## 🚀 Test Komutları

### Health Check
```bash
curl https://feellink-backend.vercel.app/health
```
Beklenen: `{"status":"ok"}`

### Login Test
```bash
curl -X POST https://feellink-backend.vercel.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername":"test@example.com","password":"test123"}'
```

## 📝 Notlar

- Vercel serverless functions kullanır, bu yüzden `app.listen()` çağrılmaz
- `api/index.ts` dosyası Vercel'in serverless handler'ıdır
- Build sırasında `dist/` klasörü oluşur
- Prisma client build sırasında generate edilir
