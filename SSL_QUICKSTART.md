# Quick Start: SSL Setup

This guide will help you quickly set up Let's Encrypt SSL certificates for your subdomains.

## Prerequisites Checklist

- [ ] DNS records configured for all domains:
  - `api.kliks.life` → Your server IP
  - `grafana.kliks.life` → Your server IP
  - `db.kliks.life` → Your server IP
- [ ] Ports 80 and 443 open in firewall
- [ ] Docker and Docker Compose installed
- [ ] Valid email address for Let's Encrypt notifications

## Step-by-Step Setup

### 1. Update Email Address

Edit `init-ssl.sh` and change the email:

```bash
nano init-ssl.sh
# Find and update: EMAIL="your-email@example.com"
```

### 2. Verify Configuration

Run the verification script to check your setup:

```bash
./verify-ssl-setup.sh
```

Fix any errors reported before continuing.

### 3. Start Backend Services

Start all services except nginx:

```bash
docker-compose up -d engine grafana pgadmin postgres redis prometheus
```

Wait about 30 seconds for services to be healthy.

### 4. Run SSL Setup

Execute the SSL initialization script:

```bash
./init-ssl.sh
```

This will:
- Verify DNS configuration
- Start Nginx
- Request SSL certificates from Let's Encrypt
- Configure HTTPS for all subdomains

### 5. Verify SSL is Working

Test each subdomain in your browser:

```bash
# Test API
curl -I https://api.kliks.life/health

# Test Grafana
curl -I https://grafana.kliks.life

# Test PgAdmin
curl -I https://db.kliks.life
```

Or open in browser:
- https://api.kliks.life
- https://grafana.kliks.life
- https://db.kliks.life

### 6. Set Up Auto-Renewal (Optional)

Add cron job for automatic certificate renewal:

```bash
crontab -e
```

Add this line:

```
0 3,15 * * * /data/workspace/arb/renew-ssl.sh >> /var/log/certbot-renewal.log 2>&1
```

## Troubleshooting

### DNS Issues

If DNS verification fails:

```bash
# Check DNS for each domain
dig +short api.kliks.life
dig +short grafana.kliks.life
dig +short db.kliks.life

# Should all return your server's public IP
curl ifconfig.me
```

### Certificate Request Fails

If Let's Encrypt fails to issue certificates:

1. **Check port 80 is accessible:**
   ```bash
   # From another machine
   curl http://YOUR_SERVER_IP
   ```

2. **Check Nginx logs:**
   ```bash
   docker-compose logs nginx
   ```

3. **Try manual certificate request:**
   ```bash
   docker-compose run --rm certbot certonly \
     --webroot \
     --webroot-path=/var/www/certbot \
     --email your-email@example.com \
     --agree-tos \
     --no-eff-email \
     -d api.kliks.life
   ```

### Services Not Accessible

If you can't access the services:

1. **Check Docker services are running:**
   ```bash
   docker-compose ps
   ```

2. **Check Nginx configuration:**
   ```bash
   docker-compose exec nginx nginx -t
   ```

3. **View logs:**
   ```bash
   docker-compose logs nginx
   docker-compose logs engine
   docker-compose logs grafana
   ```

## Testing SSL Configuration

### Test SSL Certificate

```bash
# Check certificate details
echo | openssl s_client -connect api.kliks.life:443 -servername api.kliks.life 2>/dev/null | openssl x509 -noout -text

# Check expiration
echo | openssl s_client -connect api.kliks.life:443 2>/dev/null | openssl x509 -noout -dates
```

### Test SSL Grade

Use online tools:
- SSL Labs: https://www.ssllabs.com/ssltest/
- Security Headers: https://securityheaders.com/

## Common Commands

```bash
# View all certificates
docker-compose run --rm certbot certificates

# Test renewal (dry run)
docker-compose run --rm certbot renew --dry-run

# Force renewal
docker-compose run --rm certbot renew --force-renewal

# Restart Nginx
docker-compose restart nginx

# View Nginx logs
docker-compose logs -f nginx

# Check Nginx configuration
docker-compose exec nginx nginx -t

# Reload Nginx configuration
docker-compose exec nginx nginx -s reload
```

## Architecture Overview

```
                     ┌──────────────────────┐
                     │   Internet (HTTPS)   │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │   Nginx (Port 443)   │
                     │   SSL Termination    │
                     └──────────┬───────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
       ┌────────▼─────┐  ┌─────▼──────┐  ┌────▼─────┐
       │  Engine API  │  │  Grafana   │  │ PgAdmin  │
       │  (Port 3000) │  │ (Port 3000)│  │ (Port 80)│
       └──────────────┘  └────────────┘  └──────────┘
```

## Security Features

✓ **TLS 1.2 and 1.3** - Modern encryption protocols
✓ **Strong cipher suites** - Secure encryption algorithms
✓ **HSTS enabled** - Force HTTPS connections
✓ **Security headers** - Protection against common attacks
✓ **HTTP to HTTPS redirect** - Automatic secure upgrade
✓ **SSL session caching** - Improved performance

## Next Steps

1. Monitor certificate expiration dates
2. Set up monitoring alerts for certificate renewal
3. Review Nginx logs regularly
4. Test SSL configuration periodically
5. Keep Docker images updated

## Support

For detailed information, see:
- `SSL_SETUP_GUIDE.md` - Complete documentation
- `docker-compose.yml` - Service configuration
- `nginx/conf.d/*.conf` - Nginx site configurations

## Files Created

```
nginx/
├── nginx.conf                      # Main Nginx config
└── conf.d/
    ├── api.kliks.life.conf        # API subdomain config
    ├── grafana.kliks.life.conf    # Grafana subdomain config
    └── db.kliks.life.conf         # PgAdmin subdomain config

certbot/
├── conf/                          # SSL certificates
└── www/                           # ACME challenge files

Scripts:
├── init-ssl.sh                    # Initial SSL setup
├── renew-ssl.sh                   # Certificate renewal
└── verify-ssl-setup.sh            # Configuration verification
```

## Success Criteria

Your setup is complete when:
- ✓ All three domains accessible via HTTPS
- ✓ No browser certificate warnings
- ✓ SSL Labs test shows A+ rating
- ✓ Auto-renewal configured and tested
- ✓ All services functioning correctly

---

**Important**: Keep your email updated in certbot configuration to receive expiration notifications!
