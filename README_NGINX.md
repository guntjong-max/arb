# 🚀 Nginx Reverse Proxy for Arbitrage Bot

Complete Nginx reverse proxy setup for the Arbitrage Bot system. This provides a unified entry point for all services on port 80, ready for production deployment with Cloudflare.

## 📚 Quick Links

- **[Deployment Summary](./NGINX_DEPLOYMENT_SUMMARY.md)** - Start here! Complete deployment guide
- **[Setup Guide](./NGINX_SETUP.md)** - Detailed configuration and troubleshooting
- **[Quick Reference](./NGINX_QUICKREF.md)** - Command cheat sheet
- **[Architecture](./NGINX_ARCHITECTURE.md)** - System architecture diagrams

## ⚡ Quick Start

### 1-Step Deployment
```bash
./deploy-nginx.sh
```

That's it! The script will:
- ✅ Check prerequisites
- ✅ Validate configuration
- ✅ Deploy Nginx
- ✅ Run health checks
- ✅ Show access URLs

### Manual Deployment
```bash
# Start Nginx
docker-compose up -d nginx

# Check status
docker ps | grep nginx

# View logs
docker logs -f arb-nginx

# Test
curl http://localhost/health
```

## 🎯 What You Get

### Unified Access Point
- **Frontend**: `http://localhost/`
- **API**: `http://localhost/api`
- **Health**: `http://localhost/health`
- **WebSocket**: `ws://localhost/ws`
- **Dashboard**: `http://localhost/dashboard`

### Production Features
- ✅ Load balancing ready
- ✅ WebSocket support
- ✅ SSL/TLS ready
- ✅ Gzip compression
- ✅ Security headers
- ✅ CORS configured
- ✅ Health checks
- ✅ Cloudflare compatible

## 📁 File Structure

```
nginx/
├── nginx.conf                          # Main Nginx configuration
├── conf.d/
│   ├── arbitrage.conf                  # HTTP routing (active)
│   └── arbitrage-ssl.conf.example      # HTTPS template
└── logs/
    ├── access.log                      # Access logs
    └── error.log                       # Error logs

NGINX_DEPLOYMENT_SUMMARY.md             # Deployment guide
NGINX_SETUP.md                          # Detailed setup
NGINX_QUICKREF.md                       # Quick reference
NGINX_ARCHITECTURE.md                   # Architecture docs
deploy-nginx.sh                         # Deployment script
```

## 🔧 Configuration

### Routing Rules
| Path | Target | Service |
|------|--------|---------|
| `/` | `host.docker.internal:5173` | Vite React Frontend |
| `/api/*` | `arb-engine:3000` | Express API |
| `/health` | `arb-engine:3000` | Health endpoint |
| `/ws` | `arb-engine:3001` | WebSocket |
| `/dashboard` | `host.docker.internal:8080` | Python Dashboard |

### Network Setup
- **Docker Network**: `arb_arb-network`
- **Container Services**: Accessed by container name
- **Host Services**: Accessed via `host.docker.internal`
- **Ports**: 80 (HTTP), 443 (HTTPS - ready)

## 🧪 Testing

### Basic Tests
```bash
# Health check
curl http://localhost/health

# API
curl http://localhost/api/docs

# Frontend
curl http://localhost/

# Dashboard
curl http://localhost/dashboard
```

### WebSocket Test
```bash
# Using wscat
wscat -c ws://localhost/ws

# Using websocat
websocat ws://localhost/ws
```

### Load Test
```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost/health

# Using wrk
wrk -t4 -c100 -d30s http://localhost/api/docs
```

## 🐛 Troubleshooting

### Port 80 Already in Use
```bash
lsof -i :80
sudo kill -9 <PID>
```

### 502 Bad Gateway
```bash
# Check engine is running
docker ps | grep arb-engine
docker-compose up -d engine
```

### Configuration Issues
```bash
# Test config
docker exec arb-nginx nginx -t

# Reload config
docker exec arb-nginx nginx -s reload
```

### Can't Access Host Services
```bash
# Check host.docker.internal
docker exec arb-nginx ping -c 2 host.docker.internal

# Start services
cd frontend && npm run dev
python -m http.server 8080
```

See [NGINX_SETUP.md](./NGINX_SETUP.md) for detailed troubleshooting.

## 🌐 Production Deployment

### With Cloudflare

1. **DNS Setup**
   - Point domain to your server IP
   - Enable Cloudflare proxy (orange cloud)

2. **Cloudflare SSL/TLS**
   - Set SSL/TLS mode to "Full" or "Full (strict)"
   - Cloudflare handles public SSL certificate

3. **Optional: Origin Certificate**
   ```bash
   # Get certificate from Cloudflare dashboard
   mkdir -p nginx/ssl
   # Save cloudflare-origin.pem and cloudflare-origin.key
   
   # Enable HTTPS config
   cp nginx/conf.d/arbitrage-ssl.conf.example nginx/conf.d/arbitrage-ssl.conf
   nano nginx/conf.d/arbitrage-ssl.conf  # Update domain
   
   # Reload Nginx
   docker-compose restart nginx
   ```

