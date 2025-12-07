#!/bin/bash
# ════════════════════════════════════════════════════════════
# MINIMAL SPORTSBOOK AUTOMATION - ONE-COMMAND DEPLOYMENT
# ════════════════════════════════════════════════════════════

echo ""
echo "🚀 Starting deployment..."
echo ""

# Navigate to workspace
cd /data/workspace/arb

# Clean slate
echo "🧹 Step 1/3: Cleaning existing Docker resources..."
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true
docker volume rm $(docker volume ls -q) 2>/dev/null || true
docker system prune -af --volumes >/dev/null 2>&1

# Build
echo "🔨 Step 2/3: Building images..."
docker-compose -f minimal-docker-compose.yml build --no-cache

# Start
echo "▶️  Step 3/3: Starting services..."
docker-compose -f minimal-docker-compose.yml up -d

# Wait
echo ""
echo "⏳ Waiting for services to initialize..."
sleep 15

# Status
echo ""
echo "════════════════════════════════════════════════"
echo "✅ DEPLOYMENT COMPLETE!"
echo "════════════════════════════════════════════════"
echo ""
docker-compose -f minimal-docker-compose.yml ps
echo ""
echo "🌐 Access Points:"
echo "   UI:      http://localhost:3000"
echo "   API:     http://localhost:3001"
echo "   Health:  http://localhost:3001/api/system-health"
echo ""
echo "📋 Useful Commands:"
echo "   View logs: docker-compose -f minimal-docker-compose.yml logs -f"
echo "   Stop all:  docker-compose -f minimal-docker-compose.yml down"
echo ""
echo "🎉 System is ready! Open http://localhost:3000 in your browser"
echo ""
