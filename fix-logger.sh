#!/bin/bash
# LOGGER FIX - Enable console logging in production
cd /home/arbuser/arb

echo "========================================"
echo "LOGGER FIX DEPLOYMENT"
echo "========================================"
echo ""

echo "Issue: Console logging was disabled in production mode"
echo "Fix: Enable console logging always (Docker needs it for docker logs)"
echo ""

# Update logger.js
echo "=== Step 1: Updating logger.js ==="
cat > engine/src/config/logger.js << 'EOF'
// src/config/logger.js - Winston logger configuration
const winston = require('winston');
const path = require('path');

const logLevel = process.env.LOG_LEVEL || 'info';
const logDir = process.env.LOG_DIR || 'logs';

// Custom format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger
const logger = winston.createLogger({
  level: logLevel,
  format: customFormat,
  defaultMeta: { service: 'arbitrage-engine' },
  transports: [
    // File transport for errors
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    // File transport for all logs
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  ]
});

// Console logging - ALWAYS enabled for Docker (logs go to docker logs)
// In Docker, console output is the primary log destination
logger.add(new winston.transports.Console({
  format: process.env.NODE_ENV === 'production' ? customFormat : consoleFormat
}));

module.exports = logger;
EOF

echo "✓ logger.js updated"

# Add early logging to index.js
echo ""
echo "=== Step 2: Adding early console logging ==="
# Backup first
cp engine/src/index.js engine/src/index.js.backup

# Insert early logging after first line
sed -i '1a // Early console logging before logger init\nconsole.log('\''[STARTUP] Loading environment...\'\'');' engine/src/index.js
sed -i '/require('\''dotenv'\'').config();/a console.log('\''[STARTUP] Environment loaded. NODE_ENV:\'\'', process.env.NODE_ENV);\nconsole.log('\''[STARTUP] DATABASE_URL:\'\'', process.env.DATABASE_URL ? '\''SET'\'' : '\''NOT SET\'\'');\nconsole.log('\''[STARTUP] REDIS_URL:\'\'', process.env.REDIS_URL ? '\''SET'\'' : '\''NOT SET\'\'');\n' engine/src/index.js

echo "✓ index.js updated"

# Rebuild
echo ""
echo "=== Step 3: Rebuilding ==="
docker compose down
docker rmi arb-engine 2>/dev/null || true
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache engine
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

echo ""
echo "=== Step 4: Waiting for startup (120 seconds) ==="
sleep 120

# Verification
echo ""
echo "========================================"
echo "VERIFICATION"
echo "========================================"
echo ""

echo "=== Container Status ==="
docker compose ps | grep arb-engine

echo ""
echo "=== Container Logs (NOW SHOULD HAVE OUTPUT!) ==="
docker compose logs engine --tail=50

echo ""
echo "=== Health Check (Direct) ==="
curl -s http://localhost:3000/health

echo ""
echo "=== Health Check (Nginx) ==="
curl -k -s https://api.kliks.life/health

echo ""
echo "=== Sessions Endpoint ==="
curl -k -s -X POST https://api.kliks.life/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","sportsbook":"bet365","session_data":"test","consent_id":"test"}'

echo ""
echo ""
echo "Done! Check logs above - should now see startup messages!"
