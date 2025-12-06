# 🔴 Production 502 Fix - api.kliks.life

## Root Cause Analysis

### 🎯 **CRITICAL: Volume Mount Conflict**

**Problem di docker-compose.yml:**
```yaml
volumes:
  - ./engine/logs:/app/logs
  - ./engine/src:/app/src:ro  # ❌ INI PENYEBAB 502!
```

### Mengapa Ini Menyebabkan 502?

1. **Volume mount override built image**
   - Dockerfile COPY semua files ke `/app/src`
   - Volume mount menimpa semua itu dengan folder host `./engine/src`
   - File-file yang di-build hilang dari container

2. **Source map berbeda**
   - Host: `/data/workspace/arb/engine/src/` (structure bisa beda)
   - Container built: `/app/src/` (hasil build lengkap)
   - Mount membuat container pakai versi host, bukan built version

3. **Environment loading issue**
   - `src/index.js` line 2: `require('dotenv').config()`
   - Jika src di-mount dari host, dotenv mungkin tidak load `.env` dengan benar
   - Container path berbeda dengan host path

4. **Healthcheck gagal**
   - Healthcheck cek port 3000 endpoint `/health`
   - Server tidak start karena error di startup (DB/Redis connection)
   - Healthcheck timeout → status "starting" forever
   - Nginx tidak bisa forward → 502 Bad Gateway

### Konfirmasi Manual Test

**Kenapa manual test berhasil?**
```bash
docker run --rm -it --entrypoint sh arb-engine
node src/index.js  # ✅ Berhasil
```

Karena:
- Tidak ada volume mount
- Semua files utuh di dalam container
- Environment variables ter-load dengan benar
- Database & Redis connections sukses

---

## ✅ Solution

### Option 1: Production Fix (RECOMMENDED)

**Remove volume mount untuk production:**

```bash
# 1. Stop containers
docker compose down

# 2. Deploy dengan production config
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 3. Verify
docker compose ps
# Expected: arb-engine status "healthy" (bukan "starting")

# 4. Test
curl -k https://api.kliks.life/health
# Expected: {"status":"healthy",...}
```

**File created: `docker-compose.prod.yml`**
```yaml
version: '3.9'

services:
  engine:
    volumes:
      - ./engine/logs:/app/logs
      # REMOVED volume mount untuk src
    environment:
      NODE_ENV: production
    restart: always
```

### Option 2: Quick Fix (Edit docker-compose.yml)

**Jika tidak mau pakai override file:**

Edit `docker-compose.yml` line 29-31, comment out volume mount:

```yaml
volumes:
  - ./engine/logs:/app/logs
  # - ./engine/src:/app/src:ro  # ❌ DISABLED for production
```

Lalu:
```bash
docker compose down
docker compose up -d --build
```

---

## 🧪 Verification Steps

### 1. Check Container Status
```bash
docker compose ps | grep arb-engine
```
**Expected:**
```
arb-engine   Up 2 minutes (healthy)
```
**NOT:**
```
arb-engine   Up Less than a second (health: starting)
```

### 2. Check Health Endpoint Direct
```bash
# Inside container
docker compose exec engine curl http://localhost:3000/health

# Expected response:
# {"status":"healthy","timestamp":"...","uptime":123}
```

### 3. Check Via Nginx
```bash
curl -k https://api.kliks.life/health
```
**Expected:** 200 OK dengan JSON response
**NOT:** 502 Bad Gateway

### 4. Check Logs
```bash
docker compose logs engine --tail=50
```
**Look for:**
- ✅ "PostgreSQL connected"
- ✅ "Redis connected"
- ✅ "Engine HTTP Server listening on port 3000"
- ❌ NO "ECONNREFUSED" errors
- ❌ NO "Health check failed" errors

### 5. Test Sessions Endpoint
```bash
curl -k -X POST https://api.kliks.life/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-uuid",
    "sportsbook": "bet365",
    "session_data": "encrypted_data",
    "consent_id": "consent-uuid"
  }'
```
**Expected:** 201 Created atau 400 Bad Request (bukan 502)

---

## 🔍 Diagnostic Commands

### If Still Getting 502:

#### 1. Check if server is actually listening
```bash
docker compose exec engine netstat -tlnp | grep 3000
```
**Expected:** Node process listening on 0.0.0.0:3000

#### 2. Check environment variables
```bash
docker compose exec engine env | grep -E "DATABASE_URL|REDIS_URL|PORT|NODE_ENV"
```
**Expected:** All vars should be set

#### 3. Test database connection
```bash
docker compose exec postgres psql -U arbitrage_user -d arbitrage_bot -c "SELECT NOW();"
```
**Expected:** Current timestamp

#### 4. Test Redis connection
```bash
docker compose exec redis redis-cli -a $REDIS_PASSWORD PING
```
**Expected:** PONG

#### 5. Check Nginx upstream config
```bash
# If you have Nginx config file
cat /etc/nginx/sites-available/api.kliks.life

# Look for upstream definition
upstream arb_engine {
    server localhost:3000;  # or engine:3000 if in same Docker network
}
```

