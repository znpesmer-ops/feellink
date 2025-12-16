# Environment Variables Setup

## Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://192.168.1.38:3002
NEXT_PUBLIC_BACKEND_URL=http://192.168.1.38:3002
```

## Backend (.env)

```env
PORT=3002
BASE_URL=http://192.168.1.38:3002
FRONTEND_URL=http://192.168.1.38:3000
```

## Önemli Notlar

1. **Backend URL**: Görseller backend'te (3002 portunda) bulunuyor
2. **Frontend URL**: Frontend 3000 portunda çalışıyor
3. **BASE_URL**: Backend'ten dönen görsel URL'leri için kullanılıyor
4. **NEXT_PUBLIC_BACKEND_URL**: Frontend'te görsel URL'lerini çözmek için kullanılıyor

## Test

Backend'i yeniden başlattıktan sonra:
1. Tarayıcı console'unu açın (F12)
2. Bir görsel yükleyin veya sayfayı yenileyin
3. Console'da şu logları görmelisiniz:
   - `PostCard IMAGE URL: http://192.168.1.38:3002/...`
   - `Explore IMAGE URL: http://192.168.1.38:3002/...`
   - `Profile Avatar IMAGE URL: http://192.168.1.38:3002/...`


























