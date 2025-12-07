#!/bin/bash
# EXACT DEPLOYMENT COMMANDS - COPY & PASTE

# ================================================
# STEP 1: CLEAN SLATE (Delete All Existing)
# ================================================

docker stop $(docker ps -aq) 2>/dev/null || true && \
docker rm $(docker ps -aq) 2>/dev/null || true && \
docker volume rm $(docker volume ls -q) 2>/dev/null || true && \
docker network rm $(docker network ls -q) 2>/dev/null || true && \
docker system prune -af --volumes

# ================================================
# STEP 2: BUILD EVERYTHING
# ================================================

cd /data/workspace/arb && \
docker-compose -f minimal-docker-compose.yml build --no-cache

# ================================================
# STEP 3: START EVERYTHING
# ================================================

docker-compose -f minimal-docker-compose.yml up -d

# ================================================
# STEP 4: CHECK STATUS
# ================================================

sleep 10 && \
echo "Checking services..." && \
docker-compose -f minimal-docker-compose.yml ps && \
echo "" && \
echo "Testing API health..." && \
curl -s http://localhost:3001/api/system-health | python3 -m json.tool && \
echo "" && \
echo "✅ DEPLOYMENT COMPLETE!" && \
echo "UI: http://localhost:3000" && \
echo "API: http://localhost:3001"
