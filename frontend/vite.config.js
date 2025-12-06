import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Bind to all interfaces instead of localhost
    port: 5173,
    strictPort: true,
    allowedHosts: [
      'ui.kliks.life',
      'api.kliks.life',
      'localhost',
      '.kliks.life'
    ],
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://engine:3000',
        changeOrigin: true,
        secure: false
      },
      '/ws': {
        target: process.env.VITE_WS_URL || 'ws://engine:3001',
        ws: true,
        changeOrigin: true
      }
    },
    hmr: {
      clientPort: 443, // For HTTPS reverse proxy
      protocol: 'wss'
    },
    watch: {
      usePolling: true, // Better for Docker environments
      interval: 1000
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom']
        }
      }
    }
  }
});
