// Phase 9.5 + Vite Build Fix: VitePWA plugin removed entirely.
// Раньше он вызывал html-proxy баг при наличии inline CSS в index.html или @tailwind директив.
// Phase 1.5 (premium design) использует CSS-переменные, PWA не нужен.
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import fs from 'node:fs';


/**
 * RelativeAssetsPlugin: rewrites absolute asset paths in index.html to relative for Electron.
 * Uses generateBundle hook to modify the generated HTML file.
 */
function relativeAssetsPlugin(): Plugin {
    return {
        name: 'relative-assets-plugin',
        generateBundle(options, bundle) {
            console.log('[relativeAssetsPlugin] generateBundle hook called');
            console.log('[relativeAssetsPlugin] Bundle keys:', Object.keys(bundle));
        },
        writeBundle(options, bundle) {
            console.log('[relativeAssetsPlugin] writeBundle hook called');
            // Read the generated index.html from disk and rewrite paths
            if (!options.dir) {
                console.warn('[relativeAssetsPlugin] options.dir is undefined, skipping index.html rewrite');
                return;
            }
            const indexPath = path.join(options.dir, 'index.html');
            if (fs.existsSync(indexPath)) {
                console.log('[relativeAssetsPlugin] Found index.html at:', indexPath);
                let source = fs.readFileSync(indexPath, 'utf-8');
                const original = source;
                source = source
                    .replaceAll('href="/assets/', 'href="./assets/')
                    .replaceAll('src="/assets/', 'src="./assets/')
                    .replaceAll('href="/icons/', 'href="./icons/')
                    .replaceAll('href="/favicon-', 'href="./favicon-')
                    .replaceAll('href="/pwa-', 'href="./pwa-')
                    .replaceAll('src="/src/', 'src="./src/');
                if (source !== original) {
                    console.log('[relativeAssetsPlugin] Replacements applied, writing file...');
                    fs.writeFileSync(indexPath, source);
                } else {
                    console.log('[relativeAssetsPlugin] No replacements needed');
                }
            } else {
                console.log('[relativeAssetsPlugin] index.html not found at:', indexPath);
            }
        },
    };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
        base: './',  // ⚠️ ОБЯЗАТЕЛЬНО для Electron - относительные пути к ассетам
        server: {
            port: 5173,
            host: '0.0.0.0',
        },
        plugins: [react(), relativeAssetsPlugin(), electron({
            main: {
                entry: 'electron/main.ts',
            },
        })],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // FIX 2026-09-10: Vite инжектирует process.env.VITE_* из .env файлов.
        // Раньше apiService.ts использовал import.meta.env (Vite-специфичный),
        // что ломало ts-jest (TS1343). Теперь process.env — работает и в тестах, и в сборке.
        'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'https://192.168.100.4:4000'),
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
