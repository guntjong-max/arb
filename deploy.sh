#!/bin/bash

# Production Build Script
# Rebuilds and restarts the Arbitrage Bot system

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║        🚀 Arbitrage Bot - Production Build                   ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Check if running in correct directory
if [ ! -f "docker-compose.yml" ]; then
    echo "Error: docker-compose.yml not found. Please run from project root."
    exit 1
fi

# Step 1: Stop containers
print_step "Stopping containers..."
docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true
print_success "Containers stopped"
echo ""

# Step 2: Rebuild
print_step "Building Docker images..."
if command -v docker-compose &> /dev/null; then
    docker-compose build --no-cache
elif docker compose version &> /dev/null; then
    docker compose build --no-cache
fi
print_success "Images built"
echo ""

# Step 3: Start services
print_step "Starting services..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
elif docker compose version &> /dev/null; then
    docker compose up -d
fi
print_success "Services started"
echo ""

# Step 4: Wait for services
print_step "Waiting for services to initialize (30 seconds)..."
sleep 30
echo ""

# Step 5: Show status
print_step "Service Status:"
echo "═══════════════════════════════════════════════════════════════"
if command -v docker-compose &> /dev/null; then
    docker-compose ps
elif docker compose version &> /dev/null; then
    docker compose ps
fi
echo ""

# Final message
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║                    ✓ DEPLOYMENT COMPLETE                     ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Access Points:"
echo "  • Frontend:    http://localhost:5173"
echo "  • Engine API:  http://localhost:3000"
echo "  • Prometheus:  http://localhost:9090"
echo "  • Grafana:     http://localhost:3030"
echo ""
echo "📊 View Logs:"
echo "  • All:         docker compose logs -f"
echo "  • Frontend:    docker logs arb-frontend -f"
echo "  • Engine:      docker logs arb-engine -f"
echo ""
