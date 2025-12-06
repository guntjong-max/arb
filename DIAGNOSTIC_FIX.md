# 🚨 ENGINE RESTART LOOP - DIAGNOSTIC & FIX

## ✅ FIXES APPLIED

### 1. `/api/v1/sessions` Route Created
- **File**: `engine/src/routes/sessions.routes.js`
- **Response**: Returns "OK" with status 200
- **Ultra Minimal**: No external dependencies

### 2. Server.js Updated
- **File**: `engine/src/server.js`
- **Change**: Added sessions route registration (line 12 + line 37)
- **Status**: ✅ No syntax errors

### 3. Minimal Startup Mode Created
- **File**: `engine/src/index-minimal.js`
- **Purpose**: Bypasses PostgreSQL/Redis connections for testing
- **Usage**: Change Dockerfile CMD to use this file

### 4. Test Server Created
- **File**: `engine/test-server.js`
- **Purpose**: Standalone minimal server for quick testing
- **Usage**: `node test-server.js` (no dependencies)

---

## 🔍 LIKELY ROOT CAUSE

The engine is crashing because:
1. **PostgreSQL not ready** - Engine tries to connect on startup (index.js line 23)
2. **Redis not ready** - Engine tries to connect on startup (index.js line 26)
3. **Missing .env file** - No environment variables configured
4. **Docker healthcheck fails** - Returns 502, triggers restart

---

## 🛠️ IMMEDIATE FIX STEPS

### Option A: Quick Docker Fix (RECOMMENDED)

```bash
cd /home/arbuser/arb

# 1. Create .env file (if missing)
cp .env.example .env

# 2. Stop everything
docker compose down

# 3. Remove old containers
docker compose rm -f engine

# 4. Rebuild engine
docker compose build engine

# 5. Start dependencies first
docker compose up -d postgres redis

# 6. Wait 10 seconds for DB ready
sleep 10

# 7. Start engine
docker compose up -d engine

# 8. Check logs
docker compose logs engine --tail=50 -f
```

### Option B: Minimal Mode (NO DATABASE)

Edit `engine/Dockerfile`, change CMD to:
```dockerfile
CMD ["node", "src/index-minimal.js"]
```

Then:
```bash
docker compose down
docker compose build engine
docker compose up -d engine
docker compose logs engine -f
```

---

## 🧪 TESTING COMMANDS

```bash
# 1. Check container status
docker compose ps

# 2. View logs
docker compose logs engine --tail=50

# 3. Test health endpoint
curl http://localhost:3000/health

# 4. Test sessions endpoint (NEW)
curl http://localhost:3000/api/v1/sessions

# 5. Check if postgres ready
docker compose logs postgres --tail=20

# 6. Check if redis ready
docker compose logs redis --tail=20
```

---

## 📋 EXPECTED RESULTS

### Healthy Engine Logs:
```
Starting Arbitrage Bot Engine...
Metrics initialized
PostgreSQL connected
Redis connected
Engine HTTP Server listening on port 3000
Health check: http://localhost:3000/health
```

### Health Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-06T...",
  "uptime": 123.456,
  "environment": "development",
  "paperTradingMode": true
}
```

### Sessions Response:
```
OK
```

---

## 🐛 IF STILL FAILING

### Check These:

1. **Database Password Mismatch**
   ```bash
   grep DB_PASSWORD .env
   grep POSTGRES_PASSWORD docker-compose.yml
   ```

2. **Redis Password Mismatch**
   ```bash
   grep REDIS_PASSWORD .env
   docker compose logs redis | grep password
   ```

3. **Port Conflicts**
   ```bash
   netstat -tuln | grep -E '3000|5432|6379'
   ```

4. **Memory/Disk Issues**
   ```bash
   df -h
   free -h
   docker system df
   ```

### Nuclear Option (Clean Start):
```bash
docker compose down -v  # WARNING: Deletes all data
docker system prune -af
docker compose up -d
```

---

## 📁 FILES MODIFIED

1. ✅ `engine/src/routes/sessions.routes.js` - NEW
2. ✅ `engine/src/server.js` - UPDATED (2 lines added)
3. ✅ `engine/src/index-minimal.js` - NEW
4. ✅ `engine/test-server.js` - NEW

---

## 🎯 SUCCESS CRITERIA

- [ ] `docker compose ps` shows engine as "healthy"
- [ ] `curl localhost:3000/health` returns 200 OK
- [ ] `curl localhost:3000/api/v1/sessions` returns "OK"
- [ ] Engine logs show no restart loop
- [ ] No 502 errors

---

## 💡 NOTES

- **Environment**: Node 20 Alpine
- **Workspace**: /home/arbuser/arb OR /data/workspace/arb
- **No multiline commands used**: All fixes single-line compatible
- **Zero external dependencies**: Sessions route uses only Express

---

## 🚀 NEXT STEPS AFTER FIX

1. Verify arbitrage bot logic resumes
2. Check worker connections
3. Monitor metrics endpoint
4. Review recent job queue
5. Confirm exchange connections

**END OF DIAGNOSTIC REPORT**
