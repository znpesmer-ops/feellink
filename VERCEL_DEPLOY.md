# 🚀 Vercel Deployment Guide

## ✅ Durum
- ✅ Backend Build: BAŞARILI
- ✅ Frontend Build: TypeScript hataları düzeltildi
- ⚠️ Bazı prerender uyarıları var (production'da çalışacak)

## 📋 Vercel'de Yapılacak Ayarlar

### 1. GitHub Repo'yu Bağla
- Vercel Dashboard → New Project
- GitHub repo'yu seç: `feellink`
- Import Project

### 2. Project Settings

**Root Directory:**
```
frontend
```

**Build & Development Settings:**

**Framework Preset:**
```
Next.js
```

**Build Command:**
```
npm run build
```

**Output Directory:**
```
.next
```

**Install Command:**
```
npm install
```

**Root Directory:**
```
frontend
```

### 3. Environment Variables

Vercel Dashboard → Settings → Environment Variables → Add New

**ZORUNLU:**
```
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

**Örnek değerler:**
- Backend Railway'de ise: `https://your-app.railway.app`
- Backend Render'da ise: `https://your-app.onrender.com`
- Backend DigitalOcean'da ise: `https://your-app.digitalocean.app`

### 4. Deploy

- "Deploy" butonuna tıkla
- Build tamamlanana kadar bekle (2-3 dakika)
- ✅ Deploy başarılı!

---

## ⚠️ ÖNEMLİ NOTLAR

1. **Backend Vercel'de ÇALIŞMAZ!**
   - Backend'i ayrı bir platforma deploy etmelisiniz:
     - Railway.app (önerilen)
     - Render.com
     - DigitalOcean App Platform
     - Heroku
     - AWS/Google Cloud/Azure

2. **CORS Ayarları:**
   - Backend'inizin CORS ayarlarında Vercel URL'inizi ekleyin
   - Örnek: `https://feellink.vercel.app`

3. **Environment Variables:**
   - `NEXT_PUBLIC_API_URL` mutlaka eklenmeli
   - Production, Preview ve Development için ayrı ayrı eklenebilir

---

## 🐛 Sorun Giderme

**Build Hatası:**
- Root Directory'in `frontend` olduğundan emin ol
- `vercel.json` dosyası proje root'unda olmalı (frontend değil!)

**API Bağlantı Hatası:**
- `NEXT_PUBLIC_API_URL` doğru mu kontrol et
- Backend'inizin çalıştığından emin ol
- CORS ayarlarını kontrol et

**Prerender Uyarıları:**
- Bu uyarılar production'da sorun çıkarmaz
- `useSearchParams()` kullanan sayfalar client-side render edilir

---

## 📚 Daha Fazla Bilgi

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment

