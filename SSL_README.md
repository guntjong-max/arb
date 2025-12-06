# SSL Implementation with Let's Encrypt

Complete SSL/TLS implementation using Let's Encrypt certificates for the Arbitrage Bot platform.

## Overview

This implementation provides secure HTTPS access to all web services using:

- **Nginx** as reverse proxy with SSL termination
- **Let's Encrypt** for free, automated SSL certificates  
- **Certbot** for certificate management and renewal
- **Docker Compose** for service orchestration

## Subdomains Configured

| Subdomain | Service | Backend Port | Description |
|-----------|---------|--------------|-------------|
| `api.kliks.life` | Engine API | 3000 | Main API and WebSocket endpoints |
| `grafana.kliks.life` | Grafana | 3030 | Monitoring dashboard |
| `db.kliks.life` | PgAdmin | 5050 | Database administration |

## Features

### Security Features

✅ **TLS 1.2 & 1.3** - Only modern, secure protocols  
✅ **Strong Cipher Suites** - ECDHE, AES-GCM, ChaCha20-Poly1305  
✅ **HSTS Headers** - Enforce HTTPS for 1 year  
✅ **Security Headers** - X-Frame-Options, X-XSS-Protection, etc.  
✅ **HTTP to HTTPS Redirect** - Automatic upgrade  
✅ **SSL Session Caching** - Performance optimization  
✅ **OCSP Stapling** - Improved certificate validation  

### Operational Features

✅ **Automatic Certificate Renewal** - Runs every 12 hours  
✅ **Zero-Downtime Reload** - Nginx graceful reload  
✅ **Certificate Monitoring** - Built-in verification scripts  
✅ **Comprehensive Logging** - Per-domain access logs  
✅ **WebSocket Support** - Full duplex communication  
✅ **Reverse Proxy** - SSL termination at edge  

## Directory Structure

```
arb/
├── nginx/
│   ├── nginx.conf                      # Main Nginx configuration
│   ├── conf.d/
│   │   ├── 00-initial-setup.conf      # Initial HTTP-only config
│   │   ├── api.kliks.life.conf        # API subdomain config
│   │   ├── grafana.kliks.life.conf    # Grafana subdomain config
│   │   └── db.kliks.life.conf         # PgAdmin subdomain config
│   └── ssl/                            # Additional SSL configs
│
├── certbot/
│   ├── conf/                           # SSL certificates & keys
│   │   └── live/
│   │       ├── api.kliks.life/
│   │       ├── grafana.kliks.life/
│   │       └── db.kliks.life/
│   └── www/                            # ACME challenge files
│
├── docker-compose.yml                  # Updated with Nginx & Certbot
├── init-ssl.sh                         # Initial SSL setup script
├── renew-ssl.sh                        # Certificate renewal script
├── verify-ssl-setup.sh                 # Configuration verification
├── SSL_SETUP_GUIDE.md                  # Detailed documentation
└── SSL_QUICKSTART.md                   # Quick start guide
```

## Quick Start

### 1. Prerequisites

```bash
# Verify DNS records point to your server
dig +short api.kliks.life
dig +short grafana.kliks.life  
dig +short db.kliks.life

# Should all return your server's public IP
curl ifconfig.me
```

### 2. Configure Email

Edit `init-ssl.sh` and update the email address:

```bash
EMAIL="your-email@example.com"
```

### 3. Run Verification

```bash
chmod +x verify-ssl-setup.sh
./verify-ssl-setup.sh
```

### 4. Initialize SSL

```bash
chmod +x init-ssl.sh
./init-ssl.sh
```

### 5. Verify HTTPS

```bash
# Test endpoints
curl -I https://api.kliks.life/health
curl -I https://grafana.kliks.life
curl -I https://db.kliks.life
```

## Detailed Guides

- **[SSL_QUICKSTART.md](SSL_QUICKSTART.md)** - Fast setup guide
- **[SSL_SETUP_GUIDE.md](SSL_SETUP_GUIDE.md)** - Complete documentation

## Docker Compose Services

### Nginx Service

```yaml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./nginx/conf.d:/etc/nginx/conf.d:ro
    - ./certbot/conf:/etc/letsencrypt:ro
    - ./certbot/www:/var/www/certbot:ro
```

### Certbot Service

```yaml
certbot:
  image: certbot/certbot:latest
  volumes:
    - ./certbot/conf:/etc/letsencrypt
    - ./certbot/www:/var/www/certbot
  # Auto-renew every 12 hours
```

## Certificate Management

### View Certificates

```bash
docker-compose run --rm certbot certificates
```

### Test Renewal

```bash
docker-compose run --rm certbot renew --dry-run
```

### Force Renewal

```bash
docker-compose run --rm certbot renew --force-renewal
docker-compose exec nginx nginx -s reload
```

### Certificate Expiration

Certificates are valid for 90 days and auto-renew at 30 days before expiration.

## Nginx Configuration

### SSL Settings

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...';
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_stapling on;
ssl_stapling_verify on;
```

### Security Headers

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

### Proxy Configuration

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

## Monitoring & Logging

### Access Logs

```bash
# Domain-specific logs
docker-compose exec nginx tail -f /var/log/nginx/api.kliks.life.access.log
docker-compose exec nginx tail -f /var/log/nginx/grafana.kliks.life.access.log
docker-compose exec nginx tail -f /var/log/nginx/db.kliks.life.access.log
```

### Error Logs

```bash
docker-compose exec nginx tail -f /var/log/nginx/error.log
```

### Certificate Status

```bash
# Check expiration
docker-compose run --rm certbot certificates

