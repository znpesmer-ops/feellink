# Instagram Clone - Tam Entegre Sosyal Medya Platformu

Bu proje, Instagram ile birebir aynı mantıkta çalışan profesyonel bir sosyal medya platformudur.

## 🚀 Özellikler

- ✅ Takip sistemi (istek gönderme, kabul etme, reddetme, engelleme)
- ✅ Gizli hesap mantığı
- ✅ Akış (feed) algoritması (Redis cache + fan-out-on-write)
- ✅ Medya yükleme (MinIO/S3 uyumlu)
- ✅ Gerçek zamanlı bildirimler (Socket.IO + BullMQ)
- ✅ Kullanıcı ve hashtag arama (Meilisearch)
- ✅ JWT kimlik doğrulama
- ✅ Modern frontend (Next.js 15 + React Query + Zustand)

## 🛠️ Teknoloji Yığını

- **Backend**: NestJS + Prisma + PostgreSQL
- **Cache & Kuyruk**: Redis + BullMQ
- **Arama**: Meilisearch
- **Dosya Depolama**: MinIO (S3 uyumlu)
- **Gerçek Zamanlı**: Socket.IO
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS

## 📦 Kurulum

### Gereksinimler

- Docker Desktop (yüklü ve çalışıyor olmalı)
- Node.js 20+
- pnpm (veya npm/yarn)

### 🚀 Hızlı Başlangıç (Önerilen)

```bash
# Otomatik kurulum scriptini çalıştır
./BASLA.sh

# Backend'i başlat
cd backend && pnpm start:dev

# Frontend'i başlat (yeni terminal)
cd frontend && pnpm install && pnpm dev
```

### 📋 Manuel Kurulum

1. **Docker Desktop'ı başlatın**
   - Docker Desktop uygulamasını açın
   - Menü çubuğunda Docker ikonu görünmeli

2. **Servisleri başlatın:**
```bash
docker compose up -d
```

3. **Backend'i kurun:**
```bash
cd backend
cp env.example .env  # .env dosyası yoksa
pnpm install
pnpm prisma migrate dev --name init
pnpm prisma generate
pnpm start:dev
```

4. **Frontend'i kurun:**
```bash
cd frontend
pnpm install
pnpm dev
```

### 🔍 Sorun Giderme

Eğer `ERR_CONNECTION_REFUSED` hatası alıyorsanız:
1. `COZUM.md` dosyasına bakın
2. Docker Desktop'ın çalıştığından emin olun
3. `./BASLA.sh` scriptini çalıştırın

## 🔧 Yapılandırma

Backend ve frontend için `.env.example` dosyalarındaki örnekleri kullanarak `.env` dosyaları oluşturun.

## 📝 Lisans

MIT


