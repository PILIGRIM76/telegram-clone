import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, deleteToken } from 'firebase/messaging';
import { apiService } from './apiService';

// v3.13: Use process.env instead of import.meta.env for ts-jest compatibility
// Vite replaces process.env.VITE_* at build time via define config
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

let messaging: ReturnType<typeof getMessaging> | null = null;
let appInitialized = false;

/**
 * Initialize Firebase app and messaging
 */
const initFirebase = () => {
  if (appInitialized) return;
  
  // Initialize Firebase app if not already initialized
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  appInitialized = true;
  return app;
};

/**
 * Initialize FCM push notifications
 * Requests permission, gets token, and registers with server
 */
export const initPushNotifications = async (): Promise<string | null> => {
  try {
    // Initialize Firebase
    initFirebase();
    
    // Check if FCM is supported in this browser
    const supported = await isSupported();
    if (!supported) {
      console.log('[Push] FCM not supported in this browser');
      return null;
    }

    messaging = getMessaging();
    
    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Push] Notification permission not granted');
      return null;
    }

    // Get FCM token with VAPID key
    const vapidKey = process.env.VITE_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, {
      vapidKey: vapidKey || undefined,
    });

    if (token) {
      console.log('[Push] FCM Token obtained:', token.substring(0, 20) + '...');
      
      // Register token with server
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

/**
 * Handle foreground messages (when app is open)
 */
export const onForegroundMessage = (callback: (payload: any) => void): (() => void) => {
  if (!messaging) {
    initFirebase();
    messaging = getMessaging();
  }
  
  return onMessage(messaging, callback);
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  return await Notification.requestPermission();
};

/**
 * Get current FCM token
 */
export const getFCMToken = async (): Promise<string | null> => {
  if (!messaging) {
    initFirebase();
    messaging = getMessaging();
  }
  
  const vapidKey = process.env.VITE_FIREBASE_VAPID_KEY;
  return await getToken(messaging, { vapidKey: vapidKey || undefined });
};

/**
 * Delete FCM token (unregister)
 */
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

/**
 * Check if FCM is supported
 */
export const isFCMSupported = async (): Promise<boolean> => {
  return await isSupported();
};