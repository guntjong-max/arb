#!/bin/bash
# Diagnostic script for arb-engine 502 issue
# Usage: bash diagnostic.sh

echo "=========================================="
echo "ARB-ENGINE DIAGNOSTIC REPORT"
echo "Timestamp: $(date)"
echo "=========================================="
echo ""

echo "=== 1. CONTAINER STATUS ==="
docker compose ps
echo ""

echo "=== 2. ENGINE CONTAINER DETAILS ==="
docker inspect arb-engine --format='{{.State.Status}}: {{.State.Health.Status}}' 2>/dev/null || echo "Container not found"
echo ""

echo "=== 3. ENGINE LOGS (Last 50 lines) ==="
docker compose logs --tail=50 engine
echo ""

echo "=== 4. HEALTHCHECK TEST ==="
docker compose exec -T engine node healthcheck.js 2>&1
HEALTHCHECK_EXIT=$?
echo "Healthcheck exit code: $HEALTHCHECK_EXIT"
echo ""

echo "=== 5. PORT LISTENING CHECK ==="
docker compose exec -T engine netstat -tlnp 2>/dev/null | grep -E "3000|3001" || echo "netstat not available"
echo ""

echo "=== 6. ENVIRONMENT VARIABLES ==="
docker compose exec -T engine env | grep -E "NODE_ENV|PORT|DATABASE_URL|REDIS_URL|JWT_SECRET" | sed 's/=.*/=***REDACTED***/'
echo ""

echo "=== 7. DATABASE CONNECTION ==="
docker compose exec -T postgres pg_isready -U arbitrage_user -d arbitrage_bot 2>&1
echo ""

echo "=== 8. REDIS CONNECTION ==="
docker compose exec -T redis redis-cli -a "${REDIS_PASSWORD:-redis_dev_password_2024}" PING 2>&1 | grep -v "Warning"
echo ""

echo "=== 9. CURL TEST - DIRECT TO CONTAINER ==="
docker compose exec -T engine curl -s http://localhost:3000/health 2>&1 || echo "curl failed or not available"
echo ""

echo "=== 10. CURL TEST - VIA HOST ==="
curl -s http://localhost:3000/health 2>&1 || echo "Cannot reach localhost:3000"
echo ""

echo "=== 11. CURL TEST - VIA NGINX (if applicable) ==="
curl -k -s https://api.kliks.life/health 2>&1 || echo "Cannot reach api.kliks.life"
echo ""

echo "=== 12. VOLUME MOUNTS ==="
docker inspect arb-engine --format='{{range .Mounts}}{{.Source}} -> {{.Destination}} ({{.Mode}}){{"\n"}}{{end}}' 2>/dev/null || echo "Container not found"
echo ""

echo "=== 13. FILE EXISTENCE CHECK ==="
echo "Checking critical files in container..."
docker compose exec -T engine ls -lh /app/healthcheck.js /app/src/index.js /app/src/server.js 2>&1 || echo "Files check failed"
echo ""

echo "=== 14. DOCKER COMPOSE CONFIG ==="
echo "Showing engine service config..."
docker compose config --services | grep engine
echo ""

echo "=========================================="
echo "DIAGNOSTIC COMPLETE"
echo "=========================================="
echo ""
echo "Quick Analysis:"
echo ""

# Quick analysis
if [ "$HEALTHCHECK_EXIT" -eq 0 ]; then
    echo "✅ Healthcheck: PASSING"
else
    echo "❌ Healthcheck: FAILING (exit code: $HEALTHCHECK_EXIT)"
fi

if docker compose ps | grep arb-engine | grep -q "healthy"; then
    echo "✅ Container: HEALTHY"
elif docker compose ps | grep arb-engine | grep -q "starting"; then
    echo "⏳ Container: STARTING (stuck in health check)"
else
    echo "❌ Container: UNHEALTHY or DOWN"
fi

if docker compose exec -T postgres pg_isready -U arbitrage_user -d arbitrage_bot 2>&1 | grep -q "accepting"; then
    echo "✅ Database: CONNECTED"
else
    echo "❌ Database: NOT CONNECTED"
fi

if docker compose exec -T redis redis-cli -a "${REDIS_PASSWORD:-redis_dev_password_2024}" PING 2>&1 | grep -q "PONG"; then
    echo "✅ Redis: CONNECTED"
else
    echo "❌ Redis: NOT CONNECTED"
fi

echo ""
echo "See full output above for details."
echo "To save this report: bash diagnostic.sh > diagnostic_$(date +%Y%m%d_%H%M%S).txt"
