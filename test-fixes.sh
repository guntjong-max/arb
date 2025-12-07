#!/bin/bash
# Test script for backend startup and frontend fixes

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Backend & Frontend Fix Verification Script                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if files exist
echo -e "${YELLOW}[1/5] Checking if fix files exist...${NC}"
if [ -f "engine/src/index.js" ]; then
    echo -e "${GREEN}✓ engine/src/index.js exists${NC}"
else
    echo -e "${RED}✗ engine/src/index.js NOT FOUND${NC}"
fi

if [ -f "engine/src/server.js" ]; then
    echo -e "${GREEN}✓ engine/src/server.js exists${NC}"
else
    echo -e "${RED}✗ engine/src/server.js NOT FOUND${NC}"
fi

if [ -f "public/index.html" ]; then
    echo -e "${GREEN}✓ public/index.html exists${NC}"
else
    echo -e "${RED}✗ public/index.html NOT FOUND${NC}"
fi
echo ""

# Test 2: Verify critical code changes
echo -e "${YELLOW}[2/5] Verifying critical code changes...${NC}"
if grep -q "SERVER STARTED ON PORT" engine/src/index.js; then
    echo -e "${GREEN}✓ Critical startup log found in index.js${NC}"
else
    echo -e "${RED}✗ Critical startup log MISSING in index.js${NC}"
fi

if grep -q "0.0.0.0" engine/src/index.js; then
    echo -e "${GREEN}✓ Explicit 0.0.0.0 binding found${NC}"
else
    echo -e "${RED}✗ Explicit 0.0.0.0 binding MISSING${NC}"
fi

if grep -q "catch (dbError)" engine/src/index.js; then
    echo -e "${GREEN}✓ Database error handling found${NC}"
else
    echo -e "${RED}✗ Database error handling MISSING${NC}"
fi

if grep -q "express.static" engine/src/server.js; then
    echo -e "${GREEN}✓ Static file serving configured${NC}"
else
    echo -e "${RED}✗ Static file serving NOT configured${NC}"
fi
echo ""

# Test 3: Check frontend features
echo -e "${YELLOW}[3/5] Checking frontend features...${NC}"
if grep -q "window.location.origin + '/api'" public/index.html; then
    echo -e "${GREEN}✓ Dynamic API_BASE found${NC}"
else
    echo -e "${RED}✗ Dynamic API_BASE MISSING${NC}"
fi

if grep -q "handleLogin" public/index.html; then
    echo -e "${GREEN}✓ Login function found${NC}"
else
    echo -e "${RED}✗ Login function MISSING${NC}"
fi

if grep -q "Backend is currently offline" public/index.html; then
    echo -e "${GREEN}✓ Offline mode message found${NC}"
else
    echo -e "${RED}✗ Offline mode message MISSING${NC}"
fi

if grep -q "checkBackendStatus" public/index.html; then
    echo -e "${GREEN}✓ Backend status check function found${NC}"
else
    echo -e "${RED}✗ Backend status check function MISSING${NC}"
fi
echo ""

# Test 4: Try to start the server (if Docker is available)
echo -e "${YELLOW}[4/5] Testing server startup (if Docker available)...${NC}"
if command -v docker &> /dev/null; then
    echo "Docker found. You can now run:"
    echo -e "${GREEN}  docker compose up engine${NC}"
    echo ""
    echo "Watch for this critical line in the logs:"
    echo -e "${GREEN}  🚀 SERVER STARTED ON PORT 3000${NC}"
else
    echo -e "${YELLOW}⚠ Docker not found. Skipping Docker test.${NC}"
    echo "You can manually test with: docker compose up engine"
fi
echo ""

# Test 5: Check HTML validity
echo -e "${YELLOW}[5/5] Basic HTML structure check...${NC}"
if grep -q "<!DOCTYPE html>" public/index.html; then
    echo -e "${GREEN}✓ Valid HTML5 doctype${NC}"
else
    echo -e "${RED}✗ HTML5 doctype MISSING${NC}"
fi

if grep -q "</html>" public/index.html; then
    echo -e "${GREEN}✓ HTML properly closed${NC}"
else
    echo -e "${RED}✗ HTML not properly closed${NC}"
fi
echo ""

# Summary
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Verification Complete                                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "1. Start the backend:"
echo -e "   ${GREEN}docker compose up engine${NC}"
echo ""
echo "2. Open browser and navigate to:"
echo -e "   ${GREEN}http://localhost:3000/${NC}"
echo ""
echo "3. Check the Account Manager panel:"
echo "   - Should show login form immediately"
echo "   - Status LED should indicate connection state"
echo "   - Form should work when backend is online"
echo ""
echo "4. View logs to confirm startup:"
echo -e "   ${GREEN}docker compose logs engine -f${NC}"
echo ""
echo "Look for the startup banner with:"
echo -e "   ${GREEN}🚀 SERVER STARTED ON PORT 3000${NC}"
echo ""
