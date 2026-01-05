# Vercel Serverless API Migration - Feellink

## 🎯 Durum

Backend'i Render'dan Vercel Serverless API'ye taşıyoruz.

## ✅ Tamamlananlar

1. ✅ Prisma schema kopyalandı → `frontend/prisma/schema.prisma`
2. ✅ Prisma client helper → `frontend/app/api/lib/prisma.ts`
3. ✅ Auth helper → `frontend/app/api/lib/auth.ts`
4. ✅ Auth API routes:
   - `/api/auth/login` → POST
   - `/api/auth/register` → POST
   - `/api/auth/me` → GET
5. ✅ Posts API routes:
   - `/api/posts` → GET (list posts)
   - `/api/posts/[id]/like` → POST (like/unlike)
   - `/api/posts/[id]/comments` → GET, POST (get comments, create comment)
6. ✅ Feed API route:
   - `/api/feed` → GET
7. ✅ Users API route:
   - `/api/users/profile/[username]` → GET

## 📦 Gerekli Paketler

```bash
cd frontend
npm install @prisma/client prisma jsonwebtoken bcryptjs
npm install -D @types/jsonwebtoken @types/bcryptjs
npx prisma generate --schema=./prisma/schema.prisma
```

## 🔧 Vercel Environment Variables

Vercel Dashboard → Project → Settings → Environment Variables:

```
DATABASE_URL=mongodb+srv://znpesmer:WSOXKNZF@cluster0.rpqulqn.mongodb.net/feellink?retryWrites=true&w=majority
JWT_SECRET=your-jwt-secret-here
```

## 🚀 Frontend API Base URL Değişikliği

`frontend/lib/api.ts` dosyasında:

**ÖNCE:**
```typescript
const envURL = process.env.NEXT_PUBLIC_API_URL // Backend URL (Render)
```

**SONRA:**
```typescript
// Serverless API - aynı domain'de
const baseURL = typeof window === 'undefined' 
  ? '' // Server-side: relative URL
  : '' // Client-side: relative URL
```

Veya `getBaseURL()` fonksiyonunu şöyle değiştir:

```typescript
const getBaseURL = (): string => {
  // Serverless API - relative URL kullan
  return ''
}
```

## ⚠️ Eksik Endpoint'ler (Sonra Eklenecek)

1. File upload (MinIO) - Şimdilik backend'deki media servisini kullanabiliriz
2. Stories
3. Notifications
4. Follow/Unfollow
5. Search
6. Admin endpoints
7. Chat/Messages
8. Events
9. Collections
10. Analytics

## 📝 Notlar

- File upload'lar için şimdilik backend'deki MinIO servisi kullanılabilir
- Veya Vercel Blob Storage'a geçiş yapılabilir
- Socket.io real-time özellikleri için başka bir çözüm gerekebilir (Pusher, Ably, vs.)

