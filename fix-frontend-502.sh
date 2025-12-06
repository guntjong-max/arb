#!/bin/bash

# Script untuk memperbaiki error 502 Bad Gateway pada frontend
# Author: Auto-generated fix script
# Date: December 6, 2025

set -e

echo "========================================="
echo "🔧 Fixing 502 Bad Gateway Error"
echo "========================================="
echo ""

# Warna untuk output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function untuk print dengan warna
print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Cek apakah docker tersedia
print_info "Checking Docker availability..."
if ! command -v docker &> /dev/null; then
    print_error "Docker tidak ditemukan! Install Docker terlebih dahulu."
    exit 1
fi
print_success "Docker tersedia"

# Step 2: Cek apakah docker-compose tersedia
print_info "Checking Docker Compose availability..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose tidak ditemukan! Install Docker Compose terlebih dahulu."
    exit 1
fi
print_success "Docker Compose tersedia"

# Function untuk menjalankan docker compose
run_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        docker-compose "$@"
    else
        docker compose "$@"
    fi
}

# Step 3: Stop frontend container jika ada
print_info "Stopping existing frontend container..."
run_docker_compose stop frontend 2>/dev/null || true
print_success "Frontend container stopped"

# Step 4: Remove frontend container jika ada
print_info "Removing existing frontend container..."
run_docker_compose rm -f frontend 2>/dev/null || true
print_success "Frontend container removed"

# Step 5: Remove frontend image untuk rebuild fresh
print_info "Removing old frontend image..."
docker rmi arb-frontend 2>/dev/null || true
print_success "Old image removed"

# Step 6: Build frontend image baru
print_info "Building new frontend image..."
run_docker_compose build --no-cache frontend
print_success "Frontend image built successfully"

# Step 7: Start frontend container
print_info "Starting frontend container..."
run_docker_compose up -d frontend
print_success "Frontend container started"

# Step 8: Tunggu beberapa detik untuk container startup
print_info "Waiting for frontend to be ready..."
sleep 10

# Step 9: Check status container
print_info "Checking frontend container status..."
if docker ps | grep -q arb-frontend; then
    print_success "Frontend container is running!"
else
    print_error "Frontend container tidak running. Checking logs..."
    echo ""
    docker logs arb-frontend --tail 50
    exit 1
fi

# Step 10: Check logs
echo ""
print_info "Recent logs from frontend:"
echo "========================================="
docker logs arb-frontend --tail 20
echo "========================================="
echo ""

# Step 11: Test health check
print_info "Testing frontend health..."
if docker exec arb-frontend wget --quiet --tries=1 --spider http://localhost:5173/ 2>/dev/null; then
    print_success "Frontend health check passed!"
else
    print_error "Frontend health check failed. Container might still be starting..."
    print_info "Check logs dengan: docker logs arb-frontend -f"
fi

# Final summary
echo ""
echo "========================================="
print_success "SELESAI!"
echo "========================================="
echo ""
echo "📝 Ringkasan:"
echo "   - Frontend container: REBUILT & RESTARTED"
echo "   - Port: 5173"
echo "   - Host binding: 0.0.0.0"
echo "   - Allowed hosts: ui.kliks.life, api.kliks.life"
echo ""
echo "🌐 Akses frontend di:"
echo "   - http://localhost:5173"
echo "   - https://ui.kliks.life"
echo ""
echo "🔍 Monitoring:"
echo "   - View logs: docker logs arb-frontend -f"
echo "   - Container status: docker ps | grep frontend"
echo "   - Health check: docker inspect arb-frontend | grep Health -A 10"
echo ""
print_info "Jika masih error 502, periksa:"
echo "   1. Nginx/reverse proxy configuration untuk ui.kliks.life"
echo "   2. SSL certificate configuration"
echo "   3. Firewall rules untuk port 5173"
echo ""
