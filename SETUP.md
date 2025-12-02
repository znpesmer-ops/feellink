# Kurulum Kılavuzu

Bu kılavuz, Instagram Clone projesini sıfırdan çalışır hale getirmek için adım adım talimatlar içerir.

## Gereksinimler

- Node.js 20+ 
- Docker & Docker Compose
- pnpm (npm veya yarn da kullanılabilir)

## 1. Servisleri Başlatma

İlk olarak Docker servislerini başlatın:

```bash
docker-compose up -d
```

Bu komut şunları başlatır:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Meilisearch (port 7700)
- MinIO (port 9000 - API, 9001 - Console)

MinIO konsoluna erişim: http://localhost:9001
- Kullanıcı adı: minioadmin
- Şifre: minioadmin

## 2. Backend Kurulumu

```bash
cd backend

# Bağımlılıkları yükleyin
pnpm install

# .env dosyası oluşturun
cp env.example .env

# Prisma migrate çalıştırın
pnpm prisma migrate dev --name init

# Prisma client'ı generate edin
pnpm prisma generate

# Development modda başlatın
pnpm start:dev
```

Backend şimdi http://localhost:3001 adresinde çalışıyor olmalı.

## 3. Frontend Kurulumu

Yeni bir terminal penceresi açın:

```bash
cd frontend

# Bağımlılıkları yükleyin
pnpm install

# .env.local dosyası oluşturun (opsiyonel - varsayılanlar zaten ayarlı)
# cp .env.local.example .env.local

# Development modda başlatın
pnpm dev
```

Frontend şimdi http://localhost:3000 adresinde çalışıyor olmalı.

## 4. İlk Kullanıcı Oluşturma

Tarayıcınızda http://localhost:3000 adresine gidin ve "Sign up" ile yeni bir hesap oluşturun.

## Önemli Notlar

### MinIO Bucket Oluşturma

MinIO otomatik olarak bucket oluşturmalı, ancak eğer sorun yaşarsanız:
1. http://localhost:9001 adresine gidin
2. Giriş yapın (minioadmin/minioadmin)
3. "instagram-uploads" adında bir bucket oluşturun
4. Bucket policy'yi public read olarak ayarlayın

### Meilisearch Indexes

Meilisearch indexleri otomatik olarak oluşturulacak. İlk arama isteğinde index oluşturulur.

### Veritabanı Yedekleme

```bash
# PostgreSQL dump
docker exec instagram_clone_postgres pg_dump -U postgres instagram_clone > backup.sql

# Restore
docker exec -i instagram_clone_postgres psql -U postgres instagram_clone < backup.sql
```

## Sorun Giderme

### Port Çakışması
Eğer portlar zaten kullanılıyorsa, `docker-compose.yml` dosyasındaki port numaralarını değiştirin.

### Prisma Migrate Hataları
```bash
# Veritabanını sıfırlamak için (DİKKAT: Tüm veriler silinir)
cd backend
pnpm prisma migrate reset
```

### Redis Bağlantı Hatası
Docker servislerinin çalıştığından emin olun:
```bash
docker-compose ps
```

## Production Deployment

Production için:
1. Tüm `.env` dosyalarındaki gizli anahtarları değiştirin
2. `JWT_SECRET` güçlü bir değer olmalı
3. `MINIO_USE_SSL=true` yapın ve SSL sertifikaları ekleyin
4. `FRONTEND_URL` ve `CORS` ayarlarını production domain'e göre güncelleyin
5. Database ve Redis için production-grade servisler kullanın




























