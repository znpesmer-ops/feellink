# 🚀 Vercel Serverless API Setup - Feellink

## ✅ Tamamlanan İşler

### 1. Prisma Setup
- ✅ Prisma schema kopyalandı → `frontend/prisma/schema.prisma`
- ✅ Prisma client helper oluşturuldu → `frontend/app/api/lib/prisma.ts`

### 2. Auth API Routes
- ✅ `/api/auth/login` → POST
- ✅ `/api/auth/register` → POST  
- ✅ `/api/auth/me` → GET
- ✅ Auth helper → `frontend/app/api/lib/auth.ts` (JWT verification)

### 3. Posts API Routes
- ✅ `/api/posts` → GET (list posts)
- ✅ `/api/posts/[id]/like` → POST (like/unlike)
- ✅ `/api/posts/[id]/comments` → GET, POST (get comments, create comment)

### 4. Feed API Route
- ✅ `/api/feed` → GET (user's feed)

### 5. Users API Route
- ✅ `/api/users/profile/[username]` → GET (user profile)

### 6. Frontend API Base URL
- ✅ `frontend/lib/api.ts` → Base URL artık empty string (relative URL)

## 📦 Yapılacaklar

### 1. Paket Yükleme

```bash
cd frontend
npm install @prisma/client prisma jsonwebtoken bcryptjs
npm install -D @types/jsonwebtoken @types/bcryptjs
npx prisma generate --schema=./prisma/schema.prisma
```

### 2. Vercel Environment Variables

Vercel Dashboard → Project → Settings → Environment Variables:

```
DATABASE_URL=mongodb+srv://znpesmer:WSOXKNZF@cluster0.rpqulqn.mongodb.net/feellink?retryWrites=true&w=majority
JWT_SECRET=your-jwt-secret-here (backend/.env'deki aynı secret)
```

**ÖNEMLİ:** `DATABASE_URL` ve `JWT_SECRET` mutlaka eklenmeli!

### 3. Build Script Güncelleme

`frontend/package.json`'da build script'e Prisma generate ekle:

```json
{
  "scripts": {
    "build": "prisma generate --schema=./prisma/schema.prisma && next build",
    "postinstall": "prisma generate --schema=./prisma/schema.prisma"
  }
}
```

### 4. Vercel Build Command

Vercel Dashboard → Settings → Build & Deploy → Build Command:

```
cd frontend && npm install && npx prisma generate --schema=./prisma/schema.prisma && npm run build
```

## ⚠️ Eksik Endpoint'ler (Sonra Eklenecek)

Bu endpoint'ler şimdilik backend'de (Render) kalsın veya sonra eklenir:

1. **File Upload** (MinIO) - Post/media upload
2. **Stories** - Story create/get/delete
3. **Notifications** - Get notifications, mark as read
4. **Follow/Unfollow** - Follow requests, accept/reject
5. **Search** - User/post search
6. **Admin** - Admin endpoints
7. **Chat/Messages** - Real-time messaging
8. **Events** - Event management
9. **Collections** - Collection management
10. **Analytics** - Analytics endpoints
11. **Socket.io** - Real-time features (Pusher/Ably gerekebilir)

## 🔄 Migration Stratejisi

### Aşama 1: Hybrid (Şu an)
- Auth, Posts (GET), Feed, Users (GET) → Vercel Serverless
- File upload, Stories, Notifications → Backend (Render)
- Frontend iki API kullanıyor (conditional)

### Aşama 2: Full Migration (Gelecek)
- Tüm endpoint'ler Vercel Serverless'a taşınır
- Backend (Render) kapatılır
- File upload → Vercel Blob Storage veya MinIO (ayrı servis)

## 📝 Notlar

1. **File Upload**: MinIO şimdilik backend'de kalsın. Sonra Vercel Blob Storage'a geçilebilir.

2. **Socket.io**: Real-time özellikler için Pusher, Ably gibi servisler kullanılabilir.

3. **Development**: Local development için backend hala çalışır (localhost:3002).

4. **Production**: Vercel Serverless API kullanılır (relative URL).

## 🐛 Test Checklist

- [ ] Login çalışıyor mu?
- [ ] Register çalışıyor mu?
- [ ] Feed çalışıyor mu?
- [ ] Posts list çalışıyor mu?
- [ ] Like/unlike çalışıyor mu?
- [ ] Comments çalışıyor mu?
- [ ] User profile çalışıyor mu?

