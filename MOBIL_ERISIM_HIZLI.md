# 📱 Mobil Erişim - Hızlı Çözüm

Mobil veri internetinden erişim için iki seçenek:

## 🚀 Seçenek 1: LocalTunnel (Önerilen - Kolay)

**Kurulum gerekmez, npm ile otomatik yüklenir!**

```bash
cd /Users/sudeesmer/Desktop/OLACAK
./start-tunnel-localtunnel.sh
```

Bu script:
- ✅ localtunnel'ı otomatik yükler (yoksa)
- ✅ Frontend için tunnel oluşturur
- ✅ Backend için tunnel oluşturur
- ✅ Mobil linkleri gösterir

**Mobil linkler log dosyalarında görünecek:**
```bash
# Frontend URL
cat localtunnel-frontend.log | grep "your url is"

# Backend URL
cat localtunnel-backend.log | grep "your url is"
```

**Durdurma:**
```bash
./stop-tunnel.sh
```

## 🔧 Seçenek 2: ngrok (Daha Stabil)

**Kurulum:**
```bash
brew install ngrok/ngrok/ngrok
```

**Kullanım:**
```bash
cd /Users/sudeesmer/Desktop/OLACAK
./start-tunnel.sh
```

**Mobil linkler:**
- Web arayüzü: http://localhost:4040
- Log dosyaları: `ngrok-frontend.log` ve `ngrok-backend.log`

## ⚠️ Önemli Not

Frontend otomatik olarak backend URL'ini belirler, ancak tunnel kullanırken:

1. **LocalTunnel için:** URL'ler her başlatmada değişir
2. **ngrok için:** URL'ler her başlatmada değişir (free plan)

**Çözüm:** Frontend'de environment variable kullanın:

```bash
# frontend/.env.local oluşturun
NEXT_PUBLIC_API_URL=https://your-backend-tunnel-url
```

## 📝 Hızlı Başlangıç

```bash
# 1. Servisleri başlat (eğer çalışmıyorsa)
./start-dev.sh

# 2. Tunnel başlat (LocalTunnel - Önerilen)
./start-tunnel-localtunnel.sh

# 3. Mobil linkleri al
cat localtunnel-frontend.log | grep "your url is"

# 4. Mobil cihazdan eriş
# https://xxxx.loca.lt
```

## 🔄 Otomatik URL Güncelleme (İsteğe Bağlı)

Tunnel URL'lerini otomatik olarak frontend'e aktarmak için bir script hazırlayabiliriz. Şimdilik manuel olarak `.env.local` dosyasına ekleyin.









