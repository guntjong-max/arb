# 🏗️ Sportsbook Minimal - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER / CLIENT                            │
│                    (Future: Web Dashboard)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FASTAPI BACKEND                             │
│                        (Port 8000)                               │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  WebSocket       │  │  Event Matcher   │  │  Arbitrage    │ │
│  │  Manager         │  │                  │  │  Calculator   │ │
│  │                  │  │  - Normalize     │  │               │ │
│  │  - Register      │  │  - Match Events  │  │  - Calculate  │ │
│  │  - Broadcast     │  │  - Team Aliases  │  │  - Filter     │ │
│  │  - Health Check  │  │                  │  │  - Notify     │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
│                                                                  │
│  REST API:                                                       │
│  - GET  /              Info                                      │
│  - GET  /health        Health check                              │
│  - GET  /workers       List workers                              │
│  - GET  /odds          Latest odds                               │
│  - WS   /ws            Worker connections                        │
└────────────────┬─────────────────┬─────────────────┬─────────────┘
                 │                 │                 │
                 │ WebSocket       │ WebSocket       │ WebSocket
                 │                 │                 │
         ┌───────▼──────┐  ┌──────▼─────┐   ┌──────▼─────┐
         │  Worker SBO  │  │ Worker IBC │   │ Worker CMD │  ...
         │              │  │            │   │            │
         │ Container    │  │ Container  │   │ Container  │
         └───────┬──────┘  └──────┬─────┘   └──────┬─────┘
                 │                │                 │
                 │ Playwright     │ Playwright      │ Playwright
                 │                │                 │
         ┌───────▼──────┐  ┌──────▼─────┐   ┌──────▼─────┐
         │   SBOBet     │  │   IBCBet   │   │   CMD368   │
         │   Website    │  │   Website  │   │   Website  │
         └──────────────┘  └────────────┘   └────────────┘
```

## Data Flow

### 1. Worker Registration

```
Worker                  Backend
  │                       │
  │─────[CONNECT WS]─────>│
  │                       │
  │─────[REGISTER]───────>│  {type: "worker:register",
  │                       │   worker_id: "worker-sbo-123",
  │                       │   site: "sbo"}
  │                       │
  │<────[ACK]─────────────│  {type: "registration:ack",
  │                       │   status: "registered"}
  │                       │
```

### 2. Odds Scraping & Sending

```
Worker                  Backend                Event Matcher
  │                       │                         │
  │──[Scrape Website]     │                         │
  │                       │                         │
  │─────[SEND ODDS]──────>│                         │
  │                       │                         │
  │                       │──[Store Odds]           │
  │                       │                         │
  │                       │──[Match Events]────────>│
  │                       │                         │
  │                       │<──[Matched Events]──────│
  │                       │                         │
```

### 3. Arbitrage Detection & Broadcasting

```
Backend                 Arbitrage Calc          All Workers
  │                          │                      │
  │──[Matched Events]───────>│                      │
  │                          │                      │
  │                          │─[Calculate]          │
  │                          │                      │
  │<──[Opportunities]────────│                      │
  │                          │                      │
  │────────[BROADCAST]──────────────────────────────>│
  │                          │                      │
```

## Component Details

### Backend Components

#### 1. WebSocket Manager (`websocket_manager.py`)

```python
class WebSocketManager:
    - register_worker(worker_id, websocket, site)
    - unregister_worker(worker_id)
    - send_to_worker(worker_id, message)
    - broadcast(message, exclude=[])
    - get_workers_by_site(site)
```

#### 2. Event Matcher (`matcher.py`)

```python
class EventMatcher:
    - normalize_team_name(name)
    - find_team_canonical(normalized_name)
    - create_event_signature(home, away)
    - match_events(odds_by_provider)
```

#### 3. Main Server (`main.py`)

```python
FastAPI App:
    - WebSocket endpoint /ws
    - REST endpoints (/, /health, /workers, /odds)
    - process_arbitrage()
    - calculate_arbitrage(matched_events)
```

### Worker Components

#### 1. Generic Worker (`worker.py`)

```python
class GenericWorker:
    - _load_scraper()           # Load site-specific module
    - _init_browser()           # Initialize Playwright
    - _run_worker()             # Main loop
    - _register_worker()        # Register with backend
    - _scrape_loop()            # Scraping loop
    - _send_odds()              # Send to backend
