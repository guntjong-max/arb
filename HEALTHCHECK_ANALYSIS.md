# Healthcheck Analysis & Fix Strategy

## Current Situation

**Problem**: Container crashes silently in restart loop with NO logs visible, even after enabling console logging in production.

**Status**: 
- ✅ Logger fixed to always output to console
- ✅ Early console.log added before logger initialization
- ✅ Server binding to 0.0.0.0 
- ✅ Environment variables loading via env_file
- ✅ Problematic volume mount removed
- ❌ Still no logs visible = healthcheck likely killing container before startup completes

---

## Healthcheck Configuration Review

### 1. Dockerfile Healthcheck (engine/Dockerfile:39-40)
```dockerfile
HEALTHCHECK --interval=30s --timeout=20s --start-period=90s --retries=3 \
  CMD node healthcheck.js || exit 1
```

**Analysis**:
- ✅ Using `node healthcheck.js` (correct for Alpine)
- ✅ Timeout: 20s (generous)
- ✅ Start period: 90s (generous for DB/Redis init)
- ⚠️ **This runs even if compose healthcheck is disabled**

### 2. Compose Healthcheck (docker-compose.yml:36-41)
```yaml
healthcheck:
  test: ["CMD", "node", "healthcheck.js"]
  interval: 30s
  timeout: 20s
  retries: 3
  start_period: 90s
```

**Analysis**:
- Same configuration as Dockerfile
- Can be overridden by docker-compose.prod.yml

### 3. Production Override (docker-compose.prod.yml:22-25)
```yaml
# TEMPORARILY DISABLE healthcheck for debugging
healthcheck:
  disable: true
```

**Analysis**:
- ✅ This disables the **Compose** healthcheck
- ❌ **Does NOT disable Dockerfile HEALTHCHECK**
- 🔍 Container will still run healthcheck from Dockerfile

---

## Root Cause Hypothesis

The Dockerfile `HEALTHCHECK` instruction is still active even when Compose healthcheck is disabled. This means:

1. Container starts
2. After 90s start_period, healthcheck begins running every 30s
3. Healthcheck fails (server not ready or wrong binding)
4. After 3 failures, Docker marks container unhealthy
5. `restart: always` policy triggers restart
6. Loop continues before logs can be emitted

**Why no logs?**
- If the app crashes **before** logger is initialized, no logs appear
- If healthcheck kills container quickly, logs buffer may not flush
- Early console.log statements should appear unless process dies immediately

---

## Fix Strategy

### Option 1: Rebuild Without Dockerfile Healthcheck (RECOMMENDED)

Temporarily comment out HEALTHCHECK in Dockerfile to completely disable it:

```dockerfile
# Temporarily disabled for debugging
# HEALTHCHECK --interval=30s --timeout=20s --start-period=90s --retries=3 \
#   CMD node healthcheck.js || exit 1
```

**Files to modify**:
1. `engine/Dockerfile` - Comment out HEALTHCHECK (lines 38-40)
2. Keep `docker-compose.prod.yml` healthcheck disabled as-is

### Option 2: Manual Healthcheck Test (DIAGNOSTIC)

If container stays running with disabled healthcheck, test manually:

```bash
# Check if container is running
docker compose ps

# Execute healthcheck inside running container
docker compose exec engine node healthcheck.js
echo $?  # Should be 0 if healthy

# Test health endpoint directly
docker compose exec engine curl -s http://localhost:3000/health

# Check what's actually listening on port 3000
docker compose exec engine netstat -tlnp | grep 3000
```

### Option 3: Debug Server Startup (IF LOGS STILL EMPTY)

If logs remain empty even with healthcheck fully disabled, add more early logging:

```javascript
// At the very top of src/index.js, before ANY imports
console.log('=== PROCESS START ===');
console.log('PID:', process.pid);
console.log('Node version:', process.version);
console.log('CWD:', process.cwd());

process.on('uncaughtException', (err) => {
  console.error('!!! UNCAUGHT EXCEPTION !!!', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('!!! UNHANDLED REJECTION !!!', reason);
  process.exit(1);
});
```

---

## Deployment Commands

### Step 1: Comment Out Dockerfile Healthcheck

```bash
cd /home/arbuser/arb

# Edit engine/Dockerfile and comment out lines 38-40
sed -i '38,40 s/^/# DISABLED: /' engine/Dockerfile
```

### Step 2: Deploy with Script

```bash
chmod +x deploy-healthcheck-disabled.sh
./deploy-healthcheck-disabled.sh
```

This will:
1. Stop all services
2. Remove old engine image
3. Clean build cache
4. Rebuild with NO healthcheck
5. Start services
6. Show diagnostics
7. Monitor logs in real-time

### Step 3: Verify

After deployment, you should see:

```
=== Container Status ===
arb-engine  running  (no health status)

=== Engine Logs ===
[STARTUP] Loading environment...
[STARTUP] Environment loaded. NODE_ENV: production
[STARTUP] DATABASE_URL: SET
[STARTUP] REDIS_URL: SET
... (actual startup logs)
```

### Step 4: Test Endpoints

```bash
# Direct health check
curl -s http://localhost:3000/health
# Should return: {"status":"healthy","timestamp":"..."}

# Via Nginx
curl -k -s https://api.kliks.life/health
# Should return: {"status":"healthy","timestamp":"..."}
```

---

## Expected Outcomes

### Scenario A: Container Stays Running ✅
**Logs show**:
```
[STARTUP] Loading environment...
[STARTUP] Environment loaded...
Engine HTTP Server listening on 0.0.0.0:3000
Health check: http://localhost:3000/health
```

**Action**: Re-enable healthcheck after verifying endpoints work

### Scenario B: Container Still Crashes ❌
**Logs show**:
```
[STARTUP] Loading environment...
Error: connect ECONNREFUSED ...
```

**Action**: Fix the actual connection error (DB/Redis config)

### Scenario C: Still No Logs ❌❌
**No logs at all**

**Action**: Add uncaughtException handlers and rebuild

---

## Next Steps After Healthcheck is Disabled

1. ✅ Verify container stays running
2. ✅ Check logs appear in `docker compose logs engine`
3. ✅ Test health endpoint: `curl http://localhost:3000/health`
4. ✅ Test via Nginx: `curl -k https://api.kliks.life/health`
5. ✅ Test sessions endpoint: `curl -k -X POST https://api.kliks.life/api/v1/sessions -H "Content-Type: application/json" -d '{"sportsbook":"bet365","credentials":{"username":"test","password":"test"},"user_consent":true}'`
6. 🔄 Re-enable healthcheck with correct configuration
7. 🎉 Deploy to production with healthcheck enabled

---

## Files Modified

- ✅ `docker-compose.prod.yml` - Healthcheck disabled (already done)
- ⏳ `engine/Dockerfile` - Need to comment out HEALTHCHECK
- ✅ `deploy-healthcheck-disabled.sh` - Deployment script created

---

## Manual Commands (Alternative to Script)

If you prefer to run commands manually:

```bash
cd /home/arbuser/arb

# Comment out Dockerfile healthcheck
sed -i '38,40 s/^/# DISABLED: /' engine/Dockerfile

# Stop services
docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# Remove old image
docker rmi arb-engine

# Clean cache
docker builder prune -af

# Rebuild
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache --pull engine

# Start
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Monitor logs
docker compose logs -f engine
```

---

**Status**: Ready to deploy. Execute `deploy-healthcheck-disabled.sh` on the server to apply fixes and see actual logs.
