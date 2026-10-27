import { logger } from './logger';
// Push-уведомления помогают связаться с получателями, которые сейчас не в сети.
// Использует Web Push API и Service Worker.
// Для боевой версии требуется ключ VAPID (Firebase Cloud Messaging или собственный).

export interface PushConfig {
  /** Открытый ключ VAPID в base64url. Замените его собственным для боевой версии. */
  vapidPublicKey: string;
  /** Сервис отправки уведомлений: Firebase, OneSignal или собственный. */
  provider: 'web-push' | 'fcm' | 'onesignal';
}

const DEFAULT_CONFIG: PushConfig = {
  vapidPublicKey: 'YOUR_VAPID_PUBLIC_KEY_HERE',
  provider: 'web-push',
};

export class PushNotificationService {
  private config: PushConfig;
  private subscription: PushSubscription | null = null;
  private token: string | null = null;

  constructor(config?: Partial<PushConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Проверяет, поддерживается ли Web Push API.
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Инициализирует push-подписку. Требует HTTPS (или localhost для dev).
   */
  async init(): Promise<PushSubscription | null> {
    if (!this.isSupported()) {
      logger.warn('[Push] Web Push API not supported');
      return null;
    }

    if (Notification.permission === 'denied') {
      logger.warn('[Push] Notification permission denied');
      return null;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        logger.warn('[Push] Notification permission not granted');
        return null;
      }
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(
            this.config.vapidPublicKey
          ) as unknown as BufferSource,
        });
        logger.info('[Push] New subscription created');
      } else {
        logger.info('[Push] Using existing subscription');
      }

      this.subscription = subscription;
      this.token = JSON.stringify(subscription);
      return subscription;
    } catch (e) {
      logger.error('[Push] init failed:', e);
      return null;
    }
  }

  /**
   * Возвращает текущий токен/подписку для отправки на сервер.
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Возвращает subscription object.
   */
  getSubscription(): PushSubscription | null {
    return this.subscription;
  }

  /**
   * Отписывается от push-уведомлений.
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) return true;
    try {
      const result = await this.subscription.unsubscribe();
      this.subscription = null;
      this.token = null;
      logger.info('[Push] Unsubscribed:', result);
      return result;
    } catch (e) {
      logger.error('[Push] Unsubscribe failed:', e);
      return false;
    }
  }

  /**
   * Показывает локальное уведомление (для отладки без сервера).
   */
  async showLocalNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.isSupported()) return;
    if (Notification.permission !== 'granted') {
      logger.warn('[Push] Notification permission not granted');
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      ...options,
    });
  }

  /**
   * Преобразует открытый ключ VAPID из base64url в Uint8Array.
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
  }
}

export const pushNotifications = new PushNotificationService();
