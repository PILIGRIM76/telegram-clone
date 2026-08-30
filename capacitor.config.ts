import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cipherlink.app',
  appName: 'CipherLink',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // Phase 9: Подключение планшета RT9 к ПК по локальной сети
    hostname: '192.168.100.4',
    // Phase 9.5: фирменный стиль Lock + Waves — adaptive icons для Android 8+
    android: {
      allowList: true,
      adaptiveIcon: {
        // Capacitor требует именно PNG (SVG не поддерживается для native)
        foreground: 'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_foreground.png',
        background: 'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_background.png',
      },
    },
  },
};

export default config;