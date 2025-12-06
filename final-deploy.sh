#!/bin/bash
# FINAL DEPLOYMENT - After removing /app/src mount from base config
# Run this on server: /home/arbuser/arb

cd /home/arbuser/arb

echo "========================================"
echo "🚀 FINAL DEPLOYMENT"
echo "========================================"
echo ""

# Step 1: Update docker-compose.yml (remove src volume mount)
echo "=== Step 1: Updating docker-compose.yml ==="
echo "Removing problematic volume mount..."

# Backup current file
cp docker-compose.yml docker-compose.yml.backup

# Remove the src volume mount line
sed -i '/- \.\/engine\/src:\/app\/src:ro/d' docker-compose.yml

echo "✓ Volume mount removed from docker-compose.yml"
echo ""

# Step 2: Verify the change
echo "=== Step 2: Verifying configuration ==="
echo "Checking merged config..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml config 2>&1 | grep -A 5 "volumes:" | head -10
echo ""

# Step 3: Stop and clean
echo "=== Step 3: Stopping containers and cleaning ==="
docker compose down
docker rmi arb-engine 2>/dev/null || echo "No old image to remove"
echo ""

# Step 4: Rebuild and start
echo "=== Step 4: Building and starting services ==="
echo "This will take 2-3 minutes..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --force-recreate

# Step 5: Wait for initialization
echo ""
echo "=== Step 5: Waiting for services (70 seconds) ==="
for i in {70..1}; do
    echo -ne "⏳ $i seconds remaining...\r"
    sleep 1
done
echo "✓ Wait complete                    "
echo ""

# Step 6: Verification
echo "========================================"
echo "📊 VERIFICATION RESULTS"
echo "========================================"
echo ""

echo "=== Container Status ==="
docker compose ps
echo ""

echo "=== Volume Mounts in Container ==="
docker inspect arb-engine --format='{{range .Mounts}}  {{.Destination}}{{"\n"}}{{end}}' 2>&1
echo ""
echo "Expected: Only /app/logs (NO /app/src)"
echo ""

echo "=== Health Check (Direct - localhost:3000) ==="
HEALTH_DIRECT=$(curl -s http://localhost:3000/health 2>&1)
if echo "$HEALTH_DIRECT" | grep -q "healthy"; then
    echo "✅ SUCCESS: $HEALTH_DIRECT"
else
    echo "❌ FAILED: $HEALTH_DIRECT"
fi
echo ""

echo "=== Health Check (Nginx - api.kliks.life) ==="
HEALTH_NGINX=$(curl -k -s https://api.kliks.life/health 2>&1)
if echo "$HEALTH_NGINX" | grep -q "healthy"; then
    echo "✅ SUCCESS: $HEALTH_NGINX"
elif echo "$HEALTH_NGINX" | grep -q "502"; then
    echo "❌ STILL 502: $HEALTH_NGINX"
else
    echo "⚠️  UNEXPECTED: $HEALTH_NGINX"
fi
echo ""

echo "=== Test Sessions Endpoint ==="
SESSION_TEST=$(curl -k -s -X POST https://api.kliks.life/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","sportsbook":"bet365","session_data":"test","consent_id":"test"}' 2>&1)
if echo "$SESSION_TEST" | grep -q "502"; then
    echo "❌ STILL 502"
else
    echo "✅ NOT 502: $SESSION_TEST"
fi
echo ""

echo "========================================"
echo "📝 SUMMARY"
echo "========================================"
echo ""

# Check if all tests passed
if echo "$HEALTH_DIRECT" | grep -q "healthy" && \
   echo "$HEALTH_NGINX" | grep -q "healthy" && \
   ! echo "$SESSION_TEST" | grep -q "502"; then
    echo "🎉 ALL TESTS PASSED!"
    echo ""
    echo "✅ Container is healthy"
    echo "✅ Direct health endpoint working"
    echo "✅ Nginx health endpoint working"
    echo "✅ Sessions API accessible"
    echo ""
    echo "The system is now fully operational!"
else
    echo "⚠️  SOME TESTS FAILED"
    echo ""
    echo "Debugging steps:"
    echo "1. Check container logs:"
    echo "   docker compose logs engine --tail=100"
    echo ""
    echo "2. Try manual container run:"
    echo "   docker run --rm --network arb_arb-network --env-file .env -e NODE_ENV=production arb-engine node src/index.js"
    echo ""
    echo "3. Check database/redis connections:"
    echo "   docker compose exec postgres pg_isready -U arbitrage_user"
    echo "   docker compose exec redis redis-cli PING"
fi

echo ""
echo "To view logs: docker compose logs -f engine"
echo "To restart: docker compose restart engine"
echo ""
