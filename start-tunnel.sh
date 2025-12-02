#!/bin/bash

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}🌐 Feellink - Tunnel Başlatılıyor${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# ngrok kontrolü
if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}❌ ngrok yüklü değil!${NC}"
    echo ""
    echo -e "${YELLOW}ngrok kurulumu:${NC}"
    echo "1. Homebrew ile:"
    echo "   brew install ngrok/ngrok/ngrok"
    echo ""
    echo "2. Veya manuel:"
    echo "   https://ngrok.com/download"
    echo ""
    echo -e "${YELLOW}Alternatif: localtunnel (npm ile)${NC}"
    echo "   npm install -g localtunnel"
    echo "   lt --port 3000"
    echo ""
    exit 1
fi

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

# Mevcut ngrok process'lerini durdur
pkill -f "ngrok http" 2>/dev/null
sleep 1

# Frontend tunnel
echo -e "${YELLOW}📱 Frontend tunnel başlatılıyor (port 3000)...${NC}"
ngrok http 3000 --log=stdout > ngrok-frontend.log 2>&1 &
FRONTEND_TUNNEL_PID=$!
echo $FRONTEND_TUNNEL_PID > ngrok-frontend.pid
sleep 3

# Backend tunnel
echo -e "${YELLOW}🔧 Backend tunnel başlatılıyor (port 3002)...${NC}"
ngrok http 3002 --log=stdout > ngrok-backend.log 2>&1 &
BACKEND_TUNNEL_PID=$!
echo $BACKEND_TUNNEL_PID > ngrok-backend.pid
sleep 3

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}✅ Tunnel'lar başlatıldı!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "${YELLOW}📱 Mobil Linkler:${NC}"
echo ""
echo -e "${BLUE}Frontend URL'lerini görmek için:${NC}"
echo "  cat ngrok-frontend.log | grep 'started tunnel'"
echo ""
echo -e "${BLUE}Backend URL'lerini görmek için:${NC}"
echo "  cat ngrok-backend.log | grep 'started tunnel'"
echo ""
echo -e "${YELLOW}Veya ngrok web arayüzünden:${NC}"
echo "  http://localhost:4040 (Frontend tunnel)"
echo "  http://localhost:4041 (Backend tunnel - eğer farklı port kullanıyorsa)"
echo ""
echo -e "${YELLOW}Tunnel'ları durdurmak için:${NC}"
echo "  ./stop-tunnel.sh"
echo ""









