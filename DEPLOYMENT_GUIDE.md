# Arbitrage Bot System - Full Deployment Guide

## 🎯 System Overview

Sistem Arbitrage Bot lengkap dengan:
- **Backend Engine**: Node.js dengan API endpoints dan WebSocket real-time
- **Frontend Dashboard**: React dengan Tailwind CSS dark mode UI
- **Database**: PostgreSQL untuk data persistence
- **Cache/Queue**: Redis untuk session dan job queue
- **Logic Engine**: Arbitrage detection, odds conversion, bet rounding, safety filters

## 📋 Prerequisites

- Docker & Docker Compose
- Node.js 18+ (untuk development)
- 4GB+ RAM
- 50GB+ storage

## 🚀 Quick Start

### 1. Clone & Setup Environment

```bash
cd /data/workspace/arb

# Create .env file
cat > .env << 'EOF'
NODE_ENV=development
PORT=3000

# Database
DB_PASSWORD=your_strong_password_here
POSTGRES_DB=arbitrage_bot
POSTGRES_USER=arbitrage_user

# Redis
REDIS_PASSWORD=your_redis_password_here

# Secrets (generate dengan: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# Admin
PGADMIN_EMAIL=admin@arbitrage.local
PGADMIN_PASSWORD=admin_password_here
GRAFANA_USER=admin
GRAFANA_PASSWORD=grafana_password_here

# Trading
PAPER_TRADING_MODE=true
ENABLE_DEBUG_LOGS=true
EOF
```

### 2. Initialize Database

Database schema akan otomatis diinisialisasi saat container pertama kali dijalankan.

### 3. Start Backend Services

```bash
# Start all services (Engine, PostgreSQL, Redis, Monitoring)
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f engine
```

### 4. Setup & Start Frontend

```bash
cd frontend

# Install dependencies (if npm/node available)
npm install

# Or use Docker for frontend
docker run -it --rm \
  -v $(pwd):/app \
  -w /app \
  -p 5173:5173 \
  node:18 bash -c "npm install && npm run dev -- --host"
```

## 📊 Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend Dashboard** | http://localhost:5173 | N/A |
| **Backend API** | http://localhost:3000 | N/A |
| **API Documentation** | http://localhost:3000/api/docs | N/A |
| **WebSocket** | ws://localhost:3000/ws | N/A |
| **Prometheus** | http://localhost:9090 | N/A |
| **Grafana** | http://localhost:3030 | admin / (from .env) |
| **PgAdmin** | http://localhost:5050 | (from .env) |

## 🎨 Frontend Features

### 1. System Health Status Bar
Real-time indicators untuk:
- 🟢 ENGINE API (API server status)
- 🟢 DATABASE (PostgreSQL connection)
- 🟢 REDIS (Cache/Queue status)
- 🟢 WORKER/BROWSER (Worker bot status)

### 2. Account Panel
- Add sportsbook accounts (Nova88, QQ188, SBOBET, Maxbet)
- View account status (Online/Offline)
- Real-time balance updates
- Account management (CRUD operations)

### 3. Configuration Panel
- **Tier Management**: Max bet untuk Tier 1/2/3 leagues
- **Profit Settings**: Min/Max profit percentage (3%-10%)
- **Time Filter**: Max minute HT/FT untuk live betting
- **Match Filter**: Prematch/Live/All
- **Market Filter**: FT/HT HDP, O/U, 1X2

### 4. Monitoring Center
- **Live Scanner Table**: Peluang arbitrage yang terdeteksi real-time
- **Execution History**: Riwayat bet dengan status (ACCEPTED/RUNNING/REJECTED)
- **Activity Logs**: Log sistem real-time
- **Profit Widget**: Summary profit harian

### 5. Master Controls
- **Auto Trading Toggle**: Enable/Disable auto trading
- **Emergency Stop**: Panic button untuk stop semua aktivitas

## ⚙️ Backend Features

### API Endpoints

