# Feellink Backend

**Vercel Project:** `feellink-backend`  
**Root Directory:** `backend` (Vercel Settings'te ayarlanmalı!)

## ⚠️ VERCEL AYARLARI

Bu proje Vercel'de **ayrı bir proje** olarak deploy edilmelidir:

1. Vercel Dashboard → `feellink-backend` projesi
2. Settings → General → **Root Directory:** `backend`
3. Save

## Build

```bash
npm install --legacy-peer-deps
npx prisma generate
npm run build
```

## Deploy

```bash
vercel --prod
```
