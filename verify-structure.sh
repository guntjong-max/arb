#!/bin/bash
echo "========================================="
echo "Verifying Refactored Structure"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1 (MISSING)"
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
        return 0
    else
        echo -e "${RED}✗${NC} $1/ (MISSING)"
        return 1
    fi
}

echo "Checking directories..."
check_dir "backend"
check_dir "worker"
check_dir "worker/sites"
echo ""

echo "Checking backend files..."
check_file "backend/Dockerfile"
check_file "backend/requirements.txt"
check_file "backend/main.py"
check_file "backend/matcher.py"
check_file "backend/websocket_manager.py"
echo ""

echo "Checking worker files..."
check_file "worker/Dockerfile"
check_file "worker/requirements.txt"
check_file "worker/worker.py"
echo ""

echo "Checking worker site modules..."
check_file "worker/sites/__init__.py"
check_file "worker/sites/sbo.py"
check_file "worker/sites/ibc.py"
check_file "worker/sites/cmd.py"
echo ""

echo "Checking configuration files..."
check_file "docker-compose.yml"
check_file ".env"
echo ""

echo "Checking documentation..."
check_file "REFACTOR_README.md"
check_file "REFACTOR_COMPLETE.md"
check_file "ARCHITECTURE.md"
check_file "quickstart.sh"
echo ""

echo "Checking Dockerfile worker fix..."
if grep -q "USER worker" worker/Dockerfile && grep -q "playwright install chromium" worker/Dockerfile; then
    # Check order: USER worker should come before playwright install
    user_line=$(grep -n "^USER worker" worker/Dockerfile | head -1 | cut -d: -f1)
    playwright_line=$(grep -n "playwright install chromium" worker/Dockerfile | cut -d: -f1)
    
    if [ "$user_line" -lt "$playwright_line" ]; then
        echo -e "${GREEN}✓${NC} Dockerfile: USER worker BEFORE playwright install (CORRECT)"
    else
        echo -e "${RED}✗${NC} Dockerfile: USER worker AFTER playwright install (WRONG ORDER)"
    fi
else
    echo -e "${RED}✗${NC} Dockerfile: Missing critical lines"
fi
echo ""

echo "========================================="
echo "Verification Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Run: ./quickstart.sh"
echo "2. Select: 1 (Build all services)"
echo "3. Select: 2 (Start all services)"
echo "4. Check logs: docker-compose logs -f"
echo ""
