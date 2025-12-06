# SSL Quick Reference Card

## 🚀 Quick Start Commands

```bash
# 1. Configure email
nano init-ssl.sh  # Update EMAIL="your@email.com"

# 2. Verify setup
./verify-ssl-setup.sh

# 3. Start backend services
docker-compose up -d engine grafana pgadmin postgres redis prometheus

# 4. Initialize SSL
./init-ssl.sh

# 5. Verify HTTPS
curl -I https://api.kliks.life/health
```

## 📋 Essential Commands

### Certificate Management
```bash
# View all certificates
docker-compose run --rm certbot certificates

# Test renewal (dry-run)
docker-compose run --rm certbot renew --dry-run

# Force renewal
docker-compose run --rm certbot renew --force-renewal

# Check expiration
openssl x509 -in certbot/conf/live/api.kliks.life/cert.pem -noout -dates
```

### Nginx Management
```bash
# Test configuration
docker-compose exec nginx nginx -t

# Reload configuration
docker-compose exec nginx nginx -s reload

# Restart Nginx
docker-compose restart nginx

# View logs
docker-compose logs -f nginx
```

### Service Management
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View status
docker-compose ps

# View specific service logs
docker-compose logs -f [service-name]
```

## 🔍 Troubleshooting

### DNS Issues
```bash
# Check DNS records
dig +short api.kliks.life
dig +short grafana.kliks.life
dig +short db.kliks.life

# Get server IP
curl ifconfig.me
```

### Certificate Issues
```bash
# View Certbot logs
docker-compose logs certbot

# Manual certificate request
docker-compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your@email.com \
  --agree-tos \
  -d api.kliks.life
```

### Nginx Issues
```bash
# Check configuration syntax
docker-compose exec nginx nginx -t

# View error logs
docker-compose exec nginx tail -f /var/log/nginx/error.log

# View access logs
docker-compose exec nginx tail -f /var/log/nginx/access.log
```

## 🌐 Service URLs

| Service | URL | Backend |
|---------|-----|---------|
| API | https://api.kliks.life | :3000 |
| Grafana | https://grafana.kliks.life | :3030 |
| PgAdmin | https://db.kliks.life | :5050 |

## 📁 Important Files

```
├── nginx/
│   ├── nginx.conf                      # Main config
│   └── conf.d/
│       ├── api.kliks.life.conf        # API config
│       ├── grafana.kliks.life.conf    # Grafana config
│       └── db.kliks.life.conf         # PgAdmin config
│
├── certbot/
│   ├── conf/live/                     # Certificates
│   └── www/                           # ACME challenges
│
├── docker-compose.yml                 # Services
├── init-ssl.sh                        # Initial setup
├── renew-ssl.sh                       # Renewal script
└── verify-ssl-setup.sh                # Verification
```

## 🔧 Configuration Locations

```bash
# Nginx main config
/data/workspace/arb/nginx/nginx.conf

