#!/bin/bash
# Complete diagnostic - Check what's happening inside container
cd /home/arbuser/arb

echo "========================================"
echo "INSIDE CONTAINER DIAGNOSTIC"
echo "========================================"
echo ""

echo "=== 1. Check if container is running at all ==="
docker compose ps | grep arb-engine
echo ""

echo "=== 2. Get container logs (last 100 lines) ==="
docker compose logs engine --tail=100 2>&1
echo ""

echo "=== 3. Try to exec into container ==="
echo "Checking if we can access container..."
if docker compose exec -T engine echo "Container accessible" 2>&1; then
    echo "✓ Can exec into container"
    
    echo ""
    echo "=== 4. Check running processes ==="
    docker compose exec -T engine ps aux 2>&1 || echo "ps command failed"
    
    echo ""
    echo "=== 5. Check if port 3000 is listening ==="
    docker compose exec -T engine netstat -tlnp 2>&1 | grep 3000 || echo "Port 3000 not listening"
    
    echo ""
    echo "=== 6. Check environment variables ==="
    docker compose exec -T engine env | grep -E "NODE_ENV|PORT|DATABASE_URL|REDIS_URL" | sed 's/=.*/=***/' 2>&1
    
    echo ""
    echo "=== 7. Test healthcheck manually ==="
    docker compose exec -T engine node healthcheck.js 2>&1
    echo "Exit code: $?"
    
    echo ""
    echo "=== 8. Try to start app manually ==="
    timeout 10 docker compose exec -T engine node src/index.js 2>&1 || echo "Manual start test complete"
    
else
    echo "✗ Cannot exec into container (it's restarting too fast)"
    echo ""
    echo "=== Alternative: Run standalone container ==="
    docker run --rm -d --name test-engine \
      --network arb_arb-network \
      --env-file .env \
      -e NODE_ENV=production \
      arb-engine node src/index.js
    
    echo "Waiting 5 seconds..."
    sleep 5
    
    echo ""
    echo "=== Check test container logs ==="
    docker logs test-engine 2>&1
    
    echo ""
    echo "=== Check if test container is running ==="
    docker ps | grep test-engine
    
    echo ""
    echo "=== Stop test container ==="
    docker stop test-engine 2>/dev/null || true
fi

echo ""
echo "========================================"
echo "DIAGNOSTIC COMPLETE"
echo "========================================"
echo ""
echo "Send ALL output above to agent"
