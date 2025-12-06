# Arbitrage Bot System

A legal-first, session-consent-based automated sports betting system designed for educational purposes.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Linux (Ubuntu 22.04 recommended)
- 4GB+ RAM, 50GB+ storage

### Installation

1. **Clone and configure:**
```bash
git clone <repository-url>
cd arb
cp .env.example .env
# Edit .env with your secrets
```

2. **Deploy:**
```bash
./deploy.sh
```

3. **Access:**
- Frontend: http://localhost:5173
- Engine API: http://localhost:3000
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3030

## 📁 Project Structure

```
arb/
├── engine/          # Node.js API server
├── frontend/        # React UI with Dashboard
├── worker/          # Python Playwright workers
├── monitoring/      # Prometheus & Grafana
├── docker-compose.yml
├── deploy.sh        # Production deployment script
└── README.md
```

## 🎨 Frontend Features

- **Dashboard**: Real-time system health and statistics
- **Jobs**: Job management interface
- **Workers**: Worker monitoring and control
- **Opportunities**: Arbitrage opportunity scanner
- **Settings**: System configuration

## 🛠️ Development

### Start services:
```bash
docker compose up -d
```

### View logs:
```bash
docker compose logs -f          # All services
docker logs arb-frontend -f     # Frontend only
docker logs arb-engine -f       # Engine only
```

### Stop services:
```bash
docker compose down
```

### Rebuild:
```bash
./deploy.sh
```

## 📊 Architecture

### Core Components
- **Engine**: Central Node.js server (REST API + WebSocket)
- **Frontend**: React SPA with Vite
- **Worker**: Python automation with Playwright
- **Database**: PostgreSQL (jobs, logs, consents)
- **Queue**: Redis + BullMQ
- **Monitoring**: Prometheus + Grafana

### Technology Stack
- **Backend**: Node.js 20, Express, BullMQ
- **Frontend**: React 18, Vite 5
- **Worker**: Python 3.11, Playwright
- **Database**: PostgreSQL 15, Redis 7
- **Container**: Docker, Docker Compose

## 🔒 Security & Compliance

- Session-consent based operations
- Full audit logging
- No security bypass mechanisms
- Paper trading mode by default
- Legal-first architecture

## 🌐 API Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

### Jobs
- `POST /api/v1/jobs` - Create job
- `GET /api/v1/jobs/:id` - Get job status
- `GET /api/v1/jobs` - List jobs
- `DELETE /api/v1/jobs/:id` - Cancel job

### Workers
- `POST /api/v1/workers/register` - Register worker
- `POST /api/v1/workers/:id/heartbeat` - Worker heartbeat
- `GET /api/v1/workers` - List workers
- `GET /api/v1/workers/:id` - Get worker details

## 📝 Configuration

### Environment Variables
See `.env.example` for all configuration options.

Key variables:
- `NODE_ENV` - Environment (development/production)
- `DB_PASSWORD` - PostgreSQL password
- `REDIS_PASSWORD` - Redis password
- `JWT_SECRET` - JWT signing secret
- `PAPER_TRADING_MODE` - Enable paper trading

### Frontend Configuration
File: `frontend/vite.config.js`
- Host binding: `0.0.0.0`
- Port: `5173`
- Allowed hosts: `ui.kliks.life`, `api.kliks.life`
- API proxy: `http://engine:3000`

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3000/health
```

### Frontend
```bash
curl http://localhost:5173
```

## 📚 Documentation

- `QUICKSTART.md` - Quick start guide
- `STATUS.md` - Project status
- `engine/README.md` - Engine documentation
- `worker/README.md` - Worker documentation

## 🔧 Troubleshooting

### Check container status
```bash
docker compose ps
```

### View specific logs
```bash
docker logs arb-frontend --tail 100
docker logs arb-engine --tail 100
```

### Restart services
```bash
docker compose restart
```

### Full rebuild
```bash
./deploy.sh
```

## 📞 Support

For issues and questions, check:
1. Container logs: `docker compose logs`
2. Health endpoint: `curl http://localhost:3000/health`
3. Service status: `docker compose ps`

## 📄 License

MIT License - Educational purposes only

---

**Status**: Production Ready ✅
**Version**: 1.0.0
**Last Updated**: December 2025
