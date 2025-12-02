# 📱 Mobil Erişim Rehberi - Farklı Ağlardan Erişim

## 🔗 Mobil Link

Farklı internet bağlantısından erişim için:

```
http://176.88.86.119:3000
```

## ⚙️ Router Port Forwarding Ayarları

Farklı ağlardan erişim için router'ınızda port forwarding yapmanız gerekiyor:

### Gerekli Port Yönlendirmeleri:

1. **Frontend (Port 3000)**
   - Dış Port: `3000`
   - İç IP: `192.168.1.38`
   - İç Port: `3000`
   - Protokol: `TCP`

2. **Backend (Port 3002)**
   - Dış Port: `3002`
   - İç IP: `192.168.1.38`
   - İç Port: `3002`
   - Protokol: `TCP`

### Router Ayarları Nasıl Yapılır?

1. Router'ınızın yönetim paneline girin (genellikle `192.168.1.1` veya `192.168.0.1`)
2. "Port Forwarding" veya "Virtual Server" bölümünü bulun
3. Yukarıdaki port yönlendirmelerini ekleyin
4. Ayarları kaydedin

### Router Markalarına Göre:

- **TP-Link**: Advanced → NAT Forwarding → Port Forwarding
- **Netgear**: Advanced → Port Forwarding / Port Triggering
- **Linksys**: Smart Wi-Fi Tools → Port Forwarding
- **ASUS**: WAN → Virtual Server / Port Forwarding

## ✅ Kontrol Listesi

- [ ] Router'da port 3000 yönlendirildi
- [ ] Router'da port 3002 yönlendirildi
- [ ] Mac güvenlik duvarı kapalı (kontrol edildi ✓)
- [ ] Frontend 0.0.0.0'da dinliyor (güncellendi ✓)
- [ ] Backend 0.0.0.0'da dinliyor (zaten ayarlı ✓)

## 🧪 Test

Port forwarding yaptıktan sonra:

1. **Mobil cihazdan test edin:**
   ```
   http://176.88.86.119:3000
   ```

2. **Backend'i test edin:**
   ```
   http://176.88.86.119:3002/api
   ```

## ⚠️ Önemli Notlar

1. **Public IP Değişebilir**: Eğer router'ınız yeniden başlatılırsa veya ISP değişikliği olursa public IP değişebilir. Bu durumda yeni IP'yi kontrol edin:
   ```bash
   curl ifconfig.me
   ```

2. **Güvenlik**: Development ortamında bu ayarlar uygundur. Production için HTTPS ve güvenlik önlemleri alınmalıdır.

3. **Dinamik IP**: Eğer public IP sık değişiyorsa, Dynamic DNS (DDNS) servisi kullanabilirsiniz (örn: No-IP, DuckDNS).

## 🔄 IP Değişirse

Public IP değişirse, yeni IP'yi öğrenmek için:
```bash
curl ifconfig.me
```

Yeni IP ile mobil link:
```
http://[YENİ_IP]:3000
```









