#!/bin/bash

# ✅ Backend ve Frontend'i başlatma scripti

echo "🔄 Servisleri durduruluyor..."
pkill -9 -f "next dev" 2>/dev/null
pkill -9 -f "nest start" 2>/dev/null
pkill -9 -f "node.*dist/main" 2>/dev/null
sleep 2

echo "🚀 Backend başlatılıyor (port 3002)..."
cd "$(dirname "$0")/backend"
npm run start:dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

echo "⏳ Backend'in başlaması bekleniyor..."
sleep 8

echo "🚀 Frontend başlatılıyor (port 3000)..."
cd "$(dirname "$0")/frontend"
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!

echo "⏳ Frontend'in başlaması bekleniyor..."
sleep 8

echo ""
echo "✅ Servisler başlatıldı!"
echo "📊 Backend PID: $BACKEND_PID"
echo "📊 Frontend PID: $FRONTEND_PID"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🌐 Backend: http://localhost:3002"
echo ""
echo "📝 Log dosyaları:"
echo "   Backend: /tmp/backend.log"
echo "   Frontend: /tmp/frontend.log"
echo ""
echo "🛑 Durdurmak için: pkill -9 -f 'next dev' && pkill -9 -f 'nest start'"






