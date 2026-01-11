# Vercel Environment Variables Düzeltme Rehberi

## 🔴 Şu Anki Sorunlar

1. ❌ `NEXT_PUBLIC_API_URL` = `https://www.feellink.io/` (YANLIŞ - Bu frontend URL'i)
2. ❌ `NEXT_PUBLIC_BACKEND_URL` eksik (Görseller için gerekli)
3. ⚠️ `JWT_SECRET` placeholder değer (Güvenlik riski)

## ✅ Düzeltme Adımları

### Senaryo A: Backend Henüz Deploy Edilmediyse

**Önce backend'i deploy et:**
1. `RAILWAY_DEPLOY.md` dosyasındaki adımları takip et
2. Railway'de backend'i deploy et
3. Railway URL'ini al (örn: `https://feellink-backend.up.railway.app`)

**Sonra Vercel'de düzelt:**

1. **`NEXT_PUBLIC_API_URL`'i düzenle:**
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: Railway backend URL'in (örn: `https://feellink-backend.up.railway.app`)
   - **ÖNEMLİ:** Sonundaki `/` olmamalı
   - Save

2. **`NEXT_PUBLIC_BACKEND_URL` ekle:**
   - Key: `NEXT_PUBLIC_BACKEND_URL`
   - Value: `NEXT_PUBLIC_API_URL` ile aynı değer
   - Environment: Production, Preview, Development (hepsini seç)
   - Save

3. **`JWT_SECRET`'i düzelt:**
   - Key: `JWT_SECRET`
   - Value: Güçlü random string (örn: `openssl rand -base64 32` ile oluştur)
   - **ÖNEMLİ:** `JWT_SECRET=` öneki olmamalı, sadece secret değeri
   - Save

### Senaryo B: Backend Zaten Deploy Edildiyse

Backend'in URL'ini bul ve yukarıdaki adımları uygula.

## 📋 Doğru Değer Örnekleri

**Railway kullanıyorsan:**
```
NEXT_PUBLIC_API_URL = https://feellink-backend.up.railway.app
NEXT_PUBLIC_BACKEND_URL = https://feellink-backend.up.railway.app
```

**Render kullanıyorsan:**
```
NEXT_PUBLIC_API_URL = https://feellink-backend.onrender.com
NEXT_PUBLIC_BACKEND_URL = https://feellink-backend.onrender.com
```

**Custom domain kullanıyorsan:**
```
NEXT_PUBLIC_API_URL = https://api.feellink.io
NEXT_PUBLIC_BACKEND_URL = https://api.feellink.io
```

## ⚠️ Önemli Notlar

1. **Sonundaki `/` olmamalı:** `https://api.feellink.io/` ❌ → `https://api.feellink.io` ✅
2. **HTTPS kullan:** Production'da mutlaka `https://` ile başlamalı
3. **JWT_SECRET güvenli olmalı:** Placeholder değer kullanma
4. **Deploy sonrası:** Environment variable'ları ekledikten sonra yeni deploy gerekir

## 🚀 Deploy Sonrası

1. Vercel dashboard → Deployments → "Redeploy" (son deployment'ı)
2. Veya yeni bir commit push et (otomatik deploy başlar)
3. Deploy tamamlandıktan sonra sayfayı test et
