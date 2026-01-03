# GitHub'a Push İçin Komutlar

## Terminal'de Çalıştırın

1. **Terminal'i açın:**
   - `Cmd + Space` → "Terminal" yazın → Enter
   - veya Applications → Utilities → Terminal

2. **Proje klasörüne gidin:**
   ```bash
   cd /Users/sudeesmer/Desktop/OLACAK
   ```

3. **GitHub'a push edin:**
   ```bash
   git push -u origin main
   ```

4. **Kimlik doğrulama:**
   - Username: GitHub kullanıcı adınızı girin
   - Password: **Personal Access Token** girin (normal şifre değil!)

## Personal Access Token Oluşturma

1. https://github.com/settings/tokens adresine gidin
2. "Generate new token (classic)" tıklayın
3. Token adı: `feellink-push`
4. Scopes: `repo` seçin (tüm alt seçenekleri seçin)
5. "Generate token" tıklayın
6. Token'ı kopyalayın (bir daha gösterilmez!)
7. Push sırasında password olarak bu token'ı yapıştırın

## Durum

✅ Tüm değişiklikler commit edildi
✅ Remote eklendi: https://github.com/znpesmer-ops/feellink.git
✅ Branch: main
⏳ Push için authentication gerekiyor