#### Accounts Management
```bash
# List all accounts
GET /api/v1/accounts

# Create account
POST /api/v1/accounts
{
  "sportsbook": "nova88",
  "url": "https://...",
  "username": "user",
  "password": "pass"
}

# Update balance
POST /api/v1/accounts/:id/update-balance
{ "balance": 10000000 }
```

#### Configuration
```bash
# Get config
GET /api/v1/config

# Update config
PUT /api/v1/config
{
  "max_bet_tier1": 5000000,
  "min_profit_pct": 3.00,
  "enabled_markets": ["ft_hdp", "ft_ou"]
}

# Emergency stop
POST /api/v1/config/emergency-stop
{ "enabled": true }
```

#### Scanner & Opportunities
```bash
# Get live feed
GET /api/v1/scanner/live-feed

# Get opportunities
GET /api/v1/scanner/opportunities?status=detected

# Get stats
GET /api/v1/scanner/stats
```

#### History & Logs
```bash
# Get bet history
GET /api/v1/history/bets?limit=50

# Get profit summary
GET /api/v1/history/profit-summary?period=today

# Get logs
GET /api/v1/history/logs?category=betting&limit=500
```

### Arbitrage Logic Engine

#### 1. Odds Conversion
Semua format odds dikonversi ke Decimal (Euro):
- Indonesian odds: -1.25, 0.85
- Malay odds: -0.80, 0.75
- Hong Kong odds: 0.85
- American odds: -150, +200

```javascript
// Example usage
const OddsService = require('./services/odds.service');

// Convert Indonesian to Decimal
const decimalOdds = OddsService.indonesianToDecimal(-1.25);
// Result: 1.80

// Calculate arbitrage profit
const profit = OddsService.calculateArbitrageProfit(2.05, 2.10);
// Result: 3.5 (3.5% profit)
```

#### 2. Bet Rounding
Nominal bet dibulatkan ke 0 atau 5:
- 152 → 150
- 153 → 155
- 158 → 160

```javascript
const roundedStake = OddsService.roundStake(153);
// Result: 155
```

#### 3. Safety Filters
- **Profit Range**: Ignore jika profit > max_profit_pct (anti-trap)
- **Time Filter**: Ignore jika menit > max_minute (anti-ghost bet)
- **Tier Priority**: Prioritas Tier 1 > Tier 2 > Tier 3

#### 4. Sure-Bet Execution Flow

**JANGAN TEMBAK BERSAMAAN!**

```javascript
// Step 1: Place VALUE BET first
const valueBet = await placeBet(legA);

// Step 2: Wait for confirmation (ACCEPTED/RUNNING)
const status = await waitForBetStatus(valueBet.id);

// Step 3: Only if Step 1 confirmed, place HEDGE BET
if (status === 'accepted' || status === 'running') {
  const hedgeBet = await placeBet(legB);
}

// If Step 1 REJECTED → Cancel Step 2
```

## 🔄 WebSocket Real-Time Updates

Frontend terhubung ke WebSocket untuk update real-time:

```javascript
// Auto-connect dan subscribe
const { systemHealth, opportunities, bets, logs } = useWebSocket();

// Available channels:
// - system_health: Status API, DB, Redis, Workers
// - opportunities: New arbitrage opportunities detected
// - bets: Bet status updates
// - logs: Activity logs
// - balances: Account balance updates
// - scanner_stats: Scanner statistics
```

## 🛠️ Development

### Backend Development

```bash
cd engine
npm install
npm run dev  # Hot reload dengan nodemon
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev  # Vite dev server dengan HMR
```

### Database Management

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U arbitrage_user -d arbitrage_bot

# Run migrations
docker compose exec postgres psql -U arbitrage_user -d arbitrage_bot \
  -f /docker-entrypoint-initdb.d/01-init-schema.sql

# View tables
docker compose exec postgres psql -U arbitrage_user -d arbitrage_bot \
  -c "\dt"
