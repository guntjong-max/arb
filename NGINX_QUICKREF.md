# Nginx Quick Reference - Arbitrage Bot

## 🚀 Quick Commands

### Start/Stop
```bash
# Start Nginx
docker-compose up -d nginx

# Stop Nginx
docker-compose stop nginx

# Restart Nginx
docker-compose restart nginx

# Remove Nginx
docker-compose down nginx
```

### Logs
```bash
# View live logs
docker logs -f arb-nginx

# Last 50 lines
docker logs --tail 50 arb-nginx

# Access log
tail -f nginx/logs/access.log

# Error log
tail -f nginx/logs/error.log
```

### Configuration
```bash
# Test config
docker exec arb-nginx nginx -t

# Reload config (no downtime)
docker exec arb-nginx nginx -s reload

# Validate before deploy
docker run --rm \
  -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
  -v $(pwd)/nginx/conf.d:/etc/nginx/conf.d:ro \
  nginx:alpine nginx -t
```

### Debugging
```bash
# Check if running
docker ps | grep nginx

# Check port binding
docker port arb-nginx

# Test inside container
docker exec -it arb-nginx sh

# Check connectivity to engine
docker exec arb-nginx wget -qO- http://arb-engine:3000/health
```

## 🔗 Access URLs

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost/ | React Vite app |
| API | http://localhost/api | REST API |
| Health | http://localhost/health | Health check |
| WebSocket | ws://localhost/ws | Real-time updates |
| Dashboard | http://localhost/dashboard | Python dashboard |

## 🧪 Quick Tests

```bash
# Test all endpoints
curl http://localhost/health
curl http://localhost/api/docs
curl http://localhost/
curl http://localhost/dashboard

# WebSocket test (requires wscat)
wscat -c ws://localhost/ws
```

## 🔧 Common Issues

### Port 80 in use
```bash
lsof -i :80
sudo kill -9 <PID>
```

### 502 Bad Gateway
```bash
# Check engine is running
docker ps | grep arb-engine

# Check frontend/dashboard
ps aux | grep -E '(vite|python.*8080)'
```

### Container won't start
```bash
docker logs arb-nginx
docker-compose up -d --force-recreate nginx
```

### Config changes not applied
```bash
docker exec arb-nginx nginx -s reload
# or
docker-compose restart nginx
```

## 📂 File Locations

```
nginx/
├── nginx.conf              # Main config
├── conf.d/
│   └── arbitrage.conf      # App routes
└── logs/
    ├── access.log          # Access logs
    └── error.log           # Error logs
```

## 🎯 Deployment Script

```bash
# Automated deployment
./deploy-nginx.sh

# Manual deployment
docker-compose up -d nginx
docker logs -f arb-nginx
```

## 📊 Status Check

```bash
# Container status
docker ps --filter name=arb-nginx

# Health check
docker inspect arb-nginx | grep -A 5 Health

# Resource usage
docker stats arb-nginx --no-stream
```

## 🔄 Update Nginx

```bash
# Pull latest image
docker pull nginx:alpine

# Recreate with new image
docker-compose up -d --force-recreate nginx
```

## 💾 Backup/Restore

```bash
# Backup config
tar -czf nginx-backup.tar.gz nginx/

# Restore config
tar -xzf nginx-backup.tar.gz
```

## 🌐 Production Ready

- [ ] All tests passing
- [ ] Logs directory exists
- [ ] Config validated
- [ ] SSL ready (for Cloudflare)
- [ ] Health checks working

For detailed documentation, see [NGINX_SETUP.md](./NGINX_SETUP.md)
