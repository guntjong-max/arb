# Sportsbook Scraping System - Implementation Guide

## 🎯 Phase 1 Deliverables - COMPLETE

This system implements a complete sports betting odds scraping platform with:

### ✅ 1. WORKER (Browser Automation - Puppeteer)

**Location:** `/sportsbook-worker/`

The Node.js worker provides:
- ✅ **LOGIN ENGINE**: Reads credentials from PostgreSQL, launches Chromium headless, navigates to login page, fills and submits form, maintains session
- ✅ **DATA SCRAPING**: Navigates to odds page, waits for dynamic content, parses matches/markets/odds, formats to JSON
- ✅ **VERIFY CHANGE**: Compares odds with Redis cache, updates PostgreSQL on changes, logs to odds_history
- ✅ **LOOPING & STABILITY**: Configurable interval (10-20s), auto-relogin on session expiry, auto-retry on failures, crash recovery, 24/7 operation

**Tech Stack:**
- Node.js 20
- Puppeteer (Chromium automation)
- PostgreSQL (storage)
- Redis (caching)
- Winston (logging)

**Key Files:**
- `src/worker.js` - Main worker class with browser automation
- `src/config/database.js` - Database operations
- `src/config/redis.js` - Redis caching
- `src/index.js` - Entry point

### ✅ 2. DATABASE STRUCTURE

**Location:** `/postgres/init-scripts/`

All required tables implemented:

#### **credentials**
```sql
- id (UUID)
- sportsbook_name (VARCHAR)
- username (VARCHAR)
- encrypted_password (TEXT)
- active (BOOLEAN)
- login_url (TEXT)
- last_login_at (TIMESTAMP)
```

#### **matches**
```sql
- id (UUID)
- sportsbook_name (VARCHAR)
- external_match_id (VARCHAR)
- league (VARCHAR)
- home_team (VARCHAR)
- away_team (VARCHAR)
- match_date (TIMESTAMP)
- status (VARCHAR)
```

#### **markets**
```sql
- id (UUID)
- match_id (UUID FK)
- market_type (VARCHAR) -- 1X2, O/U, Handicap
- market_name (VARCHAR)
- market_params (JSONB)
- status (VARCHAR)
```

#### **odds**
```sql
- id (UUID)
- market_id (UUID FK)
- selection (VARCHAR) -- home, draw, away, over, under
- odds_decimal (DECIMAL)
- odds_fractional (VARCHAR)
- odds_american (VARCHAR)
- available (BOOLEAN)
- last_updated (TIMESTAMP)
```

#### **odds_history**
```sql
- id (UUID)
- market_id (UUID FK)
- selection (VARCHAR)
- odds_decimal (DECIMAL)
- change_type (VARCHAR) -- increase, decrease, new
- previous_odds (DECIMAL)
- changed_at (TIMESTAMP)
```

#### **workers**
```sql
- id (UUID)
- worker_name (VARCHAR)
- sportsbook_name (VARCHAR)
- status (VARCHAR) -- running, stopped, error
- last_heartbeat (TIMESTAMP)
- last_scrape_at (TIMESTAMP)
- scrape_interval_seconds (INTEGER)
- total_scrapes (INTEGER)
- total_errors (INTEGER)
- session_active (BOOLEAN)
- config (JSONB)
```

#### **logs**
```sql
- id (UUID)
- worker_id (UUID FK)
- level (VARCHAR) -- info, warning, error
- message (TEXT)
- details (JSONB)
- created_at (TIMESTAMP)
```

### ✅ 3. API BACKEND (Express)

**Location:** `/engine/src/routes/`

All endpoints implemented:

#### **GET /api/v1/odds/latest**
Returns latest odds from database with filters:
- Query params: `sportsbook`, `league`, `limit`
- Joins match + market + odds data
- Response: JSON array of odds

#### **GET /api/v1/matches**
Returns matches with markets and odds:
- Query params: `sportsbook`, `league`, `status`, `limit`
- Nested JSON with markets and odds arrays
- Response: Complete match data

#### **GET /api/v1/credentials**
Returns all credentials (passwords excluded):
- Query params: `sportsbook`, `active`
- Response: Credential list without passwords

#### **POST /api/v1/credentials**
Add new sportsbook account:
- Body: `sportsbook_name`, `username`, `password`, `login_url`, `notes`
- Encrypts password with AES
- Response: Created credential

