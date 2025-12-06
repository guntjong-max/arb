# Deployment Checklist - Engine Health Fix

## Pre-Deployment Verification

### ✅ Files Created (Completed)
- [x] `.env` - Environment configuration with generated secrets (permissions: 600)
- [x] `postgres/init-scripts/01-init-schema.sql` - Complete database schema
- [x] `engine/src/routes/session.routes.js` - Sportsbook sessions API
- [x] `ENGINE_HEALTH_RESOLUTION.md` - Full documentation
- [x] `QUICKSTART_HEALTH.md` - Quick reference guide
- [x] `DEPLOYMENT_CHECKLIST.md` - This checklist

### ✅ Files Modified (Completed)
- [x] `engine/src/server.js` - Added sessions route and API docs

### ✅ Configuration Verified (Completed)
- [x] All required environment variables present in `.env`
- [x] Secure secrets generated using openssl
- [x] Database connection string properly formatted
- [x] Redis connection string properly formatted
- [x] File permissions set to 600 for `.env`

## Deployment Steps (Execute When Docker is Available)

### Step 1: Stop Existing Services
```bash
cd /data/workspace/arb
docker compose down
```
**Expected**: All containers stop gracefully

### Step 2: Rebuild Services
```bash
docker compose up -d --build
```
**Expected**: 
- Images rebuild successfully
- All 6 services start
- No error messages in output

### Step 3: Wait for Initialization
```bash
sleep 60
```
**Why**: Database initialization and service startup takes 30-60 seconds

### Step 4: Check Container Status
```bash
docker compose ps
```
**Expected Output**:
```
NAME              STATUS
arb-engine        Up (healthy)
arb-postgres      Up (healthy)
arb-redis         Up (healthy)
arb-prometheus    Up (healthy)
arb-grafana       Up
arb-pgadmin       Up
```

### Step 5: Verify Engine Health
```bash
curl http://localhost:3000/health
```
**Expected Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-12-06T...",
  "uptime": 15.234,
  "environment": "development",
  "paperTradingMode": true
}
```

### Step 6: Check Detailed Health
```bash
curl http://localhost:3000/health/detailed
```
**Expected Response** (200 OK):
```json
{
  "status": "healthy",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": "N/A",
      "timestamp": "2025-12-06T..."
    },
    "redis": {
      "status": "healthy",
      "responseTime": "5ms"
    }
  }
}
```

### Step 7: Verify API Documentation
```bash
curl http://localhost:3000/api/docs
```
**Expected**: JSON response including sessions endpoints

### Step 8: Verify Database Schema
```bash
docker compose exec postgres psql -U arbitrage_user -d arbitrage_bot -c "\dt"
```
**Expected Tables**:
- audit_logs
- jobs
- sportsbook_sessions
- user_consents
- workers

### Step 9: Test Sessions Endpoint

#### 9a. Get Test Data
```bash
docker compose exec postgres psql -U arbitrage_user -d arbitrage_bot -c \
  "SELECT id, user_id FROM user_consents LIMIT 1;"
```

#### 9b. Create Session
```bash
# Use IDs from 9a
curl -X POST http://localhost:3000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "<user_id>",
    "sportsbook": "test_sportsbook",
    "session_data": "test_encrypted_session",
    "consent_id": "<consent_id>",
    "expires_at": "2025-12-31T23:59:59Z"
  }'
```
**Expected**: 201 Created with session details

#### 9c. List Sessions
```bash
curl http://localhost:3000/api/v1/sessions
```
**Expected**: 200 OK with array of sessions

### Step 10: Check Logs for Errors
```bash
docker compose logs engine | grep -i error
docker compose logs postgres | grep -i error
docker compose logs redis | grep -i error
```
**Expected**: No critical errors

## Success Criteria

All items must be ✅ to consider deployment successful:

- [ ] Engine container status: healthy
- [ ] PostgreSQL container status: healthy
- [ ] Redis container status: healthy
- [ ] Health endpoint returns 200 OK
- [ ] Detailed health shows all services healthy
- [ ] Database tables created successfully
- [ ] Sessions endpoint accessible
- [ ] Can create session via API
- [ ] Audit logs being created
- [ ] No critical errors in logs

## Rollback Plan (If Needed)

If deployment fails:

```bash
# Stop new deployment
docker compose down

