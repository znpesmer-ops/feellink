# Vercel Cache Temizleme - Adım Adım Rehber

## 🎯 Cache Temizliği Nasıl Yapılır?

### Yöntem 1: Redeploy ile Cache Temizleme (ÖNERİLEN)

1. **Vercel Dashboard'a Git**
   - https://vercel.com/dashboard
   - `feellink-backend` projesini aç

2. **Deployments Sekmesine Git**
   - Sol menüden **"Deployments"** sekmesine tıkla
   - Veya proje sayfasında **"Deployments"** tab'ına tıkla

3. **En Son Deployment'ı Bul**
   - En üstteki (en yeni) deployment'ı bul
   - Sağ tarafta **"..."** (üç nokta) butonuna tıkla

4. **Redeploy Seçeneğini Aç**
   - Açılan menüden **"Redeploy"** seçeneğine tıkla

5. **Cache Temizliği Ayarları**
   - Açılan popup'ta **"Use existing Build Cache"** seçeneğini **KAPAT** ❌
   - Bu seçenek kapalı olmalı (checkbox işaretli olmamalı)

6. **Redeploy Başlat**
   - **"Redeploy"** butonuna tıkla
   - Deploy başlayacak

### Yöntem 2: Settings'ten Cache Temizleme

1. **Vercel Dashboard → `feellink-backend` → Settings**

2. **General Sekmesi**

3. **"Clear Build Cache" Butonu**
   - Sayfanın altında **"Clear Build Cache"** butonunu bul
   - Butona tıkla
   - Onay ver

4. **Manuel Redeploy**
   - Cache temizlendikten sonra
   - **Deployments** sekmesine git
   - **"..."** → **"Redeploy"** yap

## ✅ Cache Temizliği Sonrası Kontrol

### 1. Build Logs Kontrol

Deploy başladıktan sonra:

1. **Deployments** → En son deployment → **"Build Logs"** sekmesine tıkla
2. Kontrol et:
   - ✅ `pnpm install` başarılı mı?
   - ✅ `pnpm prisma generate` başarılı mı?
   - ✅ `pnpm build` başarılı mı?
   - ❌ `isemail` hatası YOK mu?
   - ❌ `pdf-lib`, `sharp`, `stripe` hataları YOK mu?

### 2. Health Check Test

Deploy tamamlandıktan sonra:

```bash
curl https://feellink-backend.vercel.app/health
```

**Beklenen:**
```json
{"status":"ok"}
```

### 3. Runtime Logs Kontrol

1. **Vercel Dashboard** → **Logs** sekmesi
2. **Runtime Logs** bölümüne bak
3. Kontrol et:
   - ❌ "Cannot find module 'isemail'" hatası YOK
   - ✅ "🚀 Feellink backend initialized for Vercel" mesajı var

## 🔍 Sorun Devam Ederse

### Hata: "Cannot find module 'isemail'"

**Çözüm:**
1. Build Logs'da `pnpm build` başarılı mı kontrol et
2. **"Use existing Build Cache"** seçeneğinin **KAPALI** olduğundan emin ol
3. Tekrar redeploy yap

### Hata: Eski build çıktısı kullanılıyor

**Çözüm:**
1. **Settings** → **General** → **"Clear Build Cache"** butonuna tıkla
2. **Deployments** → **"..."** → **"Redeploy"** yap
3. **"Use existing Build Cache"** seçeneğini **KAPAT**

## 📝 Önemli Notlar

- **"Use existing Build Cache" KAPALI olmalı** - Yeni build yapılmalı
- **Cache temizliği ZORUNLU** - Eski build çıktısı cache'de kalabilir
- **Deploy süresi:** 2-5 dakika (cache temizliği ile birlikte)

## ✅ Başarı Kriterleri

1. ✅ Build başarılı (yeşil ✅)
2. ✅ Health check: `{"status":"ok"}`
3. ✅ Runtime Logs'da `isemail` hatası YOK
4. ✅ Frontend'den login çalışıyor

---

**Özet:** Deployments → "..." → Redeploy → "Use existing Build Cache" KAPAT → Redeploy