#### **GET /api/v1/workers/status**
Returns all worker statuses with statistics:
- Uses `v_worker_stats` view
- Includes health status, error rates
- Response: Worker statistics

#### **POST /api/v1/workers/:id/control**
Control worker (start/stop/restart):
- Body: `action` (start, stop, restart, pause)
- Updates worker status in database
- Logs action to logs table

#### **GET /api/v1/logs**
Returns system and worker logs:
- Query params: `level`, `worker_id`, `limit`, `offset`
- Pagination support
- Response: Log entries

### ✅ 4. WEB UI (Admin Dashboard)

**Location:** `/ui/`

Complete single-page application with:

#### **Pages:**
1. **Dashboard** - Overview with stats cards, worker summary
2. **Workers Management** - List workers, control (start/stop), view stats
3. **Live Odds Monitor** - Real-time odds table, filter by sportsbook/league, highlight changes
4. **Credentials Management** - Add/edit/delete credentials, view status
5. **Logs Viewer** - Filter by level, real-time log streaming

**Features:**
- Clean, modern UI with responsive design
- Auto-refresh every 30 seconds
- Modal dialogs for adding credentials
- Status badges (running/stopped/error)
- Tabular data display
- Filter and search functionality

**Tech Stack:**
- Vanilla JavaScript (no frameworks)
- HTML5 + CSS3
- Express static file server
- RESTful API consumption

### ✅ 5. DOCKER DEPLOYMENT

**Location:** `/docker-compose.yml`

Complete Docker setup with 8 services:

1. **postgres** - PostgreSQL 15 database
2. **redis** - Redis 7 cache/queue
3. **engine** - Node.js API server
4. **sportsbook-worker** - Browser automation worker
5. **sportsbook-ui** - Admin dashboard
6. **prometheus** - Metrics collection
7. **grafana** - Monitoring dashboards
8. **pgadmin** - Database management

**Network:** Isolated bridge network (`arb-network`)
**Volumes:** Persistent data for postgres, redis, grafana
**Health Checks:** All critical services

### ✅ 6. DELIVERABLES VERIFICATION

✓ **Worker can login** - Generic login implementation with customizable selectors
✓ **Worker can scrape odds** - Extracts matches, markets, odds to structured JSON
✓ **Data enters PostgreSQL** - Full CRUD operations with upsert logic
✓ **UI displays results** - Live dashboard showing all scraped data

## 🚀 Quick Start

### Prerequisites
```bash
# Ensure Docker and Docker Compose are installed
docker --version
docker-compose --version
```

### Setup & Run

1. **Clone and Configure**
```bash
cd /data/workspace/arb
cp .env.example .env
# Edit .env with your passwords
```

2. **Build and Start**
```bash
# Build all services
docker-compose build

# Start infrastructure
docker-compose up -d postgres redis

# Wait for health checks (30 seconds)
sleep 30

# Start all services
docker-compose up -d
```

3. **Verify Services**
```bash
# Check all containers
docker-compose ps

# View logs
docker-compose logs -f engine
docker-compose logs -f sportsbook-worker
docker-compose logs -f sportsbook-ui
```

4. **Access Interfaces**
- **Dashboard UI:** http://localhost:8080
- **API:** http://localhost:3000
- **API Docs:** http://localhost:3000/api/docs
- **PgAdmin:** http://localhost:5050
- **Grafana:** http://localhost:3030

### Add Sportsbook Credentials

#### Via UI:
1. Navigate to http://localhost:8080
2. Click "Credentials" in sidebar
3. Click "+ Add Credential"
4. Fill in sportsbook details
5. Submit

#### Via API:
```bash
curl -X POST http://localhost:3000/api/v1/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "sportsbook_name": "Bet365",
    "username": "your_username",
    "password": "your_password",
    "login_url": "https://www.bet365.com",
    "notes": "Production account"
  }'
```

### Register Worker

Workers are pre-configured in seed data. To add more:

```bash
curl -X POST http://localhost:3000/api/v1/workers/register \
  -H "Content-Type: application/json" \
  -d '{
    "worker_name": "worker-pinnacle-1",
    "sportsbook_name": "Pinnacle",
    "scrape_interval_seconds": 10
  }'
```

### Control Worker

```bash
# Start worker
curl -X POST http://localhost:3000/api/v1/workers/{id}/control \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'

# Stop worker
curl -X POST http://localhost:3000/api/v1/workers/{id}/control \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'
```

## 📊 Monitoring

