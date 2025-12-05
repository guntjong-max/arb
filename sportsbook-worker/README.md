# Sportsbook Worker

Browser automation worker for scraping sportsbook odds using Puppeteer.

## Environment Variables

```bash
WORKER_NAME=worker-bet365-1
SPORTSBOOK_NAME=Bet365
SCRAPE_INTERVAL=15000
HEADLESS=true
DATABASE_URL=postgresql://arbitrage_user:password@postgres:5432/arbitrage_bot
REDIS_URL=redis://:password@redis:6379
SESSION_ENCRYPTION_KEY=your-encryption-key
LOG_LEVEL=info
```

## Features

- ✅ Login automation with session management
- ✅ Automatic re-login on session expiration
- ✅ Odds scraping with configurable intervals
- ✅ Change detection with Redis caching
- ✅ Database storage (PostgreSQL)
- ✅ Historical odds tracking
- ✅ Error handling and retry logic
- ✅ Worker status monitoring

## Usage

```bash
# Install dependencies
npm install

# Start worker
npm start

# Development mode
npm run dev
```

## Architecture

The worker operates in a continuous loop:

1. **Login** - Authenticates to sportsbook using stored credentials
2. **Scrape** - Navigates to odds page and extracts market data
3. **Verify** - Compares with cached odds in Redis
4. **Update** - Saves to PostgreSQL if changed
5. **History** - Records odds changes
6. **Repeat** - Waits for interval then loops

## Custom Scrapers

To add a new sportsbook, create a scraper in `src/scrapers/`:

```javascript
// src/scrapers/bet365.js
module.exports = {
  async login(page, username, password) {
    // Custom login logic
  },
  
  async extractOdds(page) {
    // Custom scraping logic
    return oddsData;
  }
};
```
