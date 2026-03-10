# 404 DEPLOYMENT_NOT_FOUND – Ne Yapmalı?

## 1. Doğru URL

- **Yanlış:** `https://feelink-backend.vercel.app` (tek e)
- **Doğru:** `https://feellink-backend.vercel.app` (çift e)

Önce doğru adresi dene.

---

## 2. Deployment durumu

Vercel → **feellink-backend** → **Deployments**

| Durum | Ne yap |
|-------|--------|
| **Ready** (yeşil) | Doğru URL ile (`feellink-backend.vercel.app`) tekrar dene. |
| **Building** | 2–3 dakika bekle, sonra sayfayı yenile. |
| **Failed** / **Error** (kırmızı) | Deployment’a tıkla → **Building** veya **Logs** → hata mesajını kopyala. Genelde: `DATABASE_URL` eksik, `npm run build` hatası, Prisma hatası. |

---

## 3. Sık build hataları

- **DATABASE_URL** yok → Settings → Environment Variables → ekle (MongoDB connection string).
- **JWT_SECRET** yok → ekle.
- **Prisma / Node modül hatası** → Vercel’de **Node.js Version** (Settings → General) 18 veya 20 olsun.

Build log’taki tam hata satırını paylaşırsan bir sonraki adım netleşir.
