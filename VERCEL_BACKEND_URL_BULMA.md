# Vercel'de Backend URL'ini Bulma

## 🔍 Vercel Dashboard'da Kontrol Et

### 1. Vercel Dashboard'a Git
- https://vercel.com/dashboard
- Projelerini listele

### 2. Backend Projesini Bul
Backend muhtemelen şu isimlerden biriyle olabilir:
- `feellink-backend`
- `feellink-api`
- `feellink` (aynı proje, farklı klasör)
- `instagram-clone-backend`

### 3. Backend URL'ini Bul
Backend projesine tıkla:
- **Deployments** sekmesinde en son deployment'ı gör
- **Domains** sekmesinde URL'leri gör
- URL genellikle şu formatta olur:
  - `https://feellink-backend.vercel.app`
  - `https://feellink-backend-xxxxx.vercel.app`
  - `https://api.feellink.io` (custom domain)

### 4. Backend'in Çalışıp Çalışmadığını Test Et
Tarayıcıda backend URL'ini aç:
```
https://your-backend-url.vercel.app/api
```

Swagger UI açılıyorsa backend çalışıyor! ✅

## 📝 Vercel'de Backend URL Formatları

### Senaryo A: Ayrı Vercel Projesi
- URL: `https://feellink-backend.vercel.app`
- Veya custom domain: `https://api.feellink.io`

### Senaryo B: Aynı Proje, Farklı Klasör
- Vercel'de monorepo yapısı kullanılıyorsa
- Backend klasörü için ayrı deployment
- URL: `https://feellink-backend-xxxxx.vercel.app`

### Senaryo C: Serverless Functions
- Vercel'de `/api` route'ları olarak deploy edilmişse
- URL: `https://www.feellink.io/api`
- Ama bu NestJS için uygun değil

## ✅ Doğru URL'i Bulduktan Sonra

Vercel'de environment variable'ları düzelt:

1. **Frontend projesine git** (feellink)
2. **Settings → Environment Variables**
3. **`NEXT_PUBLIC_API_URL`'i düzenle:**
   - Value: Backend URL'in (örn: `https://feellink-backend.vercel.app`)
4. **`NEXT_PUBLIC_BACKEND_URL` ekle:**
   - Value: Aynı backend URL'i
5. **Save** ve **Redeploy**

## 🔍 Hızlı Kontrol

Vercel dashboard'da:
1. Tüm projelerini listele
2. Backend ile ilgili projeyi bul
3. URL'i kopyala
4. Tarayıcıda `/api` path'ini test et

## ⚠️ Önemli Not

Eğer backend Vercel'de deploy edilmişse ama çalışmıyorsa:
- Vercel Serverless Functions NestJS için uygun değil
- Backend'i Railway veya Render'da deploy etmek daha iyi
- Veya Vercel'de Docker container olarak deploy et
