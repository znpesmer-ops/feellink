# Sorun Giderme Kılavuzu - ERR_CONNECTION_REFUSED

## 🔍 Sorun: localhost bağlanmayı reddetti

Bu hata genellikle backend servisinin çalışmadığı anlamına gelir.

## ✅ Çözüm Adımları

### 1. Docker Servislerini Kontrol Et

```bash
# Docker servislerinin durumunu kontrol et
docker-compose ps

# Tüm servisler çalışıyor olmalı:
# - postgres (port 5432)
# - redis (port 6379)
# - meilisearch (port 7700)
# - minio (port 9000, 9001)
```

Eğer servisler çalışmıyorsa:
```bash
docker-compose up -d
```

### 2. Backend'in Çalışıp Çalışmadığını Kontrol Et

```bash
cd backend

# Backend'in çalışıp çalışmadığını kontrol et
curl http://localhost:3001/health || echo "Backend çalışmıyor"

# Veya port'un açık olup olmadığını kontrol et
lsof -i :3001 || echo "Port 3001 kullanımda değil"
```

### 3. Backend'i Başlat

```bash
cd backend

# .env dosyasının var olduğundan emin ol
cp env.example .env

# Bağımlılıkları yükle
pnpm install

# Prisma migrate (ilk kurulum için)
pnpm prisma migrate dev --name init
pnpm prisma generate

# Backend'i başlat
pnpm start:dev
```

Backend başarıyla başladığında terminal'de şunu görmelisiniz:
```
🚀 Application is running on: http://localhost:3001
📚 Swagger documentation: http://localhost:3001/api
```

### 4. Environment Variables Kontrolü

`backend/.env` dosyasının var olduğundan ve doğru yapılandırıldığından emin ol:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/instagram_clone?schema=public"
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d
REDIS_HOST=localhost
REDIS_PORT=6379
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=instagram-uploads
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=master_key_change_in_production
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 5. Port Çakışması Kontrolü

Eğer 3001 portu başka bir servis tarafından kullanılıyorsa:

```bash
# Port kullanımını kontrol et
lsof -i :3001

# Veya .env'de farklı bir port kullan:
PORT=3002
```

### 6. Database Bağlantısı Kontrolü

```bash
# PostgreSQL'in çalıştığını kontrol et
docker exec instagram_clone_postgres psql -U postgres -c "SELECT 1"

# Veya
docker-compose ps postgres
```

### 7. Frontend'in Backend'e Bağlanması

Frontend'in `.env.local` dosyasında doğru backend URL'i olduğundan emin ol:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

## 🚨 Yaygın Hatalar ve Çözümleri

### Hata: "Cannot connect to database"
**Çözüm:** Docker servislerini başlat:
```bash
docker-compose up -d
```

### Hata: "Port already in use"
**Çözüm:** Port'u değiştir veya kullanan servisi durdur:
```bash
# Port'u kullanan process'i bul
lsof -i :3001

# Process'i durdur
kill -9 <PID>
```

### Hata: "Module not found"
**Çözüm:** Bağımlılıkları yeniden yükle:
```bash
cd backend
rm -rf node_modules package-lock.json
pnpm install
```

### Hata: "Prisma Client not generated"
**Çözüm:** Prisma client'ı generate et:
```bash
cd backend
pnpm prisma generate
```

## 🔄 Tam Yeniden Kurulum

Eğer hiçbir şey çalışmıyorsa:

```bash
# 1. Docker servislerini durdur ve temizle
docker-compose down -v

# 2. Docker servislerini yeniden başlat
docker-compose up -d

# 3. Backend'i temizle ve yeniden kur
cd backend
rm -rf node_modules dist
pnpm install
pnpm prisma migrate dev --name init
pnpm prisma generate

# 4. Backend'i başlat
pnpm start:dev
```

## 📝 Test Etme

Backend çalıştıktan sonra:

```bash
# Health check
curl http://localhost:3001

# Swagger UI
open http://localhost:3001/api

# API endpoint test
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer <token>"
```

## 🆘 Hala Çalışmıyorsa

1. Terminal loglarını kontrol et (hata mesajları var mı?)
2. Docker loglarını kontrol et:
   ```bash
   docker-compose logs postgres
   docker-compose logs redis
   ```
3. Backend loglarını kontrol et (terminal'de gösterilen hatalar)
4. Port'ların açık olduğundan emin ol (firewall/proxy ayarları)



























