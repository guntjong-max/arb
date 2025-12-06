#!/bin/bash
set -e

echo "=========================================="
echo "DEPLOYING WITH HEALTHCHECK DISABLED"
echo "=========================================="
echo ""

cd /home/arbuser/arb

echo "Step 1: Stop all services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml down

echo ""
echo "Step 2: Remove old engine image..."
docker rmi arb-engine || true

echo ""
echo "Step 3: Clean build cache..."
docker builder prune -af

echo ""
echo "Step 4: Rebuild engine (no cache)..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache --pull engine

echo ""
echo "Step 5: Start services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

echo ""
echo "Step 6: Wait 10 seconds for startup..."
sleep 10

echo ""
echo "=========================================="
echo "DIAGNOSTICS"
echo "=========================================="
echo ""

echo "=== Container Status ==="
docker compose ps

echo ""
echo "=== Engine Logs (last 100 lines) ==="
docker compose logs engine --tail=100

echo ""
echo "=== Test Health Endpoint (Direct) ==="
curl -s http://localhost:3000/health || echo "Failed to connect"

echo ""
echo "=== Test Health Endpoint (Nginx) ==="
curl -k -s https://api.kliks.life/health || echo "Failed to connect"

echo ""
echo "=========================================="
echo "REAL-TIME LOG MONITORING"
echo "=========================================="
echo "Press Ctrl+C to stop log monitoring"
echo ""
docker compose logs -f engine
