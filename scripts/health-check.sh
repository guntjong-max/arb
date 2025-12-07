#!/bin/bash
# Arbitrage Bot - Health Check Script
# Description: Comprehensive health check for all services

set -e

echo "================================"
echo "Arbitrage Bot - Health Check"
echo "================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service health
check_service() {
    local service_name=$1
    local check_command=$2
    
    echo -n "Checking ${service_name}... "
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Function to check HTTP endpoint
check_http() {
    local name=$1
    local url=$2
    
    echo -n "Checking ${name}... "
    if curl -s -f -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Check Docker services
echo "=== Docker Services ==="
check_service "Docker Engine" "docker info"
check_service "Docker Compose" "docker compose version"
echo ""

# Check running containers
echo "=== Running Containers ==="
docker compose ps
echo ""

# Check service health endpoints
echo "=== Service Health ==="
check_http "Engine API" "http://localhost:3000/health"
check_http "Prometheus" "http://localhost:9090/-/healthy"
check_http "Grafana" "http://localhost:3030/api/health"
echo ""

# Check database connectivity
echo "=== Database Connectivity ==="
check_service "PostgreSQL" "docker compose exec -T postgres pg_isready -U arbitrage_user"
check_service "Redis" "docker compose exec -T redis redis-cli -a redis_dev_password_2024 ping"
echo ""

# Check logs for errors
echo "=== Recent Errors (Last 10 lines) ==="
echo "Engine errors:"
docker compose logs --tail=10 engine 2>&1 | grep -i error || echo "No errors found"
echo ""

# Check disk space
echo "=== Disk Space ==="
df -h | grep -E "Filesystem|/dev/sda1|/dev/nvme" || df -h
echo ""

# Check memory usage
echo "=== Memory Usage ==="
free -h
echo ""

# Summary
echo "================================"
echo "Health check completed!"
echo "================================"
