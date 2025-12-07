#!/bin/bash

# Complete Sportsbook Automation System Deployment Script

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  SPORTSBOOK AUTOMATION SYSTEM - COMPLETE DEPLOYMENT"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Stop and remove existing containers
echo -e "${YELLOW}[1/5]${NC} Stopping existing containers..."
docker compose down -v 2>/dev/null || true
echo -e "${GREEN}✓${NC} Cleanup complete"
echo ""

# Step 2: Build all services
echo -e "${YELLOW}[2/5]${NC} Building services..."
docker compose build --no-cache
echo -e "${GREEN}✓${NC} Build complete"
echo ""

# Step 3: Start all services
echo -e "${YELLOW}[3/5]${NC} Starting services..."
docker compose up -d
echo -e "${GREEN}✓${NC} Services started"
echo ""

# Step 4: Wait for services to be healthy
echo -e "${YELLOW}[4/5]${NC} Waiting for services to be ready..."
echo "This may take 30-60 seconds..."
sleep 30

# Step 5: Check service status
echo ""
echo -e "${YELLOW}[5/5]${NC} Checking service status..."
echo ""

# Check Docker containers
docker compose ps

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  HEALTH CHECKS"
echo "═══════════════════════════════════════════════════════════"

# Test backend health
echo ""
echo "Testing backend API health..."
if curl -f http://localhost:3000/api/system-health 2>/dev/null | grep -q "healthy"; then
    echo -e "${GREEN}✓${NC} Backend API is healthy"
else
    echo -e "${RED}✗${NC} Backend API health check failed"
    echo "Checking logs..."
    docker compose logs --tail=20 engine
fi

# Test frontend
echo ""
echo "Testing frontend..."
if curl -f http://localhost:3001/ 2>/dev/null > /dev/null; then
    echo -e "${GREEN}✓${NC} Frontend is accessible"
else
    echo -e "${YELLOW}⚠${NC} Frontend not yet accessible (may still be building)"
fi

# Check worker
echo ""
echo "Checking worker status..."
WORKER_STATUS=$(docker compose ps worker | grep worker | awk '{print $6}')
if echo "$WORKER_STATUS" | grep -q "Up"; then
    echo -e "${GREEN}✓${NC} Worker is running"
else
    echo -e "${RED}✗${NC} Worker is not running properly"
    echo "Worker logs:"
    docker compose logs --tail=20 worker
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  DEPLOYMENT COMPLETE"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Access Points:"
echo "  🌐 Frontend:    http://localhost:3001"
echo "  🔌 Backend API: http://localhost:3000"
echo "  ❤️  Health:      http://localhost:3000/api/system-health"
echo "  📚 API Docs:    http://localhost:3000/api/docs"
echo "  🔍 NGINX:       http://localhost:80"
echo ""
echo "Useful Commands:"
echo "  View all logs:        docker compose logs -f"
echo "  View backend logs:    docker compose logs -f engine"
echo "  View worker logs:     docker compose logs -f worker"
echo "  View frontend logs:   docker compose logs -f frontend"
echo "  Stop all services:    docker compose down"
echo "  Restart a service:    docker compose restart <service>"
echo ""
echo "Database Access:"
echo "  Host:     localhost:5432"
echo "  Database: arbitrage_bot"
echo "  User:     arbitrage_user"
echo "  Password: arbitrage_dev_password_2024"
echo ""

# Final status summary
echo "═══════════════════════════════════════════════════════════"
RUNNING=$(docker compose ps | grep "Up" | wc -l)
echo -e "Services running: ${GREEN}${RUNNING}${NC}/6"
echo "═══════════════════════════════════════════════════════════"
echo ""
