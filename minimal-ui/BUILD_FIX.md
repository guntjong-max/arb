# React Build Fix - MIME Type Error Solution

## Problem
Error: "Failed to load module script: Expected a JavaScript-on-Wasm module script but the server responded with a MIME type of "text/jsx""

## Root Cause
Nginx was not properly configured to serve JavaScript files with the correct MIME type (`application/javascript`).

## Changes Made

### 1. Updated `/root/sportsbook-minimal/minimal-ui/nginx.conf`
Added proper MIME type configuration:
- Added `types` block to define MIME types for `.js`, `.mjs`, `.css`, and `.html` files
- Added specific location block for `.js` files to ensure `application/javascript` content type

### 2. Updated `/root/sportsbook-minimal/minimal-ui/vite.config.js`
Added build configuration to ensure consistent output:
- Set `outDir` to `dist`
- Set `assetsDir` to `assets`
- Configured rollup options for proper file naming

## Steps to Fix (Run on Server)

### 1. SSH to Server
```bash
ssh root@217.216.35.6
```

### 2. Navigate to Project Directory
```bash
cd /root/sportsbook-minimal/minimal-ui
```

### 3. Clean Previous Build (if exists)
```bash
rm -rf dist node_modules
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Build the Application
```bash
npm run build
```

### 6. Verify Build Output
```bash
ls -la dist/
```

Expected output:
- `index.html` (main HTML file)
- `assets/` (folder with JS, CSS files)
- `vite.svg` (or other static assets)

### 7. Rebuild Docker Image (No Cache)
```bash
cd /root/sportsbook-minimal
docker compose -f docker-compose.yml build --no-cache ui
```

### 8. Restart Container
```bash
docker compose -f docker-compose.yml up -d ui
```

### 9. Verify Container is Running
```bash
docker compose -f docker-compose.yml ps
```

### 10. Test in Browser
Open: http://217.216.35.6:3001

## Troubleshooting

### If Build Fails
Check for errors in the build output:
```bash
npm run build 2>&1 | tee build.log
```

### If Docker Build Fails
Check Docker logs:
```bash
docker compose -f docker-compose.yml logs ui
```

### If Still Getting MIME Type Error
1. Check nginx is serving the correct files:
```bash
docker exec -it sportsbook-minimal-ui-1 ls -la /usr/share/nginx/html
```

2. Check nginx configuration:
```bash
docker exec -it sportsbook-minimal-ui-1 cat /etc/nginx/conf.d/default.conf
```

3. Test MIME type response:
```bash
curl -I http://217.216.35.6:3001/assets/index.*.js
```

Should return: `Content-Type: application/javascript`

### If Container Won't Start
1. Check container logs:
```bash
docker logs sportsbook-minimal-ui-1
```

2. Try running container interactively:
```bash
docker run -it --rm -p 3001:80 sportsbook-minimal-ui nginx -t
```

## Files Modified
- `/root/sportsbook-minimal/minimal-ui/nginx.conf` ✓
- `/root/sportsbook-minimal/minimal-ui/vite.config.js` ✓

## Expected Result
After following these steps, the React application should load correctly without MIME type errors.
