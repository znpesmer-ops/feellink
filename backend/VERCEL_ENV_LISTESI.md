# feellink-backend – Vercel Environment Variables Listesi

Vercel → **feellink-backend** → **Settings** → **Environment Variables** → aşağıdakileri **Production** (ve istersen Preview) için ekle.

**Build ayarları:** Projede **Root Directory** mutlaka **`backend`** olmalı. **Build Command** ve **Install Command** boş bırak (veya Vercel’in otomatik kullanmasına izin ver); `backend/vercel.json` içindeki komutlar kullanılsın. Framework Preset **Other** veya **None** olsun (Next.js seçili olmasın).

---

## Zorunlu (olmadan deploy/app çalışmaz)

| Key | Açıklama | Örnek değer |
|-----|----------|-------------|
| **DATABASE_URL** | MongoDB bağlantı adresi (Prisma) | `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/feellink?retryWrites=true&w=majority` |
| **JWT_SECRET** | Giriş token’ları için gizli anahtar | Uzun rastgele string (örn. `openssl rand -base64 48`) |

**Not:** Backend önce **DATABASE_URL** arar; yoksa **MONGODB_URI** veya **DATABASE_URI** kullanır. En doğrusu **DATABASE_URL** eklemek.

**"Veritabanı bağlantısı kurulamadı" alıyorsan:**  
1. [vercel.com](https://vercel.com) → **feellink-backend** projesi → **Settings** → **Environment Variables**  
2. **Key:** `DATABASE_URL`  
3. **Value:** MongoDB connection string (örn. `mongodb+srv://kullanici:sifre@cluster0.xxxxx.mongodb.net/feellink?retryWrites=true&w=majority`)  
4. **Environment:** Production (ve istersen Preview) işaretle → **Save**  
5. **Deployments** sekmesine git → son deployment’ta **⋯** → **Redeploy** (env’ler yeni deploy’da yüklenir)

---

## Önerilen (site düzgün çalışsın)

| Key | Açıklama | Örnek değer |
|-----|----------|-------------|
| **FRONTEND_URL** | Frontend adresi (linkler, e-posta) | `https://feellink.io` |
| **BLOB_READ_WRITE_TOKEN** | Dosya yükleme (profil/gönderi fotoğrafı) | Vercel Storage → Blob → token |
| **NODE_ENV** | Ortam | `production` |
| **BASE_URL** | Backend’in kendi URL’i (bazı servisler kullanıyor) | `https://feellink-backend.vercel.app` |

**PORT** → Vercel otomatik set eder, eklemen gerekmez.

---

## Blob (dosya yükleme) nasıl eklenir?

Profil fotoğrafı ve gönderi medyası için Vercel Blob kullanıyorsun. Token’ı şöyle oluşturup backend’e bağlarsın:

1. **Vercel Dashboard** → [vercel.com](https://vercel.com) → giriş yap.
2. **feellink-backend** projesini aç (veya Blob’u bağlayacağın proje).
3. Üst menüden **Storage** sekmesine git.
4. **Create Database** → **Blob** seç → **Continue**.
5. **Access:** Public (profil/gönderi resimleri herkese açık olsun) veya Private seç.
6. Store adı ver (örn. `feellink-blob`) → **Create**.
7. Oluşturduktan sonra **Connect to Project** (veya “Add to Project”) ile bu store’u **feellink-backend** projesine bağla.
8. Environment olarak **Production** (ve istersen Preview) işaretle → bağla.

Bu adımlardan sonra Vercel, **BLOB_READ_WRITE_TOKEN** değişkenini projeye otomatik ekler. Backend’deki `MediaService` bu token’ı kullanır; ekstra env eklemen gerekmez.

**Kendi elinle env eklemek istersen:**  
Storage → Blob store’unu seç → **Settings** / **.env** kısmından token’ı kopyala → **feellink-backend** → **Settings** → **Environment Variables** → Key: `BLOB_READ_WRITE_TOKEN`, Value: (kopyaladığın token), Environment: Production → Save.

**Lokal geliştirme:** Token’ı kullanmak için `vercel env pull` ile çekebilir veya `.env` dosyana `BLOB_READ_WRITE_TOKEN=...` ekleyebilirsin.

---

## E-posta (şifre sıfırlama, bildirim – opsiyonel)

| Key | Açıklama | Örnek değer |
|-----|----------|-------------|
| **MAIL_MODE** | Mail modu | `production` veya `dev` |
| **SMTP_HOST** | SMTP sunucusu | `smtp.gmail.com` |
| **SMTP_PORT** | Port | `587` |
| **SMTP_USER** | E-posta adresi | `noreply@feellink.io` veya Gmail |
| **SMTP_PASS** | Şifre / uygulama şifresi | — |
| **MAIL_FROM** | Gönderen adres | `info@feellink.io` |
| **MAIL_FROM_NAME** | Gönderen adı | `feellink` |
| **SUPPORT_EMAIL** | Destek e-postası | `destek@feellink.io` |

---

## Opsiyonel (ek özellikler)

| Key | Açıklama |
|-----|----------|
| **REDIS_HOST** | Redis (Bildirim/queue) – Vercel’de genelde Redis eklentisi |
| **REDIS_PORT** | `6379` |
| **MEILISEARCH_HOST** | Arama servisi |
| **MEILISEARCH_API_KEY** | Meilisearch API key |
| **MINIO_ENDPOINT** | MinIO (BLOB kullanmıyorsan) |
| **MINIO_PORT** | `9000` |
| **MINIO_BUCKET_NAME** | Bucket adı |
| **CDN_BASE_URL** | CDN/base URL (MinIO veya Blob URL’i) |

---

## Kopyala-yapıştır için (sadece key’ler)

Vercel’e tek tek eklerken **Key** olarak kullan:

```
DATABASE_URL
JWT_SECRET
FRONTEND_URL
BLOB_READ_WRITE_TOKEN
NODE_ENV
BASE_URL
MAIL_MODE
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
MAIL_FROM
MAIL_FROM_NAME
SUPPORT_EMAIL
```

En azından **DATABASE_URL** ve **JWT_SECRET** mutlaka dolu olmalı; yoksa deploy oluşsa bile runtime’da hata alırsın.
