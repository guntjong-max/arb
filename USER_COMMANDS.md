# 🚀 COMPLETE FIX - COMMANDS FOR USER

## Masalah yang Ditemukan

**Root Cause:** Environment variables dari `.env` file tidak ter-load di container karena:
1. Volume mount `/app/src:ro` masih ada (sudah difix)
2. **NEW ISSUE:** `.env` file tidak di-load di production mode
3. Docker Compose tidak explicitly load `.env` file ke container

## ✅ Solusi

Updated `docker-compose.prod.yml` dengan:
- Tambah `env_file: - .env` untuk explicitly load environment variables
- Tetap remove volume mount `/app/src`
- Set `NODE_ENV: production`

---

## 📋 STEP-BY-STEP COMMANDS

Copy dan jalankan di server Contabo `/home/arbuser/arb`:

### Option 1: Automated Script (RECOMMENDED)

```bash
cd /home/arbuser/arb

# Create the deployment script
cat > deploy-fix.sh << 'EOFSCRIPT'
#!/bin/bash
set -e

echo "🚀 Starting deployment fix..."
cd /home/arbuser/arb

# Create fixed docker-compose.prod.yml
cat > docker-compose.prod.yml << 'EOF'
version: '3.9'

# Production override untuk docker-compose.yml
# Usage: docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

services:
  engine:
    # Remove problematic volume mounts for production
    volumes:
      - ./engine/logs:/app/logs
      # ❌ REMOVED: - ./engine/src:/app/src:ro
    
    # Explicitly load .env file (critical for production)
    env_file:
      - .env
    
    environment:
      NODE_ENV: production
      # Force dotenv to load even in production
      DOTENV_CONFIG_PATH: /app/.env
    
    restart: always
EOF

echo "✓ docker-compose.prod.yml created"

# Verify .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi

# Stop containers
echo "Stopping containers..."
docker compose down

# Build and start
echo "Building and starting services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Wait
echo "Waiting 70 seconds for services..."
sleep 70

# Check status
echo ""
echo "=== Container Status ==="
docker compose ps

echo ""
echo "=== Testing Health Endpoints ==="
echo "Direct:"
curl -s http://localhost:3000/health || echo "Failed"

echo ""
echo "Via Nginx:"
curl -k -s https://api.kliks.life/health || echo "Failed"

echo ""
echo "✅ Deployment complete!"
echo "Check logs: docker compose logs engine --tail=50"
EOFSCRIPT

# Make executable
chmod +x deploy-fix.sh

# Run it
./deploy-fix.sh
```

---

### Option 2: Manual Step-by-Step

```bash
cd /home/arbuser/arb

# 1. Create fixed docker-compose.prod.yml
cat > docker-compose.prod.yml << 'EOF'
version: '3.9'

# Production override untuk docker-compose.yml
# Usage: docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

services:
  engine:
    # Remove problematic volume mounts for production
    volumes:
      - ./engine/logs:/app/logs
      # ❌ REMOVED: - ./engine/src:/app/src:ro
    
    # Explicitly load .env file (critical for production)
    env_file:
      - .env
    
    environment:
      NODE_ENV: production
      # Force dotenv to load even in production
      DOTENV_CONFIG_PATH: /app/.env
    
    restart: always
EOF

# 2. Verify files exist
ls -lh docker-compose.yml docker-compose.prod.yml .env

# 3. Stop containers
docker compose down

# 4. Build and start with production config
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 5. Wait for services (70 seconds)
sleep 70

# 6. Check status
docker compose ps
```

---

## ✅ VERIFICATION COMMANDS

After running deployment, execute these to verify:

```bash
cd /home/arbuser/arb

# 1. Check container status
docker compose ps | grep arb-engine
# Expected: "Up XX minutes (healthy)" or "Up XX seconds (health: starting)"

# 2. Check logs for errors
docker compose logs engine --tail=50 | grep -i error

# 3. Test health endpoint (direct)
curl http://localhost:3000/health
# Expected: {"status":"healthy",...}

# 4. Test health endpoint (via Nginx)
curl -k https://api.kliks.life/health
# Expected: {"status":"healthy",...} NOT 502!

# 5. Test API docs
curl http://localhost:3000/api/docs

# 6. Test sessions endpoint
curl -k -X POST https://api.kliks.life/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-123",
    "sportsbook": "bet365",
    "session_data": "encrypted_token_here",
    "consent_id": "test-consent-456",
    "expires_at": "2025-12-31T23:59:59Z"
  }'
# Expected: 201 Created or 400 Bad Request (with validation errors)
# NOT 502!
```

---

## 🔍 IF STILL ISSUES

### Get detailed logs:

```bash
# Full engine logs
docker compose logs engine --tail=200 > engine_logs.txt
cat engine_logs.txt

# Check for specific errors
docker logs arb-engine 2>&1 | grep -A 5 -B 5 -i "error\|exception\|failed"

# Check environment variables in container
docker compose exec engine env | grep -E "DATABASE_URL|REDIS_URL|NODE_ENV|PORT"

# Manual healthcheck inside container
docker compose exec engine node healthcheck.js
echo $?  # Should be 0

# Test database connection
docker compose exec postgres pg_isready -U arbitrage_user -d arbitrage_bot

# Test Redis connection  
docker compose exec redis redis-cli PING
```

### Restart if needed:

```bash
# Restart engine only
docker compose restart engine

# Or full restart
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart
```

---

## 📊 EXPECTED RESULTS

### Before Fix:
```
arb-engine   Restarting (1) XX seconds ago
curl https://api.kliks.life/health → 502 Bad Gateway
```

### After Fix:
```
arb-engine   Up 2 minutes (healthy)
curl https://api.kliks.life/health → {"status":"healthy",...}
```

---

## 🎯 SUCCESS CRITERIA

- ✅ `docker compose ps` shows engine as "healthy"
- ✅ `curl http://localhost:3000/health` returns JSON with "healthy"
- ✅ `curl -k https://api.kliks.life/health` returns JSON (NOT 502)
- ✅ Sessions endpoint returns 201 or 400 (NOT 502)
- ✅ No "Restarting" status in container
- ✅ No errors in logs about missing modules or environment variables

---

## 📝 WHAT CHANGED

### docker-compose.prod.yml (NEW VERSION):
```yaml
version: '3.9'

services:
  engine:
    volumes:
      - ./engine/logs:/app/logs
    
    # 🆕 ADDED: Explicitly load .env file
    env_file:
      - .env
    
    environment:
      NODE_ENV: production
      # 🆕 ADDED: Force dotenv path
      DOTENV_CONFIG_PATH: /app/.env
    
    restart: always
```

### Key Changes:
1. ✅ Added `env_file: - .env` to explicitly inject environment variables
2. ✅ Added `DOTENV_CONFIG_PATH` to ensure dotenv loads .env file
3. ✅ Kept volume mount removal (no `/app/src` override)
4. ✅ Production mode enabled

---

**Status:** Ready to deploy  
**Risk:** Low (only config changes, no code changes)  
**Downtime:** ~2-3 minutes during rebuild  
**Rollback:** `docker compose down && docker compose up -d` (use old config)
