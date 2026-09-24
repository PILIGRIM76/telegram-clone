// Firebase Messaging Service Worker for CipherLink
// This file must be in the public folder for Vite to serve it at root
// Version: v3.13

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase configuration will be replaced at build time via env variables
// For now, using placeholder values - these should be set via Vite env
const firebaseConfig = {
  apiKey: '__FIREBASE_API_KEY__',
  authDomain: '__FIREBASE_AUTH_DOMAIN__',
  projectId: '__FIREBASE_PROJECT_ID__',
  messagingSenderId: '__FIREBASE_MESSAGING_SENDER_ID__',
  appId: '__FIREBASE_APP_ID__',
};

try {
  firebase.initializeApp(firebaseConfig);
} catch (e) {
  console.error('[SW] Firebase initialization failed:', e);
}

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[Service Worker] Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'New message';
  const notificationBody = payload.notification?.body || 'You have a new encrypted message';
  
  const notificationOptions = {
    body: notificationBody,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'cipherlink-message',
    renotify: true,
    requireInteraction: false,
    data: {
      url: payload.data?.chatId ? `/?chat=${payload.data.chatId}` : '/',
      messageId: payload.data?.messageId || '',
      type: payload.data?.type || 'new_message',
    },
  };

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          // Send postMessage to navigate to specific chat
          client.postMessage({
            type: 'NAVIGATE_TO_CHAT',
            chatId: notificationData.messageId ? `chat_${notificationData.chatId}` : null,
            url: targetUrl,
          });
          return client.focus();
        }
      }
      
      // Open new window if no existing window found
      return clients.openWindow(targetUrl);
    })
  );
});

// Handle push subscription change (token refresh)
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[Service Worker] Push subscription changed');
  
  event.waitUntil(
    // The client will re-register the token on next visit
    Promise.resolve()
  );
});

// Skip waiting to activate immediately
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(clients.claim());
});