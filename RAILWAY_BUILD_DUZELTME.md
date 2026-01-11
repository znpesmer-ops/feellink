# Railway Build Hatası Düzeltme

## 🔴 Sorun: ERR_PNPM_OUTDATED_LOCKFILE

Hata mesajı:
```
ERR_PNPM_OUTDATED_LOCKFILE Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date
```

## ✅ Çözüm: Build Command'ı Düzelt

### Yöntem 1: Railway Dashboard'dan (Hızlı)

1. **Railway Dashboard → Service → Settings**
2. **Build & Deploy** sekmesine git
3. **Build Command** alanını bul
4. Şu komutu yaz:
   ```
   pnpm install && pnpm build
   ```
   (NOT: `--frozen-lockfile` flag'i olmamalı)
5. **Start Command** alanına:
   ```
   pnpm start:prod
   ```
6. **Save** tıkla
7. **Redeploy** yap

### Yöntem 2: railway.json Dosyası (Otomatik)

Projeye `railway.json` dosyası ekledim. Bu dosya Railway'in build ayarlarını otomatik yapar.

**Deploy:**
1. `railway.json` dosyasını commit et ve push et
2. Railway otomatik olarak yeni ayarları kullanır
3. Yeni deployment başlar

## 📝 Doğru Build Ayarları

**Build Command:**
```
pnpm install && pnpm build
```

**Start Command:**
```
pnpm start:prod
```

veya

```
node dist/main.js
```

## ⚠️ Önemli Notlar

1. **`--frozen-lockfile` kullanma:** Bu flag lockfile'ın güncel olmasını zorunlu kılar
2. **Lockfile güncelle:** Eğer hala hata alırsan, local'de `pnpm install` çalıştır ve lockfile'ı commit et
3. **Railway otomatik algılar:** `railway.json` dosyası varsa Railway otomatik kullanır

## 🚀 Adımlar

1. Railway Dashboard → Settings → Build Command'ı düzelt
2. Veya `railway.json` dosyasını commit et ve push et
3. Railway otomatik redeploy başlatır
4. Build başarılı olmalı ✅
