# Sportsbook Minimal - Master-Worker Architecture

## 📋 Arsitektur

Sistem ini menggunakan arsitektur **Master-Worker** yang scalable untuk scraping odds dari berbagai sportsbook dan mendeteksi peluang arbitrase.

### Komponen Utama

```
┌─────────────────────────────────────────────────────────┐
│                    FastAPI Backend                       │
│         (WebSocket Server, Event Matcher,                │
│              Arbitrage Calculator)                       │
│                    Port: 8000                            │
└────────────┬────────────────────────────────────────────┘
             │ WebSocket
             │
    ┌────────┼────────┬────────┬────────┐
    │        │        │        │        │
┌───▼───┐ ┌─▼────┐ ┌─▼────┐ ┌─▼────┐  ...
│Worker │ │Worker│ │Worker│ │Worker│
│  SBO  │ │ IBC  │ │ CMD  │ │ PIN  │
└───────┘ └──────┘ └──────┘ └──────┘
(Docker)  (Docker) (Docker) (Docker)
```

### Backend (FastAPI)
- **WebSocket Server**: Mengelola koneksi dengan workers
- **Event Matcher**: Mencocokkan pertandingan dari berbagai sportsbook
- **Arbitrage Calculator**: Menghitung peluang arbitrase
- **Port**: 8000

### Workers (Docker Containers)
- **Generic Worker**: Satu Docker image untuk semua sportsbook
- **Site-Specific Modules**: Modul scraping per sportsbook (SBO, IBC, CMD, dll)
- **Playwright Automation**: Scraping menggunakan browser automation
- **WebSocket Client**: Mengirim odds ke backend

## 📁 Struktur Folder

```
/sportsbook-minimal
├── /backend                    # FastAPI Backend
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py                 # FastAPI app & WebSocket server
│   ├── matcher.py              # Event matching logic
│   └── websocket_manager.py    # WebSocket connection manager
│
├── /worker                     # Generic Worker
│   ├── Dockerfile              # FIXED: User permissions untuk Playwright
│   ├── requirements.txt
│   ├── worker.py               # Main worker script
│   └── /sites                  # Site-specific scrapers
│       ├── __init__.py
│       ├── sbo.py              # SBOBet scraper
│       ├── ibc.py              # IBCBet scraper
│       └── cmd.py              # CMD368 scraper
│
├── docker-compose.yml          # Orchestration
└── .env                        # Environment variables
```

## 🚀 Quick Start

### 1. Build & Start Services

```bash
# Build semua services
docker-compose build

# Start backend + redis + 3 workers (SBO, IBC, CMD)
docker-compose up -d

# Lihat logs
docker-compose logs -f

# Lihat logs specific service
docker-compose logs -f worker-sbo
docker-compose logs -f backend
```

### 2. Check Status

```bash
# Check health backend
curl http://localhost:8000/health

# Check connected workers
curl http://localhost:8000/workers

# Check latest odds
curl http://localhost:8000/odds
```

### 3. Add More Workers

Untuk menambahkan worker baru, edit `docker-compose.yml`:

```yaml
# Example: Add Pinnacle worker
worker-pinnacle:
  build:
    context: ./worker
    dockerfile: Dockerfile
  container_name: sportsbook-worker-pinnacle
  restart: unless-stopped
  environment:
    - SITE=pinnacle
    - BACKEND_WS_URL=ws://backend:8000/ws
    - SCRAPE_INTERVAL=30
    - PYTHONUNBUFFERED=1
  depends_on:
    backend:
      condition: service_healthy
  networks:
    - sportsbook-network
```

Kemudian buat file scraper `worker/sites/pinnacle.py`:

```python
"""
Pinnacle Scraper Module
"""
import logging
from typing import Dict, Any, List
from playwright.sync_api import Page

logger = logging.getLogger(__name__)

class PinnacleScraper:
    def __init__(self):
        self.url = "https://www.pinnacle.com"
        logger.info("PinnacleScraper initialized")
    
    def scrape_odds(self, page: Page) -> Dict[str, Any]:
        # Implement scraping logic
        pass
```

Dan update `worker/sites/__init__.py`:

```python
from .sbo import SBOScraper
from .ibc import IBCScraper
from .cmd import CMDScraper
from .pinnacle import PinnacleScraper

__all__ = ['SBOScraper', 'IBCScraper', 'CMDScraper', 'PinnacleScraper']
```

## 🔧 Konfigurasi

### Environment Variables (.env)

