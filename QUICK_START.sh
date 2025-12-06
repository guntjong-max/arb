#!/bin/bash
# Arbitrage Bot System - Quick Start Script

set -e

echo "========================================"
echo "  Arbitrage Bot System - Quick Start   "
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env
    
    # Generate secrets
    echo -e "${YELLOW}Generating security secrets...${NC}"
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)
    SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)
    
    # Update .env with generated secrets
    sed -i "s/JWT_SECRET=CHANGE_ME.*/JWT_SECRET=$JWT_SECRET/" .env
    sed -i "s/SESSION_SECRET=CHANGE_ME.*/SESSION_SECRET=$SESSION_SECRET/" .env
    
    echo -e "${GREEN}✓ .env file created with generated secrets${NC}"
    echo -e "${YELLOW}⚠ Please update passwords in .env file before production use!${NC}"
    echo ""
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}✗ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"
echo ""

# Build and start services
echo "Starting backend services..."
echo "This may take a few minutes on first run..."
echo ""

docker compose up -d

echo ""
echo -e "${GREEN}✓ Backend services started!${NC}"
echo ""

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Check health
echo "Checking service health..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✓ Engine API is healthy${NC}"
else
    echo -e "${YELLOW}⚠ Engine API not responding yet (may need more time)${NC}"
fi

echo ""
echo "========================================"
echo "  System is Ready!                     "
echo "========================================"
echo ""
echo "Access points:"
echo "  - Frontend Dashboard: http://localhost:5173 (after starting frontend)"
echo "  - Backend API:        http://localhost:3000"
echo "  - API Docs:           http://localhost:3000/api/docs"
echo "  - WebSocket:          ws://localhost:3000/ws"
echo "  - Prometheus:         http://localhost:9090"
echo "  - Grafana:            http://localhost:3030"
echo "  - PgAdmin:            http://localhost:5050"
echo ""
echo "Next steps:"
echo "  1. Start frontend:"
echo "     cd frontend"
echo "     npm install  (if not done)"
echo "     npm run dev"
echo ""
echo "  2. Access dashboard at http://localhost:5173"
echo ""
echo "  3. Configure accounts and settings"
echo ""
echo "To view logs:"
echo "  docker compose logs -f engine"
echo ""
echo "To stop services:"
echo "  docker compose down"
echo ""
echo -e "${GREEN}Happy Trading! (Educational Use Only)${NC}"
echo ""
