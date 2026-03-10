# feellink-backend Vercel – 5 Adımda Bitir

Aşağıdakileri **sırayla** yap. Her adım 1–2 dakika.

---

## Adım 1: Git’i bağla

1. **https://vercel.com/zeynep-esmers-projects/feellink-backend** sayfasını aç.
2. Üstte **Settings** sekmesine tıkla.
3. Solda **Git** bölümüne tıkla.
4. **Connected Git Repository** kısmında:
   - Eğer **“Connect Git Repository”** butonu varsa → tıkla.
   - Açılan listeden **znpesmer-ops / feellink** reposunu seç (GitHub’a bağlı değilse önce GitHub’ı bağla).
5. **Configure Project** ekranında:
   - **Root Directory** yanında **Edit** → **backend** yaz veya **backend** klasörünü seç → **Continue**.
   - **Deploy** (veya **Save**) ile bitir.

Böylece proje **znpesmer-ops/feellink** repo’suna bağlanır ve root = **backend** olur.

---

## Adım 2: Root Directory kontrolü

1. Yine **Settings** → **General** (veya **Build & Development**).
2. **Root Directory** satırına bak: **backend** yazıyor olmalı.
3. Değilse **Edit** → **backend** yaz → **Save**.

---

## Adım 3: İlk deployment’ı tetikle

Git bağlandıktan sonra:

**Seçenek A – Vercel’den:**  
**Deployments** sekmesine git. **Create Deployment** veya **Redeploy** / **Deploy** benzeri bir buton varsa tıkla (branch: **main**).

**Seçenek B – Terminalden (hook ile):**  
Daha önce çalıştırdığın komutu tekrar çalıştır (URL’yi kendi hook’unla değiştir):

```bash
curl -i -X POST "https://api.vercel.com/v1/integrations/deploy/prj_tDxKsiMJk79LDnTK6xuDIayiVV5H/5wnQVgurih"
```

Birkaç dakika bekle → **Deployments** sayfasını yenile → yeni deployment görünmeli.

---

## Adım 4: Environment Variables

1. **Settings** → **Environment Variables**.
2. Şunların **hepsi** tanımlı olsun (Production için):
   - **DATABASE_URL** (MongoDB connection string)
   - **JWT_SECRET**
   - **FRONTEND_URL** = `https://feellink.io`
   - **BLOB_READ_WRITE_TOKEN** (Vercel Blob token – varsa)
3. Eksik varsa **Add** ile ekle → **Save**.

---

## Adım 5: Kontrol

1. **Deployments** → En üstteki deployment **Ready** (yeşil) mi bak.
2. **Overview** veya **Domains**’te backend URL’i görünüyor mu bak (örn. `feellink-backend.vercel.app`).
3. Tarayıcıda `https://feellink-backend.vercel.app` (veya senin domain’in) açıp API yanıt veriyor mu dene.

---

## Özet

| Ne | Nerede |
|----|--------|
| Git bağla | Settings → Git → Connect → **znpesmer-ops/feellink**, Root: **backend** |
| Root | Settings → General / Build → **backend** |
| Deploy tetikle | Deployments’tan veya `curl -i -X POST "HOOK_URL"` |
| Env | Settings → Environment Variables (DATABASE_URL, JWT_SECRET, FRONTEND_URL, BLOB_READ_WRITE_TOKEN) |

Hepsi tamamsa feellink-backend çalışır; frontend’teki **NEXT_PUBLIC_API_URL** bu backend URL’ine işaret etmeli.