### Database Access
```bash
# Connect to PostgreSQL
docker exec -it arb-postgres psql -U arbitrage_user -d arbitrage_bot

# View matches
SELECT * FROM matches;

# View latest odds
SELECT * FROM v_latest_odds LIMIT 10;

# View worker stats
SELECT * FROM v_worker_stats;
```

### Redis Cache
```bash
# Connect to Redis
docker exec -it arb-redis redis-cli -a ${REDIS_PASSWORD}

# View cached odds
KEYS odds:*

# Get specific odds
GET odds:{market_id}:{selection}
```

## 🔧 Customization

### Add Custom Sportsbook Scraper

Create a new scraper in `/sportsbook-worker/src/scrapers/`:

```javascript
// src/scrapers/bet365.js
module.exports = {
  async login(page, username, password) {
    // Custom login logic for Bet365
    await page.goto('https://www.bet365.com');
    await page.type('#username', username);
    await page.type('#password', password);
    await page.click('.login-button');
    await page.waitForNavigation();
    return true;
  },
  
  async extractOdds(page) {
    // Custom scraping logic
    await page.goto('https://www.bet365.com/odds');
    
    const odds = await page.evaluate(() => {
      // Extract odds from page
      const matches = [];
      // ... scraping code ...
      return matches;
    });
    
    return odds;
  }
};
```

Then update worker to use custom scraper:

```javascript
// In worker.js
const bet365Scraper = require('./scrapers/bet365');

async function performLogin(username, password) {
  return await bet365Scraper.login(this.page, username, password);
}

async function extractOdds() {
  return await bet365Scraper.extractOdds(this.page);
}
```

## 🐛 Troubleshooting

### Worker Not Starting
```bash
# Check worker logs
docker-compose logs sportsbook-worker

# Check database connection
docker exec -it arb-postgres psql -U arbitrage_user -d arbitrage_bot -c "SELECT * FROM workers;"

# Restart worker
docker-compose restart sportsbook-worker
```

### No Odds Data
```bash
# Check if credentials exist
curl http://localhost:3000/api/v1/credentials

# Check worker status
curl http://localhost:3000/api/v1/workers/status

# Manually trigger scrape (if implemented)
docker-compose exec sportsbook-worker node src/index.js
```

### Database Issues
```bash
# Recreate database
docker-compose down -v
docker-compose up -d postgres
sleep 30
docker-compose up -d
```

## 📝 Architecture

```
┌─────────────────┐
│  Admin Dashboard │ :8080
│  (React/HTML)   │
└────────┬────────┘
         │
┌────────▼────────┐     ┌──────────┐     ┌───────────┐
│   Engine API    │────▶│  Redis   │     │PostgreSQL │
│   (Node.js)     │     │  Cache   │     │    DB     │
└────────┬────────┘     └──────────┘     └─────▲─────┘
         │                                      │
┌────────▼────────┐                            │
│ Sportsbook      │────────────────────────────┘
│   Worker        │  (Scrapes & Stores)
│ (Puppeteer)     │
└─────────────────┘
```

## 🎓 Next Steps

### Phase 2 - Production Ready
- [ ] Add authentication to dashboard
- [ ] Implement WebSocket for real-time updates
- [ ] Add rate limiting to API
- [ ] Implement job queue with BullMQ
- [ ] Add comprehensive error handling
- [ ] Create unit tests

### Phase 3 - Advanced Features
- [ ] Multi-worker support
- [ ] Arbitrage detection
- [ ] Bet placement automation
- [ ] Historical data analysis
- [ ] Performance optimization

## ⚠️ Important Notes

1. **Legal Compliance**: This is for educational purposes. Ensure compliance with local gambling laws.
2. **Terms of Service**: Scraping may violate sportsbook ToS. Use at your own risk.
3. **Security**: Change default passwords in `.env` file.
4. **Resource Usage**: Puppeteer is resource-intensive. Monitor CPU/memory.
5. **Session Management**: Sessions expire. Worker handles re-login automatically.

## 📚 Documentation

- API Documentation: http://localhost:3000/api/docs
- Database Schema: `/postgres/init-scripts/01_init_schema.sql`
- Worker README: `/sportsbook-worker/README.md`
- Engine README: `/engine/README.md`

## 🤝 Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Review documentation
3. Check database state
4. Restart services

---

**Status**: Phase 1 Complete ✅
**Last Updated**: 2024-12-05
