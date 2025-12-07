# Nginx Reverse Proxy Setup for Arbitrage Bot

This document provides comprehensive instructions for setting up and managing the Nginx reverse proxy for the Arbitrage Bot system.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration Details](#configuration-details)
- [Deployment](#deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

## 🎯 Overview

The Nginx reverse proxy provides a unified entry point for all Arbitrage Bot services:

- **Single Port Access**: All services accessible through port 80
- **WebSocket Support**: Handles WebSocket connections for real-time updates
- **Load Balancing**: Ready for horizontal scaling
- **SSL/TLS Ready**: Prepared for HTTPS with Cloudflare or Let's Encrypt
- **Security Headers**: Built-in security best practices

## 🏗️ Architecture

```
Internet/Cloudflare
        ↓
    Nginx (Port 80)
        ↓
    ┌───────────────────────────────────┐
    │                                   │
    ↓                                   ↓
Container Services              Host Services
    │                                   │
    ├─ Engine API (3000)                ├─ Frontend (5173)
    ├─ WebSocket (3001)                 └─ Dashboard (8080)
    ├─ PostgreSQL (5432)
    ├─ Redis (6379)
    ├─ Grafana (3030)
    └─ Prometheus (9090)
```

## ✅ Prerequisites

1. **Docker & Docker Compose**: Must be installed and running
2. **Port 80 Available**: No other service should be using port 80
3. **Services Running**: Engine, Frontend, and Dashboard should be running
4. **Network**: Docker network `arb_arb-network` should exist

Check prerequisites:
```bash
# Check Docker
docker --version
docker-compose --version

# Check port 80
lsof -i :80
netstat -tlnp | grep :80

# Check Docker network
docker network ls | grep arb
```

## 🚀 Quick Start

### Option 1: Automated Deployment (Recommended)

```bash
# Run the deployment script
./deploy-nginx.sh
```

The script will:
- ✅ Check if Docker is available
- ✅ Verify port 80 is free
- ✅ Validate Nginx configuration
- ✅ Deploy Nginx container
- ✅ Run health checks
- ✅ Display access URLs

### Option 2: Manual Deployment

```bash
# Start Nginx with docker-compose
docker-compose up -d nginx

# Check status
docker ps | grep nginx

# View logs
docker logs -f arb-nginx
```

### Option 3: Standalone Docker Run (Not Recommended)

```bash
docker run -d \
  --name arb-nginx \
  --network arb_arb-network \
  -p 80:80 \
  -p 443:443 \
  -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
  -v $(pwd)/nginx/conf.d:/etc/nginx/conf.d:ro \
  -v $(pwd)/nginx/logs:/var/log/nginx \
  --add-host=host.docker.internal:host-gateway \
  nginx:alpine
```

## ⚙️ Configuration Details

### File Structure

```
nginx/
├── nginx.conf              # Main Nginx configuration
├── conf.d/
│   └── arbitrage.conf      # Application-specific config
└── logs/
    ├── access.log          # Access logs
    └── error.log           # Error logs
```

### Routing Rules

| Path | Destination | Description |
|------|-------------|-------------|
| `/` | Frontend (5173) | React app with Vite HMR |
| `/api/*` | Engine (3000) | REST API endpoints |
| `/health` | Engine (3000) | Health check endpoint |
| `/ws` | Engine (3001) | WebSocket connection |
| `/dashboard` | Dashboard (8080) | Python dashboard |

### Upstream Configuration

The Nginx config uses the following upstreams:

1. **engine_backend**: `arb-engine:3000` (Docker network)
2. **websocket_backend**: `arb-engine:3001` (Docker network)
3. **frontend_app**: `host.docker.internal:5173` (Host)
4. **dashboard_app**: `host.docker.internal:8080` (Host)

### Important Settings

- **Max Upload Size**: 20MB (`client_max_body_size`)
- **Timeouts**: 600s for long-running requests
- **Keepalive**: 32 connections per upstream
- **Gzip**: Enabled for text/json/javascript
- **WebSocket**: Full support with proper headers

## 🚀 Deployment

### Step-by-Step Deployment

1. **Ensure all services are running**:
```bash
docker-compose up -d postgres redis engine
# Frontend and dashboard should run on host
```

2. **Validate Nginx configuration**:
```bash
docker run --rm \
  -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
  -v $(pwd)/nginx/conf.d:/etc/nginx/conf.d:ro \
  nginx:alpine nginx -t
```

3. **Deploy Nginx**:
```bash
docker-compose up -d nginx
```

4. **Verify deployment**:
```bash
docker ps | grep nginx
docker logs arb-nginx
```

## 🧪 Testing

### Health Check

```bash
# Test health endpoint
curl http://localhost/health

# Expected response:
# {"status":"ok","timestamp":"...","uptime":"..."}
```

### API Endpoints

```bash
# Test API
curl http://localhost/api/docs

# Test with authentication
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost/api/v1/opportunities
```

### WebSocket

```bash
# Test WebSocket (using wscat)
wscat -c ws://localhost/ws

# Or using websocat
websocat ws://localhost/ws
```

### Frontend

```bash
# Test frontend access
curl http://localhost/

# Should return HTML
```

### Dashboard

```bash
# Test dashboard
curl http://localhost/dashboard

# Should return dashboard HTML
```

### Complete Test Suite

```bash
# Run all tests
echo "Testing Health..."
curl -s http://localhost/health | jq

echo "Testing API..."
curl -s http://localhost/api/docs | head -n 5

echo "Testing Frontend..."
curl -s http://localhost/ | grep -o '<title>.*</title>'

echo "Testing Dashboard..."
curl -s http://localhost/dashboard | grep -o '<title>.*</title>'
```

## 🔧 Troubleshooting

### Port 80 Already in Use

```bash
# Find process using port 80
lsof -i :80

# Kill the process (replace PID)
sudo kill -9 PID

# Or stop Apache/other web server
sudo systemctl stop apache2
sudo systemctl stop httpd
```

### Nginx Container Won't Start

```bash
# Check logs
docker logs arb-nginx

# Test configuration
docker run --rm \
  -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
  -v $(pwd)/nginx/conf.d:/etc/nginx/conf.d:ro \
  nginx:alpine nginx -t

# Remove and recreate
docker rm -f arb-nginx
docker-compose up -d nginx
```

### 502 Bad Gateway

This usually means the upstream service is not accessible:

```bash
# Check if engine is running
docker ps | grep arb-engine

# Check if frontend/dashboard are running
ps aux | grep -E '(vite|python.*8080)'

# Test direct connection to engine
curl http://localhost:3000/health

# Check Docker network
docker network inspect arb_arb-network
```

### WebSocket Connection Failed

```bash
# Check WebSocket port is open on engine
docker exec arb-engine netstat -tlnp | grep 3001

# Check Nginx WebSocket config
docker exec arb-nginx cat /etc/nginx/conf.d/arbitrage.conf | grep -A 10 "location /ws"

# Test WebSocket directly
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  http://localhost/ws
```

### Can't Access host.docker.internal

```bash
# Verify extra_hosts is set
docker inspect arb-nginx | grep -A 5 ExtraHosts

# Test from inside container
docker exec arb-nginx ping -c 3 host.docker.internal

# Manual fix: Get host IP
ip addr show docker0

# Update nginx config with actual host IP
```

### Configuration Changes Not Applied

```bash
# Reload Nginx configuration
docker exec arb-nginx nginx -s reload

# Or restart container
docker-compose restart nginx

# If still not working, recreate
docker-compose up -d --force-recreate nginx
```

## 🔄 Maintenance

### View Logs

```bash
# Real-time logs
docker logs -f arb-nginx

# Last 100 lines
docker logs --tail 100 arb-nginx

# Access logs
tail -f nginx/logs/access.log

# Error logs
tail -f nginx/logs/error.log
```

### Reload Configuration

```bash
# Graceful reload (no downtime)
docker exec arb-nginx nginx -s reload

# Or using docker-compose
docker-compose exec nginx nginx -s reload
```

### Restart Nginx

```bash
# Restart container
docker-compose restart nginx

# Or manual restart
docker restart arb-nginx
```

### Update Nginx

```bash
# Pull latest image
docker pull nginx:alpine

# Recreate container with new image
docker-compose up -d --force-recreate nginx
```

### Backup Configuration

```bash
# Backup all Nginx configs
tar -czf nginx-backup-$(date +%Y%m%d).tar.gz nginx/

# Restore from backup
tar -xzf nginx-backup-YYYYMMDD.tar.gz
```

### Monitor Performance

```bash
# Check resource usage
docker stats arb-nginx

# Check connections
docker exec arb-nginx netstat -an | grep ESTABLISHED | wc -l

# Check Nginx status (requires stub_status module)
curl http://localhost/nginx_status
```

## 🔒 Security

### Enable HTTPS (with Cloudflare)

When using Cloudflare:
1. Set SSL/TLS mode to "Full" or "Full (strict)"
2. Cloudflare handles the public SSL certificate
3. Configure origin certificate in Nginx (optional)

### Enable HTTPS (with Let's Encrypt)

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Update docker-compose.yml to mount certificates
# Add to nginx volumes:
#   - /etc/letsencrypt:/etc/letsencrypt:ro

# Update nginx config for HTTPS
# See nginx/conf.d/arbitrage.conf
```

### Security Headers

Already included in configuration:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`

### Rate Limiting (Optional)

Add to `nginx/conf.d/arbitrage.conf`:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api {
    limit_req zone=api burst=20 nodelay;
    # ... rest of config
}
```

## 📊 Monitoring

### Health Check Endpoint

```bash
# Check Nginx health
curl http://localhost/health
```

### Prometheus Metrics (Optional)

Install nginx-prometheus-exporter:

```bash
docker run -d \
  --name nginx-exporter \
  --network arb_arb-network \
  -p 9113:9113 \
  nginx/nginx-prometheus-exporter:latest \
  -nginx.scrape-uri=http://arb-nginx:80/nginx_status
```

## 🌐 Production Checklist

- [ ] Port 80 is accessible
- [ ] All upstream services are running
- [ ] Nginx configuration is validated
- [ ] Health checks pass
- [ ] SSL/TLS configured (if using HTTPS)
- [ ] Firewall rules configured
- [ ] Log rotation configured
- [ ] Monitoring setup (Prometheus/Grafana)
- [ ] Backup strategy in place
- [ ] Domain DNS configured
- [ ] Cloudflare (or CDN) configured

## 📞 Support

For issues or questions:
1. Check logs: `docker logs arb-nginx`
2. Review this documentation
3. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
4. Open an issue on GitHub

## 📝 License

Part of the Arbitrage Bot project.
