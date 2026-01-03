# ✅ Vercel Deployment Checklist

## 🔴 KRİTİK - Internal Server Error Çözümü

### 1. Environment Variable Kontrolü (ZORUNLU!)

**Vercel Dashboard → Settings → Environment Variables**

✅ **NEXT_PUBLIC_API_URL** eklenmiş mi?
- Key: `NEXT_PUBLIC_API_URL`
- Value: Backend URL'iniz (örn: `https://your-app.railway.app`)
- Environment: **Production, Preview, Development** (hepsi için!)

❌ **Eğer yoksa:**
1. Add New → Key: `NEXT_PUBLIC_API_URL`
2. Value: Backend URL'inizi girin
3. Environment: Production ✅ Preview ✅ Development ✅
4. Save
5. **Mutlaka Redeploy yapın!**

### 2. Backend URL Formatı

✅ **Doğru:**
```
https://your-app.railway.app
https://your-app.onrender.com
https://api.feellink.com
```

❌ **Yanlış:**
```
http://localhost:3002
http://192.168.1.6:3002
backend-url.com (http/https eksik)
your-app.railway.app (https eksik)
```

### 3. Redeploy

Environment variable ekledikten sonra:
1. **Deployments** sekmesine git
2. Son deployment'ın yanındaki **⋮** (üç nokta) menüsüne tıkla
3. **Redeploy** seç
4. Build tamamlanana kadar bekle (2-3 dakika)

### 4. Backend CORS Kontrolü

Backend'inizin CORS ayarlarında Vercel URL'inizi ekleyin:

**Backend (NestJS) - `main.ts`:**
```typescript
const allowedOrigins = [
  'https://your-app.vercel.app',
  'https://your-app-git-main.vercel.app', // Preview deployments için
  // ... diğer origin'ler
]
```

### 5. Backend Health Check

Backend'inizin çalıştığını kontrol edin:
```bash
curl https://your-backend-url.com/health
```

**Beklenen yanıt:**
```json
{"status":"ok","timestamp":"...","service":"Feellink Backend API"}
```

---

## 🔍 Debug Adımları

### Vercel Logları

1. Vercel Dashboard → **Deployments**
2. Son deployment'a tıkla
3. **Functions** sekmesine git
4. Hata loglarını kontrol et
5. `[API]` ile başlayan logları ara

### Tarayıcı Console

1. F12 → **Console**
2. Kırmızı hata mesajlarını kontrol et
3. **Network** sekmesinde failed request'leri kontrol et

### Hangi Sayfada Hata?

Hangi sayfada Internal Server Error alıyorsunuz?
- Ana sayfa (`/`)
- Feed (`/feed`)
- Login (`/login`)
- Admin (`/admin`)
- Başka bir sayfa?

Bu bilgiyi paylaşın, spesifik çözüm sunabilirim.

---

## 🚨 Yaygın Hatalar ve Çözümleri

### "NEXT_PUBLIC_API_URL is not defined"

✅ **Çözüm:**
- Vercel'de Environment Variable ekleyin
- Redeploy yapın

### "Network Error" veya "CORS Error"

✅ **Çözüm:**
- Backend CORS ayarlarını kontrol edin
- Vercel URL'ini backend CORS'a ekleyin

### "502 Bad Gateway"

✅ **Çözüm:**
- Backend'inizin çalıştığını kontrol edin
- Backend URL'inin doğru olduğunu kontrol edin

### "500 Internal Server Error"

✅ **Çözüm:**
- Vercel loglarını kontrol edin
- Environment variable'ların doğru olduğunu kontrol edin
- Redeploy yapın

---

## ✅ Test Checklist

Deploy sonrası test edin:

- [ ] Ana sayfa açılıyor mu? (`/`)
- [ ] Login sayfası açılıyor mu? (`/login`)
- [ ] Feed sayfası açılıyor mu? (`/feed`)
- [ ] API çağrıları çalışıyor mu? (Network sekmesinde kontrol)
- [ ] Backend'e bağlanabiliyor mu? (Console'da hata yok mu?)

---

## 📞 Hala Sorun Var?

1. Vercel loglarını paylaşın
2. Backend loglarını paylaşın
3. Hangi sayfada hata aldığınızı belirtin
4. Environment variable'ların screenshot'ını paylaşın

