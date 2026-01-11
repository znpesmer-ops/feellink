# Frontend'i Yeniden Başlatma

## Hızlı Çözüm

### 1. Frontend Dev Server'ını Durdur
Terminal'de `Ctrl+C` ile durdur (eğer çalışıyorsa)

### 2. Frontend'i Yeniden Başlat
```bash
cd frontend
pnpm dev
```

veya

```bash
cd frontend
npm run dev
```

### 3. Browser Cache Temizle
- Chrome/Edge: `Ctrl+Shift+R` (Windows) veya `Cmd+Shift+R` (Mac)
- Veya Developer Tools → Network → "Disable cache" işaretle → Sayfayı yenile

---

## Vercel Production İçin

### 1. Değişiklikleri GitHub'a Push Et
```bash
git add .
git commit -m "fix: layout kırılması düzeltildi - min-h-screen kaldırıldı"
git push
```

### 2. Vercel Otomatik Deploy
- GitHub'a push edince Vercel otomatik deploy başlatır
- Vercel dashboard'dan deploy durumunu kontrol et
- Deploy tamamlandıktan sonra (2-3 dakika) sayfayı yenile

### 3. Browser Cache Temizle
Production'da da cache temizlemen gerekebilir:
- Hard refresh: `Ctrl+Shift+R` veya `Cmd+Shift+R`
- Veya incognito/private window'da test et

---

## Sorun Devam Ederse

1. **Browser DevTools'u aç** (F12)
2. **Console'da hata var mı kontrol et**
3. **Network tab'da** dosyaların güncel versiyonlarını yüklediğini kontrol et
4. **Application → Clear Storage** ile tüm cache'i temizle
