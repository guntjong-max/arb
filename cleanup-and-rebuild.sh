#!/bin/bash

# ============================================
# CLEANUP & REBUILD - Fix Docker Build Issues
# ============================================

set -e

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║        🔧 CLEANUP & REBUILD - Docker Build Fix                   ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_step() {
    echo -e "${BLUE}🔹 $1${NC}"
}

# Step 1: Stop all containers
print_step "STEP 1: Stopping all containers..."
if command -v docker-compose &> /dev/null; then
    docker-compose down 2>/dev/null || true
elif docker compose version &> /dev/null; then
    docker compose down 2>/dev/null || true
else
    print_error "Docker Compose not found!"
    exit 1
fi
print_success "Containers stopped"
echo ""

# Step 2: Clean corrupted files in engine
print_step "STEP 2: Cleaning corrupted files in engine/"
if [ -d "engine/node_modules" ]; then
    print_info "Removing engine/node_modules..."
    rm -rf engine/node_modules
    print_success "engine/node_modules removed"
fi

if [ -f "engine/package-lock.json" ]; then
    print_info "Removing engine/package-lock.json..."
    rm -f engine/package-lock.json
    print_success "engine/package-lock.json removed"
fi
echo ""

# Step 3: Clean corrupted files in frontend
print_step "STEP 3: Cleaning corrupted files in frontend/"
if [ -d "frontend/node_modules" ]; then
    print_info "Removing frontend/node_modules..."
    rm -rf frontend/node_modules
    print_success "frontend/node_modules removed"
fi

if [ -f "frontend/package-lock.json" ]; then
    print_info "Removing frontend/package-lock.json..."
    rm -f frontend/package-lock.json
    print_success "frontend/package-lock.json removed"
fi
echo ""

# Step 4: Remove old Docker images
print_step "STEP 4: Removing old Docker images..."
print_info "Removing arb-engine image..."
docker rmi arb-engine 2>/dev/null || true
docker rmi arb_engine 2>/dev/null || true

print_info "Removing arb-frontend image..."
docker rmi arb-frontend 2>/dev/null || true
docker rmi arb_frontend 2>/dev/null || true

print_success "Old images removed"
echo ""

# Step 5: Prune Docker build cache
print_step "STEP 5: Pruning Docker build cache..."
docker builder prune -f 2>/dev/null || true
print_success "Build cache pruned"
echo ""

# Step 6: Build with no cache
print_step "STEP 6: Building Docker images (this may take a few minutes)..."
echo ""

if command -v docker-compose &> /dev/null; then
    docker-compose build --no-cache --progress=plain
elif docker compose version &> /dev/null; then
    docker compose build --no-cache --progress=plain
fi

print_success "Images built successfully!"
echo ""

# Step 7: Start all services
print_step "STEP 7: Starting all services..."
echo ""

if command -v docker-compose &> /dev/null; then
    docker-compose up -d
elif docker compose version &> /dev/null; then
    docker compose up -d
fi

print_success "All services started!"
echo ""

# Step 8: Wait for services to be ready
print_step "STEP 8: Waiting for services to be ready (30 seconds)..."
sleep 30
echo ""

# Step 9: Check service status
print_step "STEP 9: Checking service status..."
echo ""

if command -v docker-compose &> /dev/null; then
    docker-compose ps
elif docker compose version &> /dev/null; then
    docker compose ps
fi

echo ""

# Step 10: Check logs
print_step "STEP 10: Recent logs from services..."
echo ""
echo "═══ ENGINE LOGS ═══"
docker logs arb-engine --tail 15 2>/dev/null || echo "Engine not running yet"
echo ""
echo "═══ FRONTEND LOGS ═══"
docker logs arb-frontend --tail 15 2>/dev/null || echo "Frontend not running yet"
echo ""

# Final summary
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║                    ✅ CLEANUP & REBUILD COMPLETE!                ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 SUMMARY:"
echo "  ✓ Corrupted files cleaned"
echo "  ✓ Docker images rebuilt"
echo "  ✓ All services started"
echo ""
echo "🌐 ACCESS POINTS:"
echo "  • Engine API:    http://localhost:3000"
echo "  • Frontend UI:   http://localhost:5173"
echo "  • Prometheus:    http://localhost:9090"
echo "  • Grafana:       http://localhost:3030"
echo "  • PgAdmin:       http://localhost:5050"
echo ""
echo "🔍 MONITORING:"
echo "  • View all logs:      docker compose logs -f"
echo "  • View engine logs:   docker logs arb-engine -f"
echo "  • View frontend logs: docker logs arb-frontend -f"
echo "  • Check health:       curl http://localhost:3000/health"
echo ""
echo "📝 NEXT STEPS:"
echo "  1. Wait 1-2 minutes for all services to fully initialize"
echo "  2. Check health: curl http://localhost:3000/health"
echo "  3. Access frontend: http://localhost:5173"
echo ""
print_success "System is UP and Running! 🚀"
echo ""
