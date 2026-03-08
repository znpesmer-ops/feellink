# Vercel Backend – Environment Variables (Ne Yazılacak)

Backend projesini Vercel’de deploy ederken **Settings → Environment Variables** kısmına aşağıdakileri ekleyin. Değerleri kendi hesap/panel bilgilerinizle doldurun.

---

## Zorunlu (olmadan backend çalışmaz)

### 1. `DATABASE_URL` (MongoDB bağlantı adresi)

Projede **PostgreSQL değil, MongoDB** kullanılıyor.

- **Nereden alınır:** [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (ücretsiz cluster açabilirsiniz).
- Atlas’ta: **Database → Connect → Connect your application** → connection string’i kopyalayın.
- Şifre ve DB adını kendinize göre değiştirin.

**Örnek format:**
```bash
mongodb+srv://KULLANICI_ADI:SIFRE@cluster0.xxxxx.mongodb.net/feellink?retryWrites=true&w=majority
```

- `KULLANICI_ADI` → Atlas’ta oluşturduğunuz database user.
- `SIFRE` → O kullanıcının şifresi (özel karakter varsa URL-encode edin, örn. `@` → `%40`).
- `cluster0.xxxxx.mongodb.net` → Cluster’ınızın adresi (Atlas’ta yazar).
- `feellink` → Veritabanı adı (istediğiniz ismi verebilirsiniz).

**Vercel’e:** Value kısmına bu tek satırı yapıştırın (tırnak koymayın).

---

### 2. `JWT_SECRET` (Giriş token’ları için gizli anahtar)

- Uzun, rastgele bir string olmalı. Production’da **mutlaka** kendiniz üretin.
- Örnek üretmek için: `openssl rand -base64 48` (terminal) veya [randomkeygen.com](https://randomkeygen.com) benzeri bir site.

**Örnek (gerçekte kendi ürettiğinizi kullanın):**
```bash
JWT_SECRET=super_gizli_uzun_rastgele_string_buraya_48_karakter_civarı
```

**Vercel’e:** Value kısmına sadece bu string’i yapıştırın.

---

## Önemli (site ve medya düzgün çalışsın diye)

### 3. `FRONTEND_URL` (Frontend adresi)

- Canlı sitede feellink.io kullanıyorsanız:

```bash
FRONTEND_URL=https://feellink.io
```

- Hem www hem de www’suz kullanacaksanız yine `https://feellink.io` yeterli (yönlendirmeyi Vercel/DNS’te yaparsınız).

---

### 4. `BLOB_READ_WRITE_TOKEN` (Dosya yükleme – Vercel Blob)

- Gönderi fotoğrafı, profil fotoğrafı vb. yüklemek için kullanılıyor.
- **Nereden:** Vercel Dashboard → **Storage** → **Create Database / Blob** → Blob store oluşturun → **.env** veya connection bilgilerinden **token**’ı alın.
- Vercel, bazen bu token’ı otomatik env olarak ekler; yoksa siz **Environment Variables**’a yapıştırın.

**Örnek (gerçek değil, sadece format):**
```bash
vercel_blob_rw_xxxxxxxxxxxx_yyyyyyyyyyyy
```

---

## E-posta (şifre sıfırlama, bildirim vb.)

**Önemli:** Bu ayarlar sadece **sizin uygulamanızın** e-posta göndermesi için (şifre sıfırlama, bildirim vb.). **Üyeler hangi adresle kayıt olur?** → Gmail, Outlook, kurumsal, Yahoo… **İstedikleri e-posta adresiyle** kayıt olabilirler; backend bunu kısıtlamaz. SMTP ile sadece “mailler hangi hesaptan gidecek” belirlenir.

Aşağıdakileri **hepsini** doldurursanız e-posta gönderme çalışır. Boş bırakırsanız uygulama çalışır ama mail gönderilmez (veya dev modunda log’a yazar).

### Farklı “gönderen” seçenekleri (birini seçin)

| Sağlayıcı | SMTP_HOST | SMTP_PORT | SMTP_USER | SMTP_PASS |
|-----------|-----------|-----------|-----------|-----------|
| **Gmail** | `smtp.gmail.com` | `587` | Gmail adresiniz | [Uygulama şifresi](https://myaccount.google.com/apppasswords) (2 adım açık) |
| **Outlook / Microsoft 365** | `smtp.office365.com` | `587` | Outlook/M365 adresiniz | Hesap şifresi |
| **Kurumsal (örn. info@feellink.io)** | Hosting’inizin SMTP adresi (örn. `mail.feellink.io`) | `587` veya `465` | `info@feellink.io` vb. | O hesabın şifresi |
| **SendGrid / Mailgun** | API kullanır (kod tarafında farklı entegrasyon gerekir) | — | — | API key |

MAIL_FROM / MAIL_FROM_NAME’i istediğiniz “gönderen” adına göre ayarlayın (örn. `info@feellink.io`, `feellink`).

### 5. `MAIL_MODE`
```bash
MAIL_MODE=production
```
- Geliştirme için `dev` yapabilirsiniz (o zaman gerçek mail gitmez).

### 6. `SMTP_HOST` (veya `MAIL_HOST`)
- Gmail: `smtp.gmail.com`
- Outlook: `smtp.office365.com`
- Kendi sunucunuz: sunucu adresi

### 7. `SMTP_PORT` (veya `MAIL_PORT`)
- Genelde `587` (TLS).

### 8. `SMTP_USER` (veya `MAIL_USER`)
- E-posta adresiniz (örn. `noreply@feellink.io` veya Gmail adresi).

### 9. `SMTP_PASS` (veya `MAIL_PASS`)
- O e-posta hesabının şifresi.
- Gmail için: “Uygulama şifresi” (2 adımlı doğrulama açıksa) kullanın.

### 10. `MAIL_FROM` ve `MAIL_FROM_NAME`
```bash
MAIL_FROM=info@feellink.io
MAIL_FROM_NAME=feellink
```

### 11. (İsteğe bağlı) `SUPPORT_EMAIL`
```bash
SUPPORT_EMAIL=destek@feellink.io
```

---

## İsteğe bağlı (ek özellikler)

- **Redis** (bildirim/cache): `REDIS_HOST`, `REDIS_PORT` (Vercel’de genelde Redis add-on kullanılır).
- **Meilisearch** (arama): `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`.
- **MinIO** (kendi depolama sunucunuz): `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_BUCKET_NAME`, `CDN_BASE_URL`.  
  Vercel’de genelde **BLOB_READ_WRITE_TOKEN** kullanıldığı için MinIO zorunlu değil.

---

## Özet tablo (Vercel’e ne yazacağınız)

| Değişken | Zorunlu? | Örnek / Açıklama |
|----------|----------|-------------------|
| `DATABASE_URL` | Evet | `mongodb+srv://user:pass@cluster....mongodb.net/feellink?retryWrites=true&w=majority` |
| `JWT_SECRET` | Evet | Uzun rastgele string (örn. 48 karakter) |
| `FRONTEND_URL` | Önerilen | `https://feellink.io` |
| `BLOB_READ_WRITE_TOKEN` | Önerilen | Vercel Blob token (dosya yükleme) |
| `MAIL_MODE` | Mail için | `production` veya `dev` |
| `SMTP_HOST` | Mail için | `smtp.gmail.com` vb. |
| `SMTP_PORT` | Mail için | `587` |
| `SMTP_USER` | Mail için | E-posta adresi |
| `SMTP_PASS` | Mail için | E-posta şifresi / uygulama şifresi |
| `MAIL_FROM` | Mail için | `info@feellink.io` |
| `MAIL_FROM_NAME` | Mail için | `feellink` |

---

**Not:** Vercel’de her değişkeni **Production** (ve gerekirse Preview) ortamına ekleyin. Değerleri asla repoya commit etmeyin; sadece Vercel Dashboard’da tutun.