# Check specific certificate
openssl x509 -in certbot/conf/live/api.kliks.life/cert.pem -noout -dates
```

## Troubleshooting

### Common Issues

#### 1. Certificate Request Fails

**Symptoms**: "Challenge failed for domain"

**Solutions**:
- Verify DNS records: `dig +short domain.name`
- Check port 80 accessibility: `curl http://your-server-ip`
- View Certbot logs: `docker-compose logs certbot`
- Ensure firewall allows port 80: `sudo ufw allow 80/tcp`

#### 2. Nginx Configuration Error

**Symptoms**: "nginx: configuration file test failed"

**Solutions**:
```bash
# Test configuration
docker-compose exec nginx nginx -t

# Check syntax in specific file
docker-compose exec nginx cat /etc/nginx/conf.d/api.kliks.life.conf
```

#### 3. Certificate Not Loading

**Symptoms**: "NET::ERR_CERT_AUTHORITY_INVALID"

**Solutions**:
- Verify certificate paths: `ls -la certbot/conf/live/api.kliks.life/`
- Check Nginx is reading certs: `docker-compose logs nginx`
- Reload Nginx: `docker-compose exec nginx nginx -s reload`

#### 4. Rate Limit Exceeded

**Symptoms**: "too many certificates already issued"

**Solutions**:
- Wait 7 days for rate limit reset
- Use staging environment: `--staging` flag
- Check limit status at letsencrypt.org

### Health Checks

```bash
# Nginx health
docker-compose exec nginx nginx -t

# Certificate health
docker-compose run --rm certbot certificates

# SSL test
echo | openssl s_client -connect api.kliks.life:443 -servername api.kliks.life

# Full verification
./verify-ssl-setup.sh
```

## Backup & Recovery

### Backup Certificates

```bash
# Backup certificates and configuration
tar -czf ssl-backup-$(date +%Y%m%d).tar.gz certbot/ nginx/

# Store securely off-site
```

### Restore Certificates

```bash
# Extract backup
tar -xzf ssl-backup-YYYYMMDD.tar.gz

# Restart services
docker-compose restart nginx certbot
```

## Security Best Practices

1. **Keep Email Updated** - Receive expiration notifications
2. **Monitor Certificate Expiration** - Check monthly
3. **Regular Security Audits** - Use SSL Labs quarterly
4. **Update Cipher Suites** - Review annually
5. **Review Access Logs** - Check for suspicious activity
6. **Backup Certificates** - Weekly automated backups
7. **Test Renewal Process** - Monthly dry-run tests

## Testing & Validation

### SSL Labs Test

```
https://www.ssllabs.com/ssltest/analyze.html?d=api.kliks.life
```

Expected grade: **A+**

### Security Headers Test

```
https://securityheaders.com/?q=https://api.kliks.life
```

Expected grade: **A** or better

### Command Line Tests

```bash
# Test SSL handshake
openssl s_client -connect api.kliks.life:443 -servername api.kliks.life

# Test HTTP to HTTPS redirect
curl -I http://api.kliks.life

# Test HSTS header
curl -I https://api.kliks.life | grep -i strict

# Test certificate chain
openssl s_client -connect api.kliks.life:443 -showcerts
```

## Performance Optimization

### SSL Session Caching

Already configured for optimal performance:

```nginx
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

### HTTP/2 Support

Enabled by default:

```nginx
listen 443 ssl http2;
```

### Compression

Gzip compression enabled for:
- Text files (HTML, CSS, JS)
- JSON responses
- XML files
- SVG images

## Automation

### Auto-Renewal

Certbot container automatically checks for renewal every 12 hours.

### Cron Job (Optional)

Add additional safety with cron:

```bash
crontab -e

# Add line:
0 3,15 * * * /data/workspace/arb/renew-ssl.sh >> /var/log/certbot-renewal.log 2>&1
```

### Monitoring Script

```bash
# Add to cron for daily certificate check
0 9 * * * /data/workspace/arb/verify-ssl-setup.sh | mail -s "SSL Status" admin@example.com
```

## Support & Resources

### Documentation
- [SSL_SETUP_GUIDE.md](SSL_SETUP_GUIDE.md) - Complete guide
- [SSL_QUICKSTART.md](SSL_QUICKSTART.md) - Quick start

### External Resources
- [Let's Encrypt](https://letsencrypt.org/)
- [Certbot](https://certbot.eff.org/)
- [Nginx SSL Config](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Mozilla SSL Config Generator](https://ssl-config.mozilla.org/)

### Tools
- [SSL Labs Test](https://www.ssllabs.com/ssltest/)
- [Security Headers](https://securityheaders.com/)
- [Certificate Transparency Log](https://crt.sh/)

## License

This SSL implementation follows the same license as the main project.

## Changelog

### v1.0.0 (2025-12-06)
- Initial SSL implementation
- Nginx reverse proxy with SSL termination
- Let's Encrypt certificate automation
- Auto-renewal configuration
- Comprehensive documentation
- Verification and monitoring scripts

---

**For quick setup, see [SSL_QUICKSTART.md](SSL_QUICKSTART.md)**

**For detailed information, see [SSL_SETUP_GUIDE.md](SSL_SETUP_GUIDE.md)**
