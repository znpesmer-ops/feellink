# 📱 Mobil Erişim - ngrok ile Kolay Çözüm

## 🚀 Hızlı Başlangıç

Port forwarding yapmadan, ngrok ile mobil erişim sağlayabilirsiniz!

### 1. ngrok Kurulumu

**Homebrew ile (Önerilen):**
```bash
brew install ngrok/ngrok/ngrok
```

**Veya manuel indirme:**
- https://ngrok.com/download
- Hesap oluşturun (ücretsiz)
- Auth token'ı ekleyin: `ngrok config add-authtoken YOUR_TOKEN`

### 2. Tunnel Başlatma

```bash
cd /Users/sudeesmer/Desktop/OLACAK
./start-tunnel.sh
```

Bu script:
- Frontend için tunnel oluşturur (port 3000)
- Backend için tunnel oluşturur (port 3002)
- URL'leri log dosyalarında gösterir

### 3. Mobil Linkleri Bulma

**Yöntem 1: Log dosyalarından**
```bash
# Frontend URL
cat ngrok-frontend.log | grep "started tunnel" | tail -1

# Backend URL  
cat ngrok-backend.log | grep "started tunnel" | tail -1
```

**Yöntem 2: Web arayüzü**
- Frontend: http://localhost:4040
- Backend: http://localhost:4041 (eğer farklı port kullanıyorsa)

### 4. Mobil Cihazdan Erişim

ngrok'un verdiği URL'leri kullanın:
```
https://xxxx-xxxx-xxxx.ngrok-free.app
```

## ⚙️ Alternatif: localtunnel (ngrok olmadan)

ngrok kurmak istemiyorsanız:

```bash
# Kurulum
npm install -g localtunnel

# Frontend tunnel
lt --port 3000

# Backend tunnel (yeni terminal)
lt --port 3002
```

## 🔄 Otomatik URL Güncelleme

Frontend otomatik olarak backend URL'ini belirler, ancak ngrok URL'lerini kullanmak için:

1. ngrok URL'lerini alın
2. Frontend'de environment variable kullanın:

```bash
# frontend/.env.local oluşturun
NEXT_PUBLIC_API_URL=https://your-backend-ngrok-url.ngrok-free.app
```

## 🛑 Tunnel'ları Durdurma

```bash
./stop-tunnel.sh
```

## ⚠️ Önemli Notlar

1. **ngrok Free Plan:**
   - URL'ler her başlatmada değişir
   - Aylık limit var
   - HTTPS destekler

2. **ngrok Paid Plan:**
   - Sabit domain alabilirsiniz
   - Daha yüksek limitler

3. **Güvenlik:**
   - Development için uygundur
   - Production için domain + SSL kullanın

## 📝 Örnek Kullanım

```bash
# 1. Servisleri başlat
./start-dev.sh

# 2. Tunnel'ları başlat
./start-tunnel.sh

# 3. Mobil linkleri al
cat ngrok-frontend.log | grep "started tunnel"

# 4. Mobil cihazdan eriş
# https://xxxx.ngrok-free.app
```

## 🔧 Sorun Giderme

**ngrok bulunamadı:**
```bash
which ngrok
# Eğer bulunamazsa, PATH'e ekleyin veya yeniden kurun
```

**Port zaten kullanılıyor:**
```bash
# Mevcut tunnel'ları durdur
./stop-tunnel.sh
```

**URL'ler görünmüyor:**
```bash
# Log dosyalarını kontrol edin
tail -f ngrok-frontend.log
tail -f ngrok-backend.log
```
























