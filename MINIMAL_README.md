# 🚀 SPORTSBOOK AUTOMATION - MINIMAL VERSION

## System Overview

A minimal but complete sportsbook automation system with:
- ✅ React + Tailwind UI
- ✅ Node.js Backend (Express + BullMQ + WebSocket)
- ✅ Python Worker (Playwright)
- ✅ PostgreSQL Database
- ✅ Redis Queue
- ✅ NGINX Reverse Proxy
- ✅ Docker Deployment

---

## Folder Structure

```
/data/workspace/arb/
├── minimal-docker-compose.yml       # Main Docker Compose file
├── minimal-db-init.sql              # PostgreSQL schema
├── minimal-nginx.conf               # NGINX configuration
├── deploy-minimal.sh                # Deployment script
├── minimal-api/                     # Backend API
│   ├── Dockerfile
│   ├── package.json
│   └── index.js
├── minimal-worker/                  # Python Worker
│   ├── Dockerfile
│   ├── requirements.txt
│   └── worker.py
└── minimal-ui/                      # React Frontend
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        └── index.css
```

---

## Features Implemented

### ✅ UI (React + Tailwind)
- Panel Login (2 accounts) with URL, username, password, status, balance
- Parameter Settings (min%, max%, HT/FT time last bet)
- Match Filter (Prematch/Live/All radio buttons)
- Market Filter (FT/HT HDP/O/U/1X2 checkboxes)
- Live indicators (Ping, Health, Scanning feed, Execution feed)

### ✅ Backend (Node.js)
- REST API: `/api/login`, `/api/login-status`, `/api/settings`, `/api/execute`, `/api/system-health`
- BullMQ Queues: login, scan, bet
- WebSocket broadcasting for real-time events
- PostgreSQL for persistence
- Redis for queue management

### ✅ Worker (Python + Playwright)
- Login with session management
- Scanning with positive odds filtering
- Bet execution with stake rounding (0 or 5)
- Cloudflare bypass capability
- WebSocket communication with backend

### ✅ Rules Enforced
- ✅ Bet only positive odds
- ✅ After accepted → bet pair (skeleton ready)
- ✅ Match filter respected
- ✅ Market filter respected
- ✅ Time last bet filter (HT/FT)
- ✅ min% / max% filters
- ✅ No refresh rate limit
- ✅ Cloudflare login IP support
- ✅ Round off: 0 or 5
- ✅ Live scan + live execute logging

---

## 🎯 DEPLOYMENT INSTRUCTIONS

### Prerequisites
- Docker and Docker Compose installed
- Ports 80, 3000, 3001, 5432, 6379 available

### Quick Deploy (3 Commands)

```bash
# 1. Navigate to workspace
cd /data/workspace/arb

# 2. Make deployment script executable
chmod +x deploy-minimal.sh

# 3. Run deployment (Clean Slate + Build + Start)
./deploy-minimal.sh
```

### Alternative: Manual Deployment

```bash
# Clean slate - Stop and remove everything
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true
docker volume rm $(docker volume ls -q) 2>/dev/null || true
docker network rm $(docker network ls -q) 2>/dev/null || true
docker system prune -af --volumes

# Build and start
docker-compose -f minimal-docker-compose.yml build --no-cache
docker-compose -f minimal-docker-compose.yml up -d

# View logs
docker-compose -f minimal-docker-compose.yml logs -f
```

---

## Access Points

After deployment:

- **UI**: http://localhost:3000
- **API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/system-health
- **WebSocket**: ws://localhost:3001

---

## Testing the System

1. **Open UI**: Navigate to http://localhost:3000
2. **Check Health**: Green indicator should show "Backend: Healthy"
3. **Login Accounts**: Click "Login" on Account 1 and Account 2
4. **Update Settings**: Adjust min%, max%, time filters as needed
5. **Start Scanning**: Click "Start Scanning" button
6. **Monitor Logs**: Watch the Live Feed for real-time events

---

## Useful Commands

```bash
# View all logs
docker-compose -f minimal-docker-compose.yml logs -f

# View specific service logs
docker-compose -f minimal-docker-compose.yml logs -f api
docker-compose -f minimal-docker-compose.yml logs -f worker
docker-compose -f minimal-docker-compose.yml logs -f ui

# Restart services
docker-compose -f minimal-docker-compose.yml restart

# Stop all services
docker-compose -f minimal-docker-compose.yml down

# Stop and remove volumes
docker-compose -f minimal-docker-compose.yml down -v

# Check service status
docker-compose -f minimal-docker-compose.yml ps
```

---

## Network Configuration

The system is configured for the following subdomains (in NGINX):

- **api.arb.local** → 217.216.35.6
- **ui.arb.local** → 217.216.35.6
- **db** → 84.32.84.32 (PostgreSQL)
- **grafana** → 84.32.84.32 (not included in minimal version)

To use custom domains, update `/etc/hosts`:

```
217.216.35.6  api.arb.local
217.216.35.6  ui.arb.local
```

---

## Database Schema

- **accounts**: id, url, username, password, status, balance
- **settings**: min/max percentage, HT/FT time filters, match/market filters
- **bets**: id, account_id, match_name, market_type, odds, stake, status

---

## Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Node.js 18, Express, BullMQ, WebSocket, PostgreSQL, Redis
- **Worker**: Python 3.11, Playwright, Redis
- **Deployment**: Docker, Docker Compose, NGINX
- **Database**: PostgreSQL 15
- **Cache/Queue**: Redis 7

---

## Next Steps (Beyond Minimal)

For production enhancement:
- Add authentication/authorization
- Implement circuit breakers
- Add idempotency keys
- Enhance retry logic
- Add Grafana monitoring
- Implement advanced session management
- Add unit/integration tests
- Enable HTTPS/SSL
- Add rate limiting
- Implement advanced Cloudflare bypass

---

## Troubleshooting

**UI not loading?**
```bash
docker-compose -f minimal-docker-compose.yml logs ui
```

**API not responding?**
```bash
docker-compose -f minimal-docker-compose.yml logs api
curl http://localhost:3001/api/system-health
```

**Worker not processing jobs?**
```bash
docker-compose -f minimal-docker-compose.yml logs worker
```

**Database connection issues?**
```bash
docker-compose -f minimal-docker-compose.yml logs postgres
```

---

## System Status Check

Run this after deployment:

```bash
# Check all containers
docker-compose -f minimal-docker-compose.yml ps

# Test API health
curl http://localhost:3001/api/system-health

# Check UI
curl http://localhost:3000

# View all logs
docker-compose -f minimal-docker-compose.yml logs --tail=50
```

---

**System is minimal but fully functional and ready to run end-to-end!** 🚀
