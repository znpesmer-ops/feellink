# NEXT_PUBLIC_BACKEND_URL Nasıl Bulunur?

## 🔍 Backend URL'ini Bulmak İçin

### Senaryo 1: Backend Henüz Deploy Edilmediyse

Eğer backend'i henüz production'a deploy etmediysen, önce deploy etmen gerekiyor.

**Backend'i deploy etmek için seçenekler:**

1. **Railway** (Önerilen - Kolay ve Ücretsiz)
   - https://railway.app
   - GitHub repo'nu bağla
   - Otomatik deploy
   - URL: `https://your-project-name.up.railway.app`

2. **Render** (Ücretsiz)
   - https://render.com
   - GitHub repo'nu bağla
   - URL: `https://your-project-name.onrender.com`

3. **Heroku** (Ücretli)
   - https://heroku.com
   - URL: `https://your-project-name.herokuapp.com`

4. **Vercel** (Backend için uygun değil, sadece frontend için)

### Senaryo 2: Backend Zaten Deploy Edildiyse

Backend'in URL'ini bulmak için:

1. **Backend deploy platform'una git** (Railway, Render, vs.)
2. **Deployment URL'ini kopyala**
3. **Bu URL'i kullan**

### Senaryo 3: Backend Local'de Çalışıyorsa (Development)

Eğer backend sadece local'de çalışıyorsa ve production'da deploy etmek istemiyorsan:

**Cloudflare Tunnel kullan:**
```bash
# Backend'i local'de çalıştır
cd backend
pnpm start:dev

# Yeni terminal'de Cloudflare tunnel başlat
cloudflared tunnel --url http://localhost:3002
```

Bu sana bir URL verecek (örn: `https://xxxxx.trycloudflare.com`)
Bu URL'i `NEXT_PUBLIC_BACKEND_URL` olarak kullan.

## 📝 Vercel'de Environment Variable Olarak Ayarla

1. Vercel Dashboard → Projen → Settings → Environment Variables
2. **Key:** `NEXT_PUBLIC_BACKEND_URL`
3. **Value:** Backend URL'in (yukarıdaki adımlardan birinden aldığın)
4. **Environment:** Production, Preview, Development (hepsini seç)
5. **Add** butonuna tıkla

## ✅ Örnek Değerler

- Railway: `https://feellink-backend.up.railway.app`
- Render: `https://feellink-backend.onrender.com`
- Cloudflare Tunnel: `https://xxxxx.trycloudflare.com`
- Local IP (sadece test için): `http://192.168.1.38:3002`

## ⚠️ Önemli Notlar

1. **HTTPS kullan:** Production'da mutlaka `https://` ile başlamalı
2. **Port numarası:** Eğer URL'de port yoksa (örn: Railway, Render), port ekleme
3. **CORS:** Backend'de CORS ayarlarını frontend domain'ine izin verecek şekilde yapılandır

## 🚀 Hızlı Test

Backend URL'ini bulduktan sonra tarayıcıda test et:
```
https://your-backend-url.com/api
```

Swagger UI açılıyorsa URL doğru! ✅
