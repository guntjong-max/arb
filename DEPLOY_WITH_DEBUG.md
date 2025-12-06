# 🔍 Deploy with Enhanced Debug Logging

## What This Does

This deployment adds **step-by-step console logging** to pinpoint exactly where the startup fails:

- ✅ Logs every initialization step to console
- ✅ Shows error details in catch block
- ✅ Identifies which component causes the crash

## Quick Deploy

Copy and paste this **complete block** on your server:

```bash
cd /home/arbuser/arb

cat > deploy-with-debug-logging.sh << 'DEPLOY_SCRIPT_EOF'
#!/bin/bash
set -e

echo "=========================================="
echo "DEPLOYING WITH ENHANCED DEBUG LOGGING"
echo "=========================================="
echo ""

cd /home/arbuser/arb

# Stop services
echo "Step 1: Stopping services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# Update index.js with enhanced logging
echo ""
echo "Step 2: Updating index.js with debug logging..."
cat > engine/src/index.js << 'INDEXJS_EOF'
// src/index.js - Entry point for Arbitrage Bot Engine

// === CRITICAL ERROR HANDLERS (BEFORE ANY IMPORTS) ===
// These catch crashes that happen before logger is initialized
console.log('=== ENGINE PROCESS START ===');
console.log('PID:', process.pid);
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('CWD:', process.cwd());

// Catch uncaught exceptions EARLY
process.on('uncaughtException', (err) => {
  console.error('!!! FATAL: UNCAUGHT EXCEPTION !!!');
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('Exiting with code 1');
  process.exit(1);
});

// Catch unhandled rejections EARLY
process.on('unhandledRejection', (reason, promise) => {
  console.error('!!! FATAL: UNHANDLED REJECTION !!!');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('Exiting with code 1');
  process.exit(1);
});

console.log('Early error handlers registered');
console.log('=================================');

// Early console logging before logger init
console.log('[STARTUP] Loading environment...');
require('dotenv').config();
console.log('[STARTUP] Environment loaded. NODE_ENV:', process.env.NODE_ENV);
console.log('[STARTUP] DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('[STARTUP] REDIS_URL:', process.env.REDIS_URL ? 'SET' : 'NOT SET');

const logger = require('./config/logger');
const { createServer } = require('./server');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initializeMetrics } = require('./utils/metrics');

let server;
let httpServer;

async function start() {
  try {
    console.log('[START] Initializing logger...');
    logger.info('Starting Arbitrage Bot Engine...');
    logger.info(\`Environment: \${process.env.NODE_ENV}\`);
    logger.info(\`Paper Trading Mode: \${process.env.PAPER_TRADING_MODE}\`);
    console.log('[START] Logger initialized successfully');

    // Initialize metrics
    console.log('[START] Initializing metrics...');
    initializeMetrics();
    logger.info('Metrics initialized');
    console.log('[START] Metrics initialized successfully');

    // Connect to databases
    console.log('[START] Connecting to PostgreSQL...');
    await connectDatabase();
    logger.info('PostgreSQL connected');
    console.log('[START] PostgreSQL connected successfully');

    console.log('[START] Connecting to Redis...');
    await connectRedis();
    logger.info('Redis connected');
    console.log('[START] Redis connected successfully');

    // Create and start server
    console.log('[START] Creating server...');
    const app = await createServer();
    console.log('[START] Server created successfully');
    
    const PORT = process.env.PORT || 3000;
    const HOST = '0.0.0.0';  // Bind to all interfaces for Docker
    
    console.log(\`[START] Starting HTTP server on \${HOST}:\${PORT}...\`);
    httpServer = app.listen(PORT, HOST, () => {
      console.log(\`[START] ✅ HTTP Server listening on \${HOST}:\${PORT}\`);
      logger.info(\`Engine HTTP Server listening on \${HOST}:\${PORT}\`);
      logger.info(\`Health check: http://localhost:\${PORT}/health\`);
      logger.info(\`API docs: http://localhost:\${PORT}/api/docs\`);
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal) => {
      logger.info(\`\${signal} received. Starting graceful shutdown...\`);
      
      // Close HTTP server
      if (httpServer) {
        httpServer.close(() => {
          logger.info('HTTP server closed');
        });
      }

      // Close database connections
      const { closeDatabase } = require('./config/database');
      const { closeRedis } = require('./config/redis');
      
      try {
        await closeDatabase();
        logger.info('Database connection closed');
        
        await closeRedis();
        logger.info('Redis connection closed');
        
        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    // Unhandled rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

  } catch (error) {
    console.error('!!! [START] FAILED TO START ENGINE !!!');
    console.error('[START] Error message:', error.message);
    console.error('[START] Error stack:', error.stack);
    console.error('[START] Full error:', error);
    logger.error('Failed to start engine:', error);
    process.exit(1);
  }
}

// Start the engine
start();
INDEXJS_EOF

echo "✅ index.js updated with enhanced logging"

# Verify Dockerfile has healthcheck disabled
echo ""
echo "Step 3: Verifying Dockerfile healthcheck is disabled..."
if grep -q "^HEALTHCHECK" engine/Dockerfile; then
    echo "⚠️  HEALTHCHECK still active in Dockerfile, disabling it..."
    sed -i '/^HEALTHCHECK/,/^  CMD/s/^/# /' engine/Dockerfile
    echo "✅ Dockerfile healthcheck disabled"
else
    echo "✅ Dockerfile healthcheck already disabled"
fi

# Remove old image
echo ""
echo "Step 4: Removing old image..."
docker rmi arb-engine || true

# Clean cache
echo ""
echo "Step 5: Cleaning build cache..."
docker builder prune -af

# Rebuild
echo ""
echo "Step 6: Rebuilding engine (no cache)..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache --pull engine

# Start
echo ""
echo "Step 7: Starting services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Wait
echo ""
echo "Step 8: Waiting 15 seconds for startup..."
sleep 15

# Diagnostics
echo ""
echo "=========================================="
echo "DIAGNOSTICS"
echo "=========================================="
echo ""

echo "=== Container Status ==="
docker compose ps

echo ""
echo "=== Engine Logs (last 100 lines) ==="
docker compose logs engine --tail=100

echo ""
echo "=== Test Health Endpoint (Direct) ==="
curl -s http://localhost:3000/health || echo "Failed to connect"

echo ""
echo "=== Test Health Endpoint (Nginx) ==="
curl -k -s https://api.kliks.life/health || echo "Failed to connect"

echo ""
echo "=========================================="
echo "ANALYSIS"
echo "=========================================="
echo ""
echo "Look for the LAST console log message before restart:"
echo "  - If stops at '[START] Initializing logger...' → logger.js issue"
echo "  - If stops at '[START] Initializing metrics...' → metrics issue"
echo "  - If stops at '[START] Connecting to PostgreSQL...' → database config issue"
echo "  - If stops at '[START] Connecting to Redis...' → redis config issue"
echo "  - If stops at '[START] Creating server...' → server.js issue"
echo "  - If stops at '[START] Starting HTTP server...' → port binding issue"
echo ""
echo "If you see 'FAILED TO START ENGINE', the error details will be shown above it."
echo ""
echo "=========================================="
DEPLOY_SCRIPT_EOF

chmod +x deploy-with-debug-logging.sh
./deploy-with-debug-logging.sh
```

