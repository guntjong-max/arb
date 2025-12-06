# SSL Certificate Setup and Management Guide

## Overview

This guide covers the setup and management of Let's Encrypt SSL certificates for the following subdomains:

- **https://api.kliks.life** → Engine API (port 3000)
- **https://grafana.kliks.life** → Grafana Dashboard (port 3030)
- **https://db.kliks.life** → PgAdmin (port 5050)

## Architecture

The SSL implementation uses:

- **Nginx**: Reverse proxy with SSL termination
- **Certbot**: Let's Encrypt certificate management
- **Docker Compose**: Orchestration of all services

```
Internet (HTTPS) → Nginx (SSL Termination) → Backend Services (HTTP)
                    ↓
               Certbot (Certificate Management)
```

## Prerequisites

### 1. DNS Configuration

Before setting up SSL certificates, ensure all domains point to your server's public IP:

```bash
# Check DNS records
dig +short api.kliks.life
dig +short grafana.kliks.life
dig +short db.kliks.life
```

All three should return your server's public IP address.

### 2. Firewall Configuration

Ensure the following ports are open:

```bash
# HTTP (for Let's Encrypt challenge)
sudo ufw allow 80/tcp

# HTTPS (for secure connections)
sudo ufw allow 443/tcp

# Check firewall status
sudo ufw status
```

### 3. Update Email Address

Edit the `init-ssl.sh` script and update the email address:

```bash
EMAIL="your-email@example.com"  # Change this to your email
```

## Initial Setup

### Step 1: Prepare the Environment

```bash
# Navigate to project directory
cd /data/workspace/arb

# Create necessary directories (already created by init-ssl.sh)
mkdir -p nginx/conf.d nginx/ssl certbot/conf certbot/www
```

### Step 2: Make Scripts Executable

```bash
chmod +x init-ssl.sh
chmod +x renew-ssl.sh
```

### Step 3: Start Services Without SSL

First, start all backend services:

```bash
docker-compose up -d engine grafana pgadmin postgres redis prometheus
```

### Step 4: Run SSL Setup Script

```bash
./init-ssl.sh
```

This script will:
1. Verify DNS configuration for all domains
2. Start Nginx for HTTP-01 challenge
3. Request SSL certificates from Let's Encrypt
4. Reload Nginx with SSL configuration

### Step 5: Verify SSL Certificates

Check that certificates were created successfully:

```bash
# List certificates
docker-compose run --rm certbot certificates

# Check certificate details for a specific domain
docker-compose run --rm certbot certificates --cert-name api.kliks.life
```

## Certificate Renewal

### Automatic Renewal

Certbot automatically renews certificates within 30 days of expiration. The renewal process runs every 12 hours via the Certbot container.

### Manual Renewal

To manually renew certificates:

```bash
# Test renewal (dry run)
docker-compose run --rm certbot renew --dry-run

# Force renewal
docker-compose run --rm certbot renew --force-renewal

# Reload Nginx after renewal
docker-compose exec nginx nginx -s reload
```

### Cron Job Setup (Optional)

For additional safety, set up a cron job:

```bash
# Edit crontab
crontab -e

# Add this line to run renewal twice daily at 3am and 3pm
0 3,15 * * * /data/workspace/arb/renew-ssl.sh >> /var/log/certbot-renewal.log 2>&1
```

## Nginx Configuration

### Configuration Files

```
nginx/
├── nginx.conf                    # Main Nginx configuration
└── conf.d/
    ├── api.kliks.life.conf      # API subdomain
    ├── grafana.kliks.life.conf  # Grafana subdomain
    └── db.kliks.life.conf       # PgAdmin subdomain
```

### Testing Nginx Configuration

```bash
# Test configuration syntax
docker-compose exec nginx nginx -t

# Reload configuration
docker-compose exec nginx nginx -s reload

# View logs
docker-compose logs nginx
docker-compose logs certbot
```

## Troubleshooting

### Certificate Request Fails

**Problem**: Certificate request fails with "Challenge failed" error.

**Solutions**:

1. **Check DNS**:
   ```bash
   dig +short api.kliks.life
   ```

2. **Verify port 80 is accessible**:
   ```bash
   curl -I http://api.kliks.life/.well-known/acme-challenge/test
   ```

3. **Check Nginx logs**:
   ```bash
   docker-compose logs nginx
   ```

4. **Verify firewall**:
   ```bash
   sudo ufw status
   ```

### SSL Certificate Not Loading

**Problem**: Website shows "Certificate Invalid" or "Not Secure".

**Solutions**:

1. **Check certificate paths**:
   ```bash
   ls -la certbot/conf/live/api.kliks.life/
   ```

2. **Verify Nginx is reading certificates**:
   ```bash
   docker-compose exec nginx cat /etc/letsencrypt/live/api.kliks.life/fullchain.pem
   ```

3. **Test SSL configuration**:
   ```bash
   openssl s_client -connect api.kliks.life:443 -servername api.kliks.life
   ```

### Nginx Configuration Errors

**Problem**: Nginx fails to start or reload.

**Solutions**:

1. **Test configuration**:
   ```bash
   docker-compose exec nginx nginx -t
   ```

