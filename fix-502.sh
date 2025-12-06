#!/bin/bash
# Quick fix script for arb-engine 502 issue
# This removes the problematic volume mount and redeploys

set -e  # Exit on error

echo "=========================================="
echo "ARB-ENGINE 502 QUICK FIX"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}This script will:${NC}"
echo "1. Stop current containers"
echo "2. Deploy with production config (no src volume mount)"
echo "3. Wait for services to be healthy"
echo "4. Verify the fix"
echo ""

read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo -e "${YELLOW}[1/5] Stopping containers...${NC}"
docker compose down
echo -e "${GREEN}✓ Stopped${NC}"

echo ""
echo -e "${YELLOW}[2/5] Deploying with production config...${NC}"
if [ -f "docker-compose.prod.yml" ]; then
    echo "Using docker-compose.prod.yml override..."
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
else
    echo -e "${RED}Warning: docker-compose.prod.yml not found!${NC}"
    echo "Deploying with default config (may still have issue)..."
    docker compose up -d --build
fi
echo -e "${GREEN}✓ Deployed${NC}"

echo ""
echo -e "${YELLOW}[3/5] Waiting for services to be ready...${NC}"
echo "This may take 60-90 seconds..."
sleep 60

echo ""
echo -e "${YELLOW}[4/5] Checking container status...${NC}"
docker compose ps

echo ""
echo -e "${YELLOW}[5/5] Running verification tests...${NC}"

# Test 1: Container health
if docker compose ps | grep arb-engine | grep -q "healthy"; then
    echo -e "${GREEN}✓ Container is HEALTHY${NC}"
else
    echo -e "${RED}✗ Container is NOT healthy${NC}"
    echo "Check logs: docker compose logs engine"
fi

# Test 2: Direct health endpoint
echo ""
echo "Testing health endpoint (direct to container)..."
if docker compose exec -T engine curl -s http://localhost:3000/health | grep -q "healthy"; then
    echo -e "${GREEN}✓ Health endpoint responding${NC}"
else
    echo -e "${RED}✗ Health endpoint not responding${NC}"
fi

# Test 3: Via host
echo ""
echo "Testing health endpoint (via host)..."
if curl -s http://localhost:3000/health | grep -q "healthy"; then
    echo -e "${GREEN}✓ Accessible from host${NC}"
else
    echo -e "${RED}✗ Not accessible from host${NC}"
fi

# Test 4: Via Nginx (if applicable)
echo ""
echo "Testing health endpoint (via Nginx)..."
if curl -k -s https://api.kliks.life/health 2>/dev/null | grep -q "healthy"; then
    echo -e "${GREEN}✓ Accessible via Nginx (no more 502!)${NC}"
else
    echo -e "${RED}✗ Still getting errors via Nginx${NC}"
    echo "Check Nginx configuration and logs"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}FIX DEPLOYMENT COMPLETE${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Monitor logs: docker compose logs -f engine"
echo "2. Test sessions endpoint:"
echo "   curl -k -X POST https://api.kliks.life/api/v1/sessions \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"user_id\":\"test\",\"sportsbook\":\"bet365\"}'"
echo ""
echo "If issues persist, run: bash diagnostic.sh"
