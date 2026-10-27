import { getApps, initializeApp } from 'firebase/app';
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { apiService } from './apiService';

// Для совместимости с ts-jest используем process.env вместо import.meta.env.
// Vite подставляет значения process.env.VITE_* при сборке через define.
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

let messaging: ReturnType<typeof getMessaging> | null = null;
let appInitialized = false;

/** Инициализирует приложение Firebase и сервис push-уведомлений. */
const initFirebase = () => {
  if (appInitialized) return;

  // Инициализируем Firebase, если он ещё не запущен.
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  appInitialized = true;
  return app;
};

/** Запускает push-уведомления FCM, запрашивает разрешение и регистрирует токен на сервере. */
export const initPushNotifications = async (): Promise<string | null> => {
  try {
    initFirebase();

    // Проверяем, поддерживается ли FCM в этом браузере.
    const supported = await isSupported();
    if (!supported) {
      console.log('[Push] FCM not supported in this browser');
      return null;
    }

    messaging = getMessaging();

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Push] Notification permission not granted');
      return null;
    }

    // Получаем токен FCM с помощью ключа VAPID.
    const vapidKey = process.env.VITE_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, {
      vapidKey: vapidKey || undefined,
    });

    if (token) {
      console.log('[Push] FCM Token obtained:', token.substring(0, 20) + '...');

      // Регистрируем токен на сервере.
      await apiService.registerPushToken(token, 'web');
      return token;
    } else {
      console.warn('[Push] No FCM token received');
      return null;
    }
  } catch (error) {
    console.error('[Push] Initialization error:', error);
    return null;
  }
};

/** Обрабатывает push-сообщения, полученные при открытом приложении. */
export const onForegroundMessage = (callback: (payload: any) => void): (() => void) => {
  if (!messaging) {
    initFirebase();
    messaging = getMessaging();
  }

  return onMessage(messaging, callback);
};

/** Запрашивает разрешение на показ уведомлений. */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  return await Notification.requestPermission();
};

/** Возвращает текущий токен FCM. */
export const getFCMToken = async (): Promise<string | null> => {
  if (!messaging) {
    initFirebase();
    messaging = getMessaging();
  }

  const vapidKey = process.env.VITE_FIREBASE_VAPID_KEY;
  return await getToken(messaging, { vapidKey: vapidKey || undefined });
};

/** Удаляет токен FCM и отменяет его регистрацию. */
export const deleteFCMToken = async (): Promise<boolean> => {
  if (!messaging) {
    initFirebase();
    messaging = getMessaging();
  }

  try {
    await deleteToken(messaging);
    console.log('[Push] FCM token deleted');
    return true;
  } catch (error) {
    console.error('[Push] Error deleting token:', error);
    return false;
  }
};

/** Проверяет, поддерживается ли FCM в текущем браузере. */
export const isFCMSupported = async (): Promise<boolean> => {
  return await isSupported();
};
