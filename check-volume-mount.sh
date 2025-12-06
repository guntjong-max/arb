#!/bin/bash
# CRITICAL DIAGNOSTIC - Check if volume mount is still active
cd /home/arbuser/arb

echo "========================================"
echo "VOLUME MOUNT DIAGNOSTIC"
echo "========================================"
echo ""

echo "=== 1. Check actual volume mounts in running container ==="
docker inspect arb-engine --format='{{range .Mounts}}{{printf "Source: %s\nDestination: %s\nMode: %s\n\n" .Source .Destination .Mode}}{{end}}'

echo ""
echo "=== 2. Check if /app/src is mounted from host ==="
SRC_MOUNT=$(docker inspect arb-engine --format='{{range .Mounts}}{{if eq .Destination "/app/src"}}YES{{end}}{{end}}')
if [ "$SRC_MOUNT" = "YES" ]; then
    echo "❌ PROBLEM FOUND: /app/src IS MOUNTED FROM HOST!"
    echo "This overrides built files and causes the crash."
else
    echo "✓ /app/src is NOT mounted (good)"
fi

echo ""
echo "=== 3. List files in /app/src inside container ==="
docker run --rm arb-engine ls -la /app/src/routes/ 2>&1

echo ""
echo "=== 4. Check if session.routes.js exists in container ==="
docker run --rm arb-engine test -f /app/src/routes/session.routes.js && echo "✓ File exists" || echo "❌ File NOT found"

echo ""
echo "=== 5. Try to run with network attached (critical test) ==="
docker run --rm \
  --network arb_arb-network \
  --env-file .env \
  -e DATABASE_URL="postgresql://arbitrage_user:${DB_PASSWORD:-arbitrage_dev_password_2024}@postgres:5432/arbitrage_bot" \
  -e REDIS_URL="redis://:${REDIS_PASSWORD:-redis_dev_password_2024}@redis:6379" \
  -e NODE_ENV=production \
  -e PORT=3000 \
  arb-engine node src/index.js 2>&1 | head -100

echo ""
echo "========================================"
echo "DIAGNOSTIC COMPLETE - Send all output to agent"
echo "========================================"
