#!/bin/bash
# Quick verification after deployment

echo "=== Container Status ==="
docker compose ps

echo ""
echo "=== Engine Logs (last 100 lines) ==="
docker compose logs engine --tail=100

echo ""
echo "=== Test Health Endpoint (Direct) ==="
curl -s http://localhost:3000/health

echo ""
echo "=== Test Health Endpoint (Nginx) ==="
curl -k -s https://api.kliks.life/health

echo ""
echo "=========================================="
echo "NEXT STEPS:"
echo "=========================================="
echo ""
echo "Look for the LAST [START] message in logs above:"
echo ""
echo "  [STARTUP] Loading environment...             ← Basic startup OK"
echo "  [STARTUP] Environment loaded. NODE_ENV...    ← dotenv OK"
echo "  [START] Initializing logger...               ← Attempting logger init"
echo "  [START] Logger initialized successfully      ← Logger OK"
echo "  [START] Initializing metrics...              ← Attempting metrics"
echo "  [START] Metrics initialized successfully     ← Metrics OK"
echo "  [START] Connecting to PostgreSQL...          ← Attempting DB"
echo "  [START] PostgreSQL connected successfully    ← Database OK"
echo "  [START] Connecting to Redis...               ← Attempting Redis"
echo "  [START] Redis connected successfully         ← Redis OK"
echo "  [START] Creating server...                   ← Attempting server"
echo "  [START] Server created successfully          ← Server OK"
echo "  [START] Starting HTTP server...              ← Attempting listen"
echo "  [START] ✅ HTTP Server listening...          ← SUCCESS!"
echo ""
echo "If you see an error like:"
echo "  !!! [START] FAILED TO START ENGINE !!!"
echo ""
echo "The error message will show EXACTLY which component failed."
echo ""
