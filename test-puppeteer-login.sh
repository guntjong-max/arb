#!/bin/bash
# test-puppeteer-login.sh - Test script for Puppeteer real login

echo "========================================="
echo "PUPPETEER LOGIN TEST FOR ARBITRAGE BOT"
echo "========================================="
echo ""

# Check if Docker is running
if ! docker ps >/dev/null 2>&1; then
    echo "ERROR: Docker is not running or not accessible"
    exit 1
fi

echo "1. Stopping existing containers..."
docker compose down

echo ""
echo "2. Rebuilding engine with Puppeteer dependencies..."
docker compose build engine

echo ""
echo "3. Starting services..."
docker compose up -d postgres redis
sleep 5

echo ""
echo "4. Creating database schema..."
docker compose exec -T postgres psql -U arbuser -d arbitrage_bot < engine/schema.sql

echo ""
echo "5. Starting engine..."
docker compose up -d engine
sleep 8

echo ""
echo "6. Checking engine health..."
curl -s http://localhost:3000/health | jq .

echo ""
echo "7. Testing REAL Puppeteer login to NovaSport..."
echo "   POST /api/v1/sessions"
echo "   Username: Fgnova"
echo "   Password: Menang123"
echo ""

curl -X POST http://localhost:3000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "sportsbook_name": "novasport",
    "username": "Fgnova",
    "password": "Menang123"
  }' | jq .

echo ""
echo "8. Checking engine logs..."
docker compose logs --tail=30 engine

echo ""
echo "========================================="
echo "TEST COMPLETE"
echo "========================================="
echo ""
echo "To view live logs: docker compose logs -f engine"
echo "To stop all: docker compose down"
