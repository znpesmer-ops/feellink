# 🔥 Vercel Backend Deployment Sorunu - Kesin Çözüm

## ❌ SORUN
Vercel monorepo'da `feellink-backend` projesi deploy olmuyor.

## ✅ ÇÖZÜM ADIMLARI

### 1️⃣ Vercel Dashboard'da Proje Ayarları

1. **Vercel Dashboard** → `feellink-backend` projesine git
2. **Settings** → **General** sekmesi
3. **Root Directory** ayarını kontrol et:
   - ✅ **Root Directory:** `backend` olmalı
   - ❌ Boş veya `./` ise → `backend` yap

### 2️⃣ Git Repository Bağlantısı

1. **Settings** → **Git** sekmesi
2. **Production Branch:** `main` olmalı
3. **Auto-deploy:** ✅ Açık olmalı

### 3️⃣ Build Settings

1. **Settings** → **General** sekmesi
2. **Build Command:** (Boş bırak - `vercel.json` kullanılacak)
3. **Output Directory:** (Boş bırak - `vercel.json` kullanılacak)
4. **Install Command:** (Boş bırak - `vercel.json` kullanılacak)

### 4️⃣ Manuel Redeploy (Acil Durum)

Eğer otomatik deploy çalışmıyorsa:

1. **Deployments** sekmesine git
2. En son deployment'ın yanındaki **"..."** menüsüne tıkla
3. **Redeploy** seçeneğini seç
4. **Use existing Build Cache** seçeneğini **KAPAT**
5. **Redeploy** butonuna tıkla

### 5️⃣ Backend Klasöründe Değişiklik Algılama

Vercel monorepo'da backend klasöründe değişiklik algılaması için:

✅ **Her backend değişikliğinde şunlar güncellenmeli:**
- `backend/api/index.ts` (FORCE_DEPLOY_TRIGGER değişkeni)
- `backend/vercel-trigger.txt` (timestamp)

### 6️⃣ Test Et

1. Backend klasöründe bir değişiklik yap (örn: `api/index.ts`)
2. Commit ve push yap
3. Vercel Dashboard'da `feellink-backend` projesine git
4. **Deployments** sekmesinde yeni deployment görünmeli

## 🔍 DEBUG

### Deployment Başlamıyorsa:

1. **Vercel Dashboard** → `feellink-backend` → **Deployments**
2. En son deployment'ın **"..."** menüsü → **View Build Logs**
3. Hata mesajlarını kontrol et

### Yaygın Hatalar:

- ❌ **"Root Directory not found"** → Root Directory: `backend` yap
- ❌ **"Build failed"** → Build logs'u kontrol et
- ❌ **"No changes detected"** → `api/index.ts` dosyasını güncelle

## ✅ BAŞARILI DEPLOYMENT KONTROLÜ

Deployment başarılı olduğunda:
- ✅ Status: **"Ready"** (yeşil nokta)
- ✅ Commit mesajı görünür
- ✅ URL: `https://feellink-backend.vercel.app` çalışır

## 📝 NOTLAR

- Vercel monorepo'da her proje için ayrı **Root Directory** ayarı gerekir
- `feellink` (frontend) → Root Directory: `frontend` veya boş
- `feellink-backend` (backend) → Root Directory: `backend` **ZORUNLU**
