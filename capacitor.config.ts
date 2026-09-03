import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.piligrim.app',
  appName: 'PILIGRIM',
  webDir: 'public',
  // server Р±Р»РѕРє СѓРґР°Р»С‘РЅ вЂ” РїСЂРёР»РѕР¶РµРЅРёРµ СЂР°Р±РѕС‚Р°РµС‚ РІ offline-СЂРµР¶РёРјРµ
  // РёР· Р»РѕРєР°Р»СЊРЅРѕРіРѕ Р±Р°РЅРґР»Р° (Р±РµР· Р·Р°РІРёСЃРёРјРѕСЃС‚Рё РѕС‚ dev-СЃРµСЂРІРµСЂР°)
  android: {
    allowMixedContent: true
    // Примечание: cleartext для Capacitor v8+ теперь в network_security_config.xml
    // (android/app/src/main/res/xml/network_security_config.xml),
    // а НЕ в capacitor.config.ts.
  },
  server: {
    // v2.0 Stage 7: Phase 9.5 fix — androidScheme перенесён из android{} в server{}
    // для совместимости с Capacitor v8. Capacitor 3-7 принимал androidScheme
    // в android{}, но v8+ переместил его сюда. Dual-write для обратной совместимости:
    // Capacitor автоматически игнорирует androidScheme, если не знает о нём.
    androidScheme: 'http',
    // Разрешаем навигацию к backend (для WebSocket и REST)
    allowNavigation: ['192.168.100.4', 'localhost', '127.0.0.1']
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