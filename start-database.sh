#!/bin/bash

echo "🗄️  Veritabanı başlatılıyor..."
cd /Users/sudeesmer/Desktop/OLACAK

# Docker Desktop kontrolü
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker Desktop çalışmıyor!"
    echo "📋 Lütfen Docker Desktop'ı başlatın ve tekrar deneyin."
    exit 1
fi

# PostgreSQL ve Redis başlat
echo "✅ PostgreSQL ve Redis başlatılıyor..."
docker-compose up -d postgres redis

echo ""
echo "⏳ Veritabanının hazır olması bekleniyor (10 saniye)..."
sleep 10

# Kontrol et
if docker ps | grep -q instagram_clone_postgres; then
    echo "✅ PostgreSQL çalışıyor!"
else
    echo "❌ PostgreSQL başlatılamadı"
    exit 1
fi

if docker ps | grep -q instagram_clone_redis; then
    echo "✅ Redis çalışıyor!"
else
    echo "⚠️  Redis başlatılamadı (opsiyonel)"
fi

echo ""
echo "🎉 Veritabanı hazır! Backend'i yeniden başlatabilirsiniz."






