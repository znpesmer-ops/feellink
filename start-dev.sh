#!/bin/bash

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}🚀 Feellink - Development Server Başlatılıyor${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Backend'i başlat
echo -e "${YELLOW}📦 Backend başlatılıyor (port 3002)...${NC}"
cd "$(dirname "$0")/backend"
if [ ! -f .env ]; then
    cp env.example .env
    echo -e "${GREEN}✓ .env dosyası oluşturuldu${NC}"
fi

# Package manager'ı kontrol et
if command -v pnpm &> /dev/null; then
    PM="pnpm"
else
    PM="npm"
fi

# Backend'i arka planda başlat
$PM run start:dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid
echo -e "${GREEN}✓ Backend başlatıldı (PID: $BACKEND_PID)${NC}"
echo ""

# Frontend'i başlat
echo -e "${YELLOW}🎨 Frontend başlatılıyor (port 3000)...${NC}"
cd "../frontend"
$PM run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../frontend.pid
echo -e "${GREEN}✓ Frontend başlatıldı (PID: $FRONTEND_PID)${NC}"
echo ""

# Biraz bekle
sleep 5

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}✅ Servisler başlatıldı!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "${BLUE}🌐 Frontend:${NC} http://localhost:3000"
echo -e "${BLUE}🔧 Backend:${NC}  http://localhost:3002"
echo -e "${BLUE}📚 Swagger:${NC}  http://localhost:3002/api"
echo ""
echo -e "${YELLOW}Log dosyaları:${NC}"
echo "  - backend.log"
echo "  - frontend.log"
echo ""
echo -e "${YELLOW}Servisleri durdurmak için:${NC}"
echo "  ./stop-dev.sh"
echo ""

