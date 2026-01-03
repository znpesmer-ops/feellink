# 🔐 GitHub Personal Access Token Alma Rehberi

## 📝 Adım Adım Talimatlar

### 1️⃣ GitHub Settings'e Git
- GitHub.com'da sağ üst köşedeki profil fotoğrafınıza tıklayın
- **"Settings"** seçin

### 2️⃣ Developer Settings'e Git
- Sol menüden en alta scroll yapın
- **"Developer settings"** tıklayın
- **VEYA** doğrudan bu linke gidin: https://github.com/settings/apps

### 3️⃣ Personal Access Tokens'a Git
- Sol menüden **"Personal access tokens"** seçin
- **"Tokens (classic)"** seçin
- **VEYA** doğrudan bu linke gidin: https://github.com/settings/tokens?type=beta

### 4️⃣ Yeni Token Oluştur
- **"Generate new token"** butonuna tıklayın
- **"Generate new token (classic)"** seçeneğini seçin

### 5️⃣ Token Ayarları

#### Token Bilgileri:
- **Note (Açıklama):** `feellink-push` yazın
- **Expiration (Geçerlilik):** 
  - 90 days (önerilen)
  - veya No expiration (sınırsız - güvenlik riski!)

#### Scopes (İzinler):
✅ **repo** seçin (tüm alt seçenekler otomatik seçilir):
- ✅ repo: Full control of private repositories
- ✅ repo:status
- ✅ repo_deployment
- ✅ public_repo
- ✅ repo:invite
- ✅ security_events

### 6️⃣ Token Oluştur ve Kopyala
- **"Generate token"** butonuna tıklayın
- ⚠️ **ÖNEMLİ:** Oluşan token'ı **HEMEN KOPYALAYIN**
- Token sadece bir kez gösterilir, sonra bir daha göremezsiniz!

### 7️⃣ Token'ı Kullan
Terminal'de push yaparken:
```bash
cd /Users/sudeesmer/Desktop/OLACAK
git push -u origin main
```

İstendiğinde:
- **Username:** GitHub kullanıcı adınız
- **Password:** Kopyaladığınız token'ı yapıştırın (normal şifre değil!)

## 🔗 Hızlı Linkler

- Settings: https://github.com/settings/profile
- Developer Settings: https://github.com/settings/apps
- Tokens (Classic): https://github.com/settings/tokens?type=beta
- Yeni Token Oluştur: https://github.com/settings/tokens/new

## ⚠️ Güvenlik Uyarıları

1. ✅ Token'ı **asla paylaşmayın**
2. ✅ Token'ı **güvenli bir yerde saklayın** (password manager)
3. ✅ Token **süresi dolduğunda** yeniden oluşturmanız gerekir
4. ✅ **No expiration** seçerseniz, süresiz erişim verirsiniz (dikkatli kullanın!)

## 💡 İpuçları

- Token'ı kopyaladıktan sonra notepad veya text editörde geçici olarak saklayabilirsiniz
- Push başarılı olduktan sonra token'ı silmek zorunda değilsiniz
- İstediğiniz zaman Settings'ten token'ı silebilir veya yenileyebilirsiniz


