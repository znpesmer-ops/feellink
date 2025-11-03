# 🔐 JWT Token Sorunu Çözümü

## Problem

Admin yetkisi verdiğiniz halde "Bu sayfaya erişim yetkiniz yok" hatası alıyorsunuz.

## Neden Oluyor?

JWT token'lar içinde kullanıcı bilgilerini saklar ve 15 dakika geçerlidir. Şu anda token'ınız içinde eski `isAdmin: false` bilgisi var.

## ✅ Çözüm Yöntemleri

### Yöntem 1: Token'ı Yenileme (Hızlı)

**15 dakika bekleyin** - Token süresi dolacak ve otomatik yenilenecek. Yeni token'da `isAdmin: true` olacak.

Veya:

```bash
# Tarayıcıda
1. F12 basın (Developer Tools)
2. Console sekmesi
3. Şunu yazın ve Enter:
localStorage.clear()

4. Sayfayı yenileyin (F5)
5. Login sayfasına yönlendirecek
6. Tekrar giriş yapın
```

---

### Yöntem 2: Zorla Token Yenileme (30 Saniye)

Tarayıcıda yapın:

```javascript
// 1. F12 basın → Console sekmesi
// 2. Aşağıdaki kodu copy-paste edin

fetch('http://localhost:3001/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken: localStorage.getItem('refreshToken') })
})
.then(res => res.json())
.then(data => {
  localStorage.setItem('accessToken', data.accessToken)
  localStorage.setItem('refreshToken', data.refreshToken)
  localStorage.setItem('auth-storage', JSON.stringify({
    state: {
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken
    }
  }))
  console.log('✅ Token yenilendi! isAdmin:', data.user.isAdmin)
  location.href = '/admin'
})
.catch(err => console.error('❌ Hata:', err))
```

Bu kod:
1. Backend'e refresh isteği gönderir
2. Yeni token alır (isAdmin: true ile)
3. localStorage'ı günceller
4. Admin paneline yönlendirir

---

### Yöntem 3: Tamamen Çıkış Yapın (En Kolay)

1. Siteden **çıkış yapın** (logout butonu)
2. **Tekrar giriş yapın**
3. Admin paneline gidin

Bu yöntem yeni bir token oluşturur.

---

### Yöntem 4: Cache Temizleme

```bash
# macOS
Cmd + Shift + Delete → All Time → Clear

# Windows/Linux  
Ctrl + Shift + Delete → All Time → Clear

# Veya
Chrome: Settings → Clear browsing data → All time
Firefox: Preferences → Privacy & Security → Clear Data
Safari: Develop → Empty Caches
```

---

## 🧪 Test: Admin Mi?

Token yenilendikten sonra test edin:

```javascript
// Console'da (F12):
JSON.parse(localStorage.getItem('auth-storage')).state.user.isAdmin
```

Bu **true** dönmeli.

---

## ⚡ En Hızlı Çözüm

**Şu anda çalışan kodu çalıştırın:**

Tarayıcı Console'unda (F12):

```javascript
localStorage.clear()
location.href = '/login'
```

Sonra tekrar giriş yapın. Yeni token'da admin yetkisi olacak.

---

## 📝 Not

JWT token'lar stateless'tır. Veritabanında `isAdmin` değişse bile, mevcut token eski bilgiyi taşır. Bu yüzden yeniden login veya token refresh gerekir.

**Artık çalışmalı!** 🎉




