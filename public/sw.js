// Service Worker for SafeGuard Eldos
// Handles background notifications and offline functionality

const CACHE_NAME = 'safeguard-eldos-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/shield.svg',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New safety alert',
    icon: '/shield.svg',
    badge: '/shield.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('SafeGuard Eldos', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Background sync for offline incident reports
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-incident') {
    event.waitUntil(syncIncidentReports());
  }
});

async function syncIncidentReports() {
  // Get pending incident reports from IndexedDB
  const pendingReports = await getPendingReports();
  
  for (const report of pendingReports) {
    try {
      // Attempt to submit the report
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report)
      });

      if (response.ok) {
        // Remove from pending reports
        await removePendingReport(report.id);
        
        // Show success notification
        self.registration.showNotification('Report Submitted', {
          body: 'Your incident report has been submitted successfully.',
          icon: '/shield.svg',
          tag: 'report-success'
        });
      }
    } catch (error) {
      console.error('Failed to sync incident report:', error);
    }
  }
}

// IndexedDB helpers for offline functionality
async function getPendingReports() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SafeGuardDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingReports'], 'readonly');
      const store = transaction.objectStore('pendingReports');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingReports')) {
        db.createObjectStore('pendingReports', { keyPath: 'id' });
      }
    };
  });
}

async function removePendingReport(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SafeGuardDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingReports'], 'readwrite');
      const store = transaction.objectStore('pendingReports');
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}