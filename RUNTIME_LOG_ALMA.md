# Vercel Runtime Log Alma Rehberi

## 🎯 Runtime Log Nasıl Alınır?

### Adım 1: Vercel Dashboard'a Git
1. https://vercel.com → Projene git
2. **feellink-backend** projesini seç

### Adım 2: Deployment Sayfasına Git
1. Sol menüden **"Deployments"** tıkla
2. En üstteki (en son) deployment'ı seç
3. Deployment detay sayfasına git

### Adım 3: Runtime Logs'u Aç
1. Sayfanın üst kısmında **"Functions"** sekmesine tıkla
2. Veya sayfanın alt kısmında **"Runtime Logs"** sekmesine tıkla
3. Log görüntüleyici açılacak

### Adım 4: /health Endpoint'ini Tetikle
1. Tarayıcıda yeni sekme aç
2. Backend URL'ini aç: `https://feellink-backend.vercel.app/health`
3. Veya curl ile:
   ```bash
   curl https://feellink-backend.vercel.app/health
   ```

### Adım 5: Log'ları Kopyala
1. Runtime Logs sekmesine geri dön
2. En üstteki **ilk 20-30 satırı** kopyala
3. Buraya yapıştır

## 🔍 Ne Arıyoruz?

Runtime log'da şunlardan biri çıkacak:

1. **PrismaClientInitializationError** → DB bağlantı sorunu
2. **P1001 / P1002 / P1017** → DB erişim/timeout
3. **Query engine library for current platform ... not found** → Prisma binaryTargets sorunu
4. **Environment variable not found: DATABASE_URL** → ENV eksik
5. **Error: error:0A00018E:SSL routines...** → SSL parametresi gerekli
6. **MongoDB connection error** → Schema/provider uyumsuzluğu

## ⚠️ ÖNEMLİ NOT

**Schema/Provider Uyumsuzluğu Tespit Edildi:**
- `schema.prisma` → `provider = "mongodb"`
- `env.example` → PostgreSQL connection string
- `docker-compose.yml` → PostgreSQL container

Bu uyumsuzluk runtime error'a neden olabilir. Runtime log'u gönderirsen, ona göre düzeltiriz.
