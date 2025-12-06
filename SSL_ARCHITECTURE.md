# SSL Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET (HTTPS)                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
         ┌──────▼─────┐ ┌─────▼──────┐ ┌────▼─────┐
         │api.kliks.  │ │grafana.    │ │db.kliks. │
         │life:443    │ │kliks.life  │ │life:443  │
         │            │ │:443        │ │          │
         └──────┬─────┘ └─────┬──────┘ └────┬─────┘
                │              │              │
                └──────────────┼──────────────┘
                               │
                   ┌───────────▼────────────┐
                   │   Nginx (Port 80/443)  │
                   │   - SSL Termination    │
                   │   - Reverse Proxy      │
                   │   - Security Headers   │
                   │   - HTTP/2 Support     │
                   └───────────┬────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
         ┌──────▼─────┐ ┌─────▼──────┐ ┌────▼─────┐
         │  Engine    │ │  Grafana   │ │ PgAdmin  │
         │  :3000     │ │  :3000     │ │  :80     │
         │  (HTTP)    │ │  (HTTP)    │ │  (HTTP)  │
         └────────────┘ └────────────┘ └──────────┘
```

## Certificate Management Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    Certificate Lifecycle                         │
└──────────────────────────────────────────────────────────────────┘

1. Initial Setup:
   ┌─────────────┐
   │  init-ssl.sh│
   └──────┬──────┘
          │
          ▼
   ┌─────────────────┐     ┌──────────────┐
   │ DNS Verification│────▶│ Start Nginx  │
   └─────────────────┘     └──────┬───────┘
                                  │
                                  ▼
                        ┌─────────────────┐
                        │ HTTP-01 Challenge│
                        │ (Port 80)        │
                        └─────────┬────────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │   Let's Encrypt  │
                        │   CA Validation  │
                        └─────────┬────────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │ Certificate      │
                        │ Issued (90 days) │
                        └─────────┬────────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │ Nginx Reload     │
                        │ with SSL Config  │
                        └──────────────────┘

2. Auto-Renewal (Every 12 Hours):
   ┌──────────────────┐
   │ Certbot Container│
   │ (Background)     │
   └────────┬─────────┘
            │
            ▼
   ┌─────────────────┐     ┌──────────────┐
   │ Check Expiration│────▶│ < 30 days?   │
   └─────────────────┘     └──────┬───────┘
                                  │ Yes
                                  ▼
                        ┌──────────────────┐
                        │ Request Renewal  │
                        └─────────┬────────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │ Update Certs     │
                        └─────────┬────────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │ Reload Nginx     │
                        └──────────────────┘
```

## Request Flow (HTTPS)

```
┌──────────────────────────────────────────────────────────────────┐
│                    HTTPS Request Flow                            │
└──────────────────────────────────────────────────────────────────┘

1. Client Request:
   ┌─────────┐
   │ Browser │
   └────┬────┘
        │ https://api.kliks.life/health
        │
        ▼
   ┌─────────────┐
   │   DNS       │
   │   Lookup    │
   └──────┬──────┘
          │ Server IP
          │
          ▼
   ┌─────────────────┐
   │  TLS Handshake  │
   │  (Port 443)     │
   └──────┬──────────┘
          │
          ▼
   ┌─────────────────┐
   │ Nginx receives  │
   │ encrypted req   │
   └──────┬──────────┘
          │
          ▼
   ┌─────────────────────┐
   │ SSL Termination     │
   │ (Decrypt)           │
   └──────┬──────────────┘
          │
          ▼
   ┌─────────────────────┐
   │ Apply Security      │
   │ Headers             │
   └──────┬──────────────┘
          │
          ▼
   ┌─────────────────────┐
   │ Proxy to Engine:3000│
   │ (HTTP - Internal)   │
   └──────┬──────────────┘
          │
          ▼
   ┌─────────────────────┐
   │ Engine processes    │
   │ request             │
   └──────┬──────────────┘
          │
          ▼
   ┌─────────────────────┐
   │ Response to Nginx   │
   └──────┬──────────────┘
          │
          ▼
   ┌─────────────────────┐
   │ Nginx encrypts      │
   │ response (TLS)      │
   └──────┬──────────────┘
          │
          ▼
   ┌─────────────────────┐
   │ Send to Client      │
   └──────┬──────────────┘
          │
          ▼
   ┌─────────┐
   │ Browser │
   │ Renders │
   └─────────┘
```

## HTTP to HTTPS Redirect Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    HTTP Redirect Flow                            │
└──────────────────────────────────────────────────────────────────┘

Client sends HTTP request:
   │
   │ http://api.kliks.life/health
   ▼
┌──────────────┐
│ Nginx :80    │
│ HTTP Server  │
└──────┬───────┘
       │
       ▼
┌───────────────────────┐
│ Match server_name     │
│ api.kliks.life        │
└──────┬────────────────┘
       │
       ▼
