#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Backend Healthcheck Fix - Deployment${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Step 1: Check if backend directory exists
echo -e "${YELLOW}[1/5]${NC} Checking backend directory..."
if [ -d "backend" ]; then
    echo -e "${GREEN}✓${NC} Backend directory found"
else
    echo -e "${RED}✗${NC} Backend directory not found"
    exit 1
fi

# Step 2: Check if Dockerfile exists
echo ""
echo -e "${YELLOW}[2/5]${NC} Checking Dockerfile..."
if [ -f "backend/Dockerfile" ]; then
    echo -e "${GREEN}✓${NC} Dockerfile found"
    
    # Check if curl is installed in Dockerfile
    if grep -q "curl" backend/Dockerfile; then
        echo -e "${GREEN}✓${NC} Curl installation found in Dockerfile"
    else
        echo -e "${RED}✗${NC} Curl not found in Dockerfile"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} Dockerfile not found"
    exit 1
fi

# Step 3: Stop and remove old backend container
echo ""
echo -e "${YELLOW}[3/5]${NC} Cleaning up old backend container..."
docker-compose down backend 2>/dev/null || true
docker rmi arb-backend 2>/dev/null || true
echo -e "${GREEN}✓${NC} Old container removed"

# Step 4: Build backend with no cache
echo ""
echo -e "${YELLOW}[4/5]${NC} Building backend image (this may take a few minutes)..."
if docker-compose build --no-cache backend; then
    echo -e "${GREEN}✓${NC} Backend image built successfully"
else
    echo -e "${RED}✗${NC} Failed to build backend image"
    exit 1
fi

# Step 5: Start backend service
echo ""
echo -e "${YELLOW}[5/5]${NC} Starting backend service..."
if docker-compose up -d backend; then
    echo -e "${GREEN}✓${NC} Backend service started"
else
    echo -e "${RED}✗${NC} Failed to start backend service"
    exit 1
fi

# Wait for container to be ready
echo ""
echo -e "${YELLOW}Waiting for backend to be healthy...${NC}"
sleep 5

# Check healthcheck status
MAX_ATTEMPTS=12
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    HEALTH_STATUS=$(docker inspect arb-backend --format='{{.State.Health.Status}}' 2>/dev/null || echo "not found")
    
    if [ "$HEALTH_STATUS" = "healthy" ]; then
        echo -e "${GREEN}✓${NC} Backend is healthy!"
        break
    elif [ "$HEALTH_STATUS" = "not found" ]; then
        echo -e "${RED}✗${NC} Container not found"
        break
    else
        echo -e "${YELLOW}⏳${NC} Health status: $HEALTH_STATUS (attempt $((ATTEMPT+1))/$MAX_ATTEMPTS)"
        sleep 5
        ATTEMPT=$((ATTEMPT+1))
    fi
done

# Final verification
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Verification${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check container status
echo -e "${YELLOW}Container Status:${NC}"
docker-compose ps backend

echo ""
echo -e "${YELLOW}Container Logs (last 20 lines):${NC}"
docker-compose logs --tail=20 backend

echo ""
echo -e "${YELLOW}Health Endpoint Test:${NC}"
sleep 2
if curl -f http://localhost:8000/health 2>/dev/null; then
    echo ""
    echo -e "${GREEN}✓${NC} Health endpoint is accessible"
else
    echo ""
    echo -e "${RED}✗${NC} Health endpoint not accessible yet (may need more time)"
fi

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Check backend logs: docker-compose logs -f backend"
echo "  2. Test health endpoint: curl http://localhost:8000/health"
echo "  3. Start worker: docker-compose up -d worker"
echo "  4. Check all services: docker-compose ps"
echo ""
