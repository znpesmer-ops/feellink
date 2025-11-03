#!/bin/bash

echo "🚀 Instagram Clone - Hızlı Başlangıç"
echo "===================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker çalışmıyor! Docker'ı başlatın.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker çalışıyor${NC}"

# Start Docker services
echo -e "${YELLOW}📦 Docker servislerini başlatıyorum...${NC}"
docker compose up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Servislerin hazır olmasını bekliyorum...${NC}"
sleep 5

# Check services
echo -e "${YELLOW}🔍 Servis durumunu kontrol ediyorum...${NC}"
docker compose ps

# Backend setup
echo -e "${YELLOW}🔧 Backend kurulumunu yapıyorum...${NC}"
cd backend

# Create .env if not exists
if [ ! -f .env ]; then
    cp env.example .env
    echo -e "${GREEN}✓ .env dosyası oluşturuldu${NC}"
fi

# Install dependencies
if [ ! -d node_modules ]; then
    echo -e "${YELLOW}📥 Bağımlılıklar yükleniyor...${NC}"
    pnpm install
fi

# Prisma setup
echo -e "${YELLOW}🗄️  Prisma kurulumu...${NC}"
pnpm prisma generate

# Check if migration needed
if ! pnpm prisma migrate status > /dev/null 2>&1; then
    echo -e "${YELLOW}📝 Database migration çalıştırılıyor...${NC}"
    pnpm prisma migrate dev --name init
fi

echo -e "${GREEN}✅ Backend hazır!${NC}"
echo ""
echo -e "${GREEN}🚀 Backend'i başlatmak için:${NC}"
echo "   cd backend && pnpm start:dev"
echo ""
echo -e "${GREEN}🌐 Frontend'i başlatmak için (yeni terminal):${NC}"
echo "   cd frontend && pnpm install && pnpm dev"
echo ""




