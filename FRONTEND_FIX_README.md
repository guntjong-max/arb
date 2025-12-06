# Fix untuk Error 502 Bad Gateway - ui.kliks.life

## 🔍 Diagnosis Masalah

Error 502 Bad Gateway terjadi karena:
1. **Frontend service tidak ada** dalam docker-compose.yml
2. Nginx/reverse proxy mencoba connect ke service yang tidak running
3. Tidak ada Vite dev server yang listen pada port 5173

## ✅ Solusi yang Telah Diterapkan

### 1. Frontend Service Dibuat
- Direktori `/frontend` dengan struktur React + Vite
- `vite.config.js` dengan konfigurasi yang benar:
  - ✅ Host binding: `0.0.0.0` (bukan localhost)
  - ✅ Allowed hosts: `ui.kliks.life`, `api.kliks.life`
  - ✅ Port: 5173
  - ✅ HMR support untuk development
  - ✅ Proxy API ke backend engine

### 2. Docker Configuration
- `Dockerfile` untuk frontend dengan Node.js 20 Alpine
- Health check yang benar
- Integration dengan docker-compose.yml
- Port mapping: 5173:5173

### 3. Vite Configuration Highlights

```javascript
server: {
  host: '0.0.0.0',           // PENTING: Bind ke semua interface
  port: 5173,
  allowedHosts: [
    'ui.kliks.life',
    'api.kliks.life',
    'localhost',
    '.kliks.life'
  ],
  proxy: {
    '/api': {
      target: 'http://engine:3000',
      changeOrigin: true
    }
  }
}
```

## 🚀 Cara Menjalankan Fix

### Opsi 1: Menggunakan Script Otomatis (RECOMMENDED)

```bash
cd /data/workspace/arb
chmod +x fix-frontend-502.sh
./fix-frontend-502.sh
```

Script ini akan:
1. Stop & remove container frontend yang lama
2. Rebuild image frontend dari scratch
3. Start container baru
4. Verify health check
5. Show logs

### Opsi 2: Manual Commands

```bash
cd /data/workspace/arb

# Stop dan remove container lama
docker-compose stop frontend
docker-compose rm -f frontend

# Rebuild frontend (no cache)
docker-compose build --no-cache frontend

# Start frontend
docker-compose up -d frontend

# Check logs
docker logs arb-frontend -f
```

### Opsi 3: Rebuild Semua Service

```bash
cd /data/workspace/arb

# Stop semua
docker-compose down

# Rebuild semua (jika ada perubahan di service lain)
docker-compose build

# Start semua
docker-compose up -d

# Check status
docker-compose ps
```

## 🔧 Verifikasi

### 1. Check Container Status
```bash
docker ps | grep frontend
```
Output seharusnya menunjukkan `arb-frontend` dalam status `Up`.

### 2. Check Logs
```bash
docker logs arb-frontend
```
Output seharusnya menunjukkan:
```
VITE v5.x.x ready in xxx ms
➜  Local:   http://localhost:5173/
➜  Network: http://0.0.0.0:5173/
```

### 3. Test dari Container Host
```bash
curl http://localhost:5173
```
Seharusnya return HTML page.

### 4. Test dari Browser
- Local: http://localhost:5173
- Production: https://ui.kliks.life

## 📋 Troubleshooting

### Jika masih dapat 502 setelah rebuild:

#### 1. Check Nginx Configuration
```bash
# Check nginx config untuk ui.kliks.life
sudo nginx -t
sudo systemctl status nginx

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

Pastikan upstream pointing ke `localhost:5173` atau IP container yang benar.

#### 2. Check Container Network
```bash
# Get frontend container IP
docker inspect arb-frontend | grep IPAddress

# Test dari host
curl http://<container-ip>:5173
```

#### 3. Check Firewall
```bash
# Check jika port 5173 terbuka
sudo ufw status
sudo iptables -L -n | grep 5173
```

#### 4. Check Docker Network
```bash
# Inspect network
docker network inspect arb-network

# Check jika engine dan frontend dalam network yang sama
docker inspect arb-frontend | grep NetworkMode
docker inspect arb-engine | grep NetworkMode
```

#### 5. Apply Nginx Configuration
Jika Anda menggunakan nginx sebagai reverse proxy:

```bash
# Copy configuration template
sudo cp nginx-ui.kliks.life.conf /etc/nginx/sites-available/ui.kliks.life

# Edit sesuai kebutuhan (SSL paths, etc)
sudo nano /etc/nginx/sites-available/ui.kliks.life

# Enable site
sudo ln -s /etc/nginx/sites-available/ui.kliks.life /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## 📁 File Structure

```
/data/workspace/arb/
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js      ← Konfigurasi Vite (PENTING!)
│   ├── package.json
│   ├── Dockerfile
│   └── .dockerignore
├── docker-compose.yml       ← Updated dengan frontend service
├── fix-frontend-502.sh      ← Script untuk rebuild
└── nginx-ui.kliks.life.conf ← Nginx config template
```

## 🔐 Environment Variables

Jika perlu customize, tambahkan di `.env`:

```env
# Frontend
VITE_API_URL=http://engine:3000
VITE_WS_URL=ws://engine:3001
```

## 📊 Monitoring

### Real-time Logs
```bash
docker logs arb-frontend -f
```

### Container Stats
```bash
docker stats arb-frontend
```

### Health Check
```bash
docker inspect arb-frontend | grep -A 10 Health
```

## 🎯 Next Steps

1. ✅ Run `./fix-frontend-502.sh`
2. ✅ Verify container is running
3. ✅ Check nginx configuration
4. ✅ Test akses dari browser
5. ✅ Monitor logs untuk errors

## 💡 Tips

- Frontend akan auto-reload saat ada perubahan code (HMR)
- Volume mounted untuk `src/` directory untuk development
- Untuk production, gunakan build version dengan nginx static server
- SSL termination dilakukan di nginx, bukan di Vite

## 📞 Support

Jika masih ada masalah setelah menjalankan fix:
1. Capture full logs: `docker logs arb-frontend > frontend.log`
2. Check nginx error logs: `sudo tail -100 /var/log/nginx/error.log`
3. Verify DNS: `nslookup ui.kliks.life`
4. Test connectivity: `telnet ui.kliks.life 443`
