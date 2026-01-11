# Cloudflare Tunnel - Backend'i 5 Dakikada Aç (EN KOLAY)

## 🚀 Hızlı Başlangıç

### Adım 1: Cloudflare Tunnel Yükle

```bash
# macOS için
brew install cloudflare/cloudflare/cloudflared
```

### Adım 2: Backend'i Local'de Başlat

```bash
cd backend
pnpm install
pnpm start:prod
```

Backend `http://localhost:3002` adresinde çalışacak.

### Adım 3: Cloudflare Tunnel Başlat

**Yeni terminal penceresi aç:**

```bash
cloudflared tunnel --url http://localhost:3002
```

Bu sana bir URL verecek:
```
https://xxxxx.trycloudflare.com
```

### Adım 4: Vercel'de Kullan

1. Vercel Dashboard → Frontend Projesi → Settings → Environment Variables
2. `NEXT_PUBLIC_API_URL` = Cloudflare Tunnel URL'in (örn: `https://xxxxx.trycloudflare.com`)
3. `NEXT_PUBLIC_BACKEND_URL` = Aynı URL
4. Save ve Redeploy

## ✅ Tamamlandı!

Backend artık Cloudflare Tunnel üzerinden erişilebilir. Frontend Vercel'de, backend local'de çalışıyor.

## ⚠️ Notlar

- Backend local'de çalışırken tunnel açık olmalı
- Bilgisayarını kapatırsan tunnel kapanır (ama backend'i her zaman çalıştırabilirsin)
- Production için Railway veya Render daha iyi (7/24 çalışır)

## 🎯 Avantajlar

- ✅ 5 dakikada biter
- ✅ Build hatası yok
- ✅ Railway gibi karmaşık değil
- ✅ Hemen çalışır
