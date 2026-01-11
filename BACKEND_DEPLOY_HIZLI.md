# Backend Deploy - Hızlı Rehber (5 Dakika)

## 🎯 En Kolay Yol: Railway (Önerilir)

### Adım 1: Railway Hesabı
1. https://railway.app → "Start a New Project"
2. GitHub ile giriş yap

### Adım 2: Backend Deploy
1. "Deploy from GitHub repo" seç
2. `feellink` repo'sunu seç
3. **Root Directory:** `backend` olarak ayarla
4. "Deploy" tıkla

### Adım 3: PostgreSQL Ekle
1. Railway dashboard → "New" → "Database" → "PostgreSQL"
2. Otomatik `DATABASE_URL` oluşturulur

### Adım 4: Environment Variables
Railway → Service → Variables:

```
DATABASE_URL=<Railway PostgreSQL URL'i (otomatik)>
JWT_SECRET=<güçlü-random-string>
PORT=3002
NODE_ENV=production
FRONTEND_URL=https://www.feellink.io
```

**JWT_SECRET oluştur:**
```bash
openssl rand -base64 32
```

### Adım 5: URL'i Al (Detaylı)

1. **Railway Dashboard'a git**
   - https://railway.app/dashboard
   - Backend service'ine tıkla

2. **Settings sekmesine git**
   - Sol menüden "Settings" tıkla

3. **Domain oluştur**
   - "Generate Domain" butonuna tıkla
   - Railway otomatik bir domain oluşturur
   - Örnek: `https://feellink-backend-production.up.railway.app`

4. **URL'i kopyala**
   - Oluşturulan URL'i kopyala
   - Bu URL backend'in URL'i!

**Alternatif:** Service'in ana sayfasında (Overview) URL görünür, oradan da kopyalayabilirsin.

**Test et:** Tarayıcıda `https://your-url.railway.app/api` aç - Swagger UI görünmeli ✅

### Adım 6: Vercel'de Kullan
Frontend projesinde (Vercel):
1. Settings → Environment Variables
2. `NEXT_PUBLIC_API_URL` = Railway URL'in
3. `NEXT_PUBLIC_BACKEND_URL` = Railway URL'in (aynı)
4. Save ve Redeploy

## ✅ Tamamlandı!

Backend artık Railway'de çalışıyor. URL'i Vercel'de kullan.
