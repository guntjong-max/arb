# FINAL COMPLETE FIX - Step by Step

## Issue Summary
Container crashes silently with no logs, even after enabling console logging.
Likely cause: Healthcheck failing before app fully starts, or process exiting immediately.

## Solution: Disable Healthcheck Temporarily + Force Rebuild

### Step 1: Update docker-compose.prod.yml to disable healthcheck

```yaml
version: '3.9'

services:
  engine:
    volumes:
      - ./engine/logs:/app/logs
    
    env_file:
      - .env
    
    environment:
      NODE_ENV: production
    
    # TEMPORARILY DISABLE healthcheck to let container stay running
    healthcheck:
      disable: true
    
    restart: always
```

### Step 2: Ensure logger.js has console output

The file should have this at the end (line 51-54):
```javascript
// Console logging - ALWAYS enabled for Docker
logger.add(new winston.transports.Console({
  format: process.env.NODE_ENV === 'production' ? customFormat : consoleFormat
}));
```

### Step 3: Force complete rebuild

```bash
# Stop everything
docker compose down -v

# Remove ALL images and build cache
docker rmi arb-engine
docker builder prune -af

# Verify files are correct
cat engine/src/config/logger.js | grep -A 3 "Console logging"
cat engine/src/index.js | grep "0.0.0.0"

# Rebuild from scratch
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache --pull engine

# Start
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Monitor logs in real-time
docker compose logs -f engine
```

## Expected Behavior

With healthcheck disabled:
- Container should STAY RUNNING (not restart)
- Logs should show startup messages
- Can exec into container
- Can test endpoints

Then we can identify the actual issue!
