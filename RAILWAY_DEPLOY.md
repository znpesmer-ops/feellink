# Backend'i Railway'de Deploy Etme (5 Dakika)

## 🚀 Hızlı Adımlar

### 1. Railway Hesabı Oluştur
- https://railway.app → "Start a New Project"
- GitHub ile giriş yap

### 2. Yeni Proje Oluştur
- "Deploy from GitHub repo" seç
- `feellink` repo'sunu seç
- "Deploy Now" tıkla

### 3. Backend Klasörünü Deploy Et
- Railway dashboard'da "New Service" → "GitHub Repo"
- Repo'yu seç
- **Root Directory:** `backend` olarak ayarla
- "Deploy" tıkla

### 4. Environment Variables Ekle
Railway dashboard → Service → Variables sekmesinde:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/instagram_clone?schema=public
JWT_SECRET=<güçlü-random-string>
PORT=3002
NODE_ENV=production
FRONTEND_URL=https://www.feellink.io
```

**JWT_SECRET oluşturmak için:**
```bash
openssl rand -base64 32
```

### 5. PostgreSQL Ekle
- Railway dashboard → "New" → "Database" → "PostgreSQL"
- Otomatik `DATABASE_URL` oluşturulur
- Bu URL'i kopyala ve yukarıdaki `DATABASE_URL` yerine yapıştır

### 6. URL'i Al
- Railway dashboard → Service → Settings → "Generate Domain"
- Veya "Custom Domain" ekle
- URL'i kopyala (örn: `https://feellink-backend.up.railway.app`)

### 7. Vercel'de Kullan
Bu URL'i Vercel'de:
- `NEXT_PUBLIC_API_URL` = Railway URL'in
- `NEXT_PUBLIC_BACKEND_URL` = Railway URL'in (aynı)

## ⚡ Daha Hızlı: Railway CLI

```bash
# Railway CLI yükle
npm i -g @railway/cli

# Login
railway login

# Projeye bağlan
cd backend
railway init

# Deploy
railway up
```

## 📝 Notlar

- Railway ücretsiz plan: 500 saat/ay
- PostgreSQL otomatik eklenir
- URL otomatik HTTPS olur
- Her push'ta otomatik deploy
