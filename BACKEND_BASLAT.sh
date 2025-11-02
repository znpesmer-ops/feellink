#!/bin/bash

echo "🔧 Backend Başlatma Scripti"
echo "============================"

cd "$(dirname "$0")/backend"

# .env kontrolü
if [ ! -f .env ]; then
    echo "📝 .env dosyası oluşturuluyor..."
    cp env.example .env
fi

# node_modules kontrolü
if [ ! -d node_modules ]; then
    echo "📦 Bağımlılıklar yükleniyor..."
    if command -v pnpm &> /dev/null; then
        pnpm install
    else
        npm install
    fi
fi

# Prisma generate
echo "🗄️  Prisma client oluşturuluyor..."
if command -v pnpm &> /dev/null; then
    pnpm prisma generate
else
    npx prisma generate
fi

# Backend'i başlat
echo ""
echo "🚀 Backend başlatılıyor..."
echo "============================"
echo ""

if command -v pnpm &> /dev/null; then
    pnpm start:dev
else
    npm run start:dev
fi