### With Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Update docker-compose.yml to mount certificates
# Volumes: /etc/letsencrypt:/etc/letsencrypt:ro

# Use SSL config
cp nginx/conf.d/arbitrage-ssl.conf.example nginx/conf.d/arbitrage-ssl.conf
# Update to use Let's Encrypt paths

docker-compose restart nginx
```

## 📊 Monitoring

### Real-time Logs
```bash
# All logs
docker logs -f arb-nginx

# Access log
tail -f nginx/logs/access.log

# Error log
tail -f nginx/logs/error.log
```

### Performance Metrics
```bash
# Container stats
docker stats arb-nginx

# Connection count
docker exec arb-nginx sh -c "netstat -an | grep ESTABLISHED | wc -l"

# Request analysis
cat nginx/logs/access.log | awk '{print $7}' | sort | uniq -c | sort -rn
```

## 🔄 Maintenance

### Update Nginx
```bash
docker pull nginx:alpine
docker-compose up -d --force-recreate nginx
```

### Reload Configuration
```bash
# No downtime
docker exec arb-nginx nginx -s reload
```

### Backup Configuration
```bash
tar -czf nginx-backup-$(date +%Y%m%d).tar.gz nginx/
```

### Log Rotation
```bash
# Create logrotate config
cat > /etc/logrotate.d/nginx-arb << EOF
/data/workspace/arb/nginx/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        docker exec arb-nginx nginx -s reload > /dev/null 2>&1
    endscript
}
EOF
```

## 🔒 Security

### Built-in Security
- ✅ Security headers (X-Frame-Options, X-XSS-Protection, etc.)
- ✅ CORS configuration
- ✅ Request size limits (20MB)
- ✅ Timeout protection
- ✅ SSL/TLS ready

### Optional: Rate Limiting
Add to `nginx/conf.d/arbitrage.conf`:
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api {
    limit_req zone=api burst=20 nodelay;
    # ... existing config
}
```

### Optional: IP Whitelisting
```nginx
location /api/admin {
    allow 203.0.113.0/24;
    deny all;
    # ... existing config
}
```

## 📈 Performance Tuning

### Current Settings
- **Worker Processes**: Auto (matches CPU cores)
- **Connections per Worker**: 1024
- **Keepalive to Upstreams**: 32
- **Gzip Compression**: Enabled
- **Buffer Sizes**: Optimized

### For High Traffic
Update `nginx/nginx.conf`:
```nginx
worker_connections 4096;
keepalive 64;
client_max_body_size 50M;
```

## ✅ Health Checks

### Nginx Container Health
```bash
docker inspect arb-nginx --format='{{.State.Health.Status}}'
```

### Endpoint Health
```bash
# Health endpoint
curl -f http://localhost/health || echo "FAIL"

# API
curl -f http://localhost/api/docs || echo "FAIL"

# Frontend
curl -f http://localhost/ || echo "FAIL"
```

### Automated Monitoring
```bash
# Add to crontab
*/5 * * * * curl -fs http://localhost/health > /dev/null || /usr/local/bin/restart-nginx.sh
```

## 🎓 Learning Resources

- [Nginx Official Docs](https://nginx.org/en/docs/)
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [WebSocket Proxying](https://nginx.org/en/docs/http/websocket.html)
- [Security Best Practices](https://www.nginx.com/blog/mitigating-ddos-attacks-with-nginx-and-nginx-plus/)

## 🆘 Support

### Quick Help
1. Check logs: `docker logs arb-nginx`
2. Test config: `docker exec arb-nginx nginx -t`
3. Review docs: [NGINX_SETUP.md](./NGINX_SETUP.md)
4. Check status: `docker ps | grep nginx`

### Common Commands
```bash
# Restart
docker-compose restart nginx

# Stop
docker-compose stop nginx

# Start
docker-compose up -d nginx

# Remove
docker-compose down nginx
```

## 📝 Environment Variables

No environment variables required! Everything is configured through:
- `nginx/nginx.conf` - Main configuration
- `nginx/conf.d/arbitrage.conf` - Route configuration
- `docker-compose.yml` - Container settings

## 🎉 Success Checklist

- [ ] Nginx container running
- [ ] Port 80 accessible
- [ ] Health check responds
- [ ] API accessible
- [ ] Frontend loads
- [ ] WebSocket connects
- [ ] Dashboard accessible
- [ ] Logs working
- [ ] No errors in logs

## 🚀 Ready to Deploy?

```bash
# Simple deployment
./deploy-nginx.sh

# Or step by step
docker-compose up -d nginx
docker logs -f arb-nginx
curl http://localhost/health
```

---

**Questions?** Check [NGINX_SETUP.md](./NGINX_SETUP.md) for detailed documentation.

**Issues?** See troubleshooting section or review logs: `docker logs arb-nginx`

**Production?** Follow the Cloudflare setup guide above.

---

Made with ❤️ for Arbitrage Bot
