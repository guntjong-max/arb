#!/bin/bash

echo "=================================================="
echo "SPORTSBOOK AUTOMATION - MINIMAL VERSION"
echo "Clean Slate Deployment Script"
echo "=================================================="

# Step 1: Stop and remove all containers, volumes, and networks
echo ""
echo "[1/3] Cleaning up existing Docker resources..."
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true
docker volume rm $(docker volume ls -q) 2>/dev/null || true
docker network rm $(docker network ls -q) 2>/dev/null || true
docker system prune -af --volumes

echo ""
echo "✓ Clean slate completed"

# Step 2: Build images
echo ""
echo "[2/3] Building Docker images..."
docker-compose -f minimal-docker-compose.yml build --no-cache

echo ""
echo "✓ Build completed"

# Step 3: Start all services
echo ""
echo "[3/3] Starting all services..."
docker-compose -f minimal-docker-compose.yml up -d

echo ""
echo "✓ Services started"

# Wait for services to be ready
echo ""
echo "Waiting for services to be ready..."
sleep 10

# Show status
echo ""
echo "=================================================="
echo "DEPLOYMENT COMPLETE"
echo "=================================================="
echo ""
echo "Services Status:"
docker-compose -f minimal-docker-compose.yml ps
echo ""
echo "Access Points:"
echo "  UI:       http://localhost:3000"
echo "  API:      http://localhost:3001"
echo "  Health:   http://localhost:3001/api/system-health"
echo ""
echo "Useful Commands:"
echo "  View logs:     docker-compose -f minimal-docker-compose.yml logs -f"
echo "  Stop all:      docker-compose -f minimal-docker-compose.yml down"
echo "  Restart:       docker-compose -f minimal-docker-compose.yml restart"
echo ""
echo "=================================================="
