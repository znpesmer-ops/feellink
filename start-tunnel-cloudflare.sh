#!/bin/bash

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}🌐 Feellink - Cloudflare Tunnel Başlatılıyor${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# cloudflared kontrolü
if ! command -v cloudflared &> /dev/null; then
    echo -e "${YELLOW}📦 cloudflared yüklü değil, yükleniyor...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS için Homebrew
        if command -v brew &> /dev/null; then
            brew install cloudflare/cloudflare/cloudflared
        else
            echo -e "${RED}❌ Homebrew yüklü değil!${NC}"
            echo -e "${YELLOW}Manuel kurulum: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ cloudflared kurulumu için manuel indirme gerekli${NC}"
        echo -e "${YELLOW}https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/${NC}"
        exit 1
    fi
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

# Mevcut cloudflared process'lerini durdur
pkill -f "cloudflared tunnel" 2>/dev/null
sleep 1

# Frontend tunnel
echo -e "${YELLOW}📱 Frontend tunnel başlatılıyor (port 3000)...${NC}"
cloudflared tunnel --url http://localhost:3000 > cloudflare-frontend.log 2>&1 &
FRONTEND_TUNNEL_PID=$!
echo $FRONTEND_TUNNEL_PID > cloudflare-frontend.pid
sleep 5

# Backend tunnel
echo -e "${YELLOW}🔧 Backend tunnel başlatılıyor (port 3002)...${NC}"
cloudflared tunnel --url http://localhost:3002 > cloudflare-backend.log 2>&1 &
BACKEND_TUNNEL_PID=$!
echo $BACKEND_TUNNEL_PID > cloudflare-backend.pid
sleep 5

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}✅ Tunnel'lar başlatıldı!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "${YELLOW}📱 Mobil Linkler:${NC}"
echo ""
echo -e "${BLUE}Frontend URL:${NC}"
FRONTEND_URL=$(cat cloudflare-frontend.log 2>/dev/null | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1)
if [ -n "$FRONTEND_URL" ]; then
    echo "  $FRONTEND_URL"
else
    echo "  URL yükleniyor... (log dosyasını kontrol edin)"
    echo "  tail -f cloudflare-frontend.log"
fi
echo ""
echo -e "${BLUE}Backend URL:${NC}"
BACKEND_URL=$(cat cloudflare-backend.log 2>/dev/null | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1)
if [ -n "$BACKEND_URL" ]; then
    echo "  $BACKEND_URL"
else
    echo "  URL yükleniyor... (log dosyasını kontrol edin)"
    echo "  tail -f cloudflare-backend.log"
fi
echo ""
echo -e "${GREEN}✅ Cloudflare Tunnel şifre gerektirmez!${NC}"
echo ""
echo -e "${YELLOW}Tunnel'ları durdurmak için:${NC}"
echo "  ./stop-tunnel.sh"
echo ""
























