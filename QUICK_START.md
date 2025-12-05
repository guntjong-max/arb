# Quick Start - Redis Fix Testing

## What Was Fixed?

**Problem**: Engine crashed with "NOAUTH Authentication required"  
**Root Cause**: Code ignored `REDIS_URL` and used undefined `REDIS_PASSWORD`  
**Solution**: Implemented proper REDIS_URL parsing with enhanced error handling

---

## Quick Test (3 Steps)

### 1. Navigate to project directory
```bash
cd /home/arbuser/arb
```

### 2. Set environment variable
```bash
export REDIS_PASSWORD=Menang123
```

### 3. Run test script
```bash
./test-redis-fix.sh
```

**OR** manually:
```bash
# Start services
docker compose up redis engine

# Watch logs for success indicators:
# ✓ Using REDIS_URL: redis://:****@redis:6379
# ✓ Redis client connected to server
# ✓ Redis PING successful: PONG
```

---

## What to Look For

### ✅ Success Indicators
```
info: Initializing Redis connection...
info: Using REDIS_URL: redis://:****@redis:6379
info: ✓ Redis client connected to server
info: ✓ Redis client ready to handle commands
info: ✓ Redis PING successful: PONG
info: ✓ Redis Pub/Sub clients ready
info: Redis connected
```

### ❌ If You See Auth Errors
```
error: ❌ Redis authentication failed! Check password in REDIS_URL
```

**Fix**: Check `REDIS_PASSWORD` environment variable is set correctly

### ❌ If You See Connection Errors
```
error: ❌ Redis connection refused! Is Redis server running?
warn: Redis connection retry #1 in 100ms...
```

**Fix**: Ensure Redis container is running: `docker compose up -d redis`

---

## Key Changes Made

### File: `engine/src/config/redis.js`

1. **Added REDIS_URL Parser**
   - Extracts host, port, password from URL
   - Handles format: `redis://:password@host:port`

2. **Enhanced Retry Strategy**
   - Exponential backoff: 100ms → 200ms → 300ms → max 3s
   - Max 10 retries (prevents infinite loops)

3. **Better Error Messages**
   - Specific messages for auth vs connection issues
   - Visual indicators (✓, ❌, ⚠) in logs

4. **Connection Timeout**
   - 5-second timeout on PING test
   - Prevents hanging on network issues

---

## Commit & Push

```bash
cd /home/arbuser/arb

# Check changes
git status
git diff engine/src/config/redis.js

# Commit
git add engine/src/config/redis.js
git commit -m "fix(redis): implement proper REDIS_URL parsing and auth handling

Root Cause:
- Code ignored REDIS_URL and used undefined REDIS_PASSWORD
- Result: NOAUTH Authentication required error

Changes:
- Add parseRedisUrl() to extract host, port, password from URL
- Implement getRedisConfig() with REDIS_URL priority
- Add exponential backoff retry (100ms→3s, max 10 attempts)
- Enhance error handling with specific messages
- Add connection timeout and detailed logging
- Mask passwords in logs for security

Fixes: Engine container crash with Redis auth errors"

# Push
git push origin main
```

---

## Files Created

- ✅ `engine/src/config/redis.js` - Fixed Redis connection code
- 📄 `REDIS_FIX_REPORT.md` - Detailed technical report
- 📄 `test-redis-fix.sh` - Automated test script
- 📄 `QUICK_START.md` - This file

---

## Need Help?

See detailed report: `REDIS_FIX_REPORT.md`

**Common Issues:**
1. Docker not found → Install Docker: `apt-get install docker.io docker-compose`
2. Permission denied → Add user to docker group: `sudo usermod -aG docker $USER`
3. Port conflicts → Stop conflicting services: `docker compose down`

---

**Status**: ✅ Fix Ready for Testing  
**Next**: Run `./test-redis-fix.sh` in `/home/arbuser/arb`
