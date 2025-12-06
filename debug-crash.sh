#!/bin/bash
# Final diagnostic - capture crash error
cd /home/arbuser/arb

echo "========================================"
echo "CRASH DIAGNOSTIC"
echo "========================================"
echo ""

echo "=== 1. Check Dockerfile CMD ==="
docker inspect arb-engine --format='{{.Config.Cmd}}'
echo ""

echo "=== 2. Check compose command override ==="
docker inspect arb-engine --format='{{.Config.Entrypoint}}'
echo ""

echo "=== 3. Try to exec and run manually ==="
echo "Attempting to exec into container (may fail if restarting)..."
docker compose exec -T engine sh -c "pwd && ls -la && node --version" 2>&1 || echo "Cannot exec (container restarting too fast)"
echo ""

echo "=== 4. Run standalone container with logs ==="
echo "Starting test container..."
docker run --rm --name test-engine-debug \
  --network arb_arb-network \
  --env-file .env \
  -e NODE_ENV=production \
  arb-engine sh -c "echo 'Starting...'; node src/index.js" 2>&1 &

CONTAINER_PID=$!
sleep 5

echo ""
echo "=== 5. Check test container logs ==="
docker logs test-engine-debug 2>&1 || echo "No logs"

echo ""
echo "=== 6. Check if test container is still running ==="
docker ps -a | grep test-engine-debug

echo ""
echo "=== 7. Try with different commands ==="
echo "Test 1: Check if Node works..."
docker run --rm arb-engine node --version

echo ""
echo "Test 2: Check if file exists..."
docker run --rm arb-engine ls -la /app/src/index.js

echo ""
echo "Test 3: Try to load index.js..."
docker run --rm --env-file .env -e NODE_ENV=production arb-engine node -e "require('/app/src/index.js')" 2>&1 | head -50

echo ""
echo "Test 4: Check syntax..."
docker run --rm arb-engine node --check /app/src/index.js 2>&1

echo ""
echo "=== 8. Stop test container ==="
docker stop test-engine-debug 2>/dev/null || true
docker rm test-engine-debug 2>/dev/null || true

echo ""
echo "========================================"
echo "Send ALL output to agent"
echo "========================================"
