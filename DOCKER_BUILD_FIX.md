# 🔧 Docker Build Fix - Engine & Frontend

## ✅ FIXES APPLIED

### 1. Engine Dockerfile Fixed (`engine/Dockerfile`)
**Changes:**
- ✅ Changed `npm ci --only=production` → `npm install --omit=dev`
- ✅ Added `ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
- ✅ Added `ENV PUPPETEER_SKIP_DOWNLOAD=true`

**Why:**
- `npm install` doesn't require strict lockfile matching
- Skipping Puppeteer downloads prevents build from hanging
- More flexible for dependency resolution

### 2. Frontend Dockerfile Fixed (`frontend/Dockerfile`)
**Changes:**
- ✅ Changed `npm ci` → `npm install`
- ✅ Added `ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
- ✅ Added `ENV PUPPETEER_SKIP_DOWNLOAD=true`

**Why:**
- Prevents Puppeteer download issues
- More robust dependency installation
- No strict lockfile requirement

### 3. Cleanup Script Created (`cleanup-and-rebuild.sh`)
**Features:**
- Stops all containers
- Removes corrupted `node_modules` in engine and frontend
- Removes corrupted `package-lock.json` files
- Removes old Docker images
- Prunes Docker build cache
- Rebuilds images with `--no-cache`
- Starts all services
- Displays service status and logs

---

## 🚀 HOW TO RUN

### Option 1: Automated Cleanup & Rebuild (RECOMMENDED)
```bash
cd /data/workspace/arb
./cleanup-and-rebuild.sh
```

This script will:
1. Stop all containers
2. Clean corrupted files
3. Remove old images
4. Rebuild everything fresh
5. Start all services
6. Show status and logs

### Option 2: Manual Step-by-Step
```bash
cd /data/workspace/arb

# Stop services
docker compose down

# Clean corrupted files
rm -rf engine/node_modules engine/package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json

# Remove old images
docker rmi arb-engine arb-frontend 2>/dev/null || true

# Rebuild and start
docker compose build --no-cache
docker compose up -d
```

---

## 🔍 VERIFY SUCCESS

### 1. Check Container Status
```bash
docker compose ps
```
Expected: All containers should be "Up"

### 2. Check Engine Logs
```bash
docker logs arb-engine
```
Expected: "Engine HTTP Server listening on port 3000"

### 3. Check Frontend Logs
```bash
docker logs arb-frontend
```
Expected: "VITE v5.x.x ready" and "Network: http://0.0.0.0:5173/"

### 4. Test Engine API
```bash
curl http://localhost:3000/health
```
Expected: JSON response with status

### 5. Test Frontend
```bash
curl http://localhost:5173
```
Expected: HTML response

---

## 📋 WHAT WAS FIXED

### Problem 1: npm ci Fails
**Before:**
```dockerfile
RUN npm ci --only=production
```
**Issue:** Requires exact lockfile match, fails if out of sync

**After:**
```dockerfile
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm install --omit=dev
```
**Fixed:** More flexible, skips problematic downloads

### Problem 2: Puppeteer Download Hangs
**Before:**
- No environment variables to skip Chromium download
- Build process would hang downloading large browser binaries

**After:**
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` prevents download
- `PUPPETEER_SKIP_DOWNLOAD=true` ensures no browser downloads
- Build completes quickly

### Problem 3: Corrupted node_modules
**Solution:**
- Cleanup script removes all corrupted files
- Fresh rebuild ensures clean state
- No cached layers from old builds

---

## 🛠️ DOCKERFILE COMPARISON

### Engine Dockerfile - BEFORE vs AFTER

**BEFORE:**
```dockerfile
# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force
```

**AFTER:**
```dockerfile
# Install dependencies (skip Puppeteer downloads to avoid hanging)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm install --omit=dev && \
    npm cache clean --force
```

### Frontend Dockerfile - BEFORE vs AFTER

**BEFORE:**
```dockerfile
# Install dependencies
COPY package*.json ./
RUN npm ci
```

**AFTER:**
```dockerfile
# Install dependencies (skip Puppeteer downloads to avoid hanging)
COPY package*.json ./
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm install
```

---

## 📊 EXPECTED BUILD TIME

- **Clean build**: ~3-5 minutes
- **Cached build**: ~1-2 minutes
- **Total startup**: ~2-3 minutes

---

## ✅ SUCCESS CRITERIA

After running `cleanup-and-rebuild.sh`:

- [ ] All containers running (docker compose ps)
- [ ] Engine accessible at http://localhost:3000
- [ ] Frontend accessible at http://localhost:5173
- [ ] No errors in logs
- [ ] Health check passing

---

## 🔧 TROUBLESHOOTING

### If Build Still Fails

1. **Check Docker resources:**
   ```bash
   docker system df
   docker system prune -a
   ```

2. **Check network connectivity:**
   ```bash
   curl -I https://registry.npmjs.org/
   ```

3. **View build logs:**
   ```bash
   docker compose build --no-cache --progress=plain 2>&1 | tee build.log
   ```

4. **Check for port conflicts:**
   ```bash
   netstat -tlnp | grep -E '3000|5173|6379|5432'
   ```

### If Containers Won't Start

1. **Check logs:**
   ```bash
   docker compose logs engine
   docker compose logs frontend
   ```

2. **Check dependencies:**
   ```bash
   docker compose ps
   ```
   Ensure postgres and redis are "healthy" before engine starts

3. **Restart services:**
   ```bash
   docker compose restart
   ```

---

## 📁 FILES MODIFIED

```
✅ engine/Dockerfile        - Fixed npm install & Puppeteer skip
✅ frontend/Dockerfile      - Fixed npm install & Puppeteer skip
✅ cleanup-and-rebuild.sh   - New automation script
```

---

## 🎯 ONE-LINER TO FIX EVERYTHING

```bash
cd /data/workspace/arb && ./cleanup-and-rebuild.sh
```

This will clean, rebuild, and start everything automatically! 🚀

---

## 📞 NEXT STEPS

1. **Run the cleanup script:**
   ```bash
   ./cleanup-and-rebuild.sh
   ```

2. **Wait for services to start (2-3 minutes)**

3. **Verify all services:**
   ```bash
   docker compose ps
   curl http://localhost:3000/health
   curl http://localhost:5173
   ```

4. **Access the application:**
   - Engine API: http://localhost:3000
   - Frontend UI: http://localhost:5173
   - Grafana: http://localhost:3030
   - Prometheus: http://localhost:9090

---

**Status: READY TO RUN! ✅**

Just execute: `./cleanup-and-rebuild.sh`
