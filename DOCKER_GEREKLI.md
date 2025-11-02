# ⚠️ Docker Desktop Gerekiyor

## 🔍 Durum

Backend bağımlılıkları yüklendi, ancak **Docker Desktop yüklü değil**.

Database (PostgreSQL) Docker'da çalıştığı için, backend şu anda database'e bağlanamıyor.

## ✅ Çözüm

### 1. Docker Desktop'ı Yükleyin

**macOS için:**
1. https://www.docker.com/products/docker-desktop adresine gidin
2. "Download for Mac" butonuna tıklayın
3. İndirilen .dmg dosyasını açın
4. Docker.app'ı Applications klasörüne sürükleyin
5. Applications'dan Docker Desktop'ı başlatın
6. Menü çubuğunda Docker ikonu görünene kadar bekleyin (1-2 dakika)

**Veya Homebrew ile:**
```bash
brew install --cask docker
```

### 2. Docker Desktop'ı Başlatın

- Applications klasöründen Docker Desktop'ı açın
- Menü çubuğunda Docker ikonu görünmeli
- "Docker Desktop is running" mesajını bekleyin

### 3. Servisleri Başlatın

```bash
cd /Users/sudeesmer/Desktop/OLACAK
docker compose up -d
```

10 saniye bekleyin, sonra:
```bash
docker compose ps
```

Tüm servisler "Up" durumunda olmalı.

### 4. Database Migration

```bash
cd backend
pnpm prisma migrate dev --name init
# veya
npm run prisma migrate dev --name init
```

### 5. Backend'i Başlatın

```bash
cd backend
pnpm start:dev
# veya
npm run start:dev
```

## 📊 Mevcut Durum

✅ Backend bağımlılıkları yüklü  
✅ .env dosyası hazır  
✅ Prisma client generate edildi  
❌ Docker Desktop yüklü değil  
❌ Database servisleri çalışmıyor  

## 🎯 Docker Yüklendikten Sonra

Hazırladığım script'i çalıştırın:
```bash
./BACKEND_BASLAT.sh
```

Veya manuel:
```bash
# 1. Docker servisleri
docker compose up -d

# 2. Database migration
cd backend
pnpm prisma migrate dev --name init

# 3. Backend başlat
pnpm start:dev
```

## 🚀 Hızlı Test

Docker yüklendikten sonra:

1. `docker compose up -d` - Servisleri başlat
2. 10 saniye bekle
3. `./BACKEND_BASLAT.sh` - Backend'i başlat
4. Tarayıcıda: http://localhost:3001/api



