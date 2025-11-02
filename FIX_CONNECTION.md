# ERR_CONNECTION_REFUSED Çözümü

## 🔍 Sorun Analizi

Backend servisi çalışmıyor. Aşağıdaki adımları takip edin:

## ✅ Çözüm Adımları

### 1. Docker Kurulumu Kontrolü

Docker yüklü değil görünüyor. Önce Docker'ı yükleyin:

**macOS için:**
```bash
# Homebrew ile yükle
brew install --cask docker

# Veya Docker Desktop'ı manuel indirin:
# https://www.docker.com/products/docker-desktop
```

Docker yüklendikten sonra Docker Desktop'ı başlatın.

### 2. Backend'i Manuel Başlatma

Docker olmadan da backend'i test edebilirsiniz (ama database olmadan çalışmaz):

```bash
cd backend

# .env dosyası zaten var
cat .env

# Bağımlılıkları yükle
pnpm install
# veya
npm install

# Backend'i başlatmayı dene
pnpm start:dev
```

**Not:** Database bağlantısı olmadan başlamayacak, ama hata mesajlarını görebilirsiniz.

### 3. Docker Servislerini Başlatma

Docker yüklendikten sonra:

```bash
cd /Users/sudeesmer/Desktop/OLACAK

# Servisleri başlat
docker compose up -d

# Veya eski versiyon için:
docker-compose up -d

# Durumu kontrol et
docker compose ps
```

### 4. Backend'i Başlatma (Tam Kurulum)

```bash
cd backend

# 1. Bağımlılıkları yükle
pnpm install

# 2. Prisma migrate (ilk kez)
pnpm prisma migrate dev --name init

# 3. Prisma client generate
pnpm prisma generate

# 4. Backend'i başlat
pnpm start:dev
```

### 5. Port Kontrolü

Eğer 3001 portu başka bir şey tarafından kullanılıyorsa:

```bash
# Port'u kullanan process'i bul
lsof -i :3001

# Process'i durdur (PID'i değiştirin)
kill -9 <PID>
```

Veya `.env` dosyasında farklı bir port kullanın:
```env
PORT=3002
```

## 🎯 Hızlı Test

Backend başladıktan sonra terminal'de şunu görmelisiniz:
```
🚀 Application is running on: http://localhost:3001
📚 Swagger documentation: http://localhost:3001/api
```

Tarayıcıda test edin:
- http://localhost:3001/api (Swagger UI)

## 🐛 Olası Hatalar

### "Cannot connect to database"
**Çözüm:** Docker servislerini başlatın:
```bash
docker compose up -d
```

### "Module not found"
**Çözüm:** Bağımlılıkları yükleyin:
```bash
cd backend
pnpm install
```

### "Prisma Client not generated"
**Çözüm:**
```bash
cd backend
pnpm prisma generate
```

## 📞 Adım Adım Kontrol Listesi

- [ ] Docker Desktop yüklü ve çalışıyor mu?
- [ ] `backend/.env` dosyası var mı?
- [ ] `backend/node_modules` klasörü var mı?
- [ ] Docker servisleri çalışıyor mu? (`docker compose ps`)
- [ ] Backend başlatıldı mı? (`pnpm start:dev`)
- [ ] Port 3001 kullanılabilir mi? (`lsof -i :3001`)

## 🚀 Hızlı Başlatma Scripti

Hazırladığım script'i kullanabilirsiniz:
```bash
cd /Users/sudeesmer/Desktop/OLACAK
./start.sh
```

Veya manuel olarak:
```bash
# 1. Docker servisleri
docker compose up -d

# 2. Backend kurulumu
cd backend
pnpm install
pnpm prisma migrate dev
pnpm prisma generate
pnpm start:dev

# 3. Frontend (yeni terminal)
cd frontend
pnpm install
pnpm dev
```



