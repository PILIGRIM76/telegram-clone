import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.piligrim.app',
  appName: 'PILIGRIM',
  webDir: 'public',
  // server Р±Р»РѕРє СѓРґР°Р»С‘РЅ вЂ” РїСЂРёР»РѕР¶РµРЅРёРµ СЂР°Р±РѕС‚Р°РµС‚ РІ offline-СЂРµР¶РёРјРµ
  // РёР· Р»РѕРєР°Р»СЊРЅРѕРіРѕ Р±Р°РЅРґР»Р° (Р±РµР· Р·Р°РІРёСЃРёРјРѕСЃС‚Рё РѕС‚ dev-СЃРµСЂРІРµСЂР°)
  android: {
    allowMixedContent: true,
    // Phase 9.5 fix: androidScheme='https' по умолчанию в Capacitor 3+ создаёт
    // виртуальный хост https://localhost, который блокирует загрузку bundle
    // на Android WebView (белый экран на RT9). Используем 'http' для совместимости.
    androidScheme: 'http',
    // v1.5.2 Stage 7: Разрешаем WebSocket подключения к LAN backend (192.168.100.4:4000)
    // Mixed Content policy по умолчанию блокирует ws:// с https://localhost страницы.
    // 'cleartext': true разрешает HTTP/WS к указанным доменам.
    cleartext: true
  },
  server: {
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