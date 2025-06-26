// Firebase Messaging Service Worker
// This file handles background push notifications

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration - these will be replaced with actual values
const firebaseConfig = {
  apiKey: ${import.meta.env.VITE_FIREBASE_API_KEY},
  authDomain: ${import.meta.env.VITE_FIREBASE_AUTH_DOMAIN},
  projectId: ${import.meta.env.VITE_FIREBASE_PROJECT_ID},
  storageBucket: ${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET},
  messagingSenderId: ${import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID},
  appId: ${import.meta.env.VITE_FIREBASE_APP_ID},
  measurementId: ${import.meta.env.VITE_FIREBASE_MEASUREMENT_ID}
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'SafeGuard Eldos';
  const notificationOptions = {
    body: payload.notification?.body || 'New safety alert',
    icon: '/shield.svg',
    badge: '/shield.svg',
    tag: 'safeguard-notification',
    data: {
      ...payload.data,
      click_action: payload.data?.click_action || '/',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/icons/view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss.png'
      }
    ],
    requireInteraction: payload.data?.priority === 'urgent',
    silent: false,
    vibrate: payload.data?.priority === 'urgent' ? [200, 100, 200, 100, 200] : [100]
  };

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'view' || !event.action) {
    // Open the app or navigate to specific page
    const urlToOpen = event.notification.data?.click_action || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if app is already open
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              client.focus();
              if (urlToOpen !== '/') {
                client.navigate(urlToOpen);
              }
              return;
            }
          }
          
          // Open new window if app is not open
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification (already done above)
    console.log('Notification dismissed');
  }
});

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // Track notification dismissal if needed
  if (event.notification.data?.track_dismissal) {
    // Could send analytics event here
  }
});

// Handle push events (for additional processing)
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  // Additional push event handling can be added here
  // The onBackgroundMessage handler above will handle showing notifications
});

// Service worker activation
self.addEventListener('activate', (event) => {
  console.log('Firebase messaging service worker activated');
  
  // Clean up old caches or perform other activation tasks
  event.waitUntil(
    // Perform any cleanup tasks
    Promise.resolve()
  );
});

// Service worker installation
self.addEventListener('install', (event) => {
  console.log('Firebase messaging service worker installed');
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});