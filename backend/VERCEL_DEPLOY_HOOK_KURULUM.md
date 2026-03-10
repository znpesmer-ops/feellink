# feellink-backend – Deploy Hook ile Redeploy Nasıl Yapılır?

Git push otomatik deploy tetiklemiyorsa, **Deploy Hook** ile her push'ta (veya manuel) backend deploy'unu tetikleyebilirsiniz. Aşağıdaki adımlar tek seferlik.

---

## Hook'u tek seferde test et (sorun nerede?)

Hook'un **gerçekten backend projesine** ait olup olmadığını anlamak için:

1. **Gerçek hook URL'sini al:**  
   Vercel → **feellink-backend** → **Settings** → **Git** → **Deploy Hooks**.  
   Listede hook'un yanındaki **gerçek URL'yi kopyala** (örn. `https://api.vercel.com/v1/integrations/deploy/PRJ_xxx/...`).  
   **Placeholder / örnek metin kullanma** – komutu `"BURAYA_..."` gibi bir şeyle çalıştırırsan Vercel'e gitmez, anlamsız yanıt alırsın.

2. **Terminalde çalıştır** – kopyaladığın **gerçek URL'yi** tırnak içine yapıştır:
   ```bash
   curl -i -X POST "YAPISTIRDIGIN_GERCEK_VERCEL_URL"
   ```
   `-i` sayesinde HTTP başlıkları da görünür; 200 gelip gelmediği net olur.

3. **Beklenen:**
   - **HTTP 200** (veya benzeri başarılı yanıt) + JSON gibi bir body.
   - 5–20 saniye içinde Vercel'de **feellink-backend** → **Deployments** altında yeni bir deployment.

| Sonuç | Anlamı |
|-------|--------|
| **HTTP 200 + backend'de yeni deployment** | Hook ve Vercel tarafı doğru. Sorun GitHub Actions / workflow / secret tarafında. |
| **HTML içinde 192.168.1.1, redirect.html vb.** | İstek Vercel'e ulaşmıyor; ağ/modem/captive portal yönlendirmesi var. Farklı ağ (mobil veri, başka Wi‑Fi) dene. |
| **Hiç deployment yok (ama 200 döndü)** | Hook yanlış projede (örn. frontend), eski, ya da feellink-backend Git/ayarları bozuk. |

GitHub'daki **VERCEL_DEPLOY_HOOK_BACKEND** secret'ında bu testte kullandığın **gerçek** URL olmalı.

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

**Workflow dosyası:** Repoda `backend/VERCEL_DEPLOY_WORKFLOW_EXAMPLE.yml` var. İçeriği kopyalayıp GitHub’da **Add file → Create new file** ile path `.github/workflows/deploy-backend-vercel.yml` olarak oluşturun (ilk satırdaki # yorumunu silerek).

---

## Deployment görünmüyorsa (No Results)

1. **Filtreleri temizle:** Vercel → feellink-backend → Deployments → **Clear Filters** → **Status: All**, **All Branches**, **All Environments** yapıp tekrar bak.
2. **Hook doğru projede mi?** Deploy Hook’u **feellink-backend** projesinde (kırmızı ikonlu backend) oluşturduğundan emin ol. Frontend (feellink) projesinde oluşturduysan deployment oraya gider.
3. **Git bağlı mı?** feellink-backend → Settings → Git → **Connected Git Repository** = **znpesmer-ops/feellink**, **Root Directory** = **backend** olmalı. Bağlı değilse hook tetiklenir ama deploy oluşmaz.
4. **İlk deploy manuel:** Git bağlıysa Deployments sayfasında **Create Deployment** veya **Deploy** benzeri buton varsa onunla bir kez manuel deploy tetikle; sonra hook ile gelen deploy’lar da listelenir.
