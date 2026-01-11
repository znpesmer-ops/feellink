# Backend'i Vercel'de Deploy Etme

## ⚠️ ÖNEMLİ UYARI

Vercel **serverless functions** için tasarlandı. NestJS gibi **long-running backend** uygulamaları için ideal değil. Ancak deneyebiliriz.

**Daha iyi alternatif:** Backend'i local'de çalıştırıp Cloudflare Tunnel ile expose etmek (5 dakika, çok kolay)

## 🚀 Vercel'de Backend Deploy (Deneme)

### Yöntem 1: Vercel Dashboard

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

**SORUN:** Vercel serverless functions kullanır, NestJS long-running process gerektirir. Muhtemelen çalışmayacak.

## ✅ DAHA İYİ ÇÖZÜM: Cloudflare Tunnel (5 Dakika)

Backend'i local'de çalıştırıp Cloudflare Tunnel ile expose et. Çok daha kolay ve garantili.

### Adım 1: Backend'i Local'de Başlat

```bash
cd backend
pnpm install
pnpm start:prod
```

Backend `http://localhost:3002` adresinde çalışacak.

### Adım 2: Cloudflare Tunnel Başlat

Yeni terminal'de:

```bash
# Cloudflare Tunnel yükle (ilk kez)
brew install cloudflare/cloudflare/cloudflared

# Tunnel başlat
cloudflared tunnel --url http://localhost:3002
```

Bu sana bir URL verecek (örn: `https://xxxxx.trycloudflare.com`)

### Adım 3: Vercel'de Kullan

Frontend projesinde (Vercel):
1. Settings → Environment Variables
2. `NEXT_PUBLIC_API_URL` = Cloudflare Tunnel URL'in
3. `NEXT_PUBLIC_BACKEND_URL` = Cloudflare Tunnel URL'in (aynı)
4. Save ve Redeploy

## 🎯 Hangi Yöntemi Seçmeliyim?

**Vercel'de backend:** ❌ Muhtemelen çalışmayacak (serverless uygun değil)

**Cloudflare Tunnel:** ✅ 5 dakika, garantili çalışır

**Railway:** ✅ Çalışır ama build hatası var (dashboard'dan düzelt gerekli)

## 💡 Öneri

**En kolay ve hızlı:** Cloudflare Tunnel kullan. Backend local'de çalışır, Cloudflare üzerinden dünyaya açılır. 5 dakikada biter.

Hangi yöntemi seçiyorsun?
