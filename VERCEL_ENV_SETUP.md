# Vercel Environment Variables Kurulumu

## Görsellerin Gözükmesi İçin Gerekli

Vercel Dashboard → Project → Settings → Environment Variables bölümüne şu değişkenleri ekle:

### Production Environment

1. **NEXT_PUBLIC_API_URL**
   - Value: Backend API URL'in
   - **Backend URL'ini bulmak için:** `BACKEND_URL_BULMA.md` dosyasına bak
   - Environment: Production, Preview, Development (hepsine ekle)

2. **NEXT_PUBLIC_BACKEND_URL** (opsiyonel, NEXT_PUBLIC_API_URL ile aynı olabilir)
   - Value: Backend URL'in (görseller için) - **NEXT_PUBLIC_API_URL ile aynı değeri kullan**
   - Environment: Production, Preview, Development

### 🔍 Backend URL'ini Nasıl Bulurum?

**Eğer backend henüz deploy edilmediyse:**
- Backend'i önce deploy etmen gerekiyor (Railway, Render, Heroku, vs.)
- Detaylar için: `BACKEND_URL_BULMA.md` dosyasına bak

**Eğer backend zaten deploy edildiyse:**
- Backend'in deploy edildiği platform'a git (Railway, Render, vs.)
- Deployment URL'ini kopyala
- Bu URL'i kullan

### Örnek Değerler

**Railway kullanıyorsan:**
- `NEXT_PUBLIC_API_URL` = `https://feellink-backend.up.railway.app`
- `NEXT_PUBLIC_BACKEND_URL` = `https://feellink-backend.up.railway.app`

**Render kullanıyorsan:**
- `NEXT_PUBLIC_API_URL` = `https://feellink-backend.onrender.com`
- `NEXT_PUBLIC_BACKEND_URL` = `https://feellink-backend.onrender.com`

**Cloudflare Tunnel kullanıyorsan (local backend için):**
- `NEXT_PUBLIC_API_URL` = `https://xxxxx.trycloudflare.com`
- `NEXT_PUBLIC_BACKEND_URL` = `https://xxxxx.trycloudflare.com`

## Adımlar

1. Vercel Dashboard'a git
2. Projeni seç
3. Settings → Environment Variables
4. Her değişken için:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: Backend URL'in
   - Environment: Production, Preview, Development (hepsini seç)
   - Add butonuna tıkla
5. Deploy'u yeniden başlat (Redeploy)

## Not

Environment variable'ları ekledikten sonra yeni bir deploy gerekir. Vercel otomatik olarak yeni deploy başlatır veya manuel olarak "Redeploy" yapabilirsin.
