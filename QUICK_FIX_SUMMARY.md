# 🚨 QUICK FIX - Engine 502 Error

## TL;DR

**Problem:** Container stuck di "health: starting", Nginx return 502  
**Root Cause:** Volume mount `/app/src:ro` meng-override built files  
**Fix:** Remove volume mount untuk production  

---

## ⚡ Quick Fix (2 Options)

### Option 1: Auto Script (RECOMMENDED)
```bash
cd /data/workspace/arb
bash fix-502.sh
```
**What it does:**
- Stops containers
- Deploys with production config
- Waits for healthy status
- Verifies fix

**Time:** ~5 minutes

---

### Option 2: Manual Fix
```bash
cd /data/workspace/arb

# Stop containers
docker compose down

# Deploy with production override
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Wait 60 seconds
sleep 60

# Check status
docker compose ps

# Test
curl -k https://api.kliks.life/health
```

---

## ✅ Verification

After fix, ALL these should pass:

```bash
# 1. Container healthy
docker compose ps | grep arb-engine
# Expected: "Up XX minutes (healthy)"

# 2. Health endpoint works
curl http://localhost:3000/health
# Expected: {"status":"healthy",...}

# 3. Nginx no more 502
curl -k https://api.kliks.life/health
# Expected: {"status":"healthy",...}

# 4. Sessions endpoint works
curl -k -X POST https://api.kliks.life/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","sportsbook":"bet365","session_data":"test","consent_id":"test"}'
# Expected: 201 or 400 (NOT 502)
```

---

## 🔍 Diagnostics

If still having issues:

```bash
# Run full diagnostic
bash diagnostic.sh > diag_report.txt

# Check logs
docker compose logs engine --tail=100

# Manual healthcheck
docker compose exec engine node healthcheck.js
```

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production override (no src mount) |
| `fix-502.sh` | Auto-fix script |
| `diagnostic.sh` | Diagnostic tool |
| `PRODUCTION_502_FIX.md` | Full documentation |

---

## 🎯 Expected Results

**Before Fix:**
```
arb-engine   Up Less than a second (health: starting)
curl https://api.kliks.life/health → 502 Bad Gateway
```

**After Fix:**
```
arb-engine   Up 2 minutes (healthy)
curl https://api.kliks.life/health → {"status":"healthy",...}
```

---

## 📞 Still Issues?

1. Check full docs: `PRODUCTION_502_FIX.md`
2. Run diagnostic: `bash diagnostic.sh`
3. Check Nginx logs: `tail -f /var/log/nginx/error.log`
4. Verify .env file has all secrets

---

**Last Updated:** December 6, 2025  
**Status:** Ready to Deploy
