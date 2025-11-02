# Feellink — Instagram Clone Platform

## 🎯 Proje Adı
Feellink — Modern Sosyal Medya Platformu (Instagram Clone)

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Data Fetching**: React Query (@tanstack/react-query)
- **Icons**: Lucide React

### Backend
- **Framework**: NestJS
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT (Access/Refresh Token)
- **Storage**: MinIO (media upload)
- **Real-time**: Socket.io (bildirimler için)

### UI/UX
- **Theme**: Light/Dark Mode toggle (localStorage + Tailwind class mode)
- **Brand Color**: `#ff7b00` (Feellink turuncu)

## ✅ Aktif Özellikler

### Kimlik Doğrulama
- ✅ Kayıt Ol
- ✅ Giriş Yap
- ✅ Logout
- ✅ JWT token yönetimi (access + refresh)

### Profil Sistemi
- ✅ Profil sayfası (biyografi, fotoğraf)
- ✅ Profil düzenleme (avatar upload, bio, fullName)
- ✅ Gizli hesap (private account) desteği
- ✅ Profil fotoğrafı yükleme (MinIO)

### Takip Sistemi
- ✅ Takip etme / Takibi bırakma
- ✅ Takipçi / Takip edilen listesi
- ✅ Takip isteği sistemi (gizli hesaplar için)
- ✅ İstek onaylama/reddetme
- ✅ Bloklama sistemi

### Bildirim Sistemi
- ✅ Gerçek zamanlı bildirimler (Socket.io)
- ✅ Bildirim türleri: like, comment, follow, follow_request, follow_accept
- ✅ Okunmamış bildirim sayısı
- ✅ Bildirim sayfası

### Gönderi Sistemi
- ✅ Gönderi oluşturma (fotoğraf/video + açıklama)
- ✅ Profilde gönderi ızgarası (3 sütun)
- ✅ Gönderi detay modalı (Instagram tarzı)
- ✅ Çoklu medya desteği (görsel/video)
- ✅ Hashtag desteği
- ✅ Konum ekleme

### Etkileşimler
- ✅ Beğeni ❤️ — turuncu renk (#ff7b00) ve animasyonlu (pop effect)
- ✅ Yorum 💬 — anında ekleme ve silme
- ✅ Kaydet 🔖 — toggle
- ✅ Beğeni sayısı kalbin yanında gösteriliyor

### Admin Panel
- ✅ Admin guard
- ✅ Kullanıcı/gönderi yönetimi
- ✅ Takipçi sayısı yeniden hesaplama endpoint'i

### UI/UX Özellikleri
- ✅ Dark Mode (localStorage + Tailwind class mode)
- ✅ Responsive tasarım (mobil + desktop)
- ✅ Modern card tasarımı
- ✅ Smooth animasyonlar
- ✅ Optimistic UI updates (React Query)

## 📁 Proje Yapısı

```
OLACAK/
├── frontend/
│   ├── app/
│   │   ├── profile/
│   │   │   ├── [username]/
│   │   │   └── edit/
│   │   ├── feed/
│   │   ├── explore/
│   │   ├── notifications/
│   │   ├── settings/
│   │   ├── login/
│   │   └── register/
│   ├── components/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── navbar.tsx
│   │   ├── create-post-modal.tsx
│   │   └── post-modal.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   ├── store.ts
│   │   ├── auth-guard.tsx
│   │   └── theme-context.tsx
│   └── tailwind.config.ts
└── backend/
    ├── src/
    │   ├── auth/
    │   ├── users/
    │   ├── posts/
    │   ├── follow/
    │   ├── notifications/
    │   ├── admin/
    │   └── media/
    └── prisma/
        └── schema.prisma
```

## 🎨 Önemli Notlar

### Tasarım Prensipleri
- **Sidebar**: Sade, gönderi paylaşımı profil sayfasından yapılır
- **Renkler**: Feellink turuncu (#ff7b00) ana marka rengi
- **Dark Mode**: Tüm bileşenler dark mode uyumlu
- **Animasyonlar**: Smooth ve performanslı

### API Yapısı
- **Base URL**: `/api` (frontend axios instance)
- **Backend Port**: `3001`
- **Swagger**: `http://localhost:3001/api`
- Tüm endpoint'ler JWT Auth korumalı (gerekli yerlerde)

### Veritabanı Şeması
- **User**: Kullanıcı bilgileri, profil, takip sayıları
- **Post**: Gönderiler, media, caption, location
- **PostMedia**: Görsel/video URL'leri
- **Comment**: Yorumlar (nested comment desteği)
- **Like**: Beğeniler
- **SavedPost**: Kaydedilen gönderiler
- **Follow**: Takip ilişkileri
- **FollowRequest**: Takip istekleri (gizli hesaplar için)
- **Notification**: Bildirimler
- **Hashtag**: Hashtag'ler

## 🚀 Sonraki Planlar

- [ ] Beğenen kullanıcıları listeleme popup'ı
- [ ] Sonsuz kaydırma (infinite scroll)
- [ ] Gerçek zamanlı socket.io etkileşimleri (like/comment)
- [ ] Story özelliği (zaten schema'da var)
- [ ] Mesajlaşma sistemi
- [ ] Keşfet sayfası geliştirmeleri

## 🔧 Geliştirme Notları

### Frontend
- React Query kullanarak optimistic updates
- Zustand ile global state yönetimi
- Theme Context ile dark mode yönetimi
- File upload için FormData kullanımı

### Backend
- NestJS modüler yapı
- Prisma ORM ile veritabanı yönetimi
- JWT Auth Guard ile endpoint koruması
- Admin Guard ile admin kontrolü
- MinIO ile dosya yükleme

### Animasyonlar
- `animate-pop`: Beğeni butonu için (globals.css)
- Smooth transitions: Tüm hover efektleri
- Scale animations: Button click efektleri

## 📝 Kod Standartları

- TypeScript kullanılıyor
- Component'ler 'use client' ile işaretleniyor (Next.js 15)
- Tailwind CSS utility classes
- ESLint ve Prettier kurallarına uyuluyor



