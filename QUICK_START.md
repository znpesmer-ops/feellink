# Hızlı Başlangıç Kılavuzu

## 🚀 Hızlı Kurulum (5 Dakika)

### Adım 1: Docker Servislerini Başlat

```bash
cd /Users/sudeesmer/Desktop/OLACAK

# Docker servislerini başlat
docker compose up -d

# Veya eski Docker Compose versiyonu için:
# docker-compose up -d

# Servislerin başladığını kontrol et (10-15 saniye bekle)
docker compose ps
```

### Adım 2: Backend Kurulumu

```bash
cd backend

# .env dosyası oluştur
cp env.example .env

# Bağımlılıkları yükle
pnpm install

# Prisma migrate çalıştır
pnpm prisma migrate dev --name init

# Prisma client generate
pnpm prisma generate

# Backend'i başlat
pnpm start:dev
```

Backend başarıyla başladığında terminal'de göreceksiniz:
```
🚀 Application is running on: http://localhost:3001
📚 Swagger documentation: http://localhost:3001/api
```

### Adım 3: Frontend Kurulumu

Yeni bir terminal penceresi açın:

```bash
cd frontend

# Bağımlılıkları yükle
pnpm install

# Frontend'i başlat
pnpm dev
```

Frontend başladığında:
```
http://localhost:3000
```

## ✅ Doğrulama

1. **Docker Servisleri:**
   ```bash
   docker compose ps
   ```
   Tüm servisler "Up" olmalı.

2. **Backend:**
   - Tarayıcıda: http://localhost:3001/api (Swagger UI)
   - Terminal'de: "Application is running" mesajı

3. **Frontend:**
   - Tarayıcıda: http://localhost:3000

## 🐛 Hata Durumunda

### Backend başlamıyor?

1. `.env` dosyasının var olduğundan emin ol:
   ```bash
   ls backend/.env
   ```

2. Docker servislerinin çalıştığından emin ol:
   ```bash
   docker compose ps
   ```

3. Port çakışması var mı kontrol et:
   ```bash
   lsof -i :3001
   ```

4. Logları kontrol et:
   ```bash
   cd backend
   pnpm start:dev
   # Hata mesajlarını oku
   ```

### Database hatası?

```bash
# PostgreSQL'in çalıştığını kontrol et
docker compose exec postgres psql -U postgres -c "SELECT 1"

# Migration'ı tekrar çalıştır
cd backend
pnpm prisma migrate dev
pnpm prisma generate
```

## 📝 Önemli Notlar

- Backend port: **3001**
- Frontend port: **3000**
- PostgreSQL: **5432**
- Redis: **6379**
- Meilisearch: **7700**
- MinIO: **9000** (API), **9001** (Console)

## 🔗 Hızlı Linkler

- Backend API: http://localhost:3001
- Swagger UI: http://localhost:3001/api
- Frontend: http://localhost:3000
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)










































