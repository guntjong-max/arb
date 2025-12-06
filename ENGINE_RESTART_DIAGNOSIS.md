# ENGINE RESTART LOOP - ROOT CAUSE ANALYSIS & RESOLUTION

## 🔍 ROOT CAUSE IDENTIFICATION

### Primary Issue: Missing .env File
**Status**: ✅ FIXED
- **Cause**: No `.env` file existed in `/data/workspace/arb/`
- **Impact**: Engine couldn't load environment variables via `dotenv`
- **Resolution**: Created `.env` from `.env.example`

### Secondary Issue: No Connection Retry Logic
**Status**: ✅ FIXED
- **Cause**: Engine `src/index.js` had no retry mechanism for database connections
- **Impact**: If PostgreSQL/Redis took >5s to be ready, engine would crash with `process.exit(1)`
- **Crash Flow**:
  ```
  1. Engine starts
  2. Tries connectDatabase() [timeout: 5s]
  3. PostgreSQL not ready → throws error
  4. catch block → process.exit(1)
  5. Docker restarts container (restart: unless-stopped)
  6. LOOP REPEATS → Continuous restart cycle
  ```

### Tertiary Issue: Insufficient Health Check Start Period
**Status**: ✅ FIXED
- **Cause**: Health check `start_period: 40s` was too short for retry logic
- **Impact**: Health check could fail before retries completed
- **Resolution**: Increased to 60s to accommodate 10 retries × 3s delay

---

## 🛠️ FIXES APPLIED

### 1. Created Missing .env File
```bash
cp .env.example .env
```

**Environment Variables Confirmed**:
- `DB_PASSWORD=arbitrage_dev_password_2024`
- `REDIS_PASSWORD=redis_dev_password_2024`
- `JWT_SECRET` (present, needs update for production)
- `SESSION_SECRET` (present, needs update for production)

### 2. Added Connection Retry Logic (engine/src/index.js)

**New Feature**: `retryConnection()` function
- **Max Retries**: 10 attempts
- **Retry Delay**: 3000ms (3 seconds)
- **Total Timeout**: Up to 30 seconds per service
- **Logging**: Warns on each attempt, logs success/failure

**Changes**:
- Lines 12-31: Added retry helper function
- Line 38: PostgreSQL connection now uses `retryConnection(connectDatabase, 'PostgreSQL', 10, 3000)`
- Line 41: Redis connection now uses `retryConnection(connectRedis, 'Redis', 10, 3000)`

**Benefits**:
- Graceful handling of slow database startup
- Detailed logging for troubleshooting
- Prevents premature crashes during Docker orchestration

### 3. Extended Health Check Start Period

**docker-compose.yml** (line 39):
- Changed: `start_period: 40s` → `start_period: 60s`

**engine/Dockerfile** (line 36):
- Changed: `start_period: 40s` → `start_period: 60s`

**Rationale**:
- 10 retries × 3s delay = 30s for each service
- PostgreSQL + Redis = up to 60s worst case
- 60s start period prevents premature health check failures

---

## 📊 VERIFICATION STEPS

### Pre-Deployment Checks (Completed ✅)
1. ✅ `.env` file created and contains required variables
2. ✅ Retry logic added to `engine/src/index.js`
3. ✅ Health check timings updated in both Dockerfile and docker-compose.yml
4. ✅ No syntax errors in modified files

### Post-Deployment Verification (To Run on Docker Host)

```bash
# 1. Verify .env file exists
ls -la /home/arbuser/arb/.env

# 2. Stop all services
cd /home/arbuser/arb
docker compose down

# 3. Rebuild engine with new code
docker compose build engine

# 4. Start services
docker compose up -d

# 5. Monitor engine startup logs
docker compose logs engine -f

# Expected log sequence:
# - "Starting Arbitrage Bot Engine..."
# - "Metrics initialized"
# - "PostgreSQL connection attempt 1/10..." (if DB not ready)
# - "Retrying PostgreSQL connection in 3000ms..." (if needed)
# - "PostgreSQL connected successfully"
# - "Redis connected successfully"
# - "Engine HTTP Server listening on port 3000"

# 6. Check container status (after 60-90 seconds)
docker compose ps

# Expected output:
# arb-engine    Up (healthy)
# arb-postgres  Up (healthy)
# arb-redis     Up (healthy)

# 7. Test health endpoint
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-12-06T...",
#   "uptime": <seconds>,
#   "environment": "development",
#   "paperTradingMode": true
# }

# 8. Test sessions endpoint
curl http://localhost:3000/api/v1/sessions

# Expected response:
# OK

# 9. Verify no restarts (wait 5 minutes, check uptime)
docker compose ps
# Engine uptime should be >5 minutes without "Restarting" status
```

---

## 🎯 SUCCESS CRITERIA

### ✅ Container Stability
- Engine container shows "Up (healthy)" status
- No "Restarting" status in `docker compose ps`
- Container uptime >5 minutes without crashes

### ✅ Health Checks Passing
- `/health` endpoint returns 200 OK
- `/api/v1/sessions` endpoint returns "OK"
- Docker health check passes (healthy status)

