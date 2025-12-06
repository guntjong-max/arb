# Quick Start Guide - Engine Health Fix

## What Was Done

✅ Created `.env` file with secure secrets  
✅ Created database schema with sportsbook_sessions table  
✅ Implemented `/api/v1/sessions` endpoint for sportsbook session management  
✅ Added consent validation and audit logging  
✅ Updated API documentation  

## Start Services (When Docker is Available)

```bash
cd /data/workspace/arb

# Stop existing containers
docker compose down

# Rebuild and start
docker compose up -d --build

# Wait 30-60 seconds, then check status
docker compose ps
```

## Verify Engine Health

```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health check (shows database and Redis status)
curl http://localhost:3000/health/detailed

# View API documentation
curl http://localhost:3000/api/docs
```

## Test Sportsbook Sessions Endpoint

### 1. Get test consent ID from database

```bash
docker compose exec postgres psql -U arbitrage_user -d arbitrage_bot -c \
  "SELECT id, user_id FROM user_consents LIMIT 1;"
```

### 2. Create a session

```bash
# Replace <user_id> and <consent_id> with values from step 1
curl -X POST http://localhost:3000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "<user_id>",
    "sportsbook": "test_sportsbook", 
    "session_data": "encrypted_session_here",
    "consent_id": "<consent_id>",
    "expires_at": "2025-12-31T23:59:59Z"
  }'
```

### 3. List all sessions

```bash
curl http://localhost:3000/api/v1/sessions
```

### 4. Get specific session

```bash
curl http://localhost:3000/api/v1/sessions/<session_id>
```

## Monitor Logs

```bash
# Engine logs
docker compose logs -f engine

# All services
docker compose logs -f

# Specific service
docker compose logs -f postgres
docker compose logs -f redis
```

## Troubleshooting

If engine shows "starting" but not "healthy":

1. Check logs: `docker compose logs engine`
2. Verify .env exists: `ls -la .env`
3. Check database connection: `docker compose logs postgres`
4. Check Redis connection: `docker compose logs redis`
5. Restart services: `docker compose restart`

## Expected Results

✅ arb-engine: healthy  
✅ arb-postgres: healthy  
✅ arb-redis: healthy  
✅ Health endpoint returns 200 OK  
✅ Sessions endpoint accessible  
✅ No 502 errors from Nginx  

## Files Changed

```
Created:
  .env (with generated secrets)
  postgres/init-scripts/01-init-schema.sql
  engine/src/routes/session.routes.js
  ENGINE_HEALTH_RESOLUTION.md (full documentation)
  QUICKSTART_HEALTH.md (this file)

Modified:
  engine/src/server.js (added sessions route)
```

## Security Notes

⚠️ The `.env` file contains sensitive secrets  
⚠️ Never commit `.env` to version control  
⚠️ Backup your `.env` file securely  
⚠️ Session data is encrypted before storage  

## Need Help?

See `ENGINE_HEALTH_RESOLUTION.md` for complete documentation.
