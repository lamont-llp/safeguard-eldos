import React, { useState } from 'react';
import { Bell, X, Settings, Check, Trash2, AlertCircle, Shield, Users, Route, CheckCircle } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationData } from '../services/notificationService';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const {
    notifications,
    preferences,
    fcmSupported,
    fcmToken,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    updatePreferences,
    requestPermission
  } = useNotifications();

  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');

  if (!isOpen) return null;

  const getNotificationIcon = (type: NotificationData['type']) => {
    switch (type) {
      case 'incident':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'safety_alert':
        return <Shield className="w-5 h-5 text-orange-500" />;
      case 'community_event':
        return <Users className="w-5 h-5 text-blue-500" />;
      case 'route_update':
        return <Route className="w-5 h-5 text-green-500" />;
      case 'verification':
        return <CheckCircle className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: NotificationData['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'urgent') return notification.priority === 'urgent';
    return true;
  });

  const handleNotificationClick = (notification: NotificationData) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      updatePreferences({ pushEnabled: true });
    }
  };

  if (showSettings) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Settings Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Settings className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Notification Settings</h2>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Settings Content */}
          <div className="p-6 space-y-6">
            {/* Push Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Push Notifications</h3>
                <p className="text-sm text-gray-500">Receive browser notifications</p>
              </div>
              <button
                onClick={() => updatePreferences({ pushEnabled: !preferences.pushEnabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.pushEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.pushEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Notification Types */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Notification Types</h3>
              
              {[
                { key: 'incidents', label: 'Incident Reports', description: 'New incidents in your area' },
                { key: 'safetyAlerts', label: 'Safety Alerts', description: 'Urgent safety notifications' },
                { key: 'communityEvents', label: 'Community Events', description: 'Upcoming community activities' },
                { key: 'routeUpdates', label: 'Route Updates', description: 'Changes to safe routes' },
                { key: 'verifications', label: 'Verifications', description: 'Incident verification updates' }
              ].map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-sm text-gray-500">{description}</p>
                  </div>
                  <button
                    onClick={() => updatePreferences({ [key]: !preferences[key as keyof typeof preferences] })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences[key as keyof typeof preferences] ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences[key as keyof typeof preferences] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            {/* Sound & Vibration */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Sound & Vibration</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Sound</p>
                  <p className="text-sm text-gray-500">Play notification sounds</p>
                </div>
                <button
                  onClick={() => updatePreferences({ soundEnabled: !preferences.soundEnabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.soundEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Vibration</p>
                  <p className="text-sm text-gray-500">Vibrate on notifications</p>
                </div>
                <button
                  onClick={() => updatePreferences({ vibrationEnabled: !preferences.vibrationEnabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.vibrationEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.vibrationEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Location Radius */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Notification Radius</h3>
              <p className="text-sm text-gray-500 mb-3">Receive notifications within this distance</p>
              <select
                value={preferences.locationRadius}
                onChange={(e) => updatePreferences({ locationRadius: parseInt(e.target.value) })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={500}>500m - Immediate area</option>
                <option value={1000}>1km - Neighborhood</option>
                <option value={2000}>2km - Extended area</option>
                <option value={5000}>5km - Wider community</option>
                <option value={10000}>10km - Greater area</option>
              </select>
            </div>

            {/* Quiet Hours */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Quiet Hours</h3>
                <button
                  onClick={() => updatePreferences({ 
                    quietHours: { ...preferences.quietHours, enabled: !preferences.quietHours.enabled }
                  })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.quietHours.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.quietHours.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {preferences.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                    <input
                      type="time"
                      value={preferences.quietHours.start}
                      onChange={(e) => updatePreferences({
                        quietHours: { ...preferences.quietHours, start: e.target.value }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                    <input
                      type="time"
                      value={preferences.quietHours.end}
                      onChange={(e) => updatePreferences({
                        quietHours: { ...preferences.quietHours, end: e.target.value }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Bell className="w-6 h-6 text-blue-600" />
              {unreadCount > 0 && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
              <p className="text-sm text-gray-600">{unreadCount} unread</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-500" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Enable Notifications Banner */}
        {!preferences.pushEnabled && fcmSupported && (
          <div className="bg-blue-50 border-b border-blue-200 p-4">
            <div className="flex items-start space-x-3">
              <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900">Enable Notifications</h3>
                <p className="text-blue-700 text-sm mt-1">
                  Get instant push notifications for safety incidents and community updates
                </p>
                {fcmToken && (
                  <p className="text-blue-600 text-xs mt-1">
                    ✓ Device registered for push notifications
                  </p>
                )}
                <button
                  onClick={handleEnableNotifications}
                  className="mt-2 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Enable Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FCM Status Info */}
        {!fcmSupported && (
          <div className="bg-amber-50 border-b border-amber-200 p-4">
            <div className="flex items-start space-x-3">
              <Bell className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-amber-900">Limited Notification Support</h3>
                <p className="text-amber-700 text-sm mt-1">
                  Your browser has limited support for push notifications. You'll still receive in-app notifications.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'urgent', label: 'Urgent' }
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id as any)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                filter === id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <button
              onClick={markAllAsRead}
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span className="text-sm">Mark all read</span>
            </button>
            <button
              onClick={clearAll}
              className="flex items-center space-x-1 text-red-600 hover:text-red-800 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">Clear all</span>
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-500">
                {filter === 'unread' ? 'All caught up!' : 'You\'ll see notifications here when they arrive'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-l-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    getPriorityColor(notification.priority)
                  } ${!notification.read ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start space-x-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.timestamp)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      {notification.location && (
                        <p className="text-xs text-gray-500 mt-1">
                          📍 {notification.location.address}
                        </p>
                      )}
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;