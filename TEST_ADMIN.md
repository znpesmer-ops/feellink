# 🧪 Admin Panel Test Adımları

Bu dosya admin paneline erişim için adım adım test komutları içerir.

## 🔍 Sorun Tespit Adımları

Aşağıdaki adımları sırayla takip edin ve hangi adımda sorun yaşadığınızı belirtin:

### ✅ Adım 1: Docker Servisleri Çalışıyor mu?

```bash
docker compose ps
```

**Beklenen çıktı:** Tüm servisler "Up" durumunda olmalı

**Sorun varsa:**
```bash
docker compose up -d
# 10 saniye bekleyin
docker compose ps
```

---

### ✅ Adım 2: Backend Çalışıyor mu?

**Terminal 1** açın:
```bash
cd /Users/sudeesmer/Desktop/OLACAK/backend
pnpm start:dev
```

**Beklenen çıktı:**
```
[Nest] LOG [NestFactory] Starting Nest application...
🚀 Application is running on: http://localhost:3001
```

**Sorun varsa:**
- Database bağlantısı mı var? Kontrol edin
- Port 3001 kullanımda mı? Kontrol edin

---

### ✅ Adım 3: Frontend Çalışıyor mu?

**Terminal 2** açın:
```bash
cd /Users/sudeesmer/Desktop/OLACAK/frontend
pnpm dev
```

**Beklenen çıktı:**
```
▲ Next.js 15.x
- Local: http://localhost:3000
```

**Sorun varsa:**
```bash
pnpm install
pnpm dev
```

---

### ✅ Adım 4: Kullanıcı Kayıtlı mı?

Tarayıcıda açın: `http://localhost:3000/register`

Formu doldurun ve kayıt olun:
- Username: `testuser` (veya istediğiniz)
- Email: `test@example.com`
- Password: `test123456`
- Full Name: `Test User`

**Beklenen:** Giriş sayfasına yönlendirilmelisiniz

---

### ✅ Adım 5: Kullanıcıyı Admin Yap

**Terminal 3** açın:
```bash
cd /Users/sudeesmer/Desktop/OLACAK/backend
pnpm make:admin testuser
```

**Beklenen çıktı:**
```
🔍 Kullanıcı aranıyor: testuser...
✅ testuser kullanıcısı admin yapıldı!
📧 Email: test@example.com
🎉 Artık admin paneline erişebilir: http://localhost:3000/admin
🎉 İşlem tamamlandı
```

**SORUN VARSA BURADA BELIRTIN:**

#### Sorun A: "Kullanıcı bulunamadı"
**Çözüm:** Backend veritabanına bağlanamıyor olabilir
```bash
# Kontrol edin
cd backend
pnpm prisma:studio
# Tarayıcıda localhost:5555 açılacak, Users tablosuna bakın
```

#### Sorun B: "Error loading .env"
**Çözüm:** Backend klasöründe .env dosyası yok
```bash
cd backend
cp env.example .env
# .env dosyasını düzenleyin (DATABASE_URL vs.)
```

#### Sorun C: "Cannot find module"
**Çözüm:** Bağımlılıklar yüklü değil
```bash
cd backend
pnpm install
```

---

### ✅ Adım 6: Admin Paneline Erişim

1. Tarayıcıda: `http://localhost:3000/login`
2. Kullanıcı adı ve şifreyle giriş yapın
3. Adres çubuğuna `/admin` yazın: `http://localhost:3000/admin`

**Beklenen:** Admin paneli açılmalı

**SORUN VARSA BELIRTIN:**

#### Sorun D: "Bu sayfaya erişim yetkiniz yok!" mesajı
**Çözüm:** Kullanıcıya admin yetkisi verilmemiş veya token yenilenmemiş
```bash
# Çıkış yapın ve tekrar giriş yapın
# Veya tarayıcı cache'ini temizleyin (Cmd+Shift+R Mac, Ctrl+Shift+R Windows)
```

#### Sorun E: Login sayfasına yönlendiriliyor
**Çözüm:** Token süresi dolmuş veya session kaybolmuş
```bash
# Tekrar giriş yapın
```

#### Sorun F: Beyaz sayfa / hiçbir şey görünmüyor
**Çözüm:** Console'da hata olabilir
```bash
# Browser DevTools açın (F12)
# Console sekmesine bakın, hata mesajını paylaşın
```

---

### ✅ Adım 7: Admin Sayfalarını Test Et

Admin paneli açıldıktan sonra:

1. **Dashboard:** `http://localhost:3000/admin` - İstatistikler görünüyor mu?
2. **Kullanıcılar:** `http://localhost:3000/admin/users` - Kullanıcı listesi var mı?
3. **Gönderiler:** `http://localhost:3000/admin/posts` - Gönderiler yükleniyor mu?
4. **Bildirimler:** `http://localhost:3000/admin/notifications` - Bildirimler görünüyor mu?
5. **Ayarlar:** `http://localhost:3000/admin/settings` - Ayarlar sayfası açılıyor mu?

---

## 🐛 Yaygın Sorunlar ve Çözümleri

### Sorun: "pnpm make:admin komutu bulunamadı"

**Çözüm:**
```bash
cd backend
# package.json'da script var mı kontrol edin
cat package.json | grep "make:admin"

# Yoksa manuel çalıştırın
npx ts-node -r tsconfig-paths/register src/scripts/make-user-admin.ts testuser
```

### Sorun: "Prisma Client not found"

**Çözüm:**
```bash
cd backend
pnpm prisma:generate
```

### Sorun: "Database connection refused"

**Çözüm:**
```bash
# Docker servisleri çalışıyor mu?
docker compose ps

# PostgreSQL çalışmıyorsa:
docker compose up -d postgres
sleep 5
```

### Sorun: "Port 3001 already in use"

**Çözüm:**
```bash
# Port 3001'i kullanan process'i bulun
lsof -i :3001

# Kill edin
kill -9 <PID>

# Veya backend'i farklı portta çalıştırın
# backend/.env dosyasında PORT=3002 yapın
```

---

## 📞 Yardım İçin

Lütfen şu bilgileri paylaşın:

1. **Hangi adımda sorun yaşıyorsunuz?** (1-7 arası)
2. **Tam hata mesajı nedir?** (copy-paste edin)
3. **Terminal çıktısı:** Son 20 satır
4. **Browser console:** Hata var mı? (F12 > Console)
5. **Backend logları:** Terminal 1'deki son loglar

---

## ✅ Başarılı Test Sonucu

Tüm adımlar başarılıysa:
- ✅ Admin paneli açılıyor
- ✅ Dashboard'da istatistikler görünüyor
- ✅ Kullanıcılar sayfası çalışıyor
- ✅ Gönderiler sayfası çalışıyor
- ✅ Bildirimler sayfası çalışıyor
- ✅ Ayarlar sayfası çalışıyor

**Teşekkürler! Admin paneli başarıyla çalışıyor! 🎉**





















