# 🔍 KAYDEDİLENLER DEBUG KILAVUZU

## DURUM:
- ✅ Frontend: Post "kaydedildi" olarak gözüküyor (turuncu bookmark)
- ❌ Backend: Kaydedilenler sayfasında gözükmüyor

---

## 1️⃣ BROWSER CONSOLE'U AÇ (F12)

**Chrome Developer Tools:**
1. **F12** veya **Cmd+Option+I** (Mac)
2. **Console** tab'ına git
3. **Filter** kutusuna yaz: `SavedPostsGrid`

**ARANAN LOG'LAR:**

```javascript
// ✅ Başarılı ise:
🔖 [SavedPostsGrid] Fetching saved posts...
✅ [SavedPostsGrid] SUCCESS - Response: { status: 200, length: X }
✅ [SavedPostsGrid] Final result: X posts
✅ [SavedPostsGrid] İLK POST DETAYI: { id: '...', caption: '...' }

// ❌ Hata varsa:
❌ [SavedPostsGrid] FETCH ERROR DETAY: { status: 500, message: '...' }
⚠️ [SavedPostsGrid] BOŞ ARRAY - Backend query başarısız
```

---

## 2️⃣ NETWORK TAB'I AÇ

**Chrome Developer Tools:**
1. **Network** tab'ına git
2. **Filter** kutusuna yaz: `saved`
3. **Kaydedilenler** sekmesine tıkla
4. **`saved`** isteğine tıkla

**KONTROL ET:**

| Alan | Beklenen | Hatalı |
|------|----------|--------|
| **Status** | `200 OK` | `500 Internal Server Error` |
| **Response** | `[{ id: '...', post: {...} }]` | `{ error: '...' }` |
| **Size** | `> 0 KB` | `0.1 KB` (boş) |

---

## 3️⃣ BACKEND DEPLOY KONTROLÜ

**Vercel Dashboard:**
1. https://vercel.com/dashboard
2. **feellink-backend** projesini aç
3. **Deployments** → Son deployment:
   - **Commit:** `ba04a37c` (CRITICAL - Storage + Saved posts stabilization)
   - **Status:** ✅ Ready (yeşil)
   - **Time:** < 5 dakika önce

**ENV KONTROLÜ:**
1. **Settings** → **Environment Variables**
2. **`BLOB_READ_WRITE_TOKEN`** var mı?
   - ✅ Var → OK
   - ❌ Yok → **EKLE!** (Vercel Storage → Blob → Create token)

---

## 4️⃣ MANUEL TEST

**Adımlar:**
1. Yeni bir gönderi kaydet (turuncu bookmark)
2. **Hard Refresh** (Ctrl+Shift+R / Cmd+Shift+R)
3. **Profil** → **Kaydedilenler** sekmesine git
4. Console ve Network tab'ı gözlemle

---

## 🚨 MUHTEMEL SORUNLAR VE ÇÖZÜMLER

### A) Backend 500 Error

**Sebep:** `BLOB_READ_WRITE_TOKEN` eksik veya media null

**Çözüm:**
```bash
# Vercel Dashboard:
Settings → Environment Variables → Add:
BLOB_READ_WRITE_TOKEN = vercel_blob_xxx...

# Sonra manual redeploy!
```

### B) Backend 200 ama Boş Array `[]`

**Sebep:** DB'de kayıt var ama media URL null (bozuk upload)

**Çözüm:**
- Backend'de NULL-safe filter eklendi (commit `6531d83c`)
- Backend deploy tamamlanana kadar bekle

### C) Frontend 200 ama UI güncellemiyor

**Sebep:** React Query cache eski veri gösteriyor

**Çözüm:**
```javascript
// Console'da çalıştır:
window.location.reload(true) // Hard refresh
```

### D) Artwork kayıtlı ama gözükmüyor

**Sebep:** Backend sadece `SavedPost` query ediyordu, `SavedArtwork` unutulmuştu

**Çözüm:**
- Backend'de `Promise.all` ile ikisi birlikte query ediliyor (commit `6531d83c`)
- Backend deploy tamamlanana kadar bekle

---

## 📊 BACKEND LOG'LARI

**Vercel → Backend → Functions → Logs:**

**Aranan:**
```
✅ [getSavedPosts] Found X posts + Y artworks
✅ [getSavedPosts] Valid items: Z (sorted by date)
```

**Hata varsa:**
```
❌ [getSavedPosts] ERROR: ...
⚠️ Skipping post without media: ...
⚠️ Skipping post with null media URL: ...
```

---

## ⏰ BEKLENTİ

**Backend Deploy Süresi:** 2-3 dakika  
**Frontend Deploy Süresi:** 1-2 dakika

**SON COMMIT'LER:**
- Backend: `ba04a37c` (Storage + Saved posts stabilization)
- Frontend: `13425368` ("Gönderi" yazısı kaldırıldı)

---

**ŞİMDİ NE YAPMALIYIM?**

1. ✅ **Console log'larını göster** (screenshot)
2. ✅ **Network tab'ı göster** (`/posts/saved` request)
3. ✅ **Vercel backend deploy durumu** (Ready mi?)

Bu bilgilerle **TAM** olarak nerede takıldığını göreceğiz!
