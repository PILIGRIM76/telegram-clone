// Phase 3: Push notifications — wake up offline recipients.
// Использует Web Push API + Service Worker.
// В production: требует VAPID ключ (Firebase Cloud Messaging или собственный).

export interface PushConfig {
  /** VAPID public key (base64url). Заменить на свой для production. */
  vapidPublicKey: string;
  /** Сервис для отправки (Firebase, OneSignal, собственный). */
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
   * Проверяет поддержку Web Push API.
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
      console.warn('[Push] Web Push API not supported');
      return null;
    }

    if (Notification.permission === 'denied') {
      console.warn('[Push] Notification permission denied');
      return null;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('[Push] Notification permission not granted');
        return null;
      }
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.config.vapidPublicKey) as unknown as BufferSource,
        });
        console.log('[Push] New subscription created');
      } else {
        console.log('[Push] Using existing subscription');
      }

      this.subscription = subscription;
      this.token = JSON.stringify(subscription);
      return subscription;
    } catch (e) {
      console.error('[Push] init failed:', e);
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
      console.log('[Push] Unsubscribed:', result);
      return result;
    } catch (e) {
      console.error('[Push] Unsubscribe failed:', e);
      return false;
    }
  }

  /**
   * Показывает локальное уведомление (для отладки без сервера).
   */
  async showLocalNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.isSupported()) return;
    if (Notification.permission !== 'granted') {
      console.warn('[Push] Notification permission not granted');
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
   * Конвертирует VAPID public key из base64url в Uint8Array.
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  }
}

export const pushNotifications = new PushNotificationService();