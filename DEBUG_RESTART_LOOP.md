# Debug Restart Loop - Step by Step

## Commands to Run on Server

### Step 1: Get Container Logs
```bash
cd /home/arbuser/arb
docker logs arb-engine --tail=100 2>&1 | tee engine_error_logs.txt
```

### Step 2: Check Container Details
```bash
docker inspect arb-engine --format='{{.State.ExitCode}}'
docker inspect arb-engine --format='{{json .State}}' | python3 -m json.tool || docker inspect arb-engine --format='{{json .State}}'
```

### Step 3: Check Volume Mounts
```bash
docker inspect arb-engine --format='{{range .Mounts}}{{.Source}} -> {{.Destination}} ({{.Mode}}){{"\n"}}{{end}}'
```

### Step 4: Test Inside Container (if possible)
```bash
# Try to exec into container during brief uptime
docker exec -it arb-engine sh -c "ls -la /app/ && cat /app/package.json"

# Or run a new container with same image
docker run --rm -it --entrypoint sh arb-engine -c "ls -la /app/ && node --version && npm --version"
```

### Step 5: Check Dependencies
```bash
docker compose exec postgres pg_isready -U arbitrage_user -d arbitrage_bot
docker compose exec redis redis-cli PING
```

## Common Issues to Look For

1. **Module not found** - Volume mount still overriding
2. **ECONNREFUSED** - Database/Redis connection issues
3. **Missing environment variables** - .env not loaded
4. **Syntax errors** - Code issues in routes/server.js
5. **Port already in use** - Port 3000 conflict