```

## 📝 Usage Flow

### 1. Setup Accounts
1. Buka Frontend Dashboard
2. Pilih tab "Account Panel"
3. Klik "Add Account"
4. Input sportsbook credentials
5. Save

### 2. Configure Settings
1. Pilih tab "Configuration"
2. Set tier max bets
3. Set profit range (3%-10%)
4. Set time filters
5. Select markets
6. Save Configuration

### 3. Start Trading
1. Toggle "Auto Trading ON" di header
2. Monitor di "Monitoring Center" tab
3. Lihat opportunities di Live Scanner Table
4. Track execution di Execution History
5. Monitor logs di Activity Logs window

### 4. Emergency Stop
Jika ada masalah:
1. Klik "EMERGENCY STOP" button
2. Semua trading dihentikan
3. Browser workers di-close
4. Queue dikosongkan

## 🔒 Security Notes

**PENTING:**
1. Password sportsbook disimpan dalam format BASE64 (TEMPORARY)
   - **Production**: Harus gunakan AES encryption
   - Update di `accounts.routes.js` sebelum deploy production

2. Change default admin password di database:
   ```sql
   UPDATE users SET password_hash = '$2a$10$NewHashedPassword' 
   WHERE username = 'admin';
   ```

3. Gunakan strong passwords untuk semua services
4. Enable HTTPS/SSL di production
5. Restrict port access (firewall)

## 📈 Monitoring

### Prometheus Metrics
- `job_submitted_total`: Total jobs submitted
- `job_completed_total`: Total jobs completed
- `worker_active_count`: Active workers
- `http_requests_total`: HTTP requests
- `bet_placed_total`: Total bets placed
- `arbitrage_profit_total`: Total profit

### Grafana Dashboards
1. System Overview
2. Arbitrage Performance
3. Worker Health
4. API Performance

## 🐛 Troubleshooting

### Frontend tidak connect ke Backend
```bash
# Check backend status
curl http://localhost:3000/health

# Check WebSocket
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://localhost:3000/ws
```

### Database connection error
```bash
# Check PostgreSQL logs
docker compose logs postgres

# Test connection
docker compose exec postgres psql -U arbitrage_user -d arbitrage_bot -c "SELECT 1"
```

### Redis connection error
```bash
# Check Redis logs
docker compose logs redis

# Test connection
docker compose exec redis redis-cli -a ${REDIS_PASSWORD} ping
```

## 📚 Project Structure

```
arb/
├── engine/                      # Backend Node.js
│   ├── src/
│   │   ├── services/
│   │   │   ├── odds.service.js        # Odds conversion & calculations
│   │   │   ├── arbitrage.service.js   # Sure-bet execution logic
│   │   │   └── websocket.service.js   # WebSocket real-time
│   │   ├── routes/
│   │   │   ├── accounts.routes.js     # Account management API
│   │   │   ├── config.routes.js       # Configuration API
│   │   │   ├── scanner.routes.js      # Scanner & opportunities API
│   │   │   └── history.routes.js      # History & logs API
│   │   ├── index.js
│   │   └── server.js
│   └── package.json
├── frontend/                    # React Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   └── SystemHealthBar.jsx
│   │   ├── pages/
│   │   │   ├── AccountPanel.jsx
│   │   │   ├── ConfigPanel.jsx
│   │   │   └── MonitoringCenter.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── hooks/
│   │   │   └── useWebSocket.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── postgres/
│   └── init-scripts/
│       └── 01-init-schema.sql   # Database schema
├── docker-compose.yml
└── .env
```

## ⚠️ Legal Disclaimer

**PENTING:** Sistem ini untuk **EDUCATIONAL PURPOSES ONLY**.

Gambling and sports betting are **ILLEGAL in Indonesia**. 
Use only in jurisdictions where sports betting is legal.

---

**Built with ❤️ for educational purposes**

Version: 1.0.0  
Last Updated: December 2024
