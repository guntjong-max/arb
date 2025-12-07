# Nginx Reverse Proxy Architecture

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET / CLOUDFLARE                    │
│                      (Optional: SSL/TLS, CDN, DDoS)             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ HTTP/HTTPS
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                        NGINX REVERSE PROXY                       │
│                         (Port 80/443)                            │
│                      Container: arb-nginx                        │
│                                                                  │
│  Routes:                                                         │
│  • /              → Frontend (Vite React)                       │
│  • /api/*         → Engine API                                  │
│  • /ws            → WebSocket                                   │
│  • /health        → Health Check                                │
│  • /dashboard     → Python Dashboard                            │
└──────────┬───────────────────────┬──────────────────────────────┘
           │                       │
           │                       │
    ┌──────▼────────┐       ┌─────▼──────────┐
    │  DOCKER       │       │  HOST          │
    │  NETWORK      │       │  SERVICES      │
    │               │       │                │
    │  arb-network  │       │  (via host.    │
    │               │       │   docker.      │
    │               │       │   internal)    │
    └───┬───────────┘       └────┬───────────┘
        │                        │
        │                        │
┌───────▼────────────────┐  ┌────▼──────────────┐
│  CONTAINER SERVICES    │  │  HOST SERVICES    │
│                        │  │                   │
│  ┌──────────────────┐ │  │  ┌─────────────┐ │
│  │ Engine API       │ │  │  │ Frontend    │ │
│  │ Port: 3000       │ │  │  │ Vite React  │ │
│  │ Container:       │ │  │  │ Port: 5173  │ │
│  │ arb-engine       │ │  │  └─────────────┘ │
│  └──────────────────┘ │  │                   │
│                        │  │  ┌─────────────┐ │
│  ┌──────────────────┐ │  │  │ Dashboard   │ │
│  │ WebSocket        │ │  │  │ Python HTTP │ │
│  │ Port: 3001       │ │  │  │ Port: 8080  │ │
│  │ Container:       │ │  │  └─────────────┘ │
│  │ arb-engine       │ │  │                   │
│  └──────────────────┘ │  └───────────────────┘
│                        │
│  ┌──────────────────┐ │
│  │ PostgreSQL       │ │
│  │ Port: 5432       │ │
│  │ Container:       │ │
│  │ arb-postgres     │ │
│  └──────────────────┘ │
│                        │
│  ┌──────────────────┐ │
│  │ Redis            │ │
│  │ Port: 6379       │ │
│  │ Container:       │ │
│  │ arb-redis        │ │
│  └──────────────────┘ │
│                        │
│  ┌──────────────────┐ │
│  │ Prometheus       │ │
│  │ Port: 9090       │ │
│  │ Container:       │ │
│  │ arb-prometheus   │ │
│  └──────────────────┘ │
│                        │
│  ┌──────────────────┐ │
│  │ Grafana          │ │
│  │ Port: 3030       │ │
│  │ Container:       │ │
│  │ arb-grafana      │ │
│  └──────────────────┘ │
└────────────────────────┘
```

## 🔄 Request Flow

### 1. Frontend Request
```
Browser → http://localhost/
    ↓
Nginx (Port 80)
    ↓
Proxy to host.docker.internal:5173
    ↓
Vite Dev Server (React Frontend)
    ↓
HTML/JS/CSS Response
```

### 2. API Request
```
Browser → http://localhost/api/v1/opportunities
    ↓
Nginx (Port 80)
    ↓
Proxy to arb-engine:3000
    ↓
Express API Server
    ↓
PostgreSQL Database
    ↓
JSON Response
```

### 3. WebSocket Connection
```
Browser → ws://localhost/ws
    ↓
Nginx (Port 80)
    ↓
WebSocket Upgrade
    ↓
Proxy to arb-engine:3001
    ↓
WebSocket Server
    ↓
Bidirectional Real-time Communication
```

### 4. Dashboard Request
```
Browser → http://localhost/dashboard
    ↓
Nginx (Port 80)
    ↓
Proxy to host.docker.internal:8080
    ↓
Python HTTP Server
    ↓
Dashboard HTML
```

## 🌐 Network Configuration

### Docker Network
- **Name**: `arb_arb-network`
- **Driver**: bridge
- **Subnet**: 172.25.0.0/16

### Container Communication
```
┌──────────────────────────────────────────┐
│  Docker Network: arb_arb-network         │
│                                          │
│  arb-nginx        ─────→  arb-engine    │
│      │                         │         │
│      │                         ↓         │
│      └────────────────→  arb-postgres   │
│                               │         │
│                               ↓         │
│                         arb-redis       │
│                                          │
│  All containers can communicate via     │
│  container names (DNS resolution)       │
└──────────────────────────────────────────┘
```

### Host Communication
```
┌──────────────────────────────────────────┐
│  Host Machine                            │
│                                          │
│  Frontend (5173) ←─── Nginx Container   │
│  Dashboard (8080) ←─── (via host.       │
│                         docker.          │
│                         internal)        │
│                                          │
│  Nginx uses extra_hosts to resolve      │
│  host.docker.internal to host gateway   │
└──────────────────────────────────────────┘
```

## 🔐 Security Layers

```
┌─────────────────────────────────────────┐
│  Layer 1: Cloudflare (Optional)         │
│  - DDoS Protection                      │
│  - SSL/TLS Termination                  │
│  - CDN Caching                          │
│  - Rate Limiting                        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Layer 2: Nginx                         │
│  - Security Headers                     │
│  - CORS Configuration                   │
│  - Request Filtering                    │
│  - SSL/TLS (Optional)                   │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Layer 3: Application                   │
│  - JWT Authentication                   │
│  - API Rate Limiting                    │
│  - Input Validation                     │
│  - Business Logic Security              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Layer 4: Database                      │
│  - Password Authentication              │
│  - Network Isolation                    │
│  - Encrypted Connections                │
│  - Role-based Access                    │
└─────────────────────────────────────────┘
```

## 📊 Data Flow

### Read Operation (GET /api/v1/opportunities)
```
1. Client Browser
   ↓ HTTP GET Request
2. Nginx (Port 80)
   ↓ Proxy Pass
3. Engine API (Port 3000)
   ↓ Query Database
4. PostgreSQL (Port 5432)
   ↓ Return Data
5. Engine API
   ↓ Format Response
6. Nginx
   ↓ Add Headers
7. Client Browser
   ↓ Display Data
```

### Write Operation (POST /api/v1/trades)
```
1. Client Browser
   ↓ HTTP POST Request + JWT
2. Nginx (Port 80)
   ↓ Proxy Pass + CORS
3. Engine API (Port 3000)
   ↓ Validate JWT
4. Engine API
   ↓ Validate Data
5. PostgreSQL (Port 5432)
   ↓ Insert Record
6. Redis (Port 6379)
   ↓ Queue Job
7. Engine API
   ↓ WebSocket Notification
8. WebSocket (Port 3001)
   ↓ Push Update
9. Client Browser
   ↓ Real-time Update
```

## 🔄 High Availability Setup (Future)

```
┌─────────────────────────────────────────┐
│          Load Balancer (HAProxy)        │
│               or Cloudflare              │
└──────┬────────────────────┬─────────────┘
       │                    │
┌──────▼─────────┐   ┌──────▼─────────┐
│  Nginx Server  │   │  Nginx Server  │
│  Instance 1    │   │  Instance 2    │
└──────┬─────────┘   └──────┬─────────┘
       │                    │
       └────────┬───────────┘
                │
    ┌───────────▼───────────┐
    │   Application Cluster │
    │   • Engine x 3        │
    │   • Redis Cluster     │
    │   • PostgreSQL HA     │
    └───────────────────────┘
```

## 🎯 Performance Optimization

### Nginx Optimizations
- **Worker Processes**: Auto (matches CPU cores)
- **Worker Connections**: 1024 per worker
- **Keepalive**: 32 connections to upstreams
- **Gzip Compression**: Enabled for text/json
- **Buffer Sizes**: Optimized for API responses
- **Timeouts**: 600s for long operations

### Caching Strategy (Future)
```
┌────────────────────────────────────┐
│  Static Assets                     │
│  • Cache in Nginx: 1 year          │
│  • Cache in Cloudflare: 1 month    │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  API Responses                     │
│  • Cache in Redis: 5-60 seconds    │
│  • Cache in Nginx: 10 seconds      │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  Real-time Data                    │
│  • No caching                      │
│  • WebSocket push                  │
└────────────────────────────────────┘
```

## 📈 Scalability Path

### Current Setup (Development)
- Single Nginx instance
- Single Engine instance
- Single database instance

### Production Setup (Recommended)
- Load-balanced Nginx (2+ instances)
- Horizontal Engine scaling (3+ instances)
- Database replication (Primary + Replicas)
- Redis cluster (3+ nodes)
- Separate monitoring stack

### Enterprise Setup
- Global CDN (Cloudflare)
- Multi-region deployment
- Database sharding
- Microservices architecture
- Kubernetes orchestration

## 🛠️ Maintenance Points

### Regular Tasks
1. **Log Rotation**: Nginx logs (daily)
2. **Certificate Renewal**: SSL certificates (every 90 days)
3. **Image Updates**: Nginx image (monthly)
4. **Configuration Review**: Security settings (quarterly)

### Monitoring Points
1. **Nginx Health**: Container status
2. **Response Times**: API latency
3. **Error Rates**: 4xx/5xx responses
4. **Connection Count**: Active connections
5. **Throughput**: Requests per second

---

**This architecture provides**:
- ✅ Single entry point (Port 80)
- ✅ Service isolation
- ✅ Easy scaling
- ✅ SSL/TLS ready
- ✅ Production-grade setup
