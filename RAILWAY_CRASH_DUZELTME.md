# Railway Backend Crash Düzeltme

## 🔴 Sorun: Service Crashed

Görüntüde görünen sorunlar:
1. ❌ Port yanlış: `8080` → `3002` olmalı
2. ⚠️ Environment variables eksik olabilir
3. ⚠️ Build command yanlış olabilir

## ✅ Düzeltme Adımları

### 1. Port'u Düzelt

Railway Dashboard → Service → Settings → Networking:

1. **"Enter the port your app is listening on"** alanını bul
2. `8080` yerine `3002` yaz
3. **"Generate Domain"** tıkla (veya mevcut domain'i güncelle)

### 2. Environment Variables Ekle

Railway Dashboard → Service → Variables sekmesine git:

**Şu değişkenleri ekle:**

```
DATABASE_URL=<PostgreSQL URL'i (Railway PostgreSQL'den al)>
JWT_SECRET=<güçlü-random-string>
PORT=3002
NODE_ENV=production
FRONTEND_URL=https://www.feellink.io
```

**JWT_SECRET oluştur:**
Terminal'de:
```bash
openssl rand -base64 32
```

**DATABASE_URL:**
- Railway dashboard → PostgreSQL service → Variables
- `DATABASE_URL` veya `POSTGRES_URL` değerini kopyala
- Backend service'in Variables'ına ekle

### 3. Build Command Kontrol Et

Railway Dashboard → Service → Settings → Build & Deploy:

**Build Command:**
```
pnpm install && pnpm build
```

**Start Command:**
```
pnpm start:prod
```

veya

```
node dist/main.js
```

### 4. Redeploy

1. Railway Dashboard → Service → Deployments
2. En son deployment'a tıkla
3. "Redeploy" butonuna tıkla
4. Veya yeni bir commit push et (otomatik redeploy)

## 🔍 Crash Log'larını Kontrol Et

Railway Dashboard → Service → Deployments → En son deployment → Logs:

Hata mesajlarını kontrol et:
- Database bağlantı hatası mı?
- Port hatası mı?
- Environment variable eksik mi?

## ✅ Doğru Ayarlar Özeti

**Settings:**
- Root Directory: `backend` ✅
- Port: `3002` (8080 değil!)
- Build Command: `pnpm install && pnpm build`
- Start Command: `pnpm start:prod`

**Variables:**
- `DATABASE_URL` (PostgreSQL'den)
- `JWT_SECRET` (güçlü random string)
- `PORT=3002`
- `NODE_ENV=production`
- `FRONTEND_URL=https://www.feellink.io`

## 🚀 Test

Deploy tamamlandıktan sonra:
1. Railway → Service → Settings → Domain'i kopyala
2. Tarayıcıda: `https://your-url.railway.app/api` aç
3. Swagger UI görünmeli ✅
