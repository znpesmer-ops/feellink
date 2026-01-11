# Railway Build Hatası - MANUEL DÜZELTME (ZORUNLU)

## 🔴 KRİTİK: Railway Dashboard'dan Manuel Düzeltme Gerekli

Railway otomatik olarak `--frozen-lockfile` flag'i ekliyor. Bu yüzden **Railway Dashboard'dan manuel olarak build command'ı değiştirmen ZORUNLU**.

## ✅ ADIM ADIM DÜZELTME

### 1. Railway Dashboard'a Git
- https://railway.app/dashboard
- **feellink** service'ine tıkla

### 2. Settings Sekmesine Git
- Sol menüden **"Settings"** tıkla
- Veya service'in üstündeki **"Settings"** butonuna tıkla

### 3. Build & Deploy Bölümünü Bul
- Sayfayı aşağı kaydır
- **"Build & Deploy"** bölümünü bul

### 4. Build Command'ı Değiştir
- **"Build Command"** alanını bul
- Mevcut komutu sil
- Şu komutu yaz (TAM OLARAK):
  ```
  pnpm install --no-frozen-lockfile && pnpm build
  ```
  **ÖNEMLİ:** `--no-frozen-lockfile` flag'i OLMALI!

### 5. Start Command'ı Ayarla
- **"Start Command"** alanını bul
- Şu komutu yaz:
  ```
  pnpm start:prod
  ```

### 6. Save
- **"Save"** butonuna tıkla

### 7. Redeploy
- **"Deployments"** sekmesine git
- En son deployment'a tıkla
- **"Redeploy"** butonuna tıkla
- Veya yeni bir commit push et

## 📸 Görsel Rehber

Railway Dashboard → Service → Settings → Build & Deploy:

```
Build Command: [pnpm install --no-frozen-lockfile && pnpm build]
Start Command: [pnpm start:prod]
```

## ⚠️ ÖNEMLİ NOTLAR

1. **Railway otomatik flag ekliyor:** Railway CI ortamında otomatik olarak `--frozen-lockfile` ekler
2. **Manuel override ZORUNLU:** Build command'ı manuel olarak değiştirmen gerekiyor
3. **`--no-frozen-lockfile` kullan:** Bu flag Railway'in otomatik frozen-lockfile'ını override eder

## 🚀 Test

Deploy tamamlandıktan sonra:
1. Railway → Service → Settings → Domain'i kopyala
2. Tarayıcıda: `https://your-url.railway.app/api` aç
3. Swagger UI görünmeli ✅

## ✅ Doğru Ayarlar Özeti

**Build Command:**
```
pnpm install --no-frozen-lockfile && pnpm build
```

**Start Command:**
```
pnpm start:prod
```

**Port (Networking):**
```
3002
```
