// Phase 2: Tor SOCKS5 proxy support (опциональный).
// В WebView (Capacitor) нативный SOCKS5 не поддерживается.
// Fallback: прямое соединение с предупреждением в логах.

const TOR_CHECK_URL = 'https://check.torproject.org/api/ip';
const TOR_SOCKS_HOST = '127.0.0.1';
const TOR_SOCKS_PORT = 9050;

export interface TorConfig {
  enabled: boolean;
  socksHost: string;
  socksPort: number;
}

/**
 * Tor proxy manager. Включается через Settings → "Использовать Tor".
 *
 * Ограничения:
 * - В браузере/Capacitor WebView нет нативной SOCKS5 поддержки.
 * - Для реального использования нужен нативный HTTP proxy (Tor daemon на 9050)
 *   или Capacitor плагин для SOCKS5.
 *
 * Что мы делаем сейчас:
 * - Храним состояние enabled/disabled
 * - Проверяем доступность Tor через fetch (check.torproject.org)
 * - Логируем предупреждение если Tor включён в WebView без реального proxy
 */
export class TorProxy {
  private config: TorConfig;
  private checkCache: { isTor: boolean; checkedAt: number } | null = null;
  private readonly CHECK_TTL = 5 * 60 * 1000;  // 5 минут кэш

  constructor(config?: Partial<TorConfig>) {
    this.config = {
      enabled: false,
      socksHost: TOR_SOCKS_HOST,
      socksPort: TOR_SOCKS_PORT,
      ...config,
    };
  }

  enable(): void {
    this.config.enabled = true;
    this.checkCache = null;
    console.log(`[TOR] Proxy enabled: socks5://${this.config.socksHost}:${this.config.socksPort}`);
    console.warn('[TOR] ВНИМАНИЕ: В WebView (Capacitor) SOCKS5 не поддерживается нативно.');
    console.warn('[TOR] Для реальной анонимизации нужен нативный HTTP proxy или Capacitor плагин.');
  }

  disable(): void {
    this.config.enabled = false;
    this.checkCache = null;
    console.log('[TOR] Proxy disabled');
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Проверяет, доступен ли Tor и выходим ли мы через Tor-сеть.
   * Использует check.torproject.org/api/ip.
   */
  async checkAvailability(): Promise<boolean> {
    if (!this.config.enabled) return false;

    // Cache check (5 минут)
    if (this.checkCache && Date.now() - this.checkCache.checkedAt < this.CHECK_TTL) {
      return this.checkCache.isTor;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(TOR_CHECK_URL, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) {
        console.warn(`[TOR] check.torproject.org returned ${response.status}`);
        return false;
      }
      const data: { IsTor?: boolean; IP?: string } = await response.json();
      const isTor = data.IsTor === true;
      this.checkCache = { isTor, checkedAt: Date.now() };
      if (isTor) {
        console.log(`[TOR] Confirmed: traffic going through Tor. IP=${data.IP}`);
      } else {
        console.warn(`[TOR] check.torproject.org says IsTor=false. IP=${data.IP}`);
      }
      return isTor;
    } catch (e) {
      console.warn('[TOR] checkAvailability failed:', e);
      return false;
    }
  }

  /**
   * Возвращает URL для WebSocket подключения.
   * В текущей реализации (WebView) — возвращает directUrl с предупреждением.
   * Production: нужен Capacitor плагин или нативный HTTP proxy на стороне Android.
   */
  getWsUrl(directUrl: string): string {
    if (!this.config.enabled) return directUrl;
    console.warn('[TOR] WebSocket через Tor не поддерживается в WebView.');
    console.warn('[TOR] Используется прямое соединение. Включите Tor через VPN/proxy на уровне ОС.');
    return directUrl;
  }

  /**
   * Возвращает URL для HTTP запросов.
   * В WebView — то же самое что getWsUrl.
   */
  getHttpUrl(directUrl: string): string {
    return this.getWsUrl(directUrl);
  }

  getConfig(): TorConfig {
    return { ...this.config };
  }
}

export const torProxy = new TorProxy();