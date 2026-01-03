# 🔐 Vercel Deployment - Environment Variables Listesi

## 📋 FRONTEND (Next.js) - Vercel Environment Variables

Vercel Dashboard → Project → Settings → Environment Variables

### ✅ ZORUNLU

```
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

**Açıklama:** Frontend'in backend API'sine bağlanması için. Production'da backend URL'inizi yazın.

---

## 📋 BACKEND (NestJS) - Environment Variables

**NOT:** Backend Vercel'de değil, ayrı bir hosting'de (VPS, Railway, Render, vb.) olacak. Backend için environment variables o hosting platformuna eklenmeli.

### ✅ ZORUNLU

```
# Database (PostgreSQL veya MongoDB)
DATABASE_URL=postgresql://user:password@host:port/database
# VEYA MongoDB için:
# DATABASE_URL=mongodb+srv://user:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_change_in_production_min_32_chars
JWT_EXPIRES_IN=15m

# Frontend URL (CORS için)
FRONTEND_URL=https://your-frontend-url.vercel.app

# Node Environment
NODE_ENV=production
PORT=3002
```

### ⚠️ OPSİYONEL (Özelliklere Göre)

#### Redis (Kullanıyorsanız)
```
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

#### MinIO / S3 (Media Storage)
```
MINIO_ENDPOINT=your-minio-endpoint.com
MINIO_PORT=9000
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET_NAME=instagram-uploads
# VEYA MinIO devre dışı bırakmak için:
MINIO_DISABLED=true
```

#### Meilisearch (Kullanıyorsanız)
```
MEILISEARCH_HOST=https://your-meilisearch-host.com
MEILISEARCH_API_KEY=your-meilisearch-api-key
```

#### Email (SMTP) - Mail göndermek için
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=info@feellink.io
MAIL_FROM_NAME=feellink
```

#### Stripe (Ödeme - Kullanıyorsanız)
```
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

#### Prisma Connection Tuning (Opsiyonel)
```
PRISMA_CONNECTION_LIMIT=10
PRISMA_POOL_TIMEOUT=0
PRISMA_DB_DISABLE_PREPARED_STATEMENTS=false
```

---

## 🎯 Vercel'de Sadece Frontend İçin

Vercel Dashboard → Project → Settings → Environment Variables

### Production Environment Variables:

```
NEXT_PUBLIC_API_URL=https://your-backend-production-url.com
```

### Preview Environment Variables (Opsiyonel):

```
NEXT_PUBLIC_API_URL=https://your-backend-staging-url.com
```

---

## 📝 Örnek Vercel Environment Variable Ekleme

1. Vercel Dashboard'a gidin
2. Projenizi seçin
3. Settings → Environment Variables
4. "Add New" butonuna tıklayın
5. Key: `NEXT_PUBLIC_API_URL`
6. Value: Backend URL'iniz (örn: `https://api.feellink.com`)
7. Environment: Production, Preview, Development (hepsini seçin)
8. Save

---

## ⚠️ ÖNEMLİ NOTLAR

1. **Backend Vercel'de değil!** Backend ayrı bir hosting'de olmalı (Railway, Render, DigitalOcean, vb.)
2. **NEXT_PUBLIC_** prefix'i: Frontend'de kullanılacak env variable'lar mutlaka `NEXT_PUBLIC_` ile başlamalı
3. **Güvenlik:** `JWT_SECRET`, `DATABASE_URL` gibi hassas bilgiler ASLA frontend env variable'larına eklenmemeli
4. **CORS:** Backend'de `FRONTEND_URL` env variable'ı Vercel URL'iniz olmalı

---

## 🔍 Hangi Environment Variable'ları Kullanıyorsunuz?

Projenizde aktif olarak kullanılan env variable'ları görmek için:
- Backend: `backend/env.example` dosyasına bakın
- Frontend: `frontend/lib/api.ts` dosyasında `process.env.NEXT_PUBLIC_API_URL` kullanılıyor


