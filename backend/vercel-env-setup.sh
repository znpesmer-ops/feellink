#!/bin/bash

# Vercel Environment Variables Setup Script
# Bu script Vercel CLI kullanarak environment variables ekler

echo "🚀 Vercel Environment Variables Setup"
echo "======================================"
echo ""

# Vercel CLI kontrolü
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI bulunamadı. Yükleniyor..."
    npm install -g vercel@latest
fi

# Vercel login kontrolü
if ! vercel whoami &> /dev/null; then
    echo "🔐 Vercel'e giriş yapmanız gerekiyor..."
    vercel login
fi

echo ""
echo "📝 Environment Variables ekleniyor..."
echo ""

# Environment Variables
vercel env add DATABASE_URL production <<< "postgresql://user:password@host:5432/dbname?schema=public"
vercel env add JWT_SECRET production <<< "your-super-secret-jwt-key-change-in-production-$(openssl rand -hex 16)"
vercel env add NODE_ENV production <<< "production"
vercel env add FRONTEND_URL production <<< "https://www.feellink.io"

echo ""
echo "✅ Environment Variables eklendi!"
echo ""
echo "🔍 Kontrol etmek için: vercel env ls"
echo "🚀 Deploy için: vercel --prod"
