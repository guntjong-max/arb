#!/bin/bash
# AUTOMATED DEPLOYMENT SCRIPT - Engine Restart Loop Fix
# Run this on Docker host at /home/arbuser/arb

set -e  # Exit on error

echo "======================================================"
echo "🚀 ARBITRAGE BOT ENGINE - AUTOMATED FIX DEPLOYMENT"
echo "======================================================"
echo ""

# Change to correct directory
if [ -d "/home/arbuser/arb" ]; then
    cd /home/arbuser/arb
    echo "✅ Working directory: /home/arbuser/arb"
elif [ -d "/data/workspace/arb" ]; then
    cd /data/workspace/arb
    echo "✅ Working directory: /data/workspace/arb"
else
    echo "❌ ERROR: Cannot find arb directory"
    exit 1
fi

echo ""
echo "Step 1/7: Checking .env file..."
if [ ! -f .env ]; then
    echo "⚠️  .env not found, creating from example..."
    cp .env.example .env
    echo "✅ .env created - PLEASE EDIT PASSWORDS BEFORE PRODUCTION!"
else
    echo "✅ .env exists"
fi

echo ""
echo "Step 2/7: Stopping all services..."
docker compose down
echo "✅ Services stopped"

echo ""
echo "Step 3/7: Starting PostgreSQL..."
docker compose up -d postgres
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 8

echo ""
echo "Step 4/7: Starting Redis..."
docker compose up -d redis
echo "⏳ Waiting for Redis to be ready..."
sleep 5

echo ""
echo "Step 5/7: Verifying database health..."
docker compose exec -T postgres pg_isready -U arbitrage_user || echo "⚠️  PostgreSQL check failed"
docker compose exec -T redis redis-cli -a "${REDIS_PASSWORD:-redis_dev_password_2024}" ping || echo "⚠️  Redis check failed"

echo ""
echo "Step 6/7: Starting Engine..."
docker compose up -d engine
echo "⏳ Waiting for Engine to start..."
sleep 10

echo ""
echo "Step 7/7: Running verification tests..."
echo ""

echo "📊 Container Status:"
docker compose ps

echo ""
echo "📝 Engine Logs (last 20 lines):"
docker compose logs engine --tail=20

echo ""
echo "🧪 Health Check:"
curl -s http://localhost:3000/health || echo "❌ Health check failed"

echo ""
echo "🧪 Sessions API Check:"
SESSIONS_RESULT=$(curl -s http://localhost:3000/api/v1/sessions || echo "FAILED")
if [ "$SESSIONS_RESULT" = "OK" ]; then
    echo "✅ /api/v1/sessions returns: OK"
else
    echo "❌ /api/v1/sessions failed: $SESSIONS_RESULT"
fi

echo ""
echo "======================================================"
echo "🎯 DEPLOYMENT COMPLETE"
echo "======================================================"
echo ""
echo "Next steps:"
echo "1. Monitor logs: docker compose logs engine -f"
echo "2. Check metrics: curl http://localhost:3000/metrics"
echo "3. Verify arbitrage bot operation"
echo ""
echo "Documentation:"
echo "  - Quick reference: cat QUICK_FIX.txt"
echo "  - Full guide: cat CRISIS_FIX_SUMMARY.md"
echo "  - Diagnostics: bash diagnose.sh"
echo ""
echo "======================================================"
