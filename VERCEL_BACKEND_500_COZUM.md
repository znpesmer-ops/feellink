# Vercel Backend 500 Hatası Çözümü

## ✅ Yapılan Değişiklikler

1. **`backend/api/index.ts`** - Vercel serverless handler oluşturuldu
2. **`backend/vercel.json`** - Vercel yapılandırması güncellendi

## 🚀 Şimdi Yapılacaklar

### 1. GitHub'a Commit ve Push

```bash
cd /Users/sudeesmer/Desktop/OLACAK
git add backend/api/index.ts backend/vercel.json
git commit -m "fix: Vercel serverless handler eklendi"
git push
```

### 2. Vercel'de Environment Variables Kontrol Et

Vercel Dashboard → `feellink-backend` projesi → Settings → Environment Variables

**Şunlar olmalı:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Güçlü random string
- `NODE_ENV` = `production`
- `FRONTEND_URL` = `https://www.feellink.io`
- `PORT` = `3002` (Vercel otomatik ayarlar, ama ekleyebilirsin)

**ÖNEMLİ:** `@vercel/node` paketi Vercel'de otomatik yüklenir, manuel eklemeye gerek yok.

### 3. Vercel'de Redeploy

1. Vercel Dashboard → `feellink-backend` projesi
2. "Deployments" sekmesi
3. En son deployment'ın yanında "..." → "Redeploy"
4. Veya otomatik olarak GitHub push sonrası deploy başlar

### 4. Build Logs Kontrol Et

Deploy sırasında "Build Logs" sekmesine bak:
- ✅ `nest build` başarılı olmalı
- ✅ `api/index.ts` compile edilmeli
- ❌ Hata varsa logları kontrol et

### 5. Test Et

Deploy tamamlandıktan sonra:
1. Backend URL'ini aç: `https://feellink-backend.vercel.app`
2. Health check: `https://feellink-backend.vercel.app/health`
3. Login endpoint: `https://feellink-backend.vercel.app/auth/login`

## ⚠️ Olası Sorunlar ve Çözümleri

### Sorun 1: "Cannot find module '../src/app.module'"

**Çözüm:** Vercel build sırasında `nest build` çalışmalı. `package.json`'da build script kontrol et.

### Sorun 2: "CORS Error"

**Çözüm:** `api/index.ts` dosyasında CORS ayarlarını kontrol et. Frontend URL'i `allowedOrigins` listesinde olmalı.

### Sorun 3: "Database Connection Error"

**Çözüm:** `DATABASE_URL` environment variable'ı doğru mu kontrol et. Vercel'de production environment'a eklenmiş olmalı.

### Sorun 4: "500 Internal Server Error"

**Çözüm:** 
1. Vercel Dashboard → Runtime Logs sekmesine bak
2. Hata mesajını kontrol et
3. `api/index.ts` dosyasında `console.log` ekleyerek debug yap

## 📝 Notlar

- Vercel serverless functions kullanır, bu yüzden `app.listen()` çağrılmaz
- `app.init()` kullanılır ve Express app Vercel handler'a bağlanır
- `cachedApp` ile app instance cache'lenir (performance için)

## 🎯 Sonraki Adımlar

1. ✅ GitHub'a push yap
2. ✅ Vercel otomatik deploy eder
3. ✅ Build logs kontrol et
4. ✅ Runtime logs kontrol et
5. ✅ Frontend'den test et
