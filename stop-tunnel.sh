#!/bin/bash

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Tunnel'lar durduruluyor...${NC}"

# PID dosyalarından process'leri durdur
if [ -f ngrok-frontend.pid ]; then
    kill $(cat ngrok-frontend.pid) 2>/dev/null
    rm ngrok-frontend.pid
    echo -e "${GREEN}✓ Frontend tunnel durduruldu${NC}"
fi

if [ -f ngrok-backend.pid ]; then
    kill $(cat ngrok-backend.pid) 2>/dev/null
    rm ngrok-backend.pid
    echo -e "${GREEN}✓ Backend tunnel durduruldu${NC}"
fi

# Tüm ngrok process'lerini durdur
pkill -f "ngrok http" 2>/dev/null

# Tüm localtunnel process'lerini durdur
pkill -f "localtunnel" 2>/dev/null
pkill -f "npx.*localtunnel" 2>/dev/null

# Tüm cloudflared process'lerini durdur
if [ -f cloudflare-frontend.pid ]; then
    kill $(cat cloudflare-frontend.pid) 2>/dev/null
    rm cloudflare-frontend.pid
    echo -e "${GREEN}✓ Frontend cloudflare tunnel durduruldu${NC}"
fi

if [ -f cloudflare-backend.pid ]; then
    kill $(cat cloudflare-backend.pid) 2>/dev/null
    rm cloudflare-backend.pid
    echo -e "${GREEN}✓ Backend cloudflare tunnel durduruldu${NC}"
fi

pkill -f "cloudflared tunnel" 2>/dev/null

echo -e "${GREEN}✅ Tüm tunnel'lar durduruldu${NC}"

