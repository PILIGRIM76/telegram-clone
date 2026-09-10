// Phase 9.5 + Vite Build Fix: VitePWA plugin removed entirely.
// Раньше он вызывал html-proxy баг при наличии inline CSS в index.html или @tailwind директив.
// Phase 1.5 (premium design) использует CSS-переменные, PWA не нужен.
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';


/**
 * BufferPolyfillPlugin: injects inline Buffer polyfill into index.html BEFORE bundle loads.
 * Fixes ReferenceError: Buffer is not defined on Android WebView (RT9).
 * Vite hoisting may reorder imports, so polyfill must be inline-<script>.
 */
function bufferPolyfillPlugin(): Plugin {
  const polyfill = `
<script>
  // CRITICAL: Buffer polyfill BEFORE bundle loads (RT9 white screen fix)
  // Vite hoisting may reorder imports, so polyfill must be inline.
  if (typeof window.Buffer === 'undefined') {
    console.log('[PILIGRIM] Installing inline Buffer polyfill');
    window.Buffer = function(data, encoding) {
      if (typeof data === 'string') {
        const arr = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) arr[i] = data.charCodeAt(i) & 0xff;
        return arr;
      }
      if (data instanceof ArrayBuffer) return new Uint8Array(data);
      if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      return new Uint8Array(0);
    };
    window.Buffer.from = function(data, encoding) {
      if (typeof data === 'string') {
        const arr = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) arr[i] = data.charCodeAt(i) & 0xff;
        return arr;
      }
      if (data instanceof ArrayBuffer) return new Uint8Array(data);
      if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      return new Uint8Array(0);
    };
    window.Buffer.alloc = function(size, fill) {
      const arr = new Uint8Array(size);
      if (fill !== undefined) arr.fill(fill);
      return arr;
    };
    window.Buffer.isBuffer = function() { return false; };
    window.Buffer.isView = ArrayBuffer.isView;
    window.Buffer.byteLength = function(str) {
      if (typeof str === 'string') return str.length;
      if (str instanceof ArrayBuffer) return str.byteLength;
      if (ArrayBuffer.isView(str)) return str.byteLength;
      return 0;
    };
    window.Buffer.concat = function(list, totalLength) {
      if (!list.length) return new Uint8Array(0);
      const len = totalLength || list.reduce((s, b) => s + b.length, 0);
      const result = new Uint8Array(len);
      let pos = 0;
      for (const b of list) { result.set(b, pos); pos += b.length; }
      return result;
    };
    window.Buffer.prototype = Uint8Array.prototype;
  }
</script>`;

  return {
    name: 'buffer-polyfill-plugin',
    enforce: 'pre',
    transformIndexHtml(html) {
      return html.replace('<head>', '<head>' + polyfill);
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), bufferPolyfillPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // FIX 2026-09-10: Vite инжектирует process.env.VITE_* из .env файлов.
        // Раньше apiService.ts использовал import.meta.env (Vite-специфичный),
        // что ломало ts-jest (TS1343). Теперь process.env — работает и в тестах, и в сборке.
        'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://192.168.100.4:4000'),
        'process.env.VITE_WS_URL': JSON.stringify(env.VITE_WS_URL || 'wss://192.168.100.4:4443'),
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
