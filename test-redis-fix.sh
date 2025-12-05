#!/bin/bash
# Redis Fix Test Script
# Run this from /home/arbuser/arb directory

set -e

echo "========================================="
echo "Redis Authentication Fix - Test Script"
echo "========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found"
    echo "Please run this script from /home/arbuser/arb"
    exit 1
fi

# Check environment variables
echo "1. Checking environment variables..."
if [ -z "$REDIS_PASSWORD" ]; then
    echo "⚠ REDIS_PASSWORD not set, using default: Menang123"
    export REDIS_PASSWORD="Menang123"
fi

echo "✓ REDIS_PASSWORD is set"
echo ""

# Stop existing containers
echo "2. Stopping existing containers..."
docker compose down redis engine 2>/dev/null || true
echo "✓ Containers stopped"
echo ""

# Start Redis
echo "3. Starting Redis with password..."
docker compose up -d redis
sleep 3

# Test Redis connection
echo "4. Testing Redis authentication..."
if docker compose exec redis redis-cli -a "$REDIS_PASSWORD" ping | grep -q "PONG"; then
    echo "✓ Redis authentication successful"
else
    echo "❌ Redis authentication failed"
    exit 1
fi
echo ""

# Start Engine
echo "5. Starting Engine container..."
echo "   Watch for these success indicators:"
echo "   - Using REDIS_URL: redis://:****@redis:6379"
echo "   - ✓ Redis client connected to server"
echo "   - ✓ Redis PING successful: PONG"
echo ""

docker compose up engine

# If we get here, user stopped the container
echo ""
echo "========================================="
echo "Test complete!"
echo "========================================="
