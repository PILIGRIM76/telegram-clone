// Phase 9.5 + Vite Build Fix: VitePWA plugin removed entirely.
// Раньше он вызывал html-proxy баг при наличии inline CSS в index.html или @tailwind директив.
// Phase 1.5 (premium design) использует CSS-переменные, PWA не нужен.
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // Phase 9.5 fix: simple-peer ожидает `global` (Node.js) и `require` (CommonJS).
        // В браузере/Capacitor WebView их нет, поэтому перенаправляем на globalThis.
        global: 'globalThis',
        // Phase 9.5: critical — apiService использует хардкод (см. комментарий в apiService.ts)
      },
      build: {
        sourcemap: true,
        minify: false
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
