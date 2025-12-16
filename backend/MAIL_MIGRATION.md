# Mail Gönderen Adresi Migration Rehberi

## ✅ Yapılan Değişiklikler

### 1. Backend Kod Güncellemeleri
- ✅ `backend/src/mail/mail.service.ts` - `MAIL_FROM` ve `MAIL_FROM_NAME` kullanımı güncellendi
- ✅ `backend/src/tickets/ticket-mailer.service.ts` - Aynı şekilde güncellendi
- ✅ `backend/env.example` - Yeni mail ayarları eklendi

### 2. Yeni ENV Değişkenleri

```env
# Mail Gönderen Adresi (Tüm sistem mailleri için)
MAIL_FROM=info@feellink.io
MAIL_FROM_NAME=feellink
```

## 📋 Yapılması Gerekenler

### 1. Backend .env Dosyasını Güncelle

Backend klasöründeki `.env` dosyasını açın ve şu satırları ekleyin/güncelleyin:

```env
MAIL_FROM=info@feellink.io
MAIL_FROM_NAME=feellink
```

**ÖNEMLİ:** Eski `sudesmer20@gmail.com` veya benzeri değerleri kaldırın.

### 2. Backend'i Restart Edin

```bash
cd backend
# Eğer çalışıyorsa durdurun (Ctrl+C)
pnpm start:dev
```

### 3. Test Senaryosu

1. Uygulamada "Şifremi Unuttum" özelliğini kullanın
2. Gelen maili kontrol edin:
   - **Gönderen:** `feellink <info@feellink.io>`
   - **Mail geliyor mu?**
   - **Link çalışıyor mu?**

### 4. DNS Ayarları (Önemli!)

`info@feellink.io` mail gönderebilmek için DNS'te şunlar olmalı:

#### SPF Kaydı
```
TXT kaydı: v=spf1 include:_spf.google.com ~all
```

#### DKIM (Önerilir)
Google Workspace veya mail sağlayıcınızdan DKIM kayıtlarını alın ve DNS'e ekleyin.

#### DMARC (Opsiyonel ama önerilir)
```
TXT kaydı: v=DMARC1; p=none; rua=mailto:dmarc@feellink.io
```

## ⚠️ Dikkat Edilmesi Gerekenler

1. **Eski Gmail hesabını şimdilik silmeyin** - 1-2 hafta sorunsuz çalıştıktan sonra kapatabilirsiniz
2. **Token/şifre sistemi değişmedi** - Sadece gönderen adresi değişti
3. **Kullanıcı hesapları etkilenmedi** - Login email'leri aynı kaldı

## 🔍 Kontrol Listesi

- [ ] Backend `.env` dosyası güncellendi
- [ ] Backend restart edildi
- [ ] Şifre sıfırlama maili test edildi
- [ ] Mail gönderen adresi doğru görünüyor (`feellink <info@feellink.io>`)
- [ ] Reset linki çalışıyor
- [ ] DNS kayıtları (SPF/DKIM) eklendi (opsiyonel ama önerilir)

## 📧 Etkilenen Mail Türleri

- ✅ Şifre sıfırlama mailleri
- ✅ Bilet mailleri (etkinlik biletleri)
- ✅ Sistem bildirim mailleri (gelecekte eklenecek)

## 🆘 Sorun Giderme

### Mail gelmiyor
1. SMTP ayarlarını kontrol edin (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`)
2. `info@feellink.io` hesabının mail gönderme yetkisi var mı kontrol edin
3. Backend loglarını kontrol edin: `SMTP bağlantı hatası` var mı?

### Mail spam'a düşüyor
1. DNS'te SPF kaydı var mı kontrol edin
2. DKIM kayıtlarını ekleyin
3. Mail sağlayıcınızın (Google Workspace, vb.) ayarlarını kontrol edin

### Link çalışmıyor
- Bu mail gönderen adresi değişikliği ile ilgili değil
- Token/URL üretimi aynı kaldı
- Frontend URL'lerini kontrol edin
