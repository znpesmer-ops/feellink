# Feellink – Vercel’e GitHub Bağlama Rehberi

Bu repo **monorepo**: `frontend` (Next.js) ve `backend` (NestJS) ayrı klasörlerde. Vercel’de **iki ayrı proje** oluşturup ikisini de **aynı GitHub repo’suna** bağlamanız gerekir.

**GitHub repo:** https://github.com/znpesmer-ops/feellink

---

## 1. Frontend projesi (feellink.io)

1. **Vercel Dashboard** → [vercel.com/new](https://vercel.com/new)
2. **“Add New…”** → **“Project”**
3. **“Import Git Repository”** → GitHub’ı bağlayın (gerekirse). **znpesmer-ops/feellink** reposunu seçin.
4. **Configure Project** ekranında:
   - **Project Name:** `feellink` (veya mevcut adınız)
   - **Root Directory:** **“Edit”** deyip **`frontend`** seçin (önemli).
   - **Framework Preset:** Next.js (otomatik gelir)
   - **Build Command:** `npm run build` (varsayılan)
   - **Output Directory:** `.next` (varsayılan)
   - **Install Command:** `npm install`
5. **Environment Variables** (gerekirse):
   - `NEXT_PUBLIC_API_URL` = Backend URL’iniz (örn. `https://feellink-backend.vercel.app`)
6. **Deploy** tıklayın.
7. Domain: **feellink.io**’yu bu projeye bağlayın (Settings → Domains).

---

## 2. Backend projesi (feellink-backend)

1. **Vercel Dashboard** → **“Add New…”** → **“Project”**
2. Aynı repo’yu tekrar seçin: **znpesmer-ops/feellink**
3. **Configure Project** ekranında:
   - **Project Name:** `feellink-backend`
   - **Root Directory:** **“Edit”** deyip **`backend`** seçin (önemli).
   - Framework: **Other** (veya Vercel’in otomatik tanıdığı)
   - **Build Command:** `npm install --legacy-peer-deps && npx prisma generate && npm run build`
   - **Output Directory:** boş bırakın (backend’de .next yok)
   - **Install Command:** `npm install --legacy-peer-deps`
4. **Environment Variables** (mutlaka ekleyin):
   - `DATABASE_URL` – PostgreSQL bağlantı dizesi (Prisma için)
   - Diğer env’ler (JWT, MinIO, Meilisearch vb. – backend’deki `.env.example`’a bakın)
5. **Deploy** tıklayın.
6. Domain: Backend’e **feellink-backend.vercel.app** veya kendi domain’iniz (örn. `api.feellink.io`) bağlayabilirsiniz.

---

## 3. Özet

| Proje   | Root Directory | Repo              | Domain (örnek)              |
|---------|----------------|-------------------|-----------------------------|
| Frontend| `frontend`     | znpesmer-ops/feellink | feellink.io                 |
| Backend | `backend`      | znpesmer-ops/feellink | feellink-backend.vercel.app  |

---

## 4. İlk deploy sonrası

- Frontend’te **NEXT_PUBLIC_API_URL** = backend URL’i olmalı (production’da `https://feellink-backend.vercel.app` veya `https://api.feellink.io`).
- Backend’te **DATABASE_URL** ve diğer secret’lar doğru girilmiş olmalı.
- Deploy’dan sonra **feellink.io**’yu sert yenileyip (Cmd+Shift+R) giriş/kayıt test edin.

Sorun olursa Vercel’deki **Deployments** ve **Functions** loglarına bakın.
