#!/bin/bash
# Deep diagnostic untuk debug container crash
cd /home/arbuser/arb

echo "========================================"
echo "DEEP DIAGNOSTIC - ARB-ENGINE"
echo "========================================"
echo ""

# 1. Check container state details
echo "=== 1. Container State Details ==="
docker inspect arb-engine --format='Status: {{.State.Status}}'
docker inspect arb-engine --format='ExitCode: {{.State.ExitCode}}'
docker inspect arb-engine --format='Error: {{.State.Error}}'
docker inspect arb-engine --format='StartedAt: {{.State.StartedAt}}'
docker inspect arb-engine --format='FinishedAt: {{.State.FinishedAt}}'
echo ""

# 2. Check environment variables in container
echo "=== 2. Environment Variables (Sanitized) ==="
docker inspect arb-engine --format='{{range .Config.Env}}{{println .}}{{end}}' | grep -E "NODE_ENV|PORT|DATABASE|REDIS" | head -20
echo ""

# 3. Try to catch logs during brief uptime
echo "=== 3. Attempting to Catch Logs (will wait 10 seconds) ==="
timeout 10 docker logs -f arb-engine 2>&1 || echo "No logs captured"
echo ""

# 4. Check if image was built correctly
echo "=== 4. Image Information ==="
docker images arb-engine
echo ""

# 5. Test run container with manual command
echo "=== 5. Manual Container Test (this is critical!) ==="
echo "Running container manually to see actual error..."
docker run --rm \
  --env-file .env \
  -e NODE_ENV=production \
  arb-engine node src/index.js 2>&1 | head -50
echo ""

# 6. Check if files exist in image
echo "=== 6. File Structure Check ==="
docker run --rm arb-engine ls -la /app/
echo ""
docker run --rm arb-engine ls -la /app/src/
echo ""

# 7. Check if session.routes.js exists
echo "=== 7. Check session.routes.js ==="
docker run --rm arb-engine ls -la /app/src/routes/session.routes.js 2>&1
echo ""

# 8. Check package.json and node version
echo "=== 8. Node & Package Info ==="
docker run --rm arb-engine node --version
docker run --rm arb-engine npm --version
docker run --rm arb-engine cat /app/package.json | head -20
echo ""

# 9. Try to start with verbose error
echo "=== 9. Start with Node Debug Mode ==="
docker run --rm \
  --env-file .env \
  -e NODE_ENV=production \
  arb-engine node --trace-warnings --trace-uncaught src/index.js 2>&1 | head -100
echo ""

echo "========================================"
echo "DIAGNOSTIC COMPLETE"
echo "========================================"
echo ""
echo "Please copy ALL output above and send to agent"
