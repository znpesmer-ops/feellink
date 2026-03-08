# feellink-backend – Deploy Hook ile Redeploy Nasıl Yapılır?

Git push otomatik deploy tetiklemiyorsa, **Deploy Hook** ile her push'ta (veya manuel) backend deploy'unu tetikleyebilirsiniz. Aşağıdaki adımlar tek seferlik.

---

## 1. Vercel’de Deploy Hook oluştur

1. **vercel.com** → **feellink-backend** projesi → **Settings**.
2. Solda **Git** bölümüne gir.
3. Aşağı kaydır, **Deploy Hooks** bölümünü bul.
4. **Create Hook**:
   - **Name:** `GitHub Push` (veya istediğiniz isim)
   - **Branch:** `main`
5. **Create Hook** deyip çıkan **URL’yi kopyalayın** (örn. `https://api.vercel.com/v1/integrations/deploy/...`). Bu URL’yi bir sonraki adımda kullanacaksınız.

---

## 2. GitHub’da secret ekle

1. **github.com** → **znpesmer-ops/feellink** repo’su.
2. **Settings** → **Secrets and variables** → **Actions**.
3. **New repository secret**:
   - **Name:** `VERCEL_DEPLOY_HOOK_BACKEND`
   - **Value:** Az önce kopyaladığınız Deploy Hook URL’si (tamamen yapıştırın).
4. **Add secret** ile kaydedin.

---

## 3. Deploy’u tetikleme

**A) Otomatik:** `main` branch’e **backend/** altında bir değişiklik push edildiğinde GitHub Actions bu hook’u çağırır, Vercel backend’i deploy eder.

**B) Manuel:** GitHub’da **Actions** sekmesi → **Deploy Backend to Vercel** workflow’u → **Run workflow** → **Run workflow**. Birkaç saniye içinde Vercel’de feellink-backend deploy’u başlar.

---

Bu adımlardan sonra hem push ile hem de Actions’tan **Run workflow** ile backend redeploy alır.

**Workflow dosyası:** Repoda `backend/VERCEL_DEPLOY_WORKFLOW_EXAMPLE.yml` var. İçeriği kopyalayıp GitHub’da **Add file → Create new file** ile path ` .github/workflows/deploy-backend-vercel.yml` olarak oluşturun (ilk satırdaki # yorumunu silerek).