┌───────────────────────────────┐
│ Return 301 Redirect           │
│ Location: https://api.kliks.  │
│ life/health                   │
└──────┬────────────────────────┘
       │
       ▼
┌──────────────┐
│ Client       │
│ Redirects    │
└──────┬───────┘
       │
       │ https://api.kliks.life/health
       ▼
┌──────────────┐
│ Normal HTTPS │
│ Flow (443)   │
└──────────────┘
```

## Security Layers

```
┌──────────────────────────────────────────────────────────────────┐
│                    Security Stack                                │
└──────────────────────────────────────────────────────────────────┘

Layer 1: Transport Security
┌───────────────────────────────┐
│ TLS 1.2 / TLS 1.3             │
│ - ECDHE Key Exchange          │
│ - AES-GCM / ChaCha20 Cipher   │
│ - SHA256/384 Hash             │
└───────────────────────────────┘

Layer 2: Certificate Validation
┌───────────────────────────────┐
│ Let's Encrypt Certificate     │
│ - RSA 2048-bit                │
│ - SHA-256 Signature           │
│ - OCSP Stapling               │
└───────────────────────────────┘

Layer 3: HTTP Security Headers
┌───────────────────────────────┐
│ HSTS (1 year preload)         │
│ X-Frame-Options               │
│ X-Content-Type-Options        │
│ X-XSS-Protection              │
│ Referrer-Policy               │
└───────────────────────────────┘

Layer 4: SSL/TLS Configuration
┌───────────────────────────────┐
│ Session Caching (10MB)        │
│ OCSP Stapling                 │
│ Strong Cipher Order           │
│ No weak protocols/ciphers     │
└───────────────────────────────┘

Layer 5: Network Security
┌───────────────────────────────┐
│ Firewall (ufw)                │
│ - Port 80 (HTTP)              │
│ - Port 443 (HTTPS)            │
│ Internal network isolation    │
└───────────────────────────────┘
```

## Docker Network Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    Docker Network: arb-network                   │
│                    Subnet: 172.25.0.0/16                         │
└──────────────────────────────────────────────────────────────────┘

External Access (Host Ports):
┌──────────┐  ┌──────────┐
│  80:80   │  │ 443:443  │
└────┬─────┘  └────┬─────┘
     │             │
     └─────┬───────┘
           │
      ┌────▼─────┐
      │  Nginx   │
      └────┬─────┘
           │
    ┌──────┴──────────────────────┐
    │                             │
┌───▼────┐  ┌─────────┐  ┌───────▼──┐
│Engine  │  │Grafana  │  │ PgAdmin  │
│:3000   │  │:3000    │  │ :80      │
└───┬────┘  └────┬────┘  └───┬──────┘
    │            │            │
    ├────────────┼────────────┤
    │                         │
┌───▼────┐  ┌────────┐  ┌────▼──────┐
│Postgres│  │ Redis  │  │Prometheus │
│:5432   │  │:6379   │  │ :9090     │
└────────┘  └────────┘  └───────────┘

All services on internal network (arb-network)
Only Nginx exposes ports to host
Backend services accessible only via Nginx proxy
```

## Certificate Directory Structure

```
certbot/
├── conf/
│   ├── live/
│   │   ├── api.kliks.life/
│   │   │   ├── fullchain.pem    → ../../archive/.../fullchain.pem
│   │   │   ├── privkey.pem      → ../../archive/.../privkey.pem
│   │   │   ├── cert.pem         → ../../archive/.../cert.pem
│   │   │   └── chain.pem        → ../../archive/.../chain.pem
│   │   │
│   │   ├── grafana.kliks.life/
│   │   │   └── (same structure)
│   │   │
│   │   └── db.kliks.life/
│   │       └── (same structure)
│   │
│   ├── archive/
│   │   ├── api.kliks.life/
│   │   │   ├── fullchain1.pem
│   │   │   ├── fullchain2.pem   (after renewal)
│   │   │   ├── privkey1.pem
│   │   │   └── privkey2.pem     (after renewal)
│   │   │
│   │   └── (similar for other domains)
│   │
│   └── renewal/
│       ├── api.kliks.life.conf
│       ├── grafana.kliks.life.conf
│       └── db.kliks.life.conf
│
└── www/
    └── .well-known/
        └── acme-challenge/
            └── (challenge files during validation)
```

## Volume Mounts

```
Docker Host                    Container

nginx/nginx.conf          →    /etc/nginx/nginx.conf (ro)
nginx/conf.d/             →    /etc/nginx/conf.d/ (ro)
certbot/conf/             →    /etc/letsencrypt/ (ro for nginx)
certbot/www/              →    /var/www/certbot/ (ro for nginx)

certbot/conf/             →    /etc/letsencrypt/ (rw for certbot)
certbot/www/              →    /var/www/certbot/ (rw for certbot)

ro = read-only
rw = read-write
```

## Certificate Renewal Timeline

