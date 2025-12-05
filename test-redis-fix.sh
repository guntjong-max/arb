#!/bin/bash
# Quick test script for Redis connection fix
# Run from: /home/arbuser/arb

set -e

echo "========================================"
echo "  REDIS CONNECTION FIX - QUICK TEST"
echo "========================================"
echo ""

# Step 1: Check .env
echo "STEP 1: Checking .env file..."
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Creating .env with REDIS_PASSWORD=Menang123"
    echo "REDIS_PASSWORD=Menang123" > .env
    echo "✅ .env created"
else
    if grep -q "REDIS_PASSWORD=Menang123" .env; then
        echo "✅ REDIS_PASSWORD found in .env"
    else
        echo "⚠️  REDIS_PASSWORD not set correctly in .env"
        echo "Adding REDIS_PASSWORD=Menang123 to .env"
        echo "REDIS_PASSWORD=Menang123" >> .env
    fi
fi
echo ""

# Step 2: Start Redis
echo "STEP 2: Starting Redis..."
docker compose up redis -d
sleep 3
echo "✅ Redis started"
echo ""

# Step 3: Check Redis health
echo "STEP 3: Checking Redis health..."
if docker compose ps redis | grep -q "healthy"; then
    echo "✅ Redis is healthy"
else
    echo "⚠️  Redis may not be fully ready yet, waiting..."
    sleep 5
fi
echo ""

# Step 4: Test Redis connection
echo "STEP 4: Testing Redis connection..."
if docker compose exec redis redis-cli -a Menang123 PING | grep -q "PONG"; then
    echo "✅ Redis PING successful"
else
    echo "❌ Redis PING failed"
    exit 1
fi
echo ""

# Step 5: Build engine
echo "STEP 5: Building engine..."
docker compose build engine
echo "✅ Engine built"
echo ""

# Step 6: Run test script
echo "STEP 6: Running connection test script..."
echo "----------------------------------------"
docker compose run --rm engine node test-redis-connection.js
echo "----------------------------------------"
echo ""

# Step 7: Start engine
echo "STEP 7: Starting engine with debug logs..."
echo "Press Ctrl+C to stop"
echo ""
docker compose up engine

