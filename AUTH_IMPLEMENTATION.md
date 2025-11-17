# Kullanıcı Kayıt & Giriş Sistemi (Auth) - Dokümantasyon

## ✅ Tamamlanan Özellikler

### Backend

1. **Refresh Token Sistemi**
   - Access token: 15 dakika geçerli
   - Refresh token: 30 gün geçerli
   - Refresh token'lar veritabanında saklanıyor

2. **Endpoint'ler**
   - `POST /auth/register` - Yeni kullanıcı kaydı
   - `POST /auth/login` - Giriş işlemi
   - `POST /auth/refresh` - Token yenileme
   - `POST /auth/logout` - Çıkış yapma (refresh token'ı sil)
   - `POST /auth/logout-all` - Tüm cihazlardan çıkış
   - `GET /auth/me` - Aktif kullanıcı bilgileri

3. **Veritabanı**
   - `RefreshToken` modeli eklendi
   - Token'lar güvenli şekilde saklanıyor
   - Expire kontrolü yapılıyor

### Frontend

1. **Token Yönetimi**
   - Access token ve refresh token localStorage'da saklanıyor
   - Zustand store ile global state yönetimi
   - Otomatik token yenileme (axios interceptor)

2. **Auth Guard**
   - `AuthGuard` component ile protected route koruması
   - Otomatik yönlendirme (giriş yapılmamışsa `/login`)
   - Token doğrulama ve yenileme

3. **Sayfalar**
   - `/login` - Giriş sayfası
   - `/register` - Kayıt sayfası
   - Protected sayfalar otomatik korunuyor

## 🔒 Güvenlik Özellikleri

1. **JWT Token Yapısı**
   - Access token kısa süreli (15 dakika)
   - Refresh token uzun süreli (30 gün)
   - Token'lar veritabanında takip ediliyor

2. **Otomatik Token Yenileme**
   - 401 hatasında otomatik refresh
   - Eşzamanlı istekler için queue sistemi
   - Başarısız refresh'te otomatik logout

3. **Oturum Koruma**
   - localStorage ile kalıcı oturum
   - Sayfa yenilense bile token korunuyor
   - Refresh token ile oturum uzatma

## 📝 Kullanım

### Backend

```typescript
// Login
const response = await api.post('/auth/login', {
  username: 'user123',
  password: 'password123'
})
// Response: { user, accessToken, refreshToken }

// Register
const response = await api.post('/auth/register', {
  email: 'user@example.com',
  username: 'user123',
  password: 'password123',
  fullName: 'John Doe'
})
// Response: { user, accessToken, refreshToken }

// Refresh Token
const response = await api.post('/auth/refresh', {
  refreshToken: '...'
})
// Response: { user, accessToken, refreshToken }

// Get Current User
const response = await api.get('/auth/me')
// Response: { id, username, email, ... }
```

### Frontend

```typescript
// Store kullanımı
const { user, accessToken, refreshToken, setAuth, clearAuth } = useAuthStore()

// Login/Register sonrası
setAuth(user, accessToken, refreshToken)

// Logout
clearAuth()

// Token güncelleme (otomatik yapılıyor)
updateTokens(newAccessToken, newRefreshToken)
```

## 🔄 Token Yenileme Akışı

1. Kullanıcı bir istek yapar
2. Access token expire olmuşsa 401 hatası döner
3. Axios interceptor refresh token ile yeni token ister
4. Yeni token'lar alınır ve store güncellenir
5. Orijinal istek yeni token ile tekrar gönderilir
6. Başarılı olur

## ⚠️ Önemli Notlar

1. **Prisma Migrate**: Refresh token için migration çalıştırın:
   ```bash
   cd backend
   pnpm prisma migrate dev --name add_refresh_tokens
   ```

2. **Environment Variables**: 
   - `JWT_SECRET` güçlü bir değer olmalı
   - `JWT_EXPIRES_IN` artık kullanılmıyor (kodda 15m olarak sabit)

3. **localStorage**: 
   - Access token ve refresh token localStorage'da saklanıyor
   - Production'da httpOnly cookie kullanımı önerilir

4. **Token Temizleme**: 
   - Expire olan refresh token'lar otomatik silinir
   - Logout'ta refresh token silinir
   - `logout-all` ile tüm cihazlardan çıkış yapılır

## 🚀 Sonraki Adımlar

- [ ] httpOnly cookie kullanımı
- [ ] Remember me özelliği
- [ ] 2FA (İki faktörlü kimlik doğrulama)
- [ ] Email doğrulama
- [ ] Şifre sıfırlama

















