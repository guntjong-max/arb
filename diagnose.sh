#!/bin/bash
# Quick diagnostic script for engine restart loop

echo "=========================================="
echo "🔍 ARBITRAGE BOT ENGINE DIAGNOSTICS"
echo "=========================================="
echo ""

# Check if we're in correct directory
echo "📂 Current directory: $(pwd)"
echo ""

# Check for .env file
echo "🔐 Environment file:"
if [ -f .env ]; then
    echo "✅ .env exists"
    echo "   DB_PASSWORD: $(grep DB_PASSWORD .env | cut -d'=' -f2 | cut -c1-8)..."
    echo "   REDIS_PASSWORD: $(grep REDIS_PASSWORD .env | cut -d'=' -f2 | cut -c1-8)..."
else
    echo "❌ .env NOT FOUND - THIS IS THE PROBLEM!"
    echo "   Run: cp .env.example .env"
fi
echo ""

# Check for docker/docker-compose
echo "🐳 Docker status:"
if command -v docker &> /dev/null; then
    echo "✅ Docker installed"
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
        echo "✅ Docker Compose available"
        
        echo ""
        echo "📊 Container status:"
        docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null || echo "❌ Cannot get container status"
        
        echo ""
        echo "📝 Engine logs (last 20 lines):"
        docker compose logs engine --tail=20 2>/dev/null || docker-compose logs engine --tail=20 2>/dev/null || echo "❌ Cannot get logs"
    else
        echo "❌ Docker Compose not available"
    fi
else
    echo "❌ Docker not installed or not in PATH"
fi
echo ""

# Check if ports are free
echo "🔌 Port status:"
if command -v netstat &> /dev/null; then
    netstat -tuln 2>/dev/null | grep -E ':3000|:5432|:6379' || echo "   Ports 3000, 5432, 6379 are free"
elif command -v ss &> /dev/null; then
    ss -tuln 2>/dev/null | grep -E ':3000|:5432|:6379' || echo "   Ports 3000, 5432, 6379 are free"
else
    echo "   ⚠️  Cannot check ports (netstat/ss not available)"
fi
echo ""

# Check disk space
echo "💾 Disk space:"
df -h . 2>/dev/null | tail -1 || echo "   ⚠️  Cannot check disk space"
echo ""

# Check critical files
echo "📄 Critical files:"
[ -f engine/src/server.js ] && echo "✅ engine/src/server.js" || echo "❌ engine/src/server.js"
[ -f engine/src/routes/sessions.routes.js ] && echo "✅ engine/src/routes/sessions.routes.js (NEW)" || echo "❌ engine/src/routes/sessions.routes.js"
[ -f engine/src/index.js ] && echo "✅ engine/src/index.js" || echo "❌ engine/src/index.js"
[ -f engine/src/index-minimal.js ] && echo "✅ engine/src/index-minimal.js (NEW)" || echo "❌ engine/src/index-minimal.js"
[ -f docker-compose.yml ] && echo "✅ docker-compose.yml" || echo "❌ docker-compose.yml"
echo ""

echo "=========================================="
echo "🎯 RECOMMENDED ACTION:"
echo "=========================================="
if [ ! -f .env ]; then
    echo "1. Create .env file: cp .env.example .env"
    echo "2. Edit .env and set passwords"
    echo "3. Restart: docker compose down && docker compose up -d"
else
    echo "1. Check logs: docker compose logs engine --tail=50"
    echo "2. Test health: curl http://localhost:3000/health"
    echo "3. Test sessions: curl http://localhost:3000/api/v1/sessions"
fi
echo ""
echo "📖 Full diagnostic: See DIAGNOSTIC_FIX.md"
echo "=========================================="