# Restore previous .env if needed
cp .env.backup .env

# Remove new files
rm -rf postgres/init-scripts/

# Restore previous server.js
git checkout engine/src/server.js

# Restart with old configuration
docker compose up -d
```

## Post-Deployment Verification

### Monitor for 5 Minutes
```bash
docker compose logs -f engine
```
**Watch for**:
- Repeated connection errors
- Memory leaks
- Crashes or restarts
- Error patterns

### Test All Endpoints
- [ ] GET /health
- [ ] GET /health/detailed
- [ ] GET /api/docs
- [ ] POST /api/v1/sessions
- [ ] GET /api/v1/sessions
- [ ] GET /api/v1/sessions/:id
- [ ] PATCH /api/v1/sessions/:id
- [ ] DELETE /api/v1/sessions/:id

### Database Verification
```bash
# Check session was created
docker compose exec postgres psql -U arbitrage_user -d arbitrage_bot -c \
  "SELECT COUNT(*) FROM sportsbook_sessions;"

# Check audit logs
docker compose exec postgres psql -U arbitrage_user -d arbitrage_bot -c \
  "SELECT event_type, action FROM audit_logs ORDER BY created_at DESC LIMIT 5;"
```

## Troubleshooting

### Engine Shows "starting" but Not "healthy"

1. **Check logs**:
   ```bash
   docker compose logs engine --tail=100
   ```

2. **Common issues**:
   - Database connection failure → Check DB_PASSWORD in .env
   - Redis connection failure → Check REDIS_PASSWORD in .env
   - Missing environment variables → Compare .env with .env.example
   - Port conflicts → Check if port 3000 is already in use

3. **Restart engine only**:
   ```bash
   docker compose restart engine
   ```

### Database Connection Errors

```bash
# Test database directly
docker compose exec postgres psql -U arbitrage_user -d arbitrage_bot -c "SELECT NOW();"

# Check database logs
docker compose logs postgres --tail=50
```

### Redis Connection Errors

```bash
# Test Redis directly
docker compose exec redis redis-cli -a redis_dev_password_2024 PING

# Check Redis logs
docker compose logs redis --tail=50
```

### Sessions Endpoint Not Working

1. **Verify route is loaded**:
   ```bash
   docker compose logs engine | grep session
   ```

2. **Check for syntax errors**:
   ```bash
   docker compose exec engine node -c "require('./src/routes/session.routes.js')"
   ```

3. **Verify database table exists**:
   ```bash
   docker compose exec postgres psql -U arbitrage_user -d arbitrage_bot -c "\d sportsbook_sessions"
   ```

## Security Checklist

- [x] `.env` file permissions set to 600
- [ ] Secrets are different from example values
- [ ] Database password is strong (20+ characters)
- [ ] Redis password is strong (20+ characters)
- [ ] JWT_SECRET is cryptographically random
- [ ] SESSION_SECRET is cryptographically random
- [ ] `.env` is in .gitignore
- [ ] `.env` is backed up securely

## Documentation

All documentation is available:
- `ENGINE_HEALTH_RESOLUTION.md` - Complete resolution details
- `QUICKSTART_HEALTH.md` - Quick start commands
- `DEPLOYMENT_CHECKLIST.md` - This checklist
- `README.md` - Project overview
- `QUICKSTART.md` - Original quickstart guide

## Support Contacts

If issues persist:
1. Review all documentation
2. Check all logs thoroughly
3. Verify all environment variables
4. Test each service independently
5. Consider fresh deployment

## Notes

- Docker is not currently available in the development environment
- All fixes have been prepared and validated for syntax
- Testing must be performed once Docker is available
- All secrets have been generated using cryptographically secure methods

## Sign-off

Deployment completed by: [Name]  
Date: [Date]  
Docker environment: [Available/Not Available]  
All tests passed: [Yes/No]  
Ready for production: [Yes/No]
