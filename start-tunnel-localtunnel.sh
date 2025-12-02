#!/bin/bash

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}🌐 Feellink - LocalTunnel Başlatılıyor${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# localtunnel kontrolü - npx ile kullanacağız (global install gerekmez)
echo -e "${GREEN}✓ localtunnel npx ile kullanılacak (global install gerekmez)${NC}"

# Mevcut servislerin çalışıp çalışmadığını kontrol et
if ! lsof -i :3000 -P | grep LISTEN > /dev/null; then
    echo -e "${RED}❌ Frontend (port 3000) çalışmıyor!${NC}"
    echo -e "${YELLOW}Önce frontend'i başlatın: ./start-dev.sh${NC}"
    exit 1
fi

if ! lsof -i :3002 -P | grep LISTEN > /dev/null; then
    echo -e "${RED}❌ Backend (port 3002) çalışmıyor!${NC}"
    echo -e "${YELLOW}Önce backend'i başlatın: ./start-dev.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Servisler çalışıyor${NC}"
echo ""

# Mevcut localtunnel process'lerini durdur
pkill -f "lt --port" 2>/dev/null
sleep 1

# Frontend tunnel (npx ile - şifresiz, direkt erişim)
echo -e "${YELLOW}📱 Frontend tunnel başlatılıyor (port 3000)...${NC}"
echo -e "${GREEN}Not: Şifre sayfasında 'Continue' veya 'Click to continue' butonuna tıklayın${NC}"
npx -y localtunnel --port 3000 > localtunnel-frontend.log 2>&1 &
FRONTEND_TUNNEL_PID=$!
echo $FRONTEND_TUNNEL_PID > localtunnel-frontend.pid
sleep 5

# Backend tunnel (npx ile)
echo -e "${YELLOW}🔧 Backend tunnel başlatılıyor (port 3002)...${NC}"
npx -y localtunnel --port 3002 > localtunnel-backend.log 2>&1 &
BACKEND_TUNNEL_PID=$!
echo $BACKEND_TUNNEL_PID > localtunnel-backend.pid
sleep 5

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}✅ Tunnel'lar başlatıldı!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "${YELLOW}📱 Mobil Linkler:${NC}"
echo ""
echo -e "${BLUE}Frontend URL:${NC}"
FRONTEND_URL=$(cat localtunnel-frontend.log 2>/dev/null | grep "your url is" | tail -1 | sed 's/your url is: //' | tr -d ' ')
if [ -n "$FRONTEND_URL" ]; then
    echo "  $FRONTEND_URL"
else
    echo "  URL yükleniyor..."
fi
echo ""
echo -e "${BLUE}Backend URL:${NC}"
BACKEND_URL=$(cat localtunnel-backend.log 2>/dev/null | grep "your url is" | tail -1 | sed 's/your url is: //' | tr -d ' ')
if [ -n "$BACKEND_URL" ]; then
    echo "  $BACKEND_URL"
else
    echo "  URL yükleniyor..."
fi
echo ""
echo -e "${YELLOW}📋 Mobil Cihazdan Kullanım:${NC}"
echo "  1. Yukarıdaki Frontend URL'yi açın"
echo "  2. Şifre sayfası çıkarsa:"
echo "     - Şifre alanını BOŞ BIRAKIN"
echo "     - Veya 'Continue' / 'Click to continue' butonuna tıklayın"
echo "  3. Feellink açılacak!"
echo ""
echo -e "${GREEN}✅ Şifre gerekmez, direkt 'Continue' butonuna tıklayın!${NC}"
echo ""
echo -e "${YELLOW}Tunnel'ları durdurmak için:${NC}"
echo "  ./stop-tunnel.sh"
echo ""

