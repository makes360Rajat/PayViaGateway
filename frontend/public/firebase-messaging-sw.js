// PayVia360 — Firebase Cloud Messaging Service Worker
// Handles background push notifications when the browser tab is closed/inactive

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBc8XrFpQsnYGYvt-V6QX_yIvN9nn1KxTY',
  authDomain: 'payvia360.firebaseapp.com',
  projectId: 'payvia360',
  storageBucket: 'payvia360.firebasestorage.app',
  messagingSenderId: '772820567847',
  appId: '1:772820567847:web:efd8a2ec0ee33c46988b02',
  measurementId: 'G-NY0GPRQ4TY',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[PayVia360 SW] Background message received:', payload);

  const notificationTitle = payload.notification?.title || '💸 PayVia360 Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new payment notification.',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: payload.data?.orderId || 'payvia-notification',
    data: payload.data || {},
    actions: [
      { action: 'view', title: '👁 View Dashboard' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('payvia360.com') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('https://payvia360.com/dashboard');
        }
      })
    );
  }
});
