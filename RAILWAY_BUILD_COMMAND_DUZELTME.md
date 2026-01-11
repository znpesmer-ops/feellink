# Railway Build Command Manuel Düzeltme

## 🔴 Sorun: Railway Hala --frozen-lockfile Kullanıyor

Railway otomatik olarak `--frozen-lockfile` flag'i ekliyor. Bunu kaldırmak için manuel ayar yapmalısın.

## ✅ Çözüm: Railway Dashboard'dan Düzelt

### Adım 1: Railway Dashboard'a Git

1. https://railway.app/dashboard
2. **feellink** service'ine tıkla
3. **Settings** sekmesine git

### Adım 2: Build Command'ı Değiştir

1. **Build & Deploy** bölümünü bul
2. **Build Command** alanını bul
3. Şu komutu yaz (tam olarak):
   ```
   pnpm install && pnpm build
   ```
   **ÖNEMLİ:** `--frozen-lockfile` flag'i OLMAMALI!

4. **Start Command** alanına:
   ```
   pnpm start:prod
   ```

5. **Save** butonuna tıkla

### Adım 3: Redeploy

1. **Deployments** sekmesine git
2. En son deployment'a tıkla
3. **"Redeploy"** butonuna tıkla
4. Veya yeni bir commit push et

## 🔍 Alternatif: Railway CLI ile

```bash
# Railway CLI yükle
npm i -g @railway/cli

# Login
railway login

# Service'e bağlan
cd backend
railway link

# Build command'ı set et
railway variables set RAILWAY_BUILD_COMMAND="pnpm install && pnpm build"
```

## ⚠️ Önemli Notlar

1. **Railway otomatik flag ekliyor:** Railway CI ortamında otomatik olarak `--frozen-lockfile` ekler
2. **Manuel override gerekli:** Build command'ı manuel olarak değiştirmen gerekiyor
3. **Lockfile güncelle:** Eğer hala hata alırsan, local'de `pnpm install` çalıştır ve lockfile'ı commit et

## 📝 Doğru Build Ayarları

**Build Command:**
```
pnpm install && pnpm build
```

**Start Command:**
```
pnpm start:prod
```

**Port:**
```
3002
```

## 🚀 Test

Deploy tamamlandıktan sonra:
1. Railway → Service → Settings → Domain'i kopyala
2. Tarayıcıda: `https://your-url.railway.app/api` aç
3. Swagger UI görünmeli ✅
