# SSL Deployment Checklist

Use this checklist to ensure a smooth SSL deployment.

## Pre-Deployment

### DNS Configuration
- [ ] `api.kliks.life` A record points to server IP
- [ ] `grafana.kliks.life` A record points to server IP
- [ ] `db.kliks.life` A record points to server IP
- [ ] DNS propagation completed (24-48 hours)
- [ ] Verify with: `dig +short domain.name`

### Server Prerequisites
- [ ] Docker installed (version 20.10+)
- [ ] Docker Compose installed (version 1.29+)
- [ ] Port 80 open in firewall
- [ ] Port 443 open in firewall
- [ ] Server has public IP address
- [ ] Sufficient disk space (>5GB free)

### Email Configuration
- [ ] Valid email address for Let's Encrypt notifications
- [ ] Email updated in `init-ssl.sh` script
- [ ] Email can receive external messages

### Backup Current Setup
- [ ] Backup existing docker-compose.yml
- [ ] Backup any custom configurations
- [ ] Document current port mappings
- [ ] Export critical data from databases

## Deployment Steps

### 1. File Preparation
- [ ] All Nginx configuration files in place
- [ ] Scripts are executable (`chmod +x *.sh`)
- [ ] docker-compose.yml updated with nginx and certbot services
- [ ] Directory structure created (nginx/, certbot/)

### 2. Configuration Verification
- [ ] Run `./verify-ssl-setup.sh`
- [ ] All checks pass or warnings addressed
- [ ] Nginx configuration syntax valid
- [ ] No conflicting services on ports 80/443

### 3. Service Startup
- [ ] Start backend services first:
  ```bash
  docker-compose up -d engine grafana pgadmin postgres redis prometheus
  ```
- [ ] Wait for health checks to pass (30-60 seconds)
- [ ] Verify services are healthy: `docker-compose ps`

### 4. SSL Certificate Generation
- [ ] Run `./init-ssl.sh`
- [ ] DNS verification passed for all domains
- [ ] Nginx started successfully
- [ ] Certificates obtained for all three domains
- [ ] No rate limit errors from Let's Encrypt
- [ ] Nginx reloaded with SSL configuration

### 5. HTTPS Verification
- [ ] `https://api.kliks.life` accessible
- [ ] `https://grafana.kliks.life` accessible
- [ ] `https://db.kliks.life` accessible
- [ ] No certificate warnings in browser
- [ ] HTTP redirects to HTTPS working

### 6. Functional Testing
- [ ] API endpoints responding correctly
- [ ] Grafana login page loads
- [ ] PgAdmin interface accessible
- [ ] WebSocket connections working (if applicable)
- [ ] Static assets loading correctly

## Post-Deployment

### SSL Testing
- [ ] Run SSL Labs test (Grade A or A+)
  ```
  https://www.ssllabs.com/ssltest/analyze.html?d=api.kliks.life
  ```
- [ ] Run Security Headers test
  ```
  https://securityheaders.com/?q=https://api.kliks.life
  ```
- [ ] Test with `openssl s_client`
- [ ] Verify HSTS headers present
- [ ] Check certificate chain validity

### Certificate Verification
- [ ] Run: `docker-compose run --rm certbot certificates`
- [ ] All three certificates listed
- [ ] Expiration dates > 60 days in future
- [ ] Certificate paths correct
- [ ] No error messages

### Renewal Testing
- [ ] Test renewal: `docker-compose run --rm certbot renew --dry-run`
- [ ] Dry-run successful for all domains
- [ ] Certbot container running
- [ ] Auto-renewal configured (every 12 hours)

### Optional: Cron Job Setup
- [ ] Create cron job for renewal script
- [ ] Test cron job execution
- [ ] Verify log file creation
- [ ] Set up log rotation

### Monitoring Setup
- [ ] Certificate expiration monitoring configured
- [ ] Nginx error logs being collected
- [ ] Access logs available for analysis
- [ ] Alert system for certificate expiration

### Documentation
- [ ] Update team documentation with new URLs
- [ ] Document SSL certificate renewal process
- [ ] Share SSL_QUICKSTART.md with team
- [ ] Update API documentation with HTTPS endpoints

## Rollback Plan

If issues occur during deployment:

### Immediate Rollback Steps
1. Stop nginx container:
   ```bash
   docker-compose stop nginx certbot
   ```

2. Restore previous docker-compose.yml:
   ```bash
   cp docker-compose.yml.backup docker-compose.yml
   ```

3. Restart services:
   ```bash
   docker-compose up -d
   ```

### Troubleshooting Before Rollback
- [ ] Check logs: `docker-compose logs nginx certbot`
- [ ] Verify DNS: `dig +short domain.name`
- [ ] Test connectivity: `curl -I http://server-ip`
- [ ] Check firewall: `sudo ufw status`

## Security Checklist

### Immediate Security Tasks
- [ ] HTTP to HTTPS redirect working
- [ ] HSTS headers configured
- [ ] Security headers present (X-Frame-Options, etc.)
- [ ] TLS 1.2 minimum protocol
- [ ] Strong cipher suites only

### Ongoing Security Tasks
- [ ] Regular SSL Labs testing (quarterly)
- [ ] Certificate expiration monitoring (monthly)
- [ ] Review access logs (weekly)
- [ ] Update cipher suites (annually)
- [ ] Security audit (annually)

## Performance Checklist

### Initial Performance Checks
- [ ] HTTP/2 enabled
- [ ] SSL session caching configured
- [ ] Gzip compression working
- [ ] Response times acceptable
- [ ] No timeout errors

### Monitoring Setup
- [ ] Response time monitoring
- [ ] SSL handshake time tracking
- [ ] Error rate monitoring
- [ ] Resource usage tracking

## Maintenance Schedule

### Daily
- [ ] Check container health: `docker-compose ps`
- [ ] Review error logs if issues reported

### Weekly
- [ ] Check certificate status
- [ ] Review access logs for anomalies
- [ ] Verify all services accessible

### Monthly
- [ ] Test certificate renewal (dry-run)
- [ ] Review security headers
- [ ] Check for Nginx/Certbot updates
- [ ] Backup certificates and configs

### Quarterly
- [ ] Run SSL Labs test
- [ ] Review cipher suite configuration
- [ ] Update documentation if needed
- [ ] Security audit

### Annually
- [ ] Full security review
- [ ] Update TLS protocols/ciphers
- [ ] Review and update documentation
- [ ] Disaster recovery test

## Success Criteria

Deployment is successful when:

✅ All services accessible via HTTPS
✅ No certificate warnings in browsers
✅ SSL Labs grade A or A+
✅ Auto-renewal working (dry-run passes)
✅ All functional tests pass
✅ No errors in logs
✅ HTTP redirects to HTTPS
✅ WebSocket connections working
✅ Performance acceptable
✅ Team trained on new setup

## Emergency Contacts

- **DNS Provider**: _____________________
- **Hosting Provider**: _____________________
- **On-Call Engineer**: _____________________
- **Backup Contact**: _____________________

## Notes

Record any deployment-specific information:

---

**Deployment Date**: _______________

**Deployed By**: _______________

**Issues Encountered**: 
_________________________________________________
_________________________________________________
_________________________________________________

**Resolution Steps**:
_________________________________________________
_________________________________________________
_________________________________________________

**Post-Deployment Notes**:
_________________________________________________
_________________________________________________
_________________________________________________

---

## Sign-off

- [ ] Technical Lead Approval: _______________ Date: _______
- [ ] Security Review: _______________ Date: _______
- [ ] Operations Sign-off: _______________ Date: _______

---

**Keep this checklist for reference and future deployments!**
