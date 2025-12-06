#!/bin/bash

# ============================================
# COMPLETE 502 ERROR FIX - EXECUTION GUIDE
# ============================================

cat << 'EOF'

╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║        🚀 502 BAD GATEWAY FIX - ui.kliks.life                 ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

MASALAH:
--------
✗ Error 502 Bad Gateway saat akses https://ui.kliks.life
✗ Frontend container tidak ada/crash
✗ Vite config salah atau binding ke localhost

SOLUSI YANG SUDAH DITERAPKAN:
------------------------------
✓ Frontend service dibuat dengan React + Vite
✓ Vite config: host binding ke 0.0.0.0 (bukan localhost)
✓ Allowed hosts: ui.kliks.life, api.kliks.life ditambahkan
✓ Docker healthcheck yang benar
✓ Port 5173 exposed dengan proper mapping
✓ docker-compose.yml updated

═══════════════════════════════════════════════════════════════

PILIH METODE EKSEKUSI:
════════════════════════

[1] FULL FIX (Recommended - dengan logs detail)
    $ ./fix-frontend-502.sh

[2] QUICK FIX (Fast - minimal output)
    $ ./quick-fix.sh

[3] MANUAL (Step by step)
    $ docker-compose stop frontend
    $ docker-compose rm -f frontend
    $ docker-compose build --no-cache frontend
    $ docker-compose up -d frontend
    $ docker logs arb-frontend -f

═══════════════════════════════════════════════════════════════

SETELAH MENJALANKAN FIX:
═════════════════════════

1. Verify Container Running:
   $ docker ps | grep frontend
   
   Expected: Container "arb-frontend" dengan status "Up"

2. Check Logs:
   $ docker logs arb-frontend
   
   Expected: Vite server running di 0.0.0.0:5173

3. Test Local:
   $ curl http://localhost:5173
   
   Expected: HTML response

4. Test Production:
   Browser: https://ui.kliks.life
   
   Expected: React app tampil (bukan 502)

═══════════════════════════════════════════════════════════════

JIKA MASIH 502 SETELAH FIX:
════════════════════════════

A. Check Nginx Config:
   $ sudo cat /etc/nginx/sites-enabled/ui.kliks.life
   $ sudo nginx -t
   $ sudo systemctl reload nginx
   
   Template config tersedia di: nginx-ui.kliks.life.conf

B. Check Network:
   $ docker inspect arb-frontend | grep IPAddress
   $ curl http://<IP>:5173

C. Check Firewall:
   $ sudo ufw status
   $ sudo ufw allow 5173/tcp

D. Check DNS:
   $ nslookup ui.kliks.life
   $ ping ui.kliks.life

═══════════════════════════════════════════════════════════════

FILES YANG SUDAH DIBUAT:
═════════════════════════

frontend/
├── vite.config.js          ← Vite configuration (SUDAH BENAR)
├── Dockerfile              ← Docker container config
├── package.json            ← Dependencies
├── index.html              ← HTML template
└── src/
    ├── App.jsx             ← Main component
    ├── main.jsx            ← Entry point
    ├── App.css             ← Styles
    └── index.css           ← Global styles

docker-compose.yml          ← UPDATED (frontend service added)
fix-frontend-502.sh         ← Full fix script
quick-fix.sh                ← Quick fix script
nginx-ui.kliks.life.conf    ← Nginx template
SOLUTION_SUMMARY.md         ← Complete guide
FRONTEND_FIX_README.md      ← Detailed docs

═══════════════════════════════════════════════════════════════

KEY CONFIGURATION:
═══════════════════

vite.config.js highlights:
--------------------------
✓ host: '0.0.0.0'                    (Bind semua interface)
✓ port: 5173                         (Standard Vite port)
✓ allowedHosts: ['ui.kliks.life']    (Domain allowed)
✓ proxy: { '/api': 'engine:3000' }   (API proxy)
✓ hmr: { protocol: 'wss' }           (WSS untuk HTTPS)

docker-compose.yml highlights:
------------------------------
✓ ports: "5173:5173"                 (Port mapping)
✓ healthcheck configured             (Proper health check)
✓ depends_on: engine (healthy)       (Dependency)
✓ network: arb-network               (Shared network)

═══════════════════════════════════════════════════════════════

READY TO FIX?
═════════════

Run salah satu command berikut:

🔹 RECOMMENDED:
   $ cd /data/workspace/arb && ./fix-frontend-502.sh

🔹 QUICK:
   $ cd /data/workspace/arb && ./quick-fix.sh

═══════════════════════════════════════════════════════════════

MONITORING COMMANDS:
═══════════════════

Real-time logs:
$ docker logs arb-frontend -f

Container stats:
$ docker stats arb-frontend

Health status:
$ docker inspect arb-frontend | grep -A 10 Health

All containers:
$ docker-compose ps

═══════════════════════════════════════════════════════════════

SUPPORT:
════════

✓ Full docs: FRONTEND_FIX_README.md
✓ Summary: SOLUTION_SUMMARY.md
✓ This guide: ./show-fix-guide.sh

═══════════════════════════════════════════════════════════════

EOF

echo ""
echo -n "Apakah Anda ingin menjalankan fix sekarang? [y/N] "
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo ""
    echo "🚀 Starting fix..."
    cd /data/workspace/arb
    ./fix-frontend-502.sh
else
    echo ""
    echo "ℹ️  Fix tidak dijalankan. Anda bisa run manual dengan:"
    echo "   cd /data/workspace/arb"
    echo "   ./fix-frontend-502.sh"
    echo ""
fi