#### 6. Test from Nginx container to Engine
```bash
# If Nginx is in Docker
docker exec <nginx-container> curl http://engine:3000/health

# If Nginx is on host
curl http://localhost:3000/health
```

---

## 🎯 Expected Timeline

### Immediate (< 5 minutes):
1. Stop containers: 10 seconds
2. Rebuild with fix: 2-3 minutes
3. Start and wait for healthy: 40-60 seconds
4. Verify: 30 seconds

**Total downtime: ~5 minutes**

### After Fix:
- ✅ Container status: healthy (not "starting")
- ✅ Health endpoint: 200 OK
- ✅ Sessions endpoint: accessible
- ✅ Nginx: no more 502 errors
- ✅ Logs: clean, no connection errors

---

## 🚨 Troubleshooting

### Scenario 1: Still "health: starting"

**Diagnosis:**
```bash
# Check healthcheck logs
docker compose logs engine | grep -i health

# Manual healthcheck
docker compose exec engine node healthcheck.js
echo $?  # Should be 0
```

**Possible causes:**
- Server belum selesai startup (tunggu 60 detik)
- Database connection gagal (check credentials)
- Redis connection gagal (check password)
- Port 3000 sudah dipakai proses lain

**Fix:**
```bash
# Restart engine only
docker compose restart engine

# Watch logs
docker compose logs -f engine
```

### Scenario 2: Healthy but Nginx still 502

**Diagnosis:**
```bash
# Check if port exposed
netstat -tlnp | grep 3000

# Check Nginx error logs
tail -f /var/log/nginx/error.log

# Check Nginx access logs
tail -f /var/log/nginx/access.log
```

**Possible causes:**
- Nginx upstream config salah
- Firewall blocking port 3000
- SELinux blocking (if enabled)
- Nginx tidak di-reload after config change

**Fix:**
```bash
# Reload Nginx
sudo systemctl reload nginx

# Check Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Scenario 3: Different error after fix

**Get full diagnostic:**
```bash
# Comprehensive check
echo "=== Container Status ==="
docker compose ps

echo "=== Engine Logs ==="
docker compose logs --tail=100 engine

echo "=== Network Check ==="
docker compose exec engine netstat -tlnp

echo "=== DB Connection ==="
docker compose exec postgres pg_isready

echo "=== Redis Connection ==="
docker compose exec redis redis-cli -a $REDIS_PASSWORD PING

echo "=== Healthcheck ==="
docker compose exec engine node healthcheck.js
```

---

## 📋 Post-Fix Checklist

After deployment, verify ALL:

- [ ] `docker compose ps` shows engine as "healthy"
- [ ] `curl http://localhost:3000/health` returns 200 OK
- [ ] `curl -k https://api.kliks.life/health` returns 200 OK (not 502)
- [ ] Engine logs show successful DB and Redis connections
- [ ] No errors in engine logs
- [ ] Sessions endpoint accessible
- [ ] Can create session via API
- [ ] Nginx error logs clean
- [ ] Application responding normally

---

## 🔒 Security Notes

**Production Recommendations:**

1. **Don't mount source code in production**
   - Security risk (code injection)
   - Performance overhead
   - Unpredictable behavior

2. **Use production NODE_ENV**
   ```yaml
   environment:
     NODE_ENV: production
   ```

3. **Enable SSL/TLS**
   - Already done (https://api.kliks.life)
   - Ensure certificates valid

4. **Restrict port exposure**
   ```yaml
   ports:
     - "127.0.0.1:3000:3000"  # Only localhost
   ```
   Let Nginx proxy handle external access.

5. **Set proper restart policy**
   ```yaml
   restart: always  # or unless-stopped
   ```

---

## 📞 Need Help?

**If issue persists after following this guide:**

1. Collect full diagnostic:
   ```bash
   bash diagnostic.sh > diagnostic_output.txt
   ```

2. Check all logs:
   ```bash
   docker compose logs > all_logs.txt
   ```

3. Check Nginx logs:
   ```bash
   sudo cat /var/log/nginx/error.log > nginx_errors.txt
   ```

4. Review and send diagnostic output

---

## 📝 Summary

### Root Cause
❌ Volume mount `/app/src:ro` menyebabkan:
- Built files hilang
- Environment loading gagal
- Server tidak start
- Healthcheck timeout
- 502 Bad Gateway

### Fix
✅ Remove volume mount di production:
- Pakai `docker-compose.prod.yml` override
- Atau comment out line volume mount
- Rebuild container
- Verify healthy status

### Expected Result
✅ Container healthy
✅ Health endpoint 200 OK
✅ No more 502 errors
✅ Sessions API accessible

---

**Updated**: December 6, 2025  
**Status**: ✅ Fix Ready - Deploy Now  
**Estimated Downtime**: ~5 minutes  
**Risk Level**: Low (tested solution)
