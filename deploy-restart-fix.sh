#!/bin/bash
# Quick deployment script for engine restart loop fix
# Run this on Docker host at /home/arbuser/arb

set -e

echo "============================================================"
echo "  ENGINE RESTART LOOP FIX - DEPLOYMENT SCRIPT"
echo "============================================================"
echo ""

# Detect working directory
if [ -d "/home/arbuser/arb" ]; then
    WORK_DIR="/home/arbuser/arb"
    SOURCE_DIR="/data/workspace/arb"
elif [ -d "/data/workspace/arb" ]; then
    WORK_DIR="/data/workspace/arb"
    SOURCE_DIR="/data/workspace/arb"
else
    echo "❌ ERROR: Cannot find arb directory"
    exit 1
fi

echo "📂 Working directory: $WORK_DIR"
echo "📂 Source directory: $SOURCE_DIR"
echo ""

# Copy fixed files if needed
if [ "$WORK_DIR" != "$SOURCE_DIR" ]; then
    echo "Step 1/8: Copying fixed files..."
    cp "$SOURCE_DIR/.env" "$WORK_DIR/" 2>/dev/null || echo "⚠️  .env already exists or not found"
    cp "$SOURCE_DIR/engine/src/index.js" "$WORK_DIR/engine/src/"
    cp "$SOURCE_DIR/engine/Dockerfile" "$WORK_DIR/engine/"
    cp "$SOURCE_DIR/docker-compose.yml" "$WORK_DIR/"
    echo "✅ Files copied"
else
    echo "Step 1/8: Files already in place"
fi

cd "$WORK_DIR"

echo ""
echo "Step 2/8: Verifying .env file..."
if [ ! -f .env ]; then
    echo "⚠️  Creating .env from example..."
    cp .env.example .env
    echo "⚠️  WARNING: Please update passwords in .env for production!"
else
    echo "✅ .env exists"
fi

echo ""
echo "Step 3/8: Stopping all services..."
docker compose down
echo "✅ Services stopped"

echo ""
echo "Step 4/8: Rebuilding engine with retry logic..."
docker compose build engine
echo "✅ Engine rebuilt"

echo ""
echo "Step 5/8: Starting PostgreSQL..."
docker compose up -d postgres
echo "⏳ Waiting for PostgreSQL..."
sleep 10

echo ""
echo "Step 6/8: Starting Redis..."
docker compose up -d redis
echo "⏳ Waiting for Redis..."
sleep 5

echo ""
echo "Step 7/8: Starting Engine with monitoring..."
docker compose up -d engine
echo "⏳ Monitoring startup (90 seconds)..."
echo ""
echo "--- Engine Startup Logs ---"

# Monitor for 90 seconds
timeout 90s docker compose logs engine -f &
LOGS_PID=$!
sleep 90
kill $LOGS_PID 2>/dev/null || true

echo ""
echo "--- End Startup Logs ---"
echo ""

echo "Step 8/8: Running verification tests..."
echo ""

echo "📊 Container Status:"
docker compose ps
echo ""

echo "🔍 Checking for restart loop..."
RESTART_STATUS=$(docker compose ps | grep engine | grep -c "Restarting" || echo "0")
if [ "$RESTART_STATUS" -gt 0 ]; then
    echo "❌ WARNING: Engine still in restart loop!"
    echo "Check logs: docker compose logs engine --tail=100"
else
    echo "✅ No restart loop detected"
fi
echo ""

echo "🧪 Testing Health Endpoint..."
sleep 5
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health 2>&1 || echo "FAILED")
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo "✅ Health check passed"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo "❌ Health check failed: $HEALTH_RESPONSE"
    echo "   Engine may still be starting up..."
fi
echo ""

echo "🧪 Testing Sessions Endpoint..."
SESSIONS_RESPONSE=$(curl -s http://localhost:3000/api/v1/sessions 2>&1 || echo "FAILED")
if [ "$SESSIONS_RESPONSE" = "OK" ]; then
    echo "✅ Sessions endpoint working"
else
    echo "⚠️  Sessions endpoint: $SESSIONS_RESPONSE"
fi
echo ""

echo "============================================================"
echo "  DEPLOYMENT COMPLETE"
echo "============================================================"
echo ""
echo "📋 Next Steps:"
echo "   1. Monitor stability: docker compose logs engine -f"
echo "   2. Wait 5 minutes and verify no restarts"
echo "   3. Check uptime: docker compose ps"
echo "   4. Test all endpoints"
echo ""
echo "📖 Full Documentation:"
echo "   - Root cause analysis: cat ENGINE_RESTART_DIAGNOSIS.md"
echo "   - Quick reference: cat QUICK_FIX.txt"
echo "   - Crisis fix summary: cat CRISIS_FIX_SUMMARY.md"
echo ""
echo "🔧 If Issues Persist:"
echo "   - View logs: docker compose logs engine --tail=200"
echo "   - Check databases: docker compose exec postgres pg_isready"
echo "   - Test Redis: docker compose exec redis redis-cli ping"
echo "   - Run diagnostics: bash diagnose.sh"
echo ""
echo "============================================================"

# Final stability check
echo "⏳ Running 5-minute stability test..."
echo "   (You can Ctrl+C to skip this)"
sleep 300 || true

echo ""
echo "📊 Final Status Check:"
docker compose ps
echo ""

UPTIME_CHECK=$(docker compose ps | grep engine | grep -c "Restarting" || echo "0")
if [ "$UPTIME_CHECK" -eq 0 ]; then
    echo "✅ SUCCESS: Engine stable for 5 minutes!"
    echo "🎉 Restart loop resolved!"
else
    echo "❌ FAILED: Engine still restarting after 5 minutes"
    echo "   Check: docker compose logs engine --tail=200"
fi
