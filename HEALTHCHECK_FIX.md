# Healthcheck Fix - Container Stuck di "starting"

## 🔴 Masalah yang Ditemukan

Container `arb-engine` stuck di status **health: starting** dan menyebabkan:
- Docker Compose menganggap service belum ready
- Nginx (jika ada) mendapat 502 Bad Gateway karena upstream tidak healthy
- Container tidak bisa menerima traffic meski aplikasi sudah running

## 🔍 Root Cause

**Konflik healthcheck antara Dockerfile dan docker-compose.yml:**

### Dockerfile (BENAR):
```dockerfile
HEALTHCHECK CMD node healthcheck.js || exit 1
```

### docker-compose.yml (SALAH - SUDAH DIPERBAIKI):
```yaml
# SEBELUM (SALAH):
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]

# SESUDAH (BENAR):
healthcheck:
  test: ["CMD", "node", "healthcheck.js"]
```

### Mengapa Gagal?
1. **`wget` tidak ada di node:20-alpine** - Alpine image minimal, tidak include wget
2. **Docker Compose override Dockerfile** - Healthcheck di compose menimpa yang di Dockerfile
3. **Healthcheck command gagal** - Exit code bukan 0, Docker anggap unhealthy
4. **Container stuck di "starting"** - Tidak pernah mencapai status "healthy"

## ✅ Solusi yang Sudah Diterapkan

### Perubahan di `docker-compose.yml`:
```yaml
services:
  engine:
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]  # ✅ Menggunakan node, bukan wget
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Penjelasan Parameter:
- **interval: 30s** - Cek health setiap 30 detik
- **timeout: 10s** - Timeout jika health check > 10 detik
- **retries: 3** - Gagal 3x baru dianggap unhealthy
- **start_period: 40s** - Grace period 40 detik sebelum mulai menghitung failure

## 🚀 Cara Deploy Ulang

```bash
# 1. Stop container yang ada
docker compose down

# 2. Rebuild dan start ulang (gunakan file compose yang sudah diperbaiki)
docker compose up -d --build

# 3. Monitor logs
docker compose logs -f engine

# 4. Tunggu 40-60 detik, lalu cek status
docker compose ps
```

## ✅ Expected Result

Setelah 40-60 detik, status harus berubah:

```bash
$ docker compose ps
NAME              STATUS
arb-engine        Up (healthy)    # ✅ Harus "healthy", bukan "starting"
arb-postgres      Up (healthy)
arb-redis         Up (healthy)
```

## 🧪 Testing & Verification

### 1. Cek Health Status
```bash
# Via Docker
docker compose ps

# Via curl (direct ke container)
curl http://localhost:3000/health

# Expected response:
# {"status":"healthy","timestamp":"...","uptime":123.45}
```

### 2. Cek Logs
```bash
# Lihat healthcheck logs
docker compose logs engine | grep -i health

# Expected output:
# Health check status: 200
```

### 3. Manual Test (seperti yang Anda lakukan)
```bash
# Ini seharusnya tetap berhasil
docker run --rm -it --entrypoint sh arb-engine
node src/index.js
# Aplikasi jalan normal
```

### 4. Jika Pakai Nginx
```bash
# Test dari Nginx
curl http://localhost/health  # Atau port Nginx Anda

# Expected: 200 OK, bukan 502 Bad Gateway
```

## 🔧 Troubleshooting

### Jika Masih Stuck di "starting":

#### 1. Cek apakah healthcheck.js ada di container
```bash
docker compose exec engine ls -la /app/healthcheck.js
# Expected: File harus ada
```

#### 2. Test healthcheck manual
```bash
docker compose exec engine node healthcheck.js
echo $?  # Harus return 0 jika sukses
```

#### 3. Cek apakah port 3000 listening
```bash
docker compose exec engine netstat -tlnp | grep 3000
# Expected: Node.js listening di port 3000
```

#### 4. Cek environment variables
```bash
docker compose exec engine env | grep -E "PORT|DATABASE_URL|REDIS_URL"
# Expected: Semua env vars harus terisi
```

#### 5. Cek database & Redis connection
```bash
# Database
docker compose exec postgres pg_isready -U arbitrage_user

# Redis
docker compose exec redis redis-cli -a $REDIS_PASSWORD PING
```

### Jika Healthcheck Berhasil tapi Nginx Masih 502:

#### 1. Cek Nginx upstream configuration
```nginx
# Pastikan upstream menggunakan service name, bukan localhost
upstream engine {
    server engine:3000;  # ✅ Gunakan service name
    # server localhost:3000;  # ❌ JANGAN gunakan localhost
}
```

#### 2. Pastikan Nginx di network yang sama
```yaml
# Di docker-compose.yml
nginx:
  networks:
    - arb-network  # ✅ Harus sama dengan engine
```

#### 3. Test koneksi dari Nginx ke Engine
```bash
docker compose exec nginx wget -O- http://engine:3000/health
# Expected: JSON response dengan status healthy
```

## 📋 Checklist Verification

Sebelum declare "FIXED", cek semua ini:

- [ ] `docker compose ps` menunjukkan engine status "healthy"
- [ ] `curl http://localhost:3000/health` return 200 OK
- [ ] Logs tidak ada error tentang database/Redis connection
- [ ] Nginx (jika ada) tidak return 502 lagi
- [ ] Manual test dengan `docker run` tetap berhasil
- [ ] Healthcheck logs menunjukkan "Health check status: 200"

## 🎯 Summary

### Yang Diperbaiki:
✅ Healthcheck command di docker-compose.yml  
✅ Ganti dari `wget` (tidak ada) ke `node healthcheck.js` (ada)  
✅ Konsisten dengan Dockerfile healthcheck  

### Yang TIDAK Perlu Diubah:
✅ Dockerfile - Sudah benar  
✅ healthcheck.js - Sudah benar  
✅ src/index.js - Sudah benar  
✅ Database/Redis config - Sudah benar  

### Root Cause:
❌ Alpine image tidak punya wget  
❌ Docker Compose healthcheck override Dockerfile  
❌ Healthcheck gagal → container stuck di "starting"  

## 📞 Jika Masih Ada Masalah

Jalankan diagnostic lengkap:

```bash
# Comprehensive diagnostic
echo "=== Container Status ==="
docker compose ps

echo "=== Engine Logs (last 50 lines) ==="
docker compose logs --tail=50 engine

echo "=== Healthcheck Test ==="
docker compose exec engine node healthcheck.js
echo "Exit code: $?"

echo "=== Port Check ==="
docker compose exec engine netstat -tlnp

echo "=== Database Connection ==="
docker compose exec postgres pg_isready -U arbitrage_user

echo "=== Redis Connection ==="
docker compose exec redis redis-cli -a redis_dev_password_2024 PING

echo "=== Environment Variables ==="
docker compose exec engine env | grep -E "PORT|NODE_ENV|DATABASE_URL|REDIS_URL"
```

Simpan output dan analisa di mana bottleneck-nya.

---

**Updated**: December 6, 2025  
**Status**: ✅ Fixed - Ready to redeploy
