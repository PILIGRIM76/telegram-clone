import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.piligrim.app',
  appName: 'PILIGRIM',
  webDir: 'dist',
  // server Р±Р»РѕРє СѓРґР°Р»С‘РЅ вЂ” РїСЂРёР»РѕР¶РµРЅРёРµ СЂР°Р±РѕС‚Р°РµС‚ РІ offline-СЂРµР¶РёРјРµ
  // РёР· Р»РѕРєР°Р»СЊРЅРѕРіРѕ Р±Р°РЅРґР»Р° (Р±РµР· Р·Р°РІРёСЃРёРјРѕСЃС‚Рё РѕС‚ dev-СЃРµСЂРІРµСЂР°)
  android: {
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#7c3aed",
      showSpinner: false,
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP"
    }
  }
};

export default config;