# Site configs
/data/workspace/arb/nginx/conf.d/*.conf

# Certificates
/data/workspace/arb/certbot/conf/live/

# Docker compose
/data/workspace/arb/docker-compose.yml
```

## 🧪 Testing

### Test SSL Configuration
```bash
# SSL handshake test
openssl s_client -connect api.kliks.life:443 -servername api.kliks.life

# Test HSTS header
curl -I https://api.kliks.life | grep -i strict

# Test redirect
curl -I http://api.kliks.life
```

### Online Tests
```
SSL Labs:       https://www.ssllabs.com/ssltest/analyze.html?d=api.kliks.life
Security Headers: https://securityheaders.com/?q=https://api.kliks.life
```

## ⚙️ Environment Variables

Update in `.env` file:
```bash
# Grafana
GRAFANA_USER=admin
GRAFANA_PASSWORD=your_password

# PgAdmin
PGADMIN_EMAIL=admin@kliks.life
PGADMIN_PASSWORD=your_password

# Database
DB_PASSWORD=your_db_password

# Redis
REDIS_PASSWORD=your_redis_password
```

## 🔐 Security Headers

All sites include:
- `Strict-Transport-Security: max-age=31536000`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

## 📊 Health Checks

```bash
# Run full verification
./verify-ssl-setup.sh

# Check container health
docker-compose ps

# Test endpoints
curl https://api.kliks.life/health
curl https://grafana.kliks.life
curl https://db.kliks.life
```

## 🔄 Maintenance Schedule

- **Daily**: Check container health
- **Weekly**: Review logs, verify HTTPS access
- **Monthly**: Test certificate renewal (dry-run)
- **Quarterly**: Run SSL Labs test

## 📞 Emergency Procedures

### Rollback SSL
```bash
# Stop SSL services
docker-compose stop nginx certbot

# Restore original config
cp docker-compose.yml.backup docker-compose.yml

# Restart
docker-compose up -d
```

### Reset Certificates
```bash
# Backup existing
tar -czf certbot-backup.tar.gz certbot/

# Remove certificates
rm -rf certbot/conf/live/*
rm -rf certbot/conf/archive/*
rm -rf certbot/conf/renewal/*

# Re-run setup
./init-ssl.sh
```

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| SSL_QUICKSTART.md | Fast setup guide |
| SSL_SETUP_GUIDE.md | Complete documentation |
| SSL_README.md | Overview and reference |
| SSL_DEPLOYMENT_CHECKLIST.md | Deployment checklist |
| SSL_ARCHITECTURE.md | Architecture diagrams |
| SSL_IMPLEMENTATION_SUMMARY.md | Implementation details |

## 💡 Common Tasks

### Update Nginx Configuration
```bash
# 1. Edit config
nano nginx/conf.d/api.kliks.life.conf

# 2. Test
docker-compose exec nginx nginx -t

# 3. Reload
docker-compose exec nginx nginx -s reload
```

### Add New Subdomain
```bash
# 1. Create config file
cp nginx/conf.d/api.kliks.life.conf nginx/conf.d/new.kliks.life.conf

# 2. Update server_name
nano nginx/conf.d/new.kliks.life.conf

# 3. Request certificate
docker-compose run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  --email your@email.com --agree-tos \
  -d new.kliks.life

# 4. Reload Nginx
docker-compose exec nginx nginx -s reload
```

### View Logs by Domain
```bash
# API logs
docker-compose exec nginx tail -f /var/log/nginx/api.kliks.life.access.log

# Grafana logs
docker-compose exec nginx tail -f /var/log/nginx/grafana.kliks.life.access.log

# PgAdmin logs
docker-compose exec nginx tail -f /var/log/nginx/db.kliks.life.access.log
```

## 🎯 Success Indicators

✅ All services accessible via HTTPS  
✅ No browser certificate warnings  
✅ SSL Labs grade: A+  
✅ Auto-renewal working (dry-run passes)  
✅ HTTP redirects to HTTPS  
✅ Security headers present  

## ⏰ Certificate Timeline

```
Day 0:   Certificate issued (90-day validity)
Day 60:  Auto-renewal window opens
Day 61+: Certificate renewed automatically
Day 121: Next renewal window
```

## 🔗 Useful Links

- Let's Encrypt: https://letsencrypt.org/
- Certbot Docs: https://certbot.eff.org/docs/
- Nginx SSL Docs: https://nginx.org/en/docs/http/configuring_https_servers.html
- SSL Config Generator: https://ssl-config.mozilla.org/

## 🆘 Support

1. Check logs: `docker-compose logs nginx certbot`
2. Run verification: `./verify-ssl-setup.sh`
3. Review guides in SSL_*.md files
4. Check DNS: `dig +short domain.name`

---

**For detailed information, see:**
- 🚀 Quick Setup → `SSL_QUICKSTART.md`
- 📖 Full Guide → `SSL_SETUP_GUIDE.md`
- 🏗️ Architecture → `SSL_ARCHITECTURE.md`

---
