import { VitePWA } from 'vite-plugin-pwa';
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
      plugins: [react(), VitePWA({
      disable: true, // Phase 9.5 fix: отключаем PWA в dev-режиме, чтобы Service Worker не блокировал обновления
      registerType: 'autoUpdate',
      manifest: {
        name: 'PILIGRIM',
        short_name: 'PILIGRIM',
        description: 'Защищённый мессенджер PILIGRIM с E2EE шифрованием',
        theme_color: '#7c3aed',
        background_color: '#3b82f6',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/favicon-48x48.png',
            sizes: '48x48',
            type: 'image/png'
          }
        ]
      }
    })],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // Phase 9.5 fix: simple-peer ожидает `global` (Node.js) и `require` (CommonJS).
        // В браузере/Capacitor WebView их нет, поэтому перенаправляем на globalThis.
        global: 'globalThis',
        // Phase 9.5: critical — apiService использует хардкод (см. комментарий в apiService.ts)
      },
      optimizeDeps: {
        // Phase 9.5 fix: simple-peer не работает в Capacitor WebView (Node.js deps).
        // Исключаем из pre-bundling, чтобы useWebRTC загружался только при звонках.
        // Пока что приложение работает в offline-режиме без WebRTC.
        exclude: ['simple-peer']
      },
      build: {
        // Phase 9.5 fix: не инлайнить простые CommonJS модули (Buffer, ieee754, debug)
        commonjsOptions: {
          transformMixedEsModules: true
        },
        // Phase 9.5 debug: source maps для отладки на устройстве
        sourcemap: true,
        // Phase 9.5 debug: оставить readable для отладки в WebView
        minify: false
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          // Phase 9.5 fix: simple-peer не работает в Capacitor WebView (Node.js deps).
          // Подменяем на browser-safe stub. Реальный WebRTC будет добавлен в Phase 10.
          'simple-peer': path.resolve(__dirname, 'src/stubs/simple-peer-stub.ts'),
          // Phase 9.5 fix: better-sqlite3, ioredis, prisma — Node.js only
          'better-sqlite3': path.resolve(__dirname, 'src/stubs/empty.ts'),
          'ioredis': path.resolve(__dirname, 'src/stubs/empty.ts'),
          'prisma': path.resolve(__dirname, 'src/stubs/empty.ts'),
        }
      }
    };
});