```
Day 0:   [Certificate Issued]
         ↓
         Valid for 90 days
         ↓
Day 60:  [Auto-Renewal Window Opens]
         ↓
         Certbot checks every 12 hours
         ↓
Day 61:  [Certificate Renewed]
         ↓
         New cert valid for 90 days
         ↓
         Nginx reloaded automatically
         ↓
Day 121: [Next renewal window]
         ↓
         Process repeats
```

## Monitoring & Logging

```
┌──────────────────────────────────────────────────────────────────┐
│                    Logging Architecture                          │
└──────────────────────────────────────────────────────────────────┘

Nginx Logs:
├── /var/log/nginx/access.log            (all requests)
├── /var/log/nginx/error.log             (errors)
├── /var/log/nginx/api.kliks.life.access.log
├── /var/log/nginx/api.kliks.life.error.log
├── /var/log/nginx/grafana.kliks.life.access.log
├── /var/log/nginx/grafana.kliks.life.error.log
├── /var/log/nginx/db.kliks.life.access.log
└── /var/log/nginx/db.kliks.life.error.log

Certbot Logs:
└── Docker logs (docker-compose logs certbot)

Access via:
$ docker-compose logs -f nginx
$ docker-compose logs -f certbot
$ docker-compose exec nginx tail -f /var/log/nginx/access.log
```

## Deployment States

```
State 1: Pre-SSL (Current)
┌─────────┐
│ Client  │
└────┬────┘
     │ HTTP :3000, :3030, :5050
     ▼
┌──────────────┐
│ Direct Access│
│ to Services  │
└──────────────┘

State 2: During SSL Setup
┌─────────┐
│ Client  │
└────┬────┘
     │ HTTP :80
     ▼
┌──────────┐
│  Nginx   │
└────┬─────┘
     │ ACME Challenge
     ▼
┌────────────┐
│ Certbot    │
│ Validation │
└────────────┘

State 3: Post-SSL (Target)
┌─────────┐
│ Client  │
└────┬────┘
     │ HTTPS :443
     ▼
┌──────────┐
│  Nginx   │
│  (SSL)   │
└────┬─────┘
     │ HTTP (internal)
     ▼
┌──────────────┐
│   Services   │
│ :3000 :3030  │
│ :5050        │
└──────────────┘
```

## Performance Optimization Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                  Performance Features                            │
└──────────────────────────────────────────────────────────────────┘

1. Initial Request (Cold):
   Client → TLS Handshake (~100ms)
         → Session ID Generated
         → Full Certificate Exchange
         → Request Processed
         → Response Encrypted & Sent

2. Subsequent Requests (Warm):
   Client → TLS Session Resume (~10ms)
         → Cached Session ID Used
         → Abbreviated Handshake
         → Request Processed
         → Response Encrypted & Sent

3. HTTP/2 Benefits:
   Client → Single TCP Connection
         → Multiple Streams (Multiplexing)
         → Header Compression
         → Server Push Capability
         → Binary Protocol

4. Compression:
   Response → Gzip Compression
           → Reduced Size (~70%)
           → Faster Transfer
           → Less Bandwidth
```

## Security Threat Model

```
┌──────────────────────────────────────────────────────────────────┐
│                  Protected Against                               │
└──────────────────────────────────────────────────────────────────┘

Threat                    Protection
─────────────────────────────────────────────────────────
Man-in-the-Middle    →   TLS 1.2/1.3 Encryption
Downgrade Attack     →   HSTS Headers (Strict-Transport-Security)
Protocol Downgrade   →   Only TLS 1.2+ allowed
Weak Ciphers         →   Strong cipher suites only
Clickjacking         →   X-Frame-Options: SAMEORIGIN
XSS Attacks          →   X-XSS-Protection, Content-Type-Options
MIME Sniffing        →   X-Content-Type-Options: nosniff
Cookie Hijacking     →   Secure flag on cookies
Session Hijacking    →   TLS encryption for all traffic
Certificate Spoof    →   Let's Encrypt validation
```

## Backup & Recovery

```
┌──────────────────────────────────────────────────────────────────┐
│                  Backup Strategy                                 │
└──────────────────────────────────────────────────────────────────┘

What to Backup:
├── certbot/conf/              (Certificates and keys)
├── nginx/                     (Configuration files)
└── docker-compose.yml         (Service definitions)

Backup Script:
┌─────────────────────┐
│ tar -czf backup.tgz │
│ - certbot/          │
│ - nginx/            │
│ - *.yml             │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Upload to S3/Backup │
└─────────────────────┘

Recovery Process:
┌─────────────────────┐
│ Extract backup      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Restore files       │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ docker-compose up   │
└─────────────────────┘
```

---

This architecture provides:
- ✅ End-to-end encryption
- ✅ Automatic certificate management
- ✅ High availability
- ✅ Performance optimization
- ✅ Security best practices
- ✅ Easy maintenance

---
