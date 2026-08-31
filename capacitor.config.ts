import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cipherlink.app', // Оставляем наш appId (Phase 9.5: не меняем, чтобы избежать переустановки)
  appName: 'CipherLink',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // Phase 9: Подключение планшета RT9 к ПК по локальной сети
    hostname: '192.168.100.4',
    // Phase 9.5: фирменный стиль Lock + Waves — adaptive icons для Android 8+
    android: {
      allowList: true,
      allowMixedContent: true, // <-- критично для HTTP (без HTTPS)
      adaptiveIcon: {
        foreground: 'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_foreground.png',
        background: 'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_background.png',
      },
    },
    // Phase 9.5 FIX: dev-режим Vite (обход production-build кэш-бага esbuild)
    // Приложение будет загружать код напрямую с dev-сервера, который отдаёт правильный apiService.ts
    url: 'http://192.168.100.4:5173',
    cleartext: true,
  },
};

export default config;