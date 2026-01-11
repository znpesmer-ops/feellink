# Vercel Environment Variables Kurulumu

## Görsellerin Gözükmesi İçin Gerekli

Vercel Dashboard → Project → Settings → Environment Variables bölümüne şu değişkenleri ekle:

### Production Environment

1. **NEXT_PUBLIC_API_URL**
   - Value: Backend API URL'in (örn: `https://api.feellink.io` veya `https://backend.feellink.io`)
   - Environment: Production, Preview, Development (hepsine ekle)

2. **NEXT_PUBLIC_BACKEND_URL** (opsiyonel, NEXT_PUBLIC_API_URL ile aynı olabilir)
   - Value: Backend URL'in (görseller için)
   - Environment: Production, Preview, Development

### Örnek Değerler

Eğer backend'iniz:
- `https://api.feellink.io` üzerinde çalışıyorsa:
  - `NEXT_PUBLIC_API_URL` = `https://api.feellink.io`
  - `NEXT_PUBLIC_BACKEND_URL` = `https://api.feellink.io`

- `https://backend.feellink.io` üzerinde çalışıyorsa:
  - `NEXT_PUBLIC_API_URL` = `https://backend.feellink.io`
  - `NEXT_PUBLIC_BACKEND_URL` = `https://backend.feellink.io`

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
