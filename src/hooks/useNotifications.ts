import { useState, useEffect } from 'react';
import { notificationService, NotificationData, NotificationPreferences } from '../services/notificationService';
import { useLocation } from './useLocation';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    notificationService.getPreferences()
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const { latitude, longitude } = useLocation();

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
    const granted = await notificationService.requestPermission();
    setPreferences(notificationService.getPreferences());
    return granted;
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