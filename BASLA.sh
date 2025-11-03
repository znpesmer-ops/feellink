#!/bin/bash

echo "=========================================="
echo "🚀 Instagram Clone - Başlatma Kılavuzu"
echo "=========================================="
echo ""

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Docker kontrolü
echo -e "${BLUE}1. Docker kontrolü...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker yüklü değil!${NC}"
    echo -e "${YELLOW}   Docker Desktop'ı yükleyin: https://www.docker.com/products/docker-desktop${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker çalışmıyor!${NC}"
    echo -e "${YELLOW}   Docker Desktop'ı başlatın ve tekrar deneyin.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker çalışıyor${NC}"
echo ""

# 2. Docker servislerini başlat
echo -e "${BLUE}2. Docker servislerini başlatıyorum...${NC}"
cd "$(dirname "$0")"
docker compose up -d
sleep 3
echo -e "${GREEN}✓ Docker servisleri başlatıldı${NC}"
echo ""

# 3. Backend .env kontrolü
echo -e "${BLUE}3. Backend yapılandırması...${NC}"
cd backend
if [ ! -f .env ]; then
    cp env.example .env
    echo -e "${GREEN}✓ .env dosyası oluşturuldu${NC}"
else
    echo -e "${GREEN}✓ .env dosyası mevcut${NC}"
fi

# 4. Backend bağımlılıkları
echo -e "${BLUE}4. Backend bağımlılıklarını yüklüyorum...${NC}"
if [ ! -d node_modules ]; then
    if command -v pnpm &> /dev/null; then
        pnpm install
    else
        npm install
    fi
    echo -e "${GREEN}✓ Bağımlılıklar yüklendi${NC}"
else
    echo -e "${GREEN}✓ Bağımlılıklar zaten yüklü${NC}"
fi

# 5. Prisma
echo -e "${BLUE}5. Database kurulumu...${NC}"
if command -v pnpm &> /dev/null; then
    pnpm prisma generate
    echo -e "${YELLOW}   Migration çalıştırılıyor...${NC}"
    pnpm prisma migrate dev --name init 2>&1 | grep -v "already exists" || true
else
    npx prisma generate
    npx prisma migrate dev --name init 2>&1 | grep -v "already exists" || true
fi
echo -e "${GREEN}✓ Database hazır${NC}"
echo ""

# 6. Başlatma talimatları
echo -e "${GREEN}✅ Kurulum tamamlandı!${NC}"
echo ""
echo -e "${YELLOW}Backend'i başlatmak için:${NC}"
echo "  cd backend"
if command -v pnpm &> /dev/null; then
    echo "  pnpm start:dev"
else
    echo "  npm run start:dev"
fi
echo ""
echo -e "${YELLOW}Frontend'i başlatmak için (yeni terminal):${NC}"
echo "  cd frontend"
if command -v pnpm &> /dev/null; then
    echo "  pnpm install"
    echo "  pnpm dev"
else
    echo "  npm install"
    echo "  npm run dev"
fi
echo ""
echo -e "${BLUE}Backend çalıştığında:${NC}"
echo "  🌐 API: http://localhost:3001"
echo "  📚 Swagger: http://localhost:3001/api"
echo ""




