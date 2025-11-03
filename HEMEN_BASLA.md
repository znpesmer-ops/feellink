# ⚡ Hemen Başlat - ERR_CONNECTION_REFUSED Çözümü

## 🎯 Sorun
Backend çalışmıyor, bu yüzden `localhost bağlanmayı reddetti` hatası alıyorsunuz.

## ✅ Çözüm - 3 Adım

### 1️⃣ Docker Desktop'ı Başlatın

**macOS için:**
- Spotlight'a "Docker" yazın ve Docker Desktop'ı açın
- Veya Applications klasöründen Docker Desktop'ı başlatın
- Menü çubuğunda Docker ikonu görünene kadar bekleyin (1-2 dakika)

Docker yüklü değilse:
```bash
# Homebrew ile
brew install --cask docker

# Veya manuel indir:
# https://www.docker.com/products/docker-desktop
```

### 2️⃣ Docker Servislerini Başlatın

Terminal'de:
```bash
cd /Users/sudeesmer/Desktop/OLACAK
docker compose up -d
```

10-15 saniye bekleyin, sonra kontrol edin:
```bash
docker compose ps
```

Tüm servisler "Up" olmalı.

### 3️⃣ Backend'i Başlatın

**Seçenek A: Otomatik Script (Kolay)**
```bash
cd /Users/sudeesmer/Desktop/OLACAK
./BACKEND_BASLAT.sh
```

**Seçenek B: Manuel**
```bash
cd backend

# İlk kez mi? Bağımlılıkları yükle
pnpm install
# veya
npm install

# Database kurulumu (ilk kez)
pnpm prisma migrate dev --name init
pnpm prisma generate

# Backend'i başlat
pnpm start:dev
```

## ✅ Başarı Kontrolü

Backend başladığında terminal'de şunu göreceksiniz:
```
🚀 Application is running on: http://localhost:3001
📚 Swagger documentation: http://localhost:3001/api
```

Tarayıcıda test edin:
- http://localhost:3001/api (Swagger UI açılmalı)

## 🔍 Hala Çalışmıyorsa

1. **Docker çalışıyor mu?**
   ```bash
   docker ps
   ```
   Hata veriyorsa Docker Desktop'ı başlatın.

2. **Port kullanımda mı?**
   ```bash
   lsof -i :3001
   ```
   Başka bir uygulama kullanıyorsa durdurun.

3. **Bağımlılıklar yüklü mü?**
   ```bash
   cd backend
   ls node_modules
   ```
   Boşsa: `pnpm install`

4. **Database bağlantısı var mı?**
   ```bash
   docker compose ps postgres
   ```
   "Up" değilse: `docker compose up -d`

## 📞 Hızlı Komutlar

```bash
# Tüm servisleri başlat
docker compose up -d

# Servisleri durdur
docker compose down

# Backend loglarını gör
cd backend && pnpm start:dev

# Frontend'i başlat (yeni terminal)
cd frontend && pnpm dev
```

## 🎉 Başarılı!

Backend çalıştığında:
- ✅ http://localhost:3001/api açılıyor
- ✅ Frontend çalışıyor
- ✅ Uygulamayı kullanabilirsiniz!




