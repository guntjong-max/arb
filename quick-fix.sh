#!/bin/bash

# QUICK FIX - 502 Bad Gateway untuk ui.kliks.life
# Jalankan script ini untuk fix cepat

echo "🚀 QUICK FIX - Starting..."
echo ""

cd /data/workspace/arb

# Rebuild & restart frontend
docker-compose stop frontend 2>/dev/null || true
docker-compose rm -f frontend 2>/dev/null || true
docker-compose build --no-cache frontend
docker-compose up -d frontend

echo ""
echo "✅ Frontend restarted!"
echo ""
echo "📊 Status:"
docker ps | grep frontend
echo ""
echo "📝 Logs (last 10 lines):"
docker logs arb-frontend --tail 10
echo ""
echo "🌐 Access at: https://ui.kliks.life"
echo "🔍 Monitor logs: docker logs arb-frontend -f"
