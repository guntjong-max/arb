#!/bin/bash
# Manual diagnostic - Run container to see actual Node.js error
cd /home/arbuser/arb

echo "========================================"
echo "MANUAL CONTAINER RUN - SEE ACTUAL ERROR"
echo "========================================"
echo ""

echo "=== Test 1: Basic Run (no network) ==="
echo "Running container with env vars to see startup error..."
docker run --rm \
  --env-file .env \
  -e NODE_ENV=production \
  arb-engine node src/index.js 2>&1 | head -100

echo ""
echo ""
echo "=== Test 2: With Network (connects to DB/Redis) ==="
echo "Running with arb-network to test DB/Redis connections..."
docker run --rm \
  --network arb_arb-network \
  --env-file .env \
  -e NODE_ENV=production \
  arb-engine node src/index.js 2>&1 | head -100

echo ""
echo ""
echo "=== Test 3: Check if dependencies are installed ==="
docker run --rm arb-engine ls -la /app/node_modules/ | head -20

echo ""
echo "=== Test 4: Check if route files exist ==="
docker run --rm arb-engine ls -la /app/src/routes/

echo ""
echo "=== Test 5: Try to require session.routes.js ==="
docker run --rm arb-engine node -e "try { require('/app/src/routes/session.routes.js'); console.log('✓ Module loads OK'); } catch(e) { console.error('✗ Error:', e.message); }" 2>&1

echo ""
echo "========================================"
echo "Copy ALL output above and send to agent"
echo "========================================"
