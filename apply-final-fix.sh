#!/bin/bash
# FINAL FIX - Remove volume mount completely
cd /home/arbuser/arb

echo "========================================"
echo "APPLYING FINAL FIX"
echo "========================================"
echo ""

# Create definitive docker-compose.prod.yml that overrides volumes properly
cat > docker-compose.prod.yml << 'EOF'
version: '3.9'

services:
  engine:
    # Replace volumes entirely (not merge) - only logs, no src
    volumes:
      - ./engine/logs:/app/logs
    
    # Load environment variables
    env_file:
      - .env
    
    environment:
      NODE_ENV: production
    
    restart: always
EOF

echo "✓ docker-compose.prod.yml updated"

# Verify config shows NO /app/src mount
echo ""
echo "=== Verifying merged config ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml config | grep -A 10 "volumes:" | head -15

echo ""
echo "=== Stopping containers ==="
docker compose down

echo ""
echo "=== Removing old images ==="
docker rmi arb-engine 2>/dev/null || echo "No old image"

echo ""
echo "=== Building and starting ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --force-recreate

echo ""
echo "=== Waiting 70 seconds ==="
sleep 70

echo ""
echo "=== Checking mounts in new container ==="
docker inspect arb-engine --format='{{range .Mounts}}Destination: {{.Destination}}{{"\n"}}{{end}}'

echo ""
echo "=== Container status ==="
docker compose ps

echo ""
echo "=== Health check ==="
curl -s http://localhost:3000/health || echo "Still failed"

echo ""
echo "✅ FIX APPLIED - Check results above"
