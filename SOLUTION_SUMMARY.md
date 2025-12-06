# 🚀 SOLUSI ERROR 502 BAD GATEWAY - ui.kliks.life

## ⚡ QUICK START (Pilih salah satu)

### OPSI 1: Full Fix (Recommended)
```bash
cd /data/workspace/arb
chmod +x fix-frontend-502.sh
./fix-frontend-502.sh
```

### OPSI 2: Quick Fix
```bash
cd /data/workspace/arb
chmod +x quick-fix.sh
./quick-fix.sh
```

### OPSI 3: Manual
```bash
cd /data/workspace/arb
docker-compose build --no-cache frontend
docker-compose up -d frontend
docker logs arb-frontend -f
```

---

## 📝 APA YANG SUDAH DIPERBAIKI?

### ✅ 1. Vite Configuration (`frontend/vite.config.js`)
- Host binding: `0.0.0.0` (bukan localhost) ✅
- Port: `5173` ✅
- Allowed hosts:
  - `ui.kliks.life` ✅
  - `api.kliks.life` ✅
  - `localhost` ✅
  - `.kliks.life` (wildcard) ✅
- HMR support dengan WSS ✅
- API proxy ke engine:3000 ✅

### ✅ 2. Docker Configuration
- Dockerfile dengan Node.js 20 Alpine ✅
- Health check yang benar ✅
- Port mapping 5173:5173 ✅
- Volume mounting untuk hot reload ✅

### ✅ 3. Docker Compose (`docker-compose.yml`)
- Service frontend ditambahkan ✅
- Dependencies ke engine ✅
- Network integration ✅
- Environment variables ✅

---

## 🔍 VERIFIKASI SETELAH FIX

### 1. Cek Container Running
```bash
docker ps | grep frontend
```
**Expected:** Status "Up" dengan port 5173

### 2. Cek Logs
```bash
docker logs arb-frontend
```
**Expected:** Vite dev server running

### 3. Test dari Server
```bash
curl http://localhost:5173
```
**Expected:** HTML response

### 4. Test dari Browser
- Local: http://localhost:5173
- Production: https://ui.kliks.life

---

## 🔧 JIKA MASIH ERROR 502

### Check 1: Nginx Configuration
```bash
# Lihat config nginx untuk ui.kliks.life
sudo cat /etc/nginx/sites-enabled/ui.kliks.life

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

**Yang harus ada di nginx config:**
```nginx
upstream frontend_backend {
    server localhost:5173;
}

location / {
    proxy_pass http://frontend_backend;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
}
```

### Check 2: Container Network
```bash
# Dapatkan IP container
docker inspect arb-frontend | grep IPAddress

# Test dari IP
curl http://<IP>:5173
```

### Check 3: Port Accessible
```bash
# Check port listening
netstat -tlnp | grep 5173

# atau
ss -tlnp | grep 5173
```

### Check 4: Firewall
```bash
# Check UFW
sudo ufw status

# Allow port jika perlu
sudo ufw allow 5173/tcp
```

---

## 📋 COMMANDS REFERENCE

### Container Management
```bash
# Start frontend
docker-compose up -d frontend

# Stop frontend
docker-compose stop frontend

# Restart frontend
docker-compose restart frontend

# Remove frontend
docker-compose rm -f frontend

# Rebuild frontend
docker-compose build --no-cache frontend
```

### Logs & Debugging
```bash
# View logs (follow)
docker logs arb-frontend -f

# View last 50 lines
docker logs arb-frontend --tail 50

# View logs since 1 hour ago
docker logs arb-frontend --since 1h

# Check container stats
docker stats arb-frontend

# Inspect container
docker inspect arb-frontend

# Health check status
docker inspect arb-frontend | grep -A 10 Health
```

### Access Container
```bash
# Shell into container
docker exec -it arb-frontend sh

# Run command in container
docker exec arb-frontend npm --version
docker exec arb-frontend wget -O- http://localhost:5173
```

### Network Debugging
```bash
# Inspect network
docker network inspect arb-network

# List containers in network
docker network inspect arb-network | grep Name

# Test connectivity from engine to frontend
docker exec arb-engine wget -O- http://frontend:5173
```

---

## 📁 FILE YANG DIBUAT

```
/data/workspace/arb/
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main React component
│   │   ├── App.css           # Styles
│   │   ├── main.jsx          # Entry point
│   │   └── index.css         # Global styles
│   ├── index.html            # HTML template
│   ├── vite.config.js        # ⭐ Vite config (PENTING!)
│   ├── package.json          # Dependencies
│   ├── Dockerfile            # Container config
│   └── .dockerignore         # Docker ignore
│
├── docker-compose.yml        # ⭐ Updated (frontend added)
├── fix-frontend-502.sh       # ⭐ Full fix script
├── quick-fix.sh              # ⭐ Quick fix script
├── nginx-ui.kliks.life.conf  # Nginx config template
├── FRONTEND_FIX_README.md    # Full documentation
└── SOLUTION_SUMMARY.md       # This file
```

---

## 🎯 KESIMPULAN

**Root Cause:** Frontend service tidak ada di docker-compose.yml

**Solution:**
1. ✅ Created frontend service dengan React + Vite
2. ✅ Configured Vite untuk bind ke 0.0.0.0
3. ✅ Added allowed hosts untuk ui.kliks.life
4. ✅ Setup proper health checks
5. ✅ Created automation scripts

**Next Action:**
```bash
cd /data/workspace/arb
./fix-frontend-502.sh
```

Setelah itu, akses https://ui.kliks.life - seharusnya sudah tidak 502 lagi! 🎉

---

## 📞 TROUBLESHOOTING CHECKLIST

- [ ] Container frontend running? → `docker ps | grep frontend`
- [ ] Logs normal? → `docker logs arb-frontend`
- [ ] Port 5173 listening? → `netstat -tlnp | grep 5173`
- [ ] Nginx config benar? → `sudo nginx -t`
- [ ] DNS pointing benar? → `nslookup ui.kliks.life`
- [ ] SSL cert valid? → `sudo certbot certificates`
- [ ] Firewall allow? → `sudo ufw status`

Jika semua ✅, tapi masih 502 → Check nginx upstream dan proxy settings!
