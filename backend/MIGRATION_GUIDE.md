# Posts Modülü Refactoring - Migration Kılavuzu

## 📋 Yapılması Gerekenler

### 1. Prisma Migration

SavedPost modeli composite primary key ile güncellendi. Migration çalıştırın:

```bash
cd backend
pnpm prisma migrate dev --name update_saved_post_composite_key
pnpm prisma generate
```

**Not:** Eğer veritabanında mevcut veriler varsa, migration sırasında `id` kolonu kaldırılacak. Yedek almanız önerilir.

### 2. Bağımlılık Kurulumu

Swagger paketini yükleyin:

```bash
cd backend
pnpm install
```

### 3. Backend'i Yeniden Başlatın

```bash
pnpm start:dev
```

### 4. Swagger UI'yi Kontrol Edin

Backend başladıktan sonra:
```
http://localhost:3001/api
```

## ✅ Yapılan Değişiklikler

### DTO Yapısı
- ✅ `dto/create-post.dto.ts` - Gönderi oluşturma DTO
- ✅ `dto/post-id.dto.ts` - Post ID validasyon DTO
- ✅ `dto/create-comment.dto.ts` - Yorum oluşturma DTO

### Service Metodları
- ✅ `likePost` - Upsert kullanıyor (idempotent)
- ✅ `unlikePost` - Hata durumunda sessizce devam
- ✅ `savePost` - Zaten kayıtlıysa success döner
- ✅ `unsavePost` - Composite key ile delete
- ✅ `getSaved` - Alias metod eklendi

### Controller
- ✅ Swagger decorator'ları eklendi
- ✅ DTO kullanımı
- ✅ Param validasyonu
- ✅ Bearer Auth desteği

### Response Format
Tüm response'lar standart format:
```typescript
{ success: true, message: 'Operation successful' }
```

## 🔧 API Değişiklikleri

### Önceki Response
```json
{ "status": "liked" }
{ "status": "saved" }
```

### Yeni Response
```json
{ "success": true, "message": "Post liked successfully" }
{ "success": true, "message": "Post saved successfully" }
```

## 🧪 Test Endpoint'leri

Swagger UI'den test edebilirsiniz veya Postman kullanın:

### Like Post
```bash
POST /posts/{id}/like
Authorization: Bearer <token>
```

### Save Post
```bash
POST /posts/{id}/save
Authorization: Bearer <token>
```

### Get Saved Posts
```bash
GET /posts/saved
Authorization: Bearer <token>
```

## ⚠️ Önemli Notlar

1. **Composite Key:** SavedPost artık `userId` ve `postId` ile composite primary key kullanıyor
2. **Idempotent Operations:** Like ve Save işlemleri tekrar çağrılsa bile hata vermiyor
3. **Error Handling:** Unlike/Unsave işlemleri kayıt yoksa sessizce devam ediyor
4. **Validation:** Tüm DTO'lar class-validator ile validasyon yapıyor

## 📝 Prisma Schema Değişikliği

**Önceki:**
```prisma
model SavedPost {
  id        String   @id @default(cuid())
  ...
}
```

**Yeni:**
```prisma
model SavedPost {
  userId    String
  postId    String
  ...
  @@id([userId, postId])
}
```

Bu değişiklik migration gerektirir!



