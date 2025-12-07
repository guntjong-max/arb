#!/bin/bash
# Arbitrage Bot - Development Start Script
# Description: Start services in development mode

set -e

echo "================================"
echo "Arbitrage Bot - Development Mode"
echo "================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env and set your passwords!"
    echo ""
fi

# Pull latest images
echo "Pulling latest Docker images..."
docker compose pull

# Build services
echo "Building services..."
docker compose build

# Start services
echo "Starting services..."
docker compose up -d

# Wait for services to be ready
echo ""
echo "Waiting for services to be ready..."
sleep 10

# Run health check
echo ""
bash scripts/health-check.sh

echo ""
echo "================================"
echo "Development environment ready!"
echo "================================"
echo ""
echo "Services:"
echo "  - Engine API: http://localhost:3000"
echo "  - Frontend: http://localhost:5173"
echo "  - Prometheus: http://localhost:9090"
echo "  - Grafana: http://localhost:3030"
echo ""
echo "View logs: bash scripts/logs.sh [service]"
echo "Health check: bash scripts/health-check.sh"
echo "Stop services: docker compose down"
echo ""