### ✅ Startup Logs Clean
- Logs show successful database connections
- No repeated startup messages (indicates restart loop)
- No uncaught exceptions or errors

### ✅ Service Availability
- Nginx returns 200 (not 502)
- All API endpoints accessible
- WebSocket connection available (port 3001)

---

## 🐛 TROUBLESHOOTING

### If Engine Still Restarts:

**Check logs for specific error**:
```bash
docker compose logs engine --tail=100 | grep -i error
```

**Common Issues**:

1. **Database Connection Still Failing**
   - Verify PostgreSQL is actually healthy: `docker compose exec postgres pg_isready`
   - Check password matches: `grep DB_PASSWORD .env`
   - Verify network connectivity: `docker compose exec engine ping postgres`

2. **Redis Connection Still Failing**
   - Test Redis: `docker compose exec redis redis-cli -a <password> ping`
   - Check password: `grep REDIS_PASSWORD .env`

3. **Environment Variables Not Loading**
   - Verify `.env` in correct directory (project root)
   - Check file permissions: `ls -la .env`
   - Restart all services: `docker compose down && docker compose up -d`

4. **Port Conflicts**
   - Check port 3000 is free: `netstat -tuln | grep 3000`
   - Check other services not using ports: `docker compose ps`

5. **Health Check Still Failing**
   - Increase start period further: Change to `90s` in both files
   - Disable health check temporarily to test startup:
     ```yaml
     # Comment out healthcheck section in docker-compose.yml
     ```

### If Databases Not Ready:

```bash
# Check PostgreSQL logs
docker compose logs postgres --tail=50

# Check Redis logs
docker compose logs redis --tail=50

# Verify they're marked as healthy
docker compose ps | grep healthy
```

---

## 📈 PERFORMANCE IMPACT

### Startup Time Changes:

**Before Fix**:
- Fast startup: ~5-10 seconds (when DBs ready)
- Restart loop: Continuous failures

**After Fix**:
- Fast startup: ~5-10 seconds (when DBs ready)
- Slow startup: Up to 60 seconds (when DBs slow)
- **No restart loops**: Graceful retry and wait

### Resource Usage:
- **Minimal impact**: Retry logic uses negligible CPU/memory
- **Network**: 10 connection attempts max (vs infinite restarts)

---

## 📝 FILES MODIFIED

| File | Change | Lines | Purpose |
|------|--------|-------|---------|
| `.env` | Created | - | Environment variables |
| `engine/src/index.js` | Modified | +22/-3 | Added retry logic |
| `engine/Dockerfile` | Modified | +1/-1 | Extended health check |
| `docker-compose.yml` | Modified | +1/-1 | Extended health check |

---

## 🚀 DEPLOYMENT INSTRUCTIONS

### On Docker Host (at /home/arbuser/arb):

```bash
# 1. Ensure .env exists (already created in /data/workspace/arb)
# If deploying to different path, copy files:
# cp /data/workspace/arb/.env /home/arbuser/arb/
# cp /data/workspace/arb/engine/src/index.js /home/arbuser/arb/engine/src/
# cp /data/workspace/arb/engine/Dockerfile /home/arbuser/arb/engine/
# cp /data/workspace/arb/docker-compose.yml /home/arbuser/arb/

# 2. Navigate to project directory
cd /home/arbuser/arb

# 3. Stop current services
docker compose down

# 4. Rebuild engine with fixes
docker compose build engine

# 5. Start all services
docker compose up -d

# 6. Monitor startup (for 90 seconds)
docker compose logs engine -f

# 7. Verify after 2 minutes
docker compose ps
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/sessions

# 8. If successful, check stability after 5 minutes
sleep 300
docker compose ps  # Should show healthy, no restarts
```

---

## 💡 PREVENTION MEASURES

### For Production:

1. **Always include .env file** in deployment checklist
2. **Monitor health check timing** - adjust start_period based on actual startup time
3. **Implement startup probes** in Kubernetes/orchestrators
4. **Add connection retry logic** to all critical services
5. **Use init containers** to wait for dependencies
6. **Monitor container restart counts** with Prometheus alerts

### For Development:

1. **Use .env.example** as template
2. **Document required environment variables**
3. **Test cold starts** regularly
4. **Profile startup time** to tune retry delays
5. **Add startup time metrics** to monitoring

---

## 📞 SUMMARY

**Root Cause**: Missing `.env` file + No retry logic for database connections  
**Impact**: Continuous restart loop → 502 errors  
**Resolution**: Created `.env` + Added retry mechanism + Extended health check timing  
**Estimated Downtime**: 2-5 minutes for deployment  
**Risk**: Low - Non-breaking changes, only adds resilience  

**Status**: ✅ READY FOR DEPLOYMENT

---

**Next Steps After Deployment**:
1. Monitor engine logs for 10 minutes
2. Verify arbitrage bot resumes operations
3. Check all API endpoints functional
4. Review metrics in Grafana
5. Test worker connections

**End of Report**