```bash
# Backend
LOG_LEVEL=info
PYTHONUNBUFFERED=1

# Redis
REDIS_URL=redis://:redis_password_2024@redis:6379

# Worker
BACKEND_WS_URL=ws://backend:8000/ws
SCRAPE_INTERVAL=30

# Site Credentials (optional)
SBO_USERNAME=your_username
SBO_PASSWORD=your_password
```

### Worker Environment Variables

Setiap worker dikonfigurasi via environment variable `SITE`:

- `SITE=sbo` → Load `sites/sbo.py` (SBOScraper)
- `SITE=ibc` → Load `sites/ibc.py` (IBCScraper)
- `SITE=cmd` → Load `sites/cmd.py` (CMDScraper)

## 🐛 Troubleshooting

### Playwright Permission Error

**FIXED** ✅ Dockerfile sudah diperbaiki dengan:

1. Create user `worker` SEBELUM install Playwright
2. Switch ke `USER worker` sebelum `playwright install chromium`
3. Browser terinstall di `/home/worker/.cache/ms-playwright` (bukan `/root`)

### Worker tidak connect ke Backend

```bash
# Check backend logs
docker-compose logs backend

# Check worker logs
docker-compose logs worker-sbo

# Restart services
docker-compose restart backend worker-sbo
```

### Memory Issues

Workers menggunakan Playwright + Chromium yang memory-intensive:

- Default limit: 1GB per worker
- Minimum: 512MB
- Edit `docker-compose.yml` untuk menyesuaikan

```yaml
deploy:
  resources:
    limits:
      memory: 2G  # Increase if needed
```

## 📊 API Endpoints

### Backend (FastAPI)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Root info |
| `/health` | GET | Health check |
| `/workers` | GET | List connected workers |
| `/odds` | GET | Latest odds from all workers |
| `/ws` | WebSocket | Worker connection endpoint |

## 🔄 WebSocket Protocol

### Worker → Backend

#### 1. Registration
```json
{
  "type": "worker:register",
  "worker_id": "worker-sbo-12345",
  "site": "sbo",
  "timestamp": "2024-12-10T10:00:00"
}
```

#### 2. Odds Update
```json
{
  "type": "odds:update",
  "worker_id": "worker-sbo-12345",
  "site": "sbo",
  "timestamp": "2024-12-10T10:00:30",
  "data": {
    "matches": [
      {
        "home_team": "Manchester United",
        "away_team": "Chelsea",
        "odds": {
          "ft_hdp": {"home": 1.95, "away": 1.90, "handicap": -0.5},
          "ft_ou": {"over": 2.00, "under": 1.85, "line": 2.5}
        }
      }
    ]
  }
}
```

### Backend → Workers

#### Arbitrage Opportunities
```json
{
  "type": "arbitrage:opportunities",
  "timestamp": "2024-12-10T10:00:35",
  "count": 2,
  "opportunities": [...]
}
```

## 🚀 Scaling

### Horizontal Scaling

Untuk scale 10+ workers:

1. **Edit docker-compose.yml** - Copy worker service definition
2. **Change environment variable** - Set unique `SITE` value
3. **Create scraper module** - Implement site-specific logic in `worker/sites/`

### Resource Planning

| Workers | Memory | CPU |
|---------|--------|-----|
| 3 workers | ~3GB | 2 cores |
| 10 workers | ~10GB | 4 cores |
| 20 workers | ~20GB | 8 cores |

## 📝 Development

### Local Development (Backend)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Local Development (Worker)

```bash
cd worker
pip install -r requirements.txt

# Set environment
export SITE=sbo
export BACKEND_WS_URL=ws://localhost:8000/ws

# Run worker
python worker.py
```

### Testing Scraper Module

```python
from playwright.sync_api import sync_playwright
from sites.sbo import SBOScraper

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()
    
    scraper = SBOScraper()
    result = scraper.scrape_odds(page)
    
    print(result)
    browser.close()
```

## 🔐 Security Notes

1. Change Redis password di `.env` dan `docker-compose.yml`
2. Jangan commit credentials ke Git
3. Use secrets management untuk production
4. Restrict network access (firewall rules)

## 📚 Next Steps

1. ✅ Struktur folder refactored
2. ✅ Dockerfile fixed (Playwright permissions)
3. ✅ Docker Compose setup
4. ⏳ Implement actual scraping logic per site
5. ⏳ Add arbitrage calculation
6. ⏳ Add database untuk logging
7. ⏳ Add monitoring & alerts

## 📄 License

MIT

---

**Note**: Scraper modules (`sites/*.py`) saat ini masih placeholder. Anda perlu mengimplementasikan logic scraping actual sesuai dengan struktur HTML masing-masing sportsbook.
