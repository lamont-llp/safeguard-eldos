import { supabase } from '../lib/supabase';

export interface NotificationData {
  id: string;
  type: 'incident' | 'safety_alert' | 'community_event' | 'route_update' | 'verification';
  title: string;
  message: string;
  data?: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export interface NotificationPreferences {
  incidents: boolean;
  safetyAlerts: boolean;
  communityEvents: boolean;
  routeUpdates: boolean;
  verifications: boolean;
  pushEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  locationRadius: number; // meters
}

class NotificationService {
  private static instance: NotificationService;
  private notifications: NotificationData[] = [];
  private preferences: NotificationPreferences = {
    incidents: true,
    safetyAlerts: true,
    communityEvents: true,
    routeUpdates: false,
    verifications: true,
    pushEnabled: false,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '07:00'
    },
    locationRadius: 2000
  };
  private listeners: ((notifications: NotificationData[]) => void)[] = [];
  private userLocation: { latitude: number; longitude: number } | null = null;

  private constructor() {
    this.loadPreferences();
    this.loadNotifications();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Initialize the notification service
  async initialize(userLocation?: { latitude: number; longitude: number }) {
    if (userLocation) {
      this.userLocation = userLocation;
    }

    // Request notification permission
    await this.requestPermission();

    // Register service worker for background notifications
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered for notifications');
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }

    return this.preferences.pushEnabled;
  }

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.preferences.pushEnabled = true;
      this.savePreferences();
      return true;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      this.preferences.pushEnabled = granted;
      this.savePreferences();
      return granted;
    }

    return false;
  }

  // Add notification listener
  addListener(callback: (notifications: NotificationData[]) => void) {
    this.listeners.push(callback);
    // Immediately call with current notifications
    callback(this.notifications);
  }

  // Remove notification listener
  removeListener(callback: (notifications: NotificationData[]) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.notifications));
  }

  // Create and show notification
  async showNotification(data: Omit<NotificationData, 'id' | 'timestamp' | 'read'>) {
    const notification: NotificationData = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false
    };

    // Check if notification should be shown based on preferences
    if (!this.shouldShowNotification(notification)) {
      return;
    }

    // Check location-based filtering
    if (notification.location && this.userLocation && !this.isWithinRadius(notification.location)) {
      return;
    }

    // Add to notifications list
    this.notifications.unshift(notification);
    this.saveNotifications();
    this.notifyListeners();

    // Show browser notification if enabled
    if (this.preferences.pushEnabled && this.canShowNotification()) {
      await this.showBrowserNotification(notification);
    }

    // Play sound if enabled
    if (this.preferences.soundEnabled && this.canShowNotification()) {
      this.playNotificationSound(notification.priority);
    }

    // Vibrate if enabled and supported
    if (this.preferences.vibrationEnabled && 'vibrate' in navigator) {
      this.vibrateDevice(notification.priority);
    }

    return notification;
  }

  // Show browser notification
  private async showBrowserNotification(notification: NotificationData) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const options: NotificationOptions = {
      body: notification.message,
      icon: '/shield.svg',
      badge: '/shield.svg',
      tag: notification.type,
      data: notification,
      requireInteraction: notification.priority === 'urgent',
      silent: !this.preferences.soundEnabled,
      actions: notification.actionUrl ? [
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
      ] : undefined
    };

    const browserNotification = new Notification(notification.title, options);

    browserNotification.onclick = () => {
      window.focus();
      if (notification.actionUrl) {
        window.location.href = notification.actionUrl;
      }
      browserNotification.close();
    };

    // Auto-close non-urgent notifications after 5 seconds
    if (notification.priority !== 'urgent') {
      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }
  }

  // Play notification sound
  private playNotificationSound(priority: NotificationData['priority']) {
    try {
      const audio = new Audio();
      
      switch (priority) {
        case 'urgent':
          audio.src = '/sounds/urgent-alert.mp3';
          break;
        case 'high':
          audio.src = '/sounds/high-priority.mp3';
          break;
        default:
          audio.src = '/sounds/notification.mp3';
          break;
      }
      
      audio.volume = 0.7;
      audio.play().catch(console.warn);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }

  // Vibrate device
  private vibrateDevice(priority: NotificationData['priority']) {
    if (!('vibrate' in navigator)) return;

    switch (priority) {
      case 'urgent':
        navigator.vibrate([200, 100, 200, 100, 200]);
        break;
      case 'high':
        navigator.vibrate([100, 50, 100]);
        break;
      default:
        navigator.vibrate(100);
        break;
    }
  }

  // Check if notification should be shown based on preferences
  private shouldShowNotification(notification: NotificationData): boolean {
    switch (notification.type) {
      case 'incident':
        return this.preferences.incidents;
      case 'safety_alert':
        return this.preferences.safetyAlerts;
      case 'community_event':
        return this.preferences.communityEvents;
      case 'route_update':
        return this.preferences.routeUpdates;
      case 'verification':
        return this.preferences.verifications;
      default:
        return true;
    }
  }

  // Check if we can show notification (considering quiet hours)
  private canShowNotification(): boolean {
    if (!this.preferences.quietHours.enabled) {
      return true;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { start, end } = this.preferences.quietHours;
    
    // Handle quiet hours that span midnight
    if (start > end) {
      return currentTime < start && currentTime > end;
    } else {
      return currentTime < start || currentTime > end;
    }
  }

  // Check if location is within notification radius
  private isWithinRadius(notificationLocation: { latitude: number; longitude: number }): boolean {
    if (!this.userLocation) return true; // Show all notifications if no user location

    const distance = this.calculateDistance(
      this.userLocation.latitude,
      this.userLocation.longitude,
      notificationLocation.latitude,
      notificationLocation.longitude
    );

    return distance <= this.preferences.locationRadius;
  }

  // Calculate distance between two points
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  // Mark notification as read
  markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveNotifications();
      this.notifyListeners();
    }
  }

  // Mark all notifications as read
  markAllAsRead() {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
    this.saveNotifications();
    this.notifyListeners();
  }

  // Remove notification
  removeNotification(notificationId: string) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotifications();
    this.notifyListeners();
  }

  // Clear all notifications
  clearAll() {
    this.notifications = [];
    this.saveNotifications();
    this.notifyListeners();
  }

  // Get notifications
  getNotifications(): NotificationData[] {
    return this.notifications;
  }

  // Get unread count
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  // Update preferences
  updatePreferences(newPreferences: Partial<NotificationPreferences>) {
    this.preferences = { ...this.preferences, ...newPreferences };
    this.savePreferences();
  }

  // Get preferences
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  // Update user location
  updateLocation(location: { latitude: number; longitude: number }) {
    this.userLocation = location;
  }

  // Save preferences to localStorage
  private savePreferences() {
    try {
      localStorage.setItem('safeguard_notification_preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.warn('Failed to save notification preferences:', error);
    }
  }

  // Load preferences from localStorage
  private loadPreferences() {
    try {
      const saved = localStorage.getItem('safeguard_notification_preferences');
      if (saved) {
        this.preferences = { ...this.preferences, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load notification preferences:', error);
    }
  }

  // Save notifications to localStorage
  private saveNotifications() {
    try {
      // Only save last 50 notifications to prevent storage bloat
      const toSave = this.notifications.slice(0, 50);
      localStorage.setItem('safeguard_notifications', JSON.stringify(toSave));
    } catch (error) {
      console.warn('Failed to save notifications:', error);
    }
  }

  // Load notifications from localStorage
  private loadNotifications() {
    try {
      const saved = localStorage.getItem('safeguard_notifications');
      if (saved) {
        this.notifications = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load notifications:', error);
    }
  }
}

export const notificationService = NotificationService.getInstance();
export default notificationService;