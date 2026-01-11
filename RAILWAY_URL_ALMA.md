# Railway'de Backend URL'ini Alma (Adım 6 Detaylı)

## 🎯 Adım 6: Backend URL'ini Al

Backend deploy edildikten sonra Railway'de URL'i almak için:

### Yöntem 1: Otomatik Domain (Kolay)

1. **Railway Dashboard'a git**
   - https://railway.app/dashboard
   - Backend service'ine tıkla (deploy ettiğin service)

2. **Settings sekmesine git**
   - Sol menüden "Settings" tıkla
   - Veya service'in üstündeki "Settings" butonuna tıkla

3. **Domain oluştur**
   - "Generate Domain" butonuna tıkla
   - Railway otomatik bir domain oluşturur
   - Örnek: `https://feellink-backend-production.up.railway.app`

4. **URL'i kopyala**
   - Oluşturulan URL'i kopyala
   - Bu URL backend'in URL'i!

### Yöntem 2: Service Overview'dan

1. **Railway Dashboard → Backend Service**
2. **Service'in ana sayfasında**
   - Sağ üstte veya ortada URL görünür
   - "Open" veya URL'in yanındaki kopyala ikonuna tıkla

### Yöntem 3: Deployments'tan

1. **Railway Dashboard → Backend Service**
2. **Deployments sekmesine git**
3. **En son deployment'a tıkla**
4. **URL'i gör** (sağ üstte veya log'larda)

## ✅ URL'i Test Et

URL'i aldıktan sonra tarayıcıda test et:

```
https://your-backend-url.railway.app/api
```

**Swagger UI açılıyorsa:** ✅ Backend çalışıyor!

**404 veya hata alıyorsan:** Backend henüz deploy olmamış veya hata var.

## 📝 Örnek URL Formatları

Railway URL'leri genellikle şu formatta olur:
- `https://feellink-backend-production.up.railway.app`
- `https://feellink-backend-xxxxx.up.railway.app`
- `https://your-custom-domain.com` (custom domain eklediysen)

## 🎯 Sonraki Adım

URL'i aldıktan sonra:
1. Bu URL'i kopyala
2. Vercel'e git (frontend projesi)
3. Settings → Environment Variables
4. `NEXT_PUBLIC_API_URL` = Railway URL'in
5. `NEXT_PUBLIC_BACKEND_URL` = Railway URL'in (aynı)
6. Save ve Redeploy

## 🔍 Görsel Rehber

Railway dashboard'da:
```
[Backend Service]
  ├── Overview (URL burada görünür)
  ├── Deployments (URL burada da var)
  ├── Settings (Domain oluştur burada)
  └── Variables (Environment variables)
```

**Settings → Domains** bölümünde URL'i görebilirsin.