2. **Check logs**:
   ```bash
   docker-compose logs nginx --tail=100
   ```

3. **Verify file permissions**:
   ```bash
   ls -la nginx/conf.d/
   ```

### Rate Limiting

**Problem**: Let's Encrypt rate limit exceeded.

**Solution**: Let's Encrypt has rate limits (50 certificates per domain per week). If you hit the limit:

1. Wait for the rate limit to reset (1 week)
2. Use staging environment for testing:
   ```bash
   # Add --staging flag to certbot command
   docker-compose run --rm certbot certonly --staging --webroot ...
   ```

### Certificate Expiration

**Problem**: Certificate is about to expire or has expired.

**Solutions**:

1. **Check expiration date**:
   ```bash
   docker-compose run --rm certbot certificates
   ```

2. **Force renewal**:
   ```bash
   docker-compose run --rm certbot renew --force-renewal
   docker-compose exec nginx nginx -s reload
   ```

## Security Best Practices

### 1. HSTS (HTTP Strict Transport Security)

Already enabled in Nginx configuration:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

### 2. Security Headers

The following security headers are configured:

- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-XSS-Protection**: Enables XSS filter
- **Referrer-Policy**: Controls referrer information

### 3. Strong Cipher Suites

Using modern, secure cipher suites:

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...';
```

### 4. SSL Session Cache

Optimized for performance:

```nginx
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

## Testing SSL Configuration

### Online Tools

1. **SSL Labs Test**: https://www.ssllabs.com/ssltest/
   ```
   https://www.ssllabs.com/ssltest/analyze.html?d=api.kliks.life
   ```

2. **Security Headers**: https://securityheaders.com/
   ```
   https://securityheaders.com/?q=https://api.kliks.life
   ```

### Command Line Tests

```bash
# Test SSL certificate
openssl s_client -connect api.kliks.life:443 -servername api.kliks.life

# Check certificate expiration
echo | openssl s_client -connect api.kliks.life:443 -servername api.kliks.life 2>/dev/null | openssl x509 -noout -dates

# Test cipher suites
nmap --script ssl-enum-ciphers -p 443 api.kliks.life

# Test HSTS
curl -I https://api.kliks.life | grep -i strict
```

## Monitoring

### Certificate Expiration Monitoring

```bash
# Check all certificates
docker-compose run --rm certbot certificates

# Check specific certificate
docker-compose exec nginx openssl x509 -in /etc/letsencrypt/live/api.kliks.life/cert.pem -noout -dates
```

### Nginx Logs

```bash
# Access logs
docker-compose exec nginx tail -f /var/log/nginx/access.log

# Error logs
docker-compose exec nginx tail -f /var/log/nginx/error.log

# Domain-specific logs
docker-compose exec nginx tail -f /var/log/nginx/api.kliks.life.access.log
docker-compose exec nginx tail -f /var/log/nginx/grafana.kliks.life.access.log
docker-compose exec nginx tail -f /var/log/nginx/db.kliks.life.access.log
```

## Backup and Recovery

### Backup Certificates

```bash
# Backup all certificates
tar -czf certbot-backup-$(date +%Y%m%d).tar.gz certbot/conf/

# Backup Nginx configuration
tar -czf nginx-backup-$(date +%Y%m%d).tar.gz nginx/
```

### Restore Certificates

```bash
# Extract backup
tar -xzf certbot-backup-YYYYMMDD.tar.gz

# Restart services
docker-compose restart nginx certbot
```

## Maintenance

### Regular Tasks

1. **Weekly**: Check certificate expiration dates
2. **Monthly**: Review Nginx logs for errors
3. **Quarterly**: Test SSL configuration with online tools
4. **Annually**: Review and update security headers and cipher suites

### Updating Nginx Configuration

```bash
# 1. Edit configuration
nano nginx/conf.d/api.kliks.life.conf

# 2. Test configuration
docker-compose exec nginx nginx -t

# 3. Reload if test passes
docker-compose exec nginx nginx -s reload
```

## Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://certbot.eff.org/docs/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)

## Support

If you encounter issues not covered in this guide:

1. Check the logs: `docker-compose logs nginx certbot`
2. Verify DNS configuration: `dig +short domain.name`
3. Test connectivity: `curl -I http://domain.name`
4. Check Let's Encrypt status: https://letsencrypt.status.io/

## Quick Reference

### Common Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart Nginx
docker-compose restart nginx

# View logs
docker-compose logs -f nginx
docker-compose logs -f certbot

# Test Nginx configuration
docker-compose exec nginx nginx -t

# Reload Nginx
docker-compose exec nginx nginx -s reload

# Check certificates
docker-compose run --rm certbot certificates

# Renew certificates
docker-compose run --rm certbot renew

# Force certificate renewal
docker-compose run --rm certbot renew --force-renewal
```

### File Locations

```
/data/workspace/arb/
├── nginx/
│   ├── nginx.conf                 # Main config
│   └── conf.d/*.conf             # Site configs
├── certbot/
│   ├── conf/                     # Certificates
│   └── www/                      # ACME challenge
├── init-ssl.sh                   # Initial setup
└── renew-ssl.sh                  # Renewal script
```
