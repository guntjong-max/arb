#!/bin/bash
# EXACT COMMANDS - Copy dan jalankan di server
# Path: /home/arbuser/arb

# ====================================
# STEP 1: Update docker-compose.prod.yml
# ====================================

cat > docker-compose.prod.yml << 'EOF'
version: '3.9'

services:
  engine:
    volumes:
      - ./engine/logs:/app/logs
    
    env_file:
      - .env
    
    environment:
      NODE_ENV: production
    
    restart: always
EOF

# ====================================
# STEP 2: Deploy
# ====================================

docker compose down
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# ====================================
# STEP 3: Wait
# ====================================

echo "Waiting 70 seconds for services to initialize..."
sleep 70

# ====================================
# STEP 4: Verify
# ====================================

echo ""
echo "=== Container Status ==="
docker compose ps

echo ""
echo "=== Health Check (Direct) ==="
curl -s http://localhost:3000/health

echo ""
echo "=== Health Check (Nginx) ==="
curl -k -s https://api.kliks.life/health

echo ""
echo "=== Done ===" 
echo "Copy output di atas dan kirim ke agent untuk verifikasi"
