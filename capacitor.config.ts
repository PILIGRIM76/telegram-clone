import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cipherlink.app',
  appName: 'CipherLink',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // Phase 9: Подключение планшета RT9 к ПК по локальной сети
    hostname: '192.168.100.4',
    android: { allowList: true },
  },
};

export default config;