# ⚡ Hızlı Çözüm: Admin Yetkisi Ver

"Bu sayfaya erişim yetkiniz yok!" hatası alıyorsunuz çünkü giriş yaptığınız kullanıcı admin değil.

## 🔧 ÇÖZÜM: Kullanıcınızı Admin Yapın

### Yöntem 1: Script ile (En Kolay)

Terminal açın ve şu komutu çalıştırın:

```bash
cd /Users/sudeesmer/Desktop/OLACAK/backend
npm run make:admin KULLANICI_ADI
```

**ÖRNEK:**
```bash
cd /Users/sudeesmer/Desktop/OLACAK/backend
npm run make:admin testuser
```

Veya kullanıcı adınız neyse onu yazın.

---

### Yöntem 2: Prisma Studio ile (Görsel)

Terminal açın:

```bash
cd /Users/sudeesmer/Desktop/OLACAK/backend
npx prisma studio
```

1. Tarayıcıda `http://localhost:5555` açılacak
2. **Users** tablosuna tıklayın
3. Giriş yaptığınız kullanıcıyı bulun
4. Kullanıcıya tıklayın
5. **isAdmin** alanını bulun
6. `false` → `true` yapın
7. Kaydedin
8. Prisma Studio'yu kapatın

---

### Yöntem 3: SQL ile (Manuel)

PostgreSQL'e bağlanın:

```bash
docker exec -it instagram_clone_postgres psql -U postgres -d instagram_clone
```

SQL çalıştırın:

```sql
-- Kullanıcı adınızı yazın
UPDATE users SET "isAdmin" = true WHERE username = 'testuser';

-- Kontrol edin
SELECT username, email, "isAdmin" FROM users WHERE "isAdmin" = true;

-- Çıkış
\q
```

---

## ✅ SONRA NE YAPMALI?

1. Tarayıcıyı **TAMAMEN KAPATIN** (Cmd+Q Mac, Alt+F4 Windows)
2. Tekrar açın
3. Giriş yapın (`http://localhost:3000/login`)
4. Admin paneline gidin: `http://localhost:3000/admin`

**Artık admin paneli açılmalı!** 🎉

---

## ❌ Hala Çalışmıyor mu?

### Kontrol 1: Kullanıcı Admin Mi?

Terminal'de kontrol edin:

```bash
cd /Users/sudeesmer/Desktop/OLACAK/backend
npx prisma studio
```

Tarayıcıda `http://localhost:5555` → Users → Kullanıcınızı açın → **isAdmin** `true` olmalı

### Kontrol 2: Giriş Yaptınız mı?

Tarayıcıda:
- F12 basın → Console sekmesi
- `localStorage.getItem('auth-storage')` yazın ve Enter
- İçinde `"isAdmin":true` olmalı

### Kontrol 3: Cache Temizlendi mi?

- Tarayıcıyı **TAMAMEN KAPATIN** (Cmd+Q)
- Tekrar açın
- Veya: Cmd+Shift+R (hard refresh)

---

## 📝 YENİ BİR HESAPLA DENEYİN

Eğer hala sorun varsa, yeni bir hesap oluşturun:

1. `http://localhost:3000/register` → Yeni hesap oluşturun
2. Terminal'de: `npm run make:admin YENI_KULLANICI_ADI`
3. Çıkış yapın ve tekrar giriş yapın
4. Admin paneline gidin

---

## 💡 ÖNEMLİ NOTLAR

- Backend'in **çalışıyor olması gerekir**
- Veritabanının **erşilebilir olması gerekir**
- Her yöntemden sonra **tarayıcıyı kapatıp açın**

---

## 🆘 TAMAMEN YENİDEN BAŞLAMAK

Eğer hiçbir şey çalışmıyorsa:

```bash
# 1. Backend'i durdurun (Ctrl+C)

# 2. Docker'ı yeniden başlatın
cd /Users/sudeesmer/Desktop/OLACAK
docker compose down
docker compose up -d

# 3. Migration'ı yeniden çalıştırın
cd backend
npx prisma migrate deploy

# 4. Backend'i başlatın
npm run start:dev

# 5. Yeni hesap oluşturun ve admin yapın
# http://localhost:3000/register
# npm run make:admin KULLANICI_ADI
```

---

**Sorun devam ediyorsa:** Hangi yöntemi denediğinizi ve ne hata aldığınızı paylaşın.
