## What to Look For

After running, the logs will show exactly where it fails:

### Successful Startup (Expected)
```
=== ENGINE PROCESS START ===
[STARTUP] Loading environment...
[STARTUP] Environment loaded. NODE_ENV: production
[START] Initializing logger...
[START] Logger initialized successfully
[START] Initializing metrics...
[START] Metrics initialized successfully
[START] Connecting to PostgreSQL...
[START] PostgreSQL connected successfully
[START] Connecting to Redis...
[START] Redis connected successfully
[START] Creating server...
[START] Server created successfully
[START] Starting HTTP server on 0.0.0.0:3000...
[START] ✅ HTTP Server listening on 0.0.0.0:3000
```

### Failure Scenarios

#### If it stops at logger initialization:
```
[START] Initializing logger...
!!! [START] FAILED TO START ENGINE !!!
[START] Error message: Cannot find module './config/logger'
```
**Fix**: Logger.js file missing or syntax error

#### If it stops at database connection:
```
[START] Connecting to PostgreSQL...
!!! [START] FAILED TO START ENGINE !!!
[START] Error message: connect ECONNREFUSED 172.25.0.x:5432
```
**Fix**: PostgreSQL not ready or wrong credentials

#### If it stops at Redis connection:
```
[START] Connecting to Redis...
!!! [START] FAILED TO START ENGINE !!!
[START] Error message: WRONGPASS invalid username-password pair
```
**Fix**: Redis password mismatch

#### If it stops at server creation:
```
[START] Creating server...
!!! [START] FAILED TO START ENGINE !!!
[START] Error message: Cannot find module './routes/...'
```
**Fix**: Missing route file or syntax error in server.js

## After You See the Error

**Send me the complete output**, especially:
1. The LAST `[START]` message before failure
2. The complete error message and stack trace
3. Container status

Then I can provide the specific fix for that exact component.

---

## Quick Verification (Later)

After deployment, use this to check status:

```bash
cd /home/arbuser/arb
chmod +x verify-deployment.sh
./verify-deployment.sh
```
