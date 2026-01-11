# Backend'i Vercel'de Deploy Etme

## ⚠️ Önemli Not

Vercel **serverless functions** için tasarlandı. NestJS gibi **long-running backend** uygulamaları için ideal değil. Ancak deneyebiliriz.

**Daha iyi alternatif:** Railway veya Render (önerilir)

## 🚀 Vercel'de Backend Deploy (Deneme)

### Yöntem 1: Vercel Dashboard (Kolay)

1. **Vercel Dashboard'a git**
   - https://vercel.com/dashboard
   - "Add New..." → "Project"

2. **GitHub Repo'yu Bağla**
   - `feellink` repo'sunu seç
   - "Import" tıkla

3. **Project Settings**
   - **Framework Preset:** Other
   - **Root Directory:** `backend` olarak ayarla
   - **Build Command:** `pnpm install && pnpm build`
   - **Output Directory:** `dist`
   - **Install Command:** `pnpm install`

4. **Environment Variables Ekle**
   ```
   DATABASE_URL=<PostgreSQL URL'i>
   JWT_SECRET=<güçlü-random-string>
   PORT=3002
   NODE_ENV=production
   FRONTEND_URL=https://www.feellink.io
   ```

5. **Deploy**
   - "Deploy" tıkla
   - Deploy tamamlandıktan sonra URL'i al

### Yöntem 2: Vercel CLI

```bash
# Vercel CLI yükle
npm i -g vercel

# Backend klasörüne git
cd backend

# Login
vercel login

# Deploy
vercel

# Production'a deploy
vercel --prod
```

## ⚠️ Vercel'de Backend Sorunları

1. **Serverless Functions:** NestJS long-running process gerektirir
2. **Socket.IO:** Vercel serverless'da çalışmayabilir
3. **Redis/PostgreSQL:** External servisler gerekir (Vercel'de yok)
4. **MinIO:** External servis gerekir

## ✅ Daha İyi Alternatif: Railway (Önerilir)

Railway NestJS için çok daha uygun:
- ✅ Long-running processes destekler
- ✅ PostgreSQL otomatik eklenir
- ✅ Redis eklenebilir
- ✅ Socket.IO çalışır
- ✅ Ücretsiz plan var

**Railway'de deploy için:** `RAILWAY_DEPLOY.md` dosyasına bak

## 🎯 Hızlı Karar

**Vercel'de denemek istiyorsan:**
- Yukarıdaki adımları takip et
- Ama sorunlar yaşarsan Railway'e geç

**Daha garantili çözüm:**
- Railway kullan (5 dakika)
- Detaylar: `RAILWAY_DEPLOY.md`
