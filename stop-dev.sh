#!/bin/bash

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🛑 Servisler durduruluyor...${NC}"

cd "$(dirname "$0")"

# Backend'i durdur
if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        kill $BACKEND_PID 2>/dev/null
        echo -e "${GREEN}✓ Backend durduruldu${NC}"
    fi
    rm -f backend.pid
fi

# Frontend'i durdur
if [ -f frontend.pid ]; then
    FRONTEND_PID=$(cat frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        kill $FRONTEND_PID 2>/dev/null
        echo -e "${GREEN}✓ Frontend durduruldu${NC}"
    fi
    rm -f frontend.pid
fi

# Port'ları temizle (gerekirse)
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3002 | xargs kill -9 2>/dev/null

echo -e "${GREEN}✅ Tüm servisler durduruldu${NC}"












