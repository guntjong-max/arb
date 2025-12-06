#!/bin/bash
# Complete deployment fix for arb-engine restart loop
# This script will be provided to user to run on server

set -e

echo "========================================"
echo "🚀 ARB-ENGINE PRODUCTION FIX DEPLOYMENT"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check we're in correct directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Error: docker-compose.yml not found!${NC}"
    echo "Please run this script from /home/arbuser/arb directory"
    exit 1
fi

# Step 1: Verify .env file exists
echo -e "${BLUE}[Step 1/8]${NC} Verifying .env file..."
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ .env file exists${NC}"

# Step 2: Create/Update docker-compose.prod.yml with fixed version
echo ""
echo -e "${BLUE}[Step 2/8]${NC} Creating fixed docker-compose.prod.yml..."
cat > docker-compose.prod.yml << 'EOF'
version: '3.9'

# Production override untuk docker-compose.yml
# Usage: docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

services:
  engine:
    # Remove problematic volume mounts for production
    volumes:
      - ./engine/logs:/app/logs
      # ❌ REMOVED: - ./engine/src:/app/src:ro
    
    # Explicitly load .env file (critical for production)
    env_file:
      - .env
    
    environment:
      NODE_ENV: production
      # Force dotenv to load even in production
      DOTENV_CONFIG_PATH: /app/.env
    
    restart: always
EOF
echo -e "${GREEN}✓ docker-compose.prod.yml created${NC}"

# Step 3: Validate compose config
echo ""
echo -e "${BLUE}[Step 3/8]${NC} Validating Docker Compose configuration..."
if docker compose -f docker-compose.yml -f docker-compose.prod.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Configuration is valid${NC}"
else
    echo -e "${RED}❌ Configuration validation failed!${NC}"
    docker compose -f docker-compose.yml -f docker-compose.prod.yml config
    exit 1
fi

# Step 4: Stop existing containers
echo ""
echo -e "${BLUE}[Step 4/8]${NC} Stopping existing containers..."
docker compose down
echo -e "${GREEN}✓ Containers stopped${NC}"

# Step 5: Clean up old images (optional but recommended)
echo ""
echo -e "${BLUE}[Step 5/8]${NC} Cleaning up old engine images..."
docker rmi arb-engine 2>/dev/null || echo "No old image to remove"
echo -e "${GREEN}✓ Cleanup complete${NC}"

# Step 6: Build and start services
echo ""
echo -e "${BLUE}[Step 6/8]${NC} Building and starting services..."
echo "This will take 2-3 minutes..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Step 7: Wait for services to initialize
echo ""
echo -e "${BLUE}[Step 7/8]${NC} Waiting for services to initialize..."
echo "Waiting 70 seconds for database schema creation and service startup..."
for i in {70..1}; do
    echo -ne "${YELLOW}$i seconds remaining...${NC}\r"
    sleep 1
done
echo -e "${GREEN}✓ Wait period complete${NC}                    "

# Step 8: Check status
echo ""
echo -e "${BLUE}[Step 8/8]${NC} Checking container status..."
docker compose ps
echo ""

# Verification
echo "========================================"
echo "🔍 VERIFICATION TESTS"
echo "========================================"
echo ""

# Test 1: Container health
echo -e "${YELLOW}Test 1: Container Health${NC}"
if docker compose ps | grep arb-engine | grep -q "healthy"; then
    echo -e "${GREEN}✓ arb-engine is HEALTHY${NC}"
    ENGINE_HEALTHY=true
elif docker compose ps | grep arb-engine | grep -q "Up"; then
    echo -e "${YELLOW}⚠ arb-engine is UP but health check still running...${NC}"
    ENGINE_HEALTHY=false
else
    echo -e "${RED}✗ arb-engine is NOT healthy${NC}"
    ENGINE_HEALTHY=false
fi
echo ""

# Test 2: Direct health endpoint
echo -e "${YELLOW}Test 2: Direct Health Endpoint (localhost:3000)${NC}"
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health 2>&1)
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✓ Health endpoint responding correctly${NC}"
    echo "Response: $HEALTH_RESPONSE"
    DIRECT_HEALTH=true
