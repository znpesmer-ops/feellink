# Railway Domain + Build Hatası - Hızlı Çözüm

## 🌐 Domain Konusu (Hızlı)

Railway'de custom domain eklerken DNS kayıtlarını GoDaddy'de düzenlemen **GEREKMİYOR** şimdilik. 

**Şimdilik yapılacaklar:**
1. Railway modal'ını kapat ("Dismiss" tıkla)
2. Build hatasını önce çöz
3. Domain'i sonra halledersin

Railway otomatik domain'i kullanabilirsin: `feellink-production.up.railway.app`

## 🔴 ASIL SORUN: Build Hatası

Railway hala `--frozen-lockfile` kullanıyor. **Railway Dashboard'dan manuel düzeltme ZORUNLU.**

## ✅ KESİN ÇÖZÜM (2 Dakika)

### Railway Dashboard'dan Build Command'ı Değiştir

1. **Railway Dashboard → Service → Settings**
   - Modal'ı kapat (Dismiss)
   - Sol menüden **"Settings"** tıkla

2. **Build & Deploy Bölümünü Bul**
   - Sayfayı aşağı kaydır
   - **"Build"** bölümünü bul
   - **"Build Command"** alanını bul

3. **Build Command'ı Değiştir**
   - Mevcut komutu sil
   - Şu komutu yaz:
     ```
     pnpm install --no-frozen-lockfile && pnpm build
     ```
   - **ÖNEMLİ:** `--no-frozen-lockfile` flag'i OLMALI!

4. **Start Command'ı Ayarla**
   - **"Start Command"** alanına:
     ```
     pnpm start:prod
     ```

5. **Port'u Ayarla**
   - **"Networking"** bölümüne git
   - **"Enter the port your app is listening on"** alanına:
     ```
     3002
     ```
   - (8080 değil, 3002!)

6. **Save**
   - **"Save"** butonuna tıkla

7. **Redeploy**
   - **"Deployments"** sekmesine git
   - En son deployment'a tıkla
   - **"Redeploy"** butonuna tıkla

## 🎯 Özet

**Yapılacaklar (sırayla):**
1. ✅ Modal'ı kapat (domain şimdilik önemli değil)
2. ✅ Build Command: `pnpm install --no-frozen-lockfile && pnpm build`
3. ✅ Start Command: `pnpm start:prod`
4. ✅ Port: `3002`
5. ✅ Save
6. ✅ Redeploy

**Domain konusu:**
- Şimdilik Railway otomatik domain'i kullan: `feellink-production.up.railway.app`
- Domain'i sonra halledersin (GoDaddy'de DNS kayıtları gerekli ama şimdilik önemli değil)

## 🚀 Test

Deploy tamamlandıktan sonra:
1. Railway → Service → Settings → Domain'i kopyala
2. Tarayıcıda: `https://your-url.railway.app/api` aç
3. Swagger UI görünmeli ✅
