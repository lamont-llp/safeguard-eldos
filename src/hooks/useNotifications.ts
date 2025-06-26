import { useState, useEffect } from 'react';
import { notificationService, NotificationData, NotificationPreferences } from '../services/notificationService';
import { useLocation } from './useLocation';
import { requestFCMPermission, onForegroundMessage, getCurrentFCMToken, isMessagingSupported } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    notificationService.getPreferences()
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const { latitude, longitude } = useLocation();
  const { user, profile } = useAuthContext();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [fcmSupported, setFcmSupported] = useState(false);

  useEffect(() => {
    // Initialize notification service
    const initializeNotifications = async () => {
      if (latitude && longitude) {
        await notificationService.initialize({ latitude, longitude });
        setIsInitialized(true);
      }
    };

    initializeNotifications();
  }, [latitude, longitude]);

  // Initialize FCM
  useEffect(() => {
    const initializeFCM = async () => {
      const supported = isMessagingSupported();
      setFcmSupported(supported);
      
      if (supported) {
        // Set up foreground message listener
        const unsubscribe = onForegroundMessage((payload) => {
          console.log('Foreground FCM message received:', payload);
          
          // Convert FCM payload to our notification format
          const notificationData: Omit<NotificationData, 'id' | 'timestamp' | 'read'> = {
            type: (payload.data?.type as any) || 'incident',
            title: payload.notification?.title || 'SafeGuard Eldos',
            message: payload.notification?.body || 'New notification',
            priority: (payload.data?.priority as any) || 'medium',
            data: payload.data,
            actionUrl: payload.data?.click_action
          };
          
          // Show notification through our service
          showNotification(notificationData);
        });
        
        return unsubscribe;
      }
    };
    
    initializeFCM();
  }, []);

  // Store FCM token when user is authenticated
  useEffect(() => {
    const storeFCMToken = async () => {
      if (user && profile && fcmSupported && preferences.pushEnabled && Notification.permission === 'granted') {
        try {
          const token = await getCurrentFCMToken();
          if (token && token !== fcmToken) {
            setFcmToken(token);
            
            // Store token in Supabase
            const deviceInfo = {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              language: navigator.language,
              timestamp: new Date().toISOString()
            };
            
            const { error } = await supabase
              .from('fcm_tokens')
              .upsert({
                user_id: user.id,
                profile_id: profile.id,
                token: token,
                device_info: deviceInfo,
                is_active: true,
                last_used_at: new Date().toISOString()
              }, {
                onConflict: 'token'
              });
            
            if (error) {
              console.error('Error storing FCM token:', error);
            } else {
              console.log('FCM token stored successfully');
            }
          }
        } catch (error) {
          console.error('Error getting FCM token:', error);
        }
      }
    };
    
    storeFCMToken();
  }, [user, profile, fcmSupported, preferences.pushEnabled, fcmToken]);
  useEffect(() => {
    // Update location when it changes
    if (latitude && longitude) {
      notificationService.updateLocation({ latitude, longitude });
    }
  }, [latitude, longitude]);

  useEffect(() => {
    // Subscribe to notification updates
    const handleNotificationUpdate = (updatedNotifications: NotificationData[]) => {
      setNotifications(updatedNotifications);
    };

    notificationService.addListener(handleNotificationUpdate);

    return () => {
      notificationService.removeListener(handleNotificationUpdate);
    };
  }, []);

  const requestPermission = async () => {
    try {
      // Request browser notification permission first
      const browserGranted = await notificationService.requestPermission();
      
      // If browser permission granted and FCM is supported, request FCM permission
      if (browserGranted && fcmSupported) {
        const fcmTokenResult = await requestFCMPermission();
        if (fcmTokenResult) {
          setFcmToken(fcmTokenResult);
          console.log('FCM permission granted and token received');
        }
      }
      
      setPreferences(notificationService.getPreferences());
      return browserGranted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const showNotification = async (data: Omit<NotificationData, 'id' | 'timestamp' | 'read'>) => {
    return await notificationService.showNotification(data);
  };

  const markAsRead = (notificationId: string) => {
    notificationService.markAsRead(notificationId);
  };

  const markAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const removeNotification = (notificationId: string) => {
    notificationService.removeNotification(notificationId);
  };

  const clearAll = () => {
    notificationService.clearAll();
  };

  const updatePreferences = (newPreferences: Partial<NotificationPreferences>) => {
    notificationService.updatePreferences(newPreferences);
    setPreferences(notificationService.getPreferences());
    
    // If push notifications are disabled, deactivate FCM token
    if (newPreferences.pushEnabled === false && fcmToken && user) {
      supabase
        .from('fcm_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('token', fcmToken)
        .then(({ error }) => {
          if (error) {
            console.error('Error deactivating FCM token:', error);
          } else {
            console.log('FCM token deactivated');
          }
        });
    }
  };

  const getUnreadCount = () => {
    return notificationService.getUnreadCount();
  };

  const getNotificationsByType = (type: NotificationData['type']) => {
    return notifications.filter(notification => notification.type === type);
  };

  const getNotificationsByPriority = (priority: NotificationData['priority']) => {
    return notifications.filter(notification => notification.priority === priority);
  };

  const getRecentNotifications = (hours = 24) => {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    
    return notifications.filter(notification => 
      new Date(notification.timestamp) > cutoff
    );
  };

  return {
    notifications,
    preferences,
    isInitialized,
    fcmSupported,
    fcmToken,
    unreadCount: getUnreadCount(),
    requestPermission,
    showNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    updatePreferences,
    getNotificationsByType,
    getNotificationsByPriority,
    getRecentNotifications
  };
};