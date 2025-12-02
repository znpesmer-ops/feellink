#!/bin/bash

echo "🔍 Backend hata logları izleniyor..."
echo "Hata oluştuğunda burada görünecek..."
echo "Çıkmak için Ctrl+C"
echo ""
echo "=========================================="

tail -f /Users/sudeesmer/Desktop/OLACAK/backend.log | grep --line-buffered -E "ERROR|Error|error|Exception|exception|❌|Failed|failed|Cannot|cannot|undefined|TypeError|ReferenceError" -A 10 -B 2


