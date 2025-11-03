# ERR_CONNECTION_REFUSED Çözümü - Hızlı Rehber

## 🎯 Sorun
`localhost bağlanmayı reddetti` hatası alıyorsunuz çünkü **backend servisi çalışmıyor**.

## ✅ Hızlı Çözüm

### Seçenek 1: Otomatik Script (Önerilen)

```bash
cd /Users/sudeesmer/Desktop/OLACAK
./BASLA.sh
```

Script şunları yapacak:
- Docker kontrolü
- Docker servislerini başlatma
- Backend yapılandırması
- Bağımlılıkları yükleme
- Database kurulumu

### Seçenek 2: Manuel Adımlar

#### Adım 1: Docker Desktop'ı Başlatın
1. Docker Desktop uygulamasını açın
2. Çalıştığından emin olun (menü çubuğunda Docker ikonu görünmeli)

#### Adım 2: Docker Servislerini Başlatın
```bash
cd /Users/sudeesmer/Desktop/OLACAK
docker compose up -d
```

#### Adım 3: Backend'i Kurun ve Başlatın
```bash
cd backend

# Bağımlılıkları yükle
pnpm install
# veya npm install

# Database'i kur
pnpm prisma migrate dev --name init
pnpm prisma generate

# Backend'i başlat
pnpm start:dev
```

#### Adım 4: Frontend'i Başlatın (Yeni Terminal)
```bash
cd frontend
pnpm install
pnpm dev
```

## 🔍 Kontrol Listesi

Backend çalışıyor mu kontrol edin:

1. **Terminal'de mesaj görmeli:**
   ```
   🚀 Application is running on: http://localhost:3001
   📚 Swagger documentation: http://localhost:3001/api
   ```

2. **Tarayıcıda test edin:**
   - http://localhost:3001/api (Swagger UI açılmalı)

3. **Docker servisleri:**
   ```bash
   docker compose ps
   ```
   Tüm servisler "Up" durumunda olmalı.

## 🐛 Yaygın Sorunlar

### "Docker command not found"
**Çözüm:** Docker Desktop'ı yükleyin ve başlatın.

### "Cannot connect to database"
**Çözüm:** Docker servislerini başlatın:
```bash
docker compose up -d
```

### "Port 3001 already in use"
**Çözüm:** Port'u kullanan uygulamayı bulun ve durdurun:
```bash
lsof -i :3001
kill -9 <PID>
```

### "Module not found"
**Çözüm:** Bağımlılıkları yeniden yükleyin:
```bash
cd backend
rm -rf node_modules
pnpm install
```

## 📞 Hızlı Komutlar

```bash
# Docker servislerini başlat
docker compose up -d

# Docker servislerini durdur
docker compose down

# Backend loglarını gör
cd backend && pnpm start:dev

# Frontend loglarını gör  
cd frontend && pnpm dev
```

## ✅ Başarılı Olduğunda

Backend başladığında:
- ✅ Terminal'de "Application is running" mesajı
- ✅ http://localhost:3001/api açılıyor
- ✅ Frontend http://localhost:3000'da çalışıyor

**Artık uygulamayı kullanabilirsiniz!** 🎉




