#!/bin/bash
# HEALTHCHECK FIX DEPLOYMENT
# Issue: Healthcheck timeout too short, causing restart loop even when app is healthy
cd /home/arbuser/arb

echo "========================================"
echo "HEALTHCHECK FIX DEPLOYMENT"
echo "========================================"
echo ""

# Step 1: Update healthcheck.js
echo "=== Step 1: Updating healthcheck.js ==="
cat > engine/healthcheck.js << 'EOF'
// healthcheck.js - Simple health check for Docker
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  method: 'GET',
  timeout: 15000  // Increased from 5000 to 15000ms for slower startups
};

const req = http.request(options, (res) => {
  console.log(`Health check status: ${res.statusCode}`);
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on('error', (err) => {
  console.error('Health check failed:', err);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('Health check timeout');
  req.destroy();
  process.exit(1);
});

req.end();
EOF
echo "✓ healthcheck.js updated (timeout: 5s -> 15s)"

# Step 2: Update docker-compose.yml healthcheck config
echo ""
echo "=== Step 2: Updating docker-compose.yml ==="
sed -i 's/timeout: 10s/timeout: 20s  # Increased for slower startups/' docker-compose.yml
sed -i 's/start_period: 40s/start_period: 90s  # Increased for DB\/Redis init/' docker-compose.yml
echo "✓ docker-compose.yml updated (timeout: 10s -> 20s, start_period: 40s -> 90s)"

# Step 3: Update Dockerfile
echo ""
echo "=== Step 3: Updating Dockerfile ==="
sed -i 's/--timeout=10s/--timeout=20s/' engine/Dockerfile
sed -i 's/--start-period=40s/--start-period=90s/' engine/Dockerfile
echo "✓ Dockerfile updated"

# Step 4: Stop and clean
echo ""
echo "=== Step 4: Stopping and cleaning ==="
docker compose down
docker rmi arb-engine 2>/dev/null || true

# Step 5: Rebuild
echo ""
echo "=== Step 5: Rebuilding and starting ==="
echo "Building... (this takes 2-3 minutes)"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --force-recreate

# Step 6: Wait for healthcheck
echo ""
echo "=== Step 6: Waiting for healthcheck (90 seconds start period) ==="
echo "This is longer now to allow DB/Redis to fully initialize"
for i in {90..1}; do
    echo -ne "⏳ $i seconds remaining...\r"
    sleep 1
done
echo "✓ Initial wait complete                    "

# Additional 30 second wait for first healthcheck
echo ""
echo "Waiting additional 30 seconds for first healthcheck to run..."
sleep 30

# Step 7: Check status
echo ""
echo "========================================"
echo "VERIFICATION"
echo "========================================"
echo ""

echo "=== Container Status ==="
docker compose ps | grep arb-engine
echo ""

echo "=== Healthcheck Logs ==="
docker logs arb-engine 2>&1 | grep -i "health" | tail -10
echo ""

echo "=== Test Direct Health ==="
HEALTH_DIRECT=$(curl -s http://localhost:3000/health 2>&1)
if echo "$HEALTH_DIRECT" | grep -q "healthy"; then
    echo "✅ SUCCESS: $HEALTH_DIRECT"
else
    echo "Response: $HEALTH_DIRECT"
    echo "Waiting another 30 seconds..."
    sleep 30
    curl -s http://localhost:3000/health
fi
echo ""

echo "=== Test Nginx Health ==="
HEALTH_NGINX=$(curl -k -s https://api.kliks.life/health 2>&1)
if echo "$HEALTH_NGINX" | grep -q "healthy"; then
    echo "✅ SUCCESS: $HEALTH_NGINX"
elif echo "$HEALTH_NGINX" | grep -q "502"; then
    echo "⚠️  Still 502, waiting another 30 seconds..."
    sleep 30
    curl -k -s https://api.kliks.life/health
else
    echo "Response: $HEALTH_NGINX"
fi
echo ""

echo "=== Test Sessions Endpoint ==="
curl -k -s -X POST https://api.kliks.life/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","sportsbook":"bet365","session_data":"test","consent_id":"test"}'
echo ""
echo ""

echo "========================================"
echo "DEPLOYMENT COMPLETE"
echo "========================================"
echo ""
echo "If status shows 'health: starting', wait another 60 seconds"
echo "Monitor: docker compose logs -f engine"
