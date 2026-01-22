# 🔄 Vercel Backend Manuel Redeploy - HIZLI ÇÖZÜM

## ❌ SORUN
- `feellink` (frontend) otomatik deploy oluyor ✅
- `feellink-backend` (backend) deploy olmuyor ❌
- Backend klasöründeki değişiklikler trigger etmiyor

## ✅ HIZLI ÇÖZÜM (2 DAKİKA)

### Yöntem 1: Vercel Dashboard'dan Manuel Redeploy

1. **Vercel Dashboard'a git:**
   - https://vercel.com/dashboard
   - `feellink-backend` projesini aç

2. **Deployments sekmesine git:**
   - Sol menüden "Deployments" tıkla

3. **En son deployment'ı bul:**
   - En üstteki (en yeni) deployment'ı bul
   - Sağ tarafta "..." (üç nokta) menüsüne tıkla

4. **"Redeploy" seç:**
   - "Redeploy" seçeneğine tıkla
   - Onayla

5. **Build'i bekle:**
   - 2-3 dakika içinde deploy tamamlanacak
   - Status: "Building" → "Ready"

---

## 🔧 KALICI ÇÖZÜM: Root Directory Ayarı

### Vercel Dashboard'da Ayarla:

1. **Settings → General:**
   - `feellink-backend` projesini aç
   - Settings → General

2. **Root Directory:**
   - "Root Directory" bölümünü bul
   - Değer: `backend` olmalı
   - Eğer boşsa veya farklıysa → `backend` yaz → Save

3. **Build & Development Settings:**
   - Framework Preset: `Other`
   - Build Command: `npm install --legacy-peer-deps && npx prisma generate && npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install --legacy-peer-deps`

4. **Save ve Test:**
   - Save tıkla
   - Yeni bir commit push et
   - Backend projesi otomatik deploy olmalı

---

## 🚀 Yöntem 2: Vercel CLI ile Redeploy

```bash
# Vercel CLI yükle (ilk kez)
npm i -g vercel

# Login
vercel login

# Backend klasörüne git
cd backend

# Redeploy
vercel --prod
```

---

## ✅ KONTROL

Deploy tamamlandıktan sonra:

1. **Health Check:**
   ```bash
   curl https://feellink-backend.vercel.app/health
   ```
   Beklenen: `{"status":"ok"}`

2. **Vercel Dashboard:**
   - Deployments sekmesinde yeni deployment görünmeli
   - Status: "Ready" (yeşil nokta)

---

## 📝 NOT

**Neden backend deploy olmuyor?**
- Vercel monorepo'da `backend/` klasöründeki değişiklikler otomatik trigger etmiyor
- Root Directory ayarı yanlış olabilir
- Veya Vercel webhook backend projesine gitmiyor

**Çözüm:**
- Manuel redeploy yap (hızlı)
- Root Directory ayarını kontrol et (kalıcı)
