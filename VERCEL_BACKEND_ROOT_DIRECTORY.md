# 🔥 VERCEL BACKEND ROOT DIRECTORY AYARI - KRİTİK!

## ❌ SORUN
Vercel'de `feellink-backend` projesi deploy olmuyor çünkü **Root Directory** ayarı yanlış!

## ✅ ÇÖZÜM ADIMLARI

### 1️⃣ Vercel Dashboard'a Git
1. **Vercel Dashboard** → `feellink-backend` projesine git
2. **Settings** → **General** sekmesi

### 2️⃣ Root Directory Ayarını Kontrol Et
1. **Root Directory** alanını bul
2. **Değer:** `backend` olmalı
3. Eğer boş veya `./` ise → `backend` yaz
4. **Save** butonuna tıkla

### 3️⃣ Doğrulama
1. **Deployments** sekmesine git
2. Yeni bir commit yap (backend klasöründe değişiklik)
3. Backend deployment başlamalı

## 📝 NOTLAR

- **feellink** (frontend) → Root Directory: `frontend` veya boş
- **feellink-backend** (backend) → Root Directory: `backend` **ZORUNLU!**

Eğer Root Directory ayarı yanlışsa:
- Backend klasöründeki değişiklikler algılanmaz
- Sadece frontend deploy olur
- Backend deploy olmaz

## 🔍 KONTROL LİSTESİ

- [ ] Vercel Dashboard → `feellink-backend` → Settings → General
- [ ] Root Directory: `backend` kontrolü
- [ ] Save butonuna tıkla
- [ ] Yeni commit yap
- [ ] Backend deployment başlamalı
