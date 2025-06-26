import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// VAPID key for web push
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
let messaging: any = null;

// Check if we're in a browser environment and messaging is supported
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.warn('Firebase messaging not supported in this environment:', error);
  }
}

/**
 * Request notification permission and get FCM token
 */
export const requestFCMPermission = async (): Promise<string | null> => {
  if (!messaging) {
    console.warn('Firebase messaging not available');
    return null;
  }

  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted');
      
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: vapidKey
      });
      
      if (token) {
        console.log('FCM token received:', token);
        return token;
      } else {
        console.warn('No FCM token available');
        return null;
      }
    } else {
      console.warn('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

/**
 * Listen for foreground messages
 */
export const onForegroundMessage = (callback: (payload: MessagePayload) => void) => {
  if (!messaging) {
    console.warn('Firebase messaging not available');
    return () => {};
  }

  try {
    return onMessage(messaging, callback);
  } catch (error) {
    console.error('Error setting up foreground message listener:', error);
    return () => {};
  }
};

/**
 * Get current FCM token
 */
export const getCurrentFCMToken = async (): Promise<string | null> => {
  if (!messaging) {
    console.warn('Firebase messaging not available');
    return null;
  }

  try {
    // Check if we're in a valid context for getting tokens
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported, cannot get FCM token');
      return null;
    }
    
    const token = await getToken(messaging, {
      vapidKey: vapidKey
    });
    return token || null;
  } catch (error) {
    console.error('Error getting current FCM token:', error);
    return null;
  }
};

/**
 * Check if Firebase messaging is supported
 */
export const isMessagingSupported = (): boolean => {
  return messaging !== null;
};

export { messaging };
export default app;