# 🔍 SAVED POST DB KONTROLÜ

## SORUN:
- "Gönderi kaydedildi" toast'ı geliyor ✅
- AMA Kaydedilenler boş ❌
- Backend boş array dönüyor

---

## MUHTEMEL SEBEPLER:

### 1️⃣ USER ID UYUŞMAZLIĞI
```javascript
// Save yaparken:
POST /posts/{id}/save
→ user.id = "694bdd003cc9f2928af31f28" (sudesmer001)

// Get yaparken:
GET /posts/saved
→ user.id = "123abc..." (FARKLI BİR USER!)
```

**ÇÖZÜM:** Backend log'larında userId'leri karşılaştır!

---

### 2️⃣ POST TYPE UYUŞMAZLIĞI
```javascript
// Eğer artwork kaydedildiyse:
POST /posts/{id}/save-artwork
→ SavedArtwork tablosuna yazar

// AMA frontend normal post sanıyor:
POST /posts/{id}/save
→ SavedPost tablosuna yazar

// Ve GET /posts/saved HER İKİSİNİ DE okuyor
→ AMA filter atlarsa boş döner!
```

**ÇÖZÜM:** Kaydettiğin gönderinin type'ını kontrol et!

---

### 3️⃣ BACKEND DEPLOY OLMADI
```javascript
// Eski backend kodu hala çalışıyor
// Yeni log'lar görünmüyor
```

**ÇÖZÜM:** Vercel deployment status'unu kontrol et!

---

## 🎯 HEMEN KONTROL ET:

### A) VERCEL BACKEND LOG'LARI:

1. https://vercel.com/znpesmer-ops/feellink-backend/deployments
2. En son deployment "Ready" mi?
3. Logs tab → Filter: `savePost`
4. Şunu ara:

```
💾 [savePost] User 694bdd003cc9f2928af31f28 saving post 696e4a29290dcdcfac258194
✅ [savePost] Post found: 696e4a29290dcdcfac258194
💾 [savePost] Creating new savedPost entry...
✅ [savePost] SavedPost created successfully: 67a...
```

**EĞER BULAMAZSAN:**
- Backend deploy olmadı!
- VEYA farklı post ID'si ile save yapılıyor!

---

### B) CONSOLE'DA POST ID'Yİ BUL:

1. F12 → Console
2. Filter: `PostModal`
3. Kaydet butonuna bas
4. Şunu ara:

```javascript
💾 [PostModal] Saving post 696e4a29290dcdcfac258194: {
  isArtwork: false,  ← ❗ Bu ne?
  endpoint: '/posts/696e4a29290dcdcfac258194/save',
  ...
}
✅ [PostModal] Saved successfully: { success: true, ... }
```

**`isArtwork: true` İSE:**
- Artwork kaydediliyor → SavedArtwork tablosu
- Backend getSavedPosts bunu da okumalı!

---

### C) NETWORK TAB'DA USER ID'Yİ BUL:

1. F12 → Network
2. Filter: `saved`
3. `GET /posts/saved` → Headers tab
4. Authorization token'ı kopyala
5. https://jwt.io → Token'ı decode et
6. `sub` (user ID) ne? → "694bdd003cc9f2928af31f28" mi?

---

## 🔥 HIZLI TEST:

**Şunu dene:**

1. ✅ **Başka bir gönderi kaydet** (farklı birinden)
2. ✅ **Console'da şunu bul:**
```javascript
💾 [PostModal] Saving post {POST_ID}: { isArtwork: ?, endpoint: '...' }
✅ [PostModal] Saved successfully
```
3. ✅ **POST_ID'yi kopyala**
4. ✅ **Vercel backend log'larında ara:**
```
💾 [savePost] User ... saving post {POST_ID}
✅ [savePost] SavedPost created successfully
```

**EĞER VERCEL LOG'LARINDA BULAMAZSAN:**
- Backend deploy olmadı!
- Eski kod çalışıyor!
- Redeploy gerekir!

---

## 📸 SCREENSHOT ALACAK YERLER:

1. ✅ Console → PostModal Saving log'ları (POST_ID + isArtwork)
2. ✅ Console → SavedPostsGrid log'ları (BOŞ ARRAY)
3. ✅ Vercel Logs → savePost aramasi (POST_ID bulunuyor mu?)
4. ✅ Vercel Logs → getSavedPosts aramasi (userId + RAW QUERY RESULT)

---

**BU BİLGİLERİ TOPLA, KESIN ÇÖZECEĞ İZ! 🚀**
