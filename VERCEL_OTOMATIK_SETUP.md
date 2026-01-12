# Vercel Backend - Otomatik Setup (5 Dakika)

## ✅ Yapılanlar

1. ✅ `backend/vercel.json` - Tüm yapılandırma hazır
2. ✅ `backend/api/index.ts` - Serverless handler hazır
3. ✅ Build command: `pnpm install && pnpm prisma generate && pnpm build`

## 🚀 Şimdi Sadece 2 Şey Yap

### 1. Vercel Dashboard'da Environment Variables Ekle

Vercel Dashboard → `feellink-backend` → Settings → Environment Variables

**Production için ekle (4 tane):**

1. **DATABASE_URL**
   - Value: PostgreSQL connection string'in
   - Environment: ✅ Production

2. **JWT_SECRET**  
   - Value: Güçlü random string (32+ karakter)
   - Örnek: `feellink-secret-$(openssl rand -hex 16)`
   - Environment: ✅ Production

3. **NODE_ENV**
   - Value: `production`
   - Environment: ✅ Production

4. **FRONTEND_URL**
   - Value: `https://www.feellink.io`
   - Environment: ✅ Production

### 2. Redeploy

Vercel Dashboard → Deployments → En son deployment → "..." → "Redeploy"

**VEYA** GitHub'a push yap (otomatik deploy başlar)

## ✅ Tamamlandı!

Deploy tamamlandıktan sonra:
- Health: `https://feellink-backend.vercel.app/health`
- Login: `https://www.feellink.io/login`

## 🔍 Sorun Olursa

Vercel Dashboard → Logs → Runtime Logs → Hata mesajını kontrol et

---

**Not:** `vercel.json` dosyasındaki tüm ayarlar hazır. Sadece environment variables eklemen yeterli!
