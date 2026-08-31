import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.piligrim.app',
  appName: 'PILIGRIM',
  webDir: 'dist',
  server: {
    hostname: '192.168.100.4',
    url: 'http://192.168.100.4:5173',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#7c3aed", // Phase 9.5: фиолетовый фон под бренд
      showSpinner: false,
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP"
    }
  }
};

export default config;