```

#### 2. Site Scrapers (`sites/*.py`)

```python
class SiteScraper:
    - scrape_odds(page)         # Playwright scraping
    - _extract_matches(page)    # Extract match data
```

## Message Protocol

### Worker → Backend

#### Registration
```json
{
  "type": "worker:register",
  "worker_id": "worker-sbo-12345",
  "site": "sbo",
  "timestamp": "2024-12-10T10:00:00"
}
```

#### Odds Update
```json
{
  "type": "odds:update",
  "worker_id": "worker-sbo-12345",
  "site": "sbo",
  "timestamp": "2024-12-10T10:00:30",
  "data": {
    "site": "sbo",
    "matches": [
      {
        "home_team": "Manchester United",
        "away_team": "Chelsea",
        "odds": {
          "ft_hdp": {
            "home": 1.95,
            "away": 1.90,
            "handicap": -0.5
          },
          "ft_ou": {
            "over": 2.00,
            "under": 1.85,
            "line": 2.5
          }
        },
        "time": "15",
        "league": "Premier League"
      }
    ],
    "count": 1
  }
}
```

### Backend → Workers

#### Registration Acknowledgment
```json
{
  "type": "registration:ack",
  "worker_id": "worker-sbo-12345",
  "status": "registered"
}
```

#### Arbitrage Opportunities
```json
{
  "type": "arbitrage:opportunities",
  "timestamp": "2024-12-10T10:00:35",
  "count": 2,
  "opportunities": [
    {
      "event": "manchester_united_vs_chelsea",
      "margin": 5.2,
      "home": "Manchester United",
      "away": "Chelsea",
      "market": "ft_hdp",
      "leg_1": {
        "provider": "sbo",
        "odds": 1.95,
        "side": "home"
      },
      "leg_2": {
        "provider": "ibc",
        "odds": 2.10,
        "side": "away"
      }
    }
  ]
}
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Host                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Docker Network: sportsbook-network      │  │
│  │                                                       │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │  Backend   │  │   Redis    │  │  Worker-1  │    │  │
│  │  │ (FastAPI)  │  │ (Optional) │  │   (SBO)    │    │  │
│  │  │            │  │            │  │            │    │  │
│  │  │  Port:8000 │  │  Port:6379 │  │            │    │  │
│  │  └────────────┘  └────────────┘  └────────────┘    │  │
│  │                                                       │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │  Worker-2  │  │  Worker-3  │  │  Worker-N  │    │  │
│  │  │   (IBC)    │  │   (CMD)    │  │    ...     │    │  │
│  │  │            │  │            │  │            │    │  │
│  │  └────────────┘  └────────────┘  └────────────┘    │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Scaling Strategy

### Horizontal Scaling (Add More Workers)

1. **Create new scraper module**: `worker/sites/new_site.py`
2. **Add service to docker-compose.yml**:
   ```yaml
   worker-newsite:
     build:
       context: ./worker
     environment:
       - SITE=newsite
   ```
3. **Deploy**: `docker-compose up -d --scale worker-newsite=1`

### Vertical Scaling (More Resources)

Edit `docker-compose.yml`:

```yaml
worker-sbo:
  deploy:
    resources:
      limits:
        memory: 2G      # Increase from 1G
        cpus: '1.0'     # Add CPU limit
```

## Technology Stack

### Backend
- **FastAPI** - Async web framework
- **Uvicorn** - ASGI server
- **WebSockets** - Real-time communication
- **Python 3.11** - Runtime

### Workers
- **Playwright** - Browser automation
- **Chromium** - Headless browser
- **WebSockets** - Backend communication
- **Python 3.11** - Runtime

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Orchestration
- **Redis** - Cache/Queue (optional)

## File Structure Summary

```
/sportsbook-minimal/
├── backend/
│   ├── main.py              # FastAPI app + WebSocket server
│   ├── matcher.py           # Event matching logic
│   ├── websocket_manager.py # Connection management
│   ├── Dockerfile
│   └── requirements.txt
│
├── worker/
│   ├── worker.py            # Generic worker
│   ├── sites/
│   │   ├── sbo.py          # Site-specific scrapers
│   │   ├── ibc.py
│   │   └── cmd.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── docker-compose.yml       # Service orchestration
├── .env                     # Environment config
├── quickstart.sh           # Quick start script
├── REFACTOR_README.md      # User documentation
├── REFACTOR_COMPLETE.md    # Delivery summary
└── ARCHITECTURE.md         # This file
```

---

**Status**: Architecture complete and ready for production deployment! 🚀
