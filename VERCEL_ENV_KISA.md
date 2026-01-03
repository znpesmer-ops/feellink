# 🚀 Vercel Deployment - Environment Variables (Kısa Liste)

## ✅ FRONTEND (Vercel'de) - TEK ZORUNLU

Vercel Dashboard → Settings → Environment Variables → Add New

```
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

**Açıklama:** Backend API URL'inizi buraya yazın (örn: `https://api.feellink.com` veya Railway/Render URL'iniz)

---

## ⚠️ BACKEND (Vercel'de değil!)

**NOT:** Backend Vercel'de çalışmaz! Backend'i ayrı bir hosting'e koymalısınız (Railway, Render, DigitalOcean, vb.)

Backend için environment variables o hosting platformuna eklenmeli:

### ZORUNLU:

```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=15m
FRONTEND_URL=https://your-vercel-url.vercel.app
NODE_ENV=production
PORT=3002
```

### OPSİYONEL (Kullanıyorsanız):

```
# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379

# MinIO/S3
MINIO_ENDPOINT=your-minio-endpoint
MINIO_PORT=9000
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=your-key
MINIO_SECRET_KEY=your-secret
MINIO_BUCKET_NAME=instagram-uploads

# Meilisearch
MEILISEARCH_HOST=https://your-meilisearch-host
MEILISEARCH_API_KEY=your-api-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=info@feellink.io
MAIL_FROM_NAME=feellink
```

---

## 📝 Vercel'de Ekleme Adımları

1. Vercel Dashboard → Projenizi seçin
2. Settings → Environment Variables
3. "Add New" tıklayın
4. **Key:** `NEXT_PUBLIC_API_URL`
5. **Value:** Backend URL'iniz (örn: `https://api.feellink.com`)
6. **Environment:** Production ✅ (Preview ve Development de seçebilirsiniz)
7. Save

---

## 🔗 Detaylı Liste

Tüm environment variable'ların detaylı açıklamaları için: `VERCEL_ENV_VARIABLES.md` dosyasına bakın.


