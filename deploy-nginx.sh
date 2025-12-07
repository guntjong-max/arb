#!/bin/bash

# Nginx Deployment Script for Arbitrage Bot
# This script handles Nginx reverse proxy setup and deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Arbitrage Bot - Nginx Deployment${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed or not in PATH"
    exit 1
fi

print_status "Docker and docker-compose found"

# Check if port 80 is available
echo ""
echo "Checking if port 80 is available..."
if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "Port 80 is in use!"
    echo ""
    echo "Processes using port 80:"
    lsof -Pi :80 -sTCP:LISTEN
    echo ""
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled"
        exit 1
    fi
else
    print_status "Port 80 is available"
fi

# Validate Nginx configuration
echo ""
echo "Validating Nginx configuration..."
docker run --rm -v "$(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" \
    -v "$(pwd)/nginx/conf.d:/etc/nginx/conf.d:ro" \
    nginx:alpine nginx -t 2>&1

if [ $? -eq 0 ]; then
    print_status "Nginx configuration is valid"
else
    print_error "Nginx configuration validation failed"
    exit 1
fi

# Stop existing Nginx container if running
echo ""
echo "Stopping existing Nginx container..."
if docker ps -a --format '{{.Names}}' | grep -q '^arb-nginx$'; then
    docker stop arb-nginx 2>/dev/null || true
    docker rm arb-nginx 2>/dev/null || true
    print_status "Existing container removed"
else
    print_status "No existing container found"
fi

# Deploy Nginx using docker-compose
echo ""
echo "Deploying Nginx reverse proxy..."
docker-compose up -d nginx

if [ $? -eq 0 ]; then
    print_status "Nginx deployed successfully"
else
    print_error "Nginx deployment failed"
    exit 1
fi

# Wait for Nginx to be healthy
echo ""
echo "Waiting for Nginx to be healthy..."
WAIT_TIME=30
COUNTER=0
while [ $COUNTER -lt $WAIT_TIME ]; do
    if docker ps --filter "name=arb-nginx" --filter "health=healthy" | grep -q arb-nginx; then
        print_status "Nginx is healthy"
        break
    fi
    sleep 1
    COUNTER=$((COUNTER + 1))
    echo -n "."
done
echo ""

if [ $COUNTER -eq $WAIT_TIME ]; then
    print_warning "Nginx health check timed out (this may be normal if backend is not running)"
fi

# Display Nginx status
echo ""
echo -e "${BLUE}Nginx Status:${NC}"
docker ps --filter "name=arb-nginx" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Display access URLs
echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Nginx Reverse Proxy is Running!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "Access Points:"
echo -e "  ${BLUE}Frontend:${NC}        http://localhost/"
echo -e "  ${BLUE}API:${NC}             http://localhost/api"
echo -e "  ${BLUE}Health Check:${NC}    http://localhost/health"
echo -e "  ${BLUE}WebSocket:${NC}       ws://localhost/ws"
echo -e "  ${BLUE}Dashboard:${NC}       http://localhost/dashboard"
echo ""
echo "Logs:"
echo -e "  ${BLUE}View logs:${NC}       docker logs -f arb-nginx"
echo -e "  ${BLUE}Access log:${NC}      ./nginx/logs/access.log"
echo -e "  ${BLUE}Error log:${NC}       ./nginx/logs/error.log"
echo ""
echo "Management:"
echo -e "  ${BLUE}Restart:${NC}         docker-compose restart nginx"
echo -e "  ${BLUE}Stop:${NC}            docker-compose stop nginx"
echo -e "  ${BLUE}Reload config:${NC}   docker exec arb-nginx nginx -s reload"
echo ""

# Test health endpoint if engine is running
if docker ps --filter "name=arb-engine" --filter "status=running" | grep -q arb-engine; then
    echo "Testing health endpoint..."
    sleep 2
    if curl -f http://localhost/health >/dev/null 2>&1; then
        print_status "Health check endpoint is responding"
    else
        print_warning "Health check endpoint is not responding (backend may not be ready)"
    fi
else
    print_warning "Engine is not running. Start all services with: docker-compose up -d"
fi

echo ""
print_status "Nginx deployment complete!"