else
    echo -e "${RED}✗ Health endpoint not responding${NC}"
    echo "Response: $HEALTH_RESPONSE"
    DIRECT_HEALTH=false
fi
echo ""

# Test 3: Nginx health endpoint
echo -e "${YELLOW}Test 3: Nginx Health Endpoint (api.kliks.life)${NC}"
NGINX_RESPONSE=$(curl -k -s https://api.kliks.life/health 2>&1)
if echo "$NGINX_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✓ Nginx endpoint responding correctly (NO MORE 502!)${NC}"
    echo "Response: $NGINX_RESPONSE"
    NGINX_HEALTH=true
elif echo "$NGINX_RESPONSE" | grep -q "502"; then
    echo -e "${RED}✗ Still getting 502 error${NC}"
    echo "Response: $NGINX_RESPONSE"
    NGINX_HEALTH=false
else
    echo -e "${YELLOW}⚠ Unexpected response${NC}"
    echo "Response: $NGINX_RESPONSE"
    NGINX_HEALTH=false
fi
echo ""

# Test 4: Database connection
echo -e "${YELLOW}Test 4: Database Connection${NC}"
if docker compose exec -T postgres pg_isready -U arbitrage_user -d arbitrage_bot 2>&1 | grep -q "accepting"; then
    echo -e "${GREEN}✓ Database is ready${NC}"
else
    echo -e "${RED}✗ Database connection issue${NC}"
fi
echo ""

# Test 5: Redis connection
echo -e "${YELLOW}Test 5: Redis Connection${NC}"
if docker compose exec -T redis redis-cli PING 2>&1 | grep -q "PONG"; then
    echo -e "${GREEN}✓ Redis is ready${NC}"
else
    echo -e "${RED}✗ Redis connection issue${NC}"
fi
echo ""

# Summary
echo "========================================"
echo "📊 DEPLOYMENT SUMMARY"
echo "========================================"
echo ""

ALL_GOOD=true
if [ "$ENGINE_HEALTHY" = true ] && [ "$DIRECT_HEALTH" = true ] && [ "$NGINX_HEALTH" = true ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo ""
    echo "🎉 Engine is healthy and responding correctly!"
    echo "✓ Container status: healthy"
    echo "✓ Direct endpoint: working"
    echo "✓ Nginx endpoint: working (no more 502)"
    echo ""
    echo -e "${GREEN}Deployment is SUCCESSFUL!${NC}"
else
    echo -e "${RED}⚠️ SOME TESTS FAILED${NC}"
    ALL_GOOD=false
    echo ""
    echo "Please check the following:"
    if [ "$ENGINE_HEALTHY" = false ]; then
        echo "- Engine container is not healthy yet (may need more time)"
    fi
    if [ "$DIRECT_HEALTH" = false ]; then
        echo "- Direct health endpoint not responding"
    fi
    if [ "$NGINX_HEALTH" = false ]; then
        echo "- Nginx health endpoint not responding"
    fi
    echo ""
    echo "Check logs with: docker compose logs engine --tail=100"
fi

echo ""
echo "========================================"
echo "📝 NEXT STEPS"
echo "========================================"
echo ""

if [ "$ALL_GOOD" = true ]; then
    echo "Test the sessions API endpoint:"
    echo ""
    echo "curl -k -X POST https://api.kliks.life/api/v1/sessions \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -d '{"
    echo "    \"user_id\": \"test-user-123\","
    echo "    \"sportsbook\": \"bet365\","
    echo "    \"session_data\": \"encrypted_session_token_here\","
    echo "    \"consent_id\": \"test-consent-456\","
    echo "    \"expires_at\": \"2025-12-31T23:59:59Z\""
    echo "  }'"
else
    echo "1. Check engine logs:"
    echo "   docker compose logs engine --tail=100"
    echo ""
    echo "2. If still restarting, check specific error:"
    echo "   docker logs arb-engine 2>&1 | grep -i error"
    echo ""
    echo "3. If needed, restart engine only:"
    echo "   docker compose restart engine"
fi

echo ""
echo "Monitor logs: docker compose logs -f engine"
echo ""
