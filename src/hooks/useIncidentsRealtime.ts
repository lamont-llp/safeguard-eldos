import { useEffect, useRef, useCallback } from 'react';
import { createIncidentsChannel, createSafetyAlertsChannel } from '../lib/supabase';
import { useIncidentsContext } from '../contexts/IncidentsContext';
import { useNotifications } from './useNotifications';
import { useLocation } from './useLocation';

// ENHANCED: Notification deduplication system
interface NotificationRecord {
  incidentId: string;
  type: 'incident' | 'safety_alert' | 'verification' | 'resolution';
  timestamp: number;
  source: 'incident_channel' | 'alert_channel';
  hash: string; // Unique hash for the notification content
}

interface NotificationDeduplicator {
  records: Map<string, NotificationRecord>;
  maxAge: number; // Maximum age in milliseconds
  maxRecords: number; // Maximum number of records to keep
}

export const useIncidentsRealtime = () => {
  const { addIncident, updateIncident, removeIncident } = useIncidentsContext();
  const { showNotification } = useNotifications();
  const { latitude, longitude, getLocationString } = useLocation();

  // Use refs to track active subscriptions and prevent memory leaks
  const incidentChannelRef = useRef<any>(null);
  const alertChannelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);
  const notificationQuotaRef = useRef({ count: 0, resetTime: Date.now() });
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // ENHANCED: Notification deduplication system
  const deduplicatorRef = useRef<NotificationDeduplicator>({
    records: new Map(),
    maxAge: 300000, // 5 minutes
    maxRecords: 1000
  });

  // ENHANCED: Generate unique hash for notification content
  const generateNotificationHash = useCallback((
    incidentId: string,
    type: string,
    title: string,
    eventType: string,
    additionalData?: any
  ): string => {
    const content = {
      incidentId,
      type,
      title: title.toLowerCase().trim(),
      eventType,
      // Include relevant additional data that affects uniqueness
      isUrgent: additionalData?.is_urgent,
      isVerified: additionalData?.is_verified,
      isResolved: additionalData?.is_resolved,
      severity: additionalData?.severity
    };
    
    // Create a simple hash from the content
    const str = JSON.stringify(content);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }, []);

  // ENHANCED: Check if notification should be deduplicated
  const shouldDeduplicateNotification = useCallback((
    incidentId: string,
    type: 'incident' | 'safety_alert' | 'verification' | 'resolution',
    source: 'incident_channel' | 'alert_channel',
    title: string,
    eventType: string,
    additionalData?: any
  ): boolean => {
    const deduplicator = deduplicatorRef.current;
    const now = Date.now();
    
    // Clean up old records first
    const cutoff = now - deduplicator.maxAge;
    const toDelete: string[] = [];
    
    deduplicator.records.forEach((record, key) => {
      if (record.timestamp < cutoff) {
        toDelete.push(key);
      }
    });
    
    toDelete.forEach(key => deduplicator.records.delete(key));
    
    // Generate hash for this notification
    const hash = generateNotificationHash(incidentId, type, title, eventType, additionalData);
    
    // Check for exact duplicates (same hash)
    const existingByHash = Array.from(deduplicator.records.values()).find(
      record => record.hash === hash
    );
    
    if (existingByHash) {
      console.log('🚫 Blocked duplicate notification (exact match):', {
        incidentId,
        type,
        source,
        existingSource: existingByHash.source,
        timeDiff: now - existingByHash.timestamp,
        hash
      });
      return true; // Should deduplicate
    }
    
    // Check for incident-specific duplicates within time window
    const recentWindow = 30000; // 30 seconds
    const recentCutoff = now - recentWindow;
    
    const recentForIncident = Array.from(deduplicator.records.values()).filter(
      record => record.incidentId === incidentId && 
                record.type === type && 
                record.timestamp > recentCutoff
    );
    
    if (recentForIncident.length > 0) {
      console.log('🚫 Blocked duplicate notification (recent for incident):', {
        incidentId,
        type,
        source,
        recentCount: recentForIncident.length,
        timeSinceFirst: now - Math.min(...recentForIncident.map(r => r.timestamp))
      });
      return true; // Should deduplicate
    }
    
    // Special handling for urgent incidents
    if (type === 'safety_alert' && additionalData?.is_urgent) {
      // For urgent incidents, check if we've already sent ANY notification for this incident
      // within the last 2 minutes to prevent spam
      const urgentWindow = 120000; // 2 minutes
      const urgentCutoff = now - urgentWindow;
      
      const anyRecentForIncident = Array.from(deduplicator.records.values()).find(
        record => record.incidentId === incidentId && record.timestamp > urgentCutoff
      );
      
      if (anyRecentForIncident) {
        console.log('🚫 Blocked duplicate urgent notification (any recent):', {
          incidentId,
          source,
          existingType: anyRecentForIncident.type,
          existingSource: anyRecentForIncident.source,
          timeDiff: now - anyRecentForIncident.timestamp
        });
        return true; // Should deduplicate
      }
    }
    
    // Record this notification
    const recordKey = `${incidentId}-${type}-${source}-${now}`;
    deduplicator.records.set(recordKey, {
      incidentId,
      type,
      timestamp: now,
      source,
      hash
    });
    
    // Limit the number of records to prevent memory bloat
    if (deduplicator.records.size > deduplicator.maxRecords) {
      const sortedEntries = Array.from(deduplicator.records.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = sortedEntries.slice(0, deduplicator.records.size - deduplicator.maxRecords);
      toRemove.forEach(([key]) => deduplicator.records.delete(key));
      
      console.log('🧹 Cleaned up old notification records:', {
        removed: toRemove.length,
        remaining: deduplicator.records.size
      });
    }
    
    console.log('✅ Notification approved (not duplicate):', {
      incidentId,
      type,
      source,
      hash,
      totalRecords: deduplicator.records.size
    });
    
    return false; // Should not deduplicate
  }, [generateNotificationHash]);

  // ENHANCED: Get deduplication statistics for monitoring
  const getDeduplicationStats = useCallback(() => {
    const deduplicator = deduplicatorRef.current;
    const now = Date.now();
    
    const stats = {
      totalRecords: deduplicator.records.size,
      byType: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
      ageDistribution: {
        last1min: 0,
        last5min: 0,
        last15min: 0,
        older: 0
      }
    };
    
    deduplicator.records.forEach(record => {
      // Count by type
      stats.byType[record.type] = (stats.byType[record.type] || 0) + 1;
      
      // Count by source
      stats.bySource[record.source] = (stats.bySource[record.source] || 0) + 1;
      
      // Age distribution
      const age = now - record.timestamp;
      if (age < 60000) stats.ageDistribution.last1min++;
      else if (age < 300000) stats.ageDistribution.last5min++;
      else if (age < 900000) stats.ageDistribution.last15min++;
      else stats.ageDistribution.older++;
    });
    
    return stats;
  }, []);

  // FIXED: Extract coordinates from PostGIS point data
  const extractCoordinatesFromPoint = useCallback((locationPoint: any): { latitude: number; longitude: number } | null => {
    try {
      // Handle different PostGIS point formats
      if (typeof locationPoint === 'string') {
        // Format: "POINT(longitude latitude)" or "SRID=4326;POINT(longitude latitude)"
        const pointMatch = locationPoint.match(/POINT\s*\(\s*([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s*\)/i);
        if (pointMatch) {
          const longitude = parseFloat(pointMatch[1]);
          const latitude = parseFloat(pointMatch[2]);
          
          // Validate coordinates are reasonable for South Africa
          if (latitude >= -35 && latitude <= -22 && longitude >= 16 && longitude <= 33) {
            return { latitude, longitude };
          }
        }
      } else if (locationPoint && typeof locationPoint === 'object') {
        // Handle GeoJSON format
        if (locationPoint.type === 'Point' && Array.isArray(locationPoint.coordinates)) {
          const [lng, lat] = locationPoint.coordinates;
          if (lat >= -35 && lat <= -22 && lng >= 16 && lng <= 33) {
            return { latitude: lat, longitude: lng };
          }
        }
        
        // Handle other object formats
        if (locationPoint.latitude && locationPoint.longitude) {
          const lat = parseFloat(locationPoint.latitude);
          const lng = parseFloat(locationPoint.longitude);
          if (lat >= -35 && lat <= -22 && lng >= 16 && lng <= 33) {
            return { latitude: lat, longitude: lng };
          }
        }
      }
      
      console.warn('Could not extract valid coordinates from location_point:', locationPoint);
      return null;
    } catch (error) {
      console.error('Error extracting coordinates from PostGIS point:', error);
      return null;
    }
  }, []);

  // FIXED: Get fallback coordinates for incidents without valid location data
  const getFallbackCoordinates = useCallback((incident: any): { latitude: number; longitude: number } => {
    // Try to extract from direct latitude/longitude fields first
    if (incident.latitude && incident.longitude) {
      const lat = parseFloat(incident.latitude);
      const lng = parseFloat(incident.longitude);
      if (lat >= -35 && lat <= -22 && lng >= 16 && lng <= 33) {
        return { latitude: lat, longitude: lng };
      }
    }

    // Use area-based fallback coordinates for Eldorado Park
    const areaCoordinates: Record<string, { latitude: number; longitude: number }> = {
      'extension 1': { latitude: -26.3020, longitude: 27.9350 },
      'extension 2': { latitude: -26.3030, longitude: 27.9360 },
      'extension 3': { latitude: -26.3040, longitude: 27.9370 },
      'extension 4': { latitude: -26.3050, longitude: 27.9380 },
      'extension 5': { latitude: -26.3060, longitude: 27.9390 },
      'extension 6': { latitude: -26.3070, longitude: 27.9400 },
      'extension 7': { latitude: -26.3080, longitude: 27.9410 },
      'extension 8': { latitude: -26.3090, longitude: 27.9420 },
      'extension 9': { latitude: -26.3100, longitude: 27.9430 },
      'extension 10': { latitude: -26.3110, longitude: 27.9440 },
      'extension 11': { latitude: -26.3120, longitude: 27.9450 },
      'extension 12': { latitude: -26.3130, longitude: 27.9460 },
      'shopping centre': { latitude: -26.3054, longitude: 27.9389 },
      'shopping center': { latitude: -26.3054, longitude: 27.9389 },
      'main road': { latitude: -26.3050, longitude: 27.9395 },
      'klipriver road': { latitude: -26.3040, longitude: 27.9410 },
      'school': { latitude: -26.3045, longitude: 27.9395 },
      'clinic': { latitude: -26.3050, longitude: 27.9400 },
      'community hall': { latitude: -26.3060, longitude: 27.9380 }
    };

    // Try to match location_area or location_address to known areas
    const locationText = (incident.location_area || incident.location_address || '').toLowerCase();
    
    for (const [area, coords] of Object.entries(areaCoordinates)) {
      if (locationText.includes(area)) {
        console.log(`Using area-based coordinates for "${area}":`, coords);
        return coords;
      }
    }

    // Default to central Eldorado Park coordinates
    console.log('Using default Eldorado Park coordinates');
    return { latitude: -26.3054, longitude: 27.9389 };
  }, []);

  // FIXED: Get accurate incident coordinates with comprehensive fallback
  const getIncidentCoordinates = useCallback((incident: any): { latitude: number; longitude: number } => {
    // First, try to extract from PostGIS location_point
    if (incident.location_point) {
      const extracted = extractCoordinatesFromPoint(incident.location_point);
      if (extracted) {
        console.log('Extracted coordinates from PostGIS point:', extracted);
        return extracted;
      }
    }

    // Fallback to other coordinate sources
    const fallback = getFallbackCoordinates(incident);
    console.log('Using fallback coordinates for incident:', incident.id, fallback);
    return fallback;
  }, [extractCoordinatesFromPoint, getFallbackCoordinates]);

  // ENHANCED: Check notification quota to prevent spam
  const checkNotificationQuota = useCallback(() => {
    const now = Date.now();
    const quota = notificationQuotaRef.current;
    
    // Reset quota every hour
    if (now - quota.resetTime > 3600000) {
      quota.count = 0;
      quota.resetTime = now;
    }
    
    // Allow max 20 notifications per hour
    if (quota.count >= 20) {
      console.warn('Notification quota exceeded, skipping notification');
      return false;
    }
    
    quota.count++;
    return true;
  }, []);

  // ENHANCED: Validate notification content for security
  const validateNotificationContent = useCallback((title: string, options: NotificationOptions) => {
    // Sanitize title
    const sanitizedTitle = title.replace(/[<>]/g, '').substring(0, 100);
    
    // Sanitize body
    const sanitizedBody = options.body ? 
      options.body.replace(/[<>]/g, '').substring(0, 300) : 
      undefined;
    
    // Validate URLs
    const validateUrl = (url: string | undefined) => {
      if (!url) return undefined;
      try {
        const parsed = new URL(url, window.location.origin);
        return parsed.href;
      } catch {
        console.warn('Invalid URL in notification options:', url);
        return '/shield.svg'; // fallback
      }
    };

    return {
      title: sanitizedTitle,
      options: {
        ...options,
        body: sanitizedBody,
        icon: validateUrl(options.icon),
        badge: validateUrl(options.badge),
        // Ensure data is safe and serializable
        data: options.data ? JSON.parse(JSON.stringify(options.data)) : undefined
      }
    };
  }, []);

  // ENHANCED: Safe browser notification with comprehensive error handling and security
  const showSafeBrowserNotification = useCallback((title: string, options: NotificationOptions) => {
    // Check notification quota first
    if (!checkNotificationQuota()) {
      return false;
    }

    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('Browser notifications not supported');
      return false;
    }

    // Check current permission status
    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted:', Notification.permission);
      return false;
    }

    // Check if document is visible (don't spam hidden tabs)
    if (document.hidden && !options.requireInteraction) {
      console.log('Document hidden, skipping non-urgent notification');
      return false;
    }

    try {
      // Validate and sanitize content
      const { title: safeTitle, options: safeOptions } = validateNotificationContent(title, options);

      // Additional safety checks
      const finalOptions: NotificationOptions = {
        ...safeOptions,
        // Ensure icon and badge are valid URLs
        icon: safeOptions.icon || '/shield.svg',
        badge: safeOptions.badge || '/shield.svg',
        // Ensure tag is a string and unique
        tag: typeof safeOptions.tag === 'string' ? 
          `safeguard-${safeOptions.tag}-${Date.now()}` : 
          `safeguard-notification-${Date.now()}`,
        // Set reasonable timeout
        timestamp: Date.now(),
        // Prevent notification spam
        renotify: false
      };

      // Create notification with comprehensive error handling
      const notification = new Notification(safeTitle, finalOptions);

      // Enhanced event handlers with error boundaries
      notification.onshow = () => {
        console.log('Browser notification shown successfully:', safeTitle);
      };

      notification.onerror = (event) => {
        console.error('Browser notification error:', event);
        // Log error details for debugging
        console.error('Notification error details:', {
          title: safeTitle,
          options: finalOptions,
          timestamp: new Date().toISOString()
        });
      };

      notification.onclose = () => {
        console.log('Browser notification closed:', safeTitle);
      };

      notification.onclick = () => {
        try {
          // Focus window safely
          if (window.focus) {
            window.focus();
          }
          
          // Navigate safely
          if (finalOptions.data?.actionUrl) {
            const url = finalOptions.data.actionUrl;
            // Validate URL before navigation
            if (url.startsWith('/') || url.startsWith(window.location.origin)) {
              window.location.href = url;
            } else {
              console.warn('Blocked navigation to external URL:', url);
            }
          }
          
          notification.close();
        } catch (error) {
          console.error('Error handling notification click:', error);
        }
      };

      // Auto-close non-urgent notifications with error handling
      if (!finalOptions.requireInteraction) {
        setTimeout(() => {
          try {
            if (notification) {
              notification.close();
            }
          } catch (error) {
            console.warn('Error auto-closing notification:', error);
          }
        }, 5000);
      }

      return true;

    } catch (error) {
      console.error('Failed to create browser notification:', error);
      
      // Enhanced error classification and handling
      if (error instanceof TypeError) {
        console.error('Notification TypeError - invalid options:', {
          error: error.message,
          stack: error.stack,
          title,
          options
        });
      } else if (error instanceof DOMException) {
        console.error('Notification DOMException - browser restriction:', {
          error: error.message,
          code: error.code,
          name: error.name
        });
        
        // Handle specific DOMException cases
        if (error.name === 'NotAllowedError') {
          console.warn('Notification blocked by browser policy');
        } else if (error.name === 'AbortError') {
          console.warn('Notification creation aborted');
        }
      } else if (error instanceof RangeError) {
        console.error('Notification RangeError - likely quota exceeded:', error.message);
      } else {
        console.error('Unknown notification error:', {
          error: error.message,
          type: typeof error,
          constructor: error.constructor?.name
        });
      }

      // Attempt permission recovery for specific errors
      if (Notification.permission === 'denied') {
        console.warn('Notification permission denied - cannot show browser notifications');
      } else if (Notification.permission === 'default') {
        console.log('Notification permission not requested - attempting to request');
        Notification.requestPermission().then(permission => {
          console.log('Notification permission request result:', permission);
        }).catch(permissionError => {
          console.error('Failed to request notification permission:', permissionError);
        });
      }

      return false;
    }
  }, [checkNotificationQuota, validateNotificationContent]);

  // ENHANCED: Safe vibration with pattern validation
  const safeVibrate = useCallback((pattern: number | number[]) => {
    try {
      if (!('vibrate' in navigator) || typeof navigator.vibrate !== 'function') {
        console.warn('Vibration API not supported');
        return false;
      }

      // Validate vibration pattern
      let validPattern: number | number[];
      if (typeof pattern === 'number') {
        validPattern = Math.min(Math.max(pattern, 0), 5000); // Max 5 seconds
      } else if (Array.isArray(pattern)) {
        validPattern = pattern
          .slice(0, 10) // Max 10 elements
          .map(p => Math.min(Math.max(p, 0), 1000)); // Max 1 second per element
      } else {
        console.warn('Invalid vibration pattern:', pattern);
        return false;
      }

      const success = navigator.vibrate(validPattern);
      if (!success) {
        console.warn('Vibration request failed or was ignored');
      }
      return success;
    } catch (error) {
      console.error('Error triggering vibration:', error);
      return false;
    }
  }, []);

  // ENHANCED: Unified notification sender with deduplication
  const sendNotificationSafely = useCallback((
    incidentId: string,
    type: 'incident' | 'safety_alert' | 'verification' | 'resolution',
    source: 'incident_channel' | 'alert_channel',
    title: string,
    notificationData: any,
    browserNotificationOptions?: NotificationOptions
  ) => {
    // Check for deduplication first
    if (shouldDeduplicateNotification(
      incidentId,
      type,
      source,
      title,
      notificationData.eventType || 'unknown',
      notificationData.data
    )) {
      return false; // Notification was deduplicated
    }

    // Send notification through notification service
    showNotification(notificationData);

    // Send browser notification if options provided
    if (browserNotificationOptions) {
      const browserSuccess = showSafeBrowserNotification(title, browserNotificationOptions);
      
      // Vibrate for urgent notifications
      if (browserSuccess && (type === 'safety_alert' || notificationData.priority === 'urgent')) {
        safeVibrate([200, 100, 200, 100, 200]);
      }
      
      return browserSuccess;
    }

    return true;
  }, [shouldDeduplicateNotification, showNotification, showSafeBrowserNotification, safeVibrate]);

  // FIXED: Stabilize notification handler to prevent subscription recreation
  const handleIncidentNotification = useCallback((payload: any) => {
    try {
      if (payload.eventType === 'INSERT') {
        const incident = payload.new;
        addIncident(incident);

        // FIXED: Get actual incident coordinates instead of hardcoded (0,0)
        const incidentCoords = getIncidentCoordinates(incident);

        // ENHANCED: Send notification with deduplication
        sendNotificationSafely(
          incident.id,
          'incident',
          'incident_channel',
          `New ${incident.severity} incident reported`,
          {
            type: 'incident',
            title: `New ${incident.severity} incident reported`,
            message: incident.title,
            priority: incident.severity === 'critical' ? 'urgent' : 
                     incident.severity === 'high' ? 'high' : 'medium',
            location: {
              latitude: incidentCoords.latitude,
              longitude: incidentCoords.longitude,
              address: incident.location_address || 'Unknown location'
            },
            actionUrl: '/',
            data: {
              ...incident,
              extracted_latitude: incidentCoords.latitude,
              extracted_longitude: incidentCoords.longitude
            },
            eventType: 'INSERT'
          }
        );

      } else if (payload.eventType === 'UPDATE') {
        const incident = payload.new;
        updateIncident(incident);

        // FIXED: Get actual incident coordinates for update notifications
        const incidentCoords = getIncidentCoordinates(incident);

        // Show notification for incident updates (like verification)
        if (incident.is_verified && !payload.old.is_verified) {
          sendNotificationSafely(
            incident.id,
            'verification',
            'incident_channel',
            'Incident Verified',
            {
              type: 'verification',
              title: 'Incident Verified',
              message: `${incident.title} has been verified by the community`,
              priority: 'medium',
              location: {
                latitude: incidentCoords.latitude,
                longitude: incidentCoords.longitude,
                address: incident.location_address || 'Unknown location'
              },
              actionUrl: '/',
              data: {
                ...incident,
                extracted_latitude: incidentCoords.latitude,
                extracted_longitude: incidentCoords.longitude
              },
              eventType: 'UPDATE'
            }
          );
        }

        if (incident.is_resolved && !payload.old.is_resolved) {
          sendNotificationSafely(
            incident.id,
            'resolution',
            'incident_channel',
            'Incident Resolved',
            {
              type: 'incident',
              title: 'Incident Resolved',
              message: `${incident.title} has been marked as resolved`,
              priority: 'low',
              location: {
                latitude: incidentCoords.latitude,
                longitude: incidentCoords.longitude,
                address: incident.location_address || 'Unknown location'
              },
              actionUrl: '/',
              data: {
                ...incident,
                extracted_latitude: incidentCoords.latitude,
                extracted_longitude: incidentCoords.longitude
              },
              eventType: 'UPDATE'
            }
          );
        }

      } else if (payload.eventType === 'DELETE') {
        removeIncident(payload.old.id);
      }
    } catch (error) {
      console.error('Error handling incident notification:', error);
    }
  }, [addIncident, updateIncident, removeIncident, getIncidentCoordinates, sendNotificationSafely]);

  // ENHANCED: Safety alert handler with deduplication and rate limiting
  const handleSafetyAlert = useCallback((payload: any) => {
    try {
      if (payload.eventType === 'INSERT' && payload.new.is_urgent) {
        const incident = payload.new;
        
        // FIXED: Get actual incident coordinates for urgent alerts
        const incidentCoords = getIncidentCoordinates(incident);
        
        // ENHANCED: Send urgent notification with deduplication
        const notificationSent = sendNotificationSafely(
          incident.id,
          'safety_alert',
          'alert_channel',
          '🚨 SafeGuard Eldos - URGENT ALERT',
          {
            type: 'safety_alert',
            title: '🚨 URGENT SAFETY ALERT',
            message: `${incident.title} - ${incident.location_address}`,
            priority: 'urgent',
            location: {
              latitude: incidentCoords.latitude,
              longitude: incidentCoords.longitude,
              address: incident.location_address || 'Unknown location'
            },
            actionUrl: '/',
            data: {
              ...incident,
              extracted_latitude: incidentCoords.latitude,
              extracted_longitude: incidentCoords.longitude
            },
            eventType: 'INSERT'
          },
          // Browser notification options for urgent alerts
          {
            body: `${incident.title} - ${incident.location_address}`,
            icon: '/shield.svg',
            badge: '/shield.svg',
            tag: 'urgent-alert',
            requireInteraction: true,
            silent: false,
            data: {
              incidentId: incident.id,
              coordinates: incidentCoords,
              timestamp: new Date().toISOString(),
              actionUrl: '/'
            }
          }
        );

        // Enhanced logging for monitoring and debugging
        console.log('🚨 URGENT SAFETY ALERT processed:', {
          incidentId: incident.id,
          location: incident.location_address,
          coordinates: incidentCoords,
          notificationSent,
          deduplicationStats: getDeduplicationStats(),
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          notificationPermission: Notification.permission
        });
      }
    } catch (error) {
      console.error('Error handling safety alert:', error);
    }
  }, [getIncidentCoordinates, sendNotificationSafely, getDeduplicationStats]);

  // ENHANCED: Cleanup function with comprehensive error handling
  const cleanupSubscriptions = useCallback(() => {
    console.log('Cleaning up real-time subscriptions...');
    
    if (incidentChannelRef.current) {
      try {
        incidentChannelRef.current.unsubscribe();
        console.log('Incident channel unsubscribed');
      } catch (error) {
        console.warn('Error unsubscribing from incident channel:', error);
      }
      incidentChannelRef.current = null;
    }

    if (alertChannelRef.current) {
      try {
        alertChannelRef.current.unsubscribe();
        console.log('Alert channel unsubscribed');
      } catch (error) {
        console.warn('Error unsubscribing from alert channel:', error);
      }
      alertChannelRef.current = null;
    }

    isSubscribedRef.current = false;
    reconnectAttemptsRef.current = 0;
  }, []);

  // ENHANCED: Setup subscriptions with exponential backoff and circuit breaker
  const setupSubscriptions = useCallback(() => {
    // Prevent duplicate subscriptions
    if (isSubscribedRef.current) {
      console.log('Subscriptions already active, skipping setup');
      return;
    }

    // Circuit breaker - stop trying after max attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached, stopping subscription setup');
      return;
    }

    console.log('Setting up real-time subscriptions...');

    try {
      // Create incident channel
      const incidentChannel = createIncidentsChannel(handleIncidentNotification);
      incidentChannelRef.current = incidentChannel;

      // Create safety alerts channel
      const alertChannel = createSafetyAlertsChannel(handleSafetyAlert);
      alertChannelRef.current = alertChannel;

      // Subscribe to channels with enhanced error handling and exponential backoff
      const incidentSubscription = incidentChannel.subscribe((status: string) => {
        console.log('Incident channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to incident updates');
          reconnectAttemptsRef.current = 0; // Reset on success
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to incident channel');
          reconnectAttemptsRef.current++;
          
          // Exponential backoff: 2^attempts * 1000ms
          const delay = Math.min(Math.pow(2, reconnectAttemptsRef.current) * 1000, 30000);
          
          setTimeout(() => {
            if (isSubscribedRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
              console.log(`Attempting to reconnect incident channel (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
              cleanupSubscriptions();
              setupSubscriptions();
            }
          }, delay);
        } else if (status === 'TIMED_OUT') {
          console.warn('Incident channel subscription timed out');
        } else if (status === 'CLOSED') {
          console.log('Incident channel closed');
        }
      });

      const alertSubscription = alertChannel.subscribe((status: string) => {
        console.log('Alert channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to safety alerts');
          reconnectAttemptsRef.current = 0; // Reset on success
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to alert channel');
          reconnectAttemptsRef.current++;
          
          // Exponential backoff: 2^attempts * 1000ms
          const delay = Math.min(Math.pow(2, reconnectAttemptsRef.current) * 1000, 30000);
          
          setTimeout(() => {
            if (isSubscribedRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
              console.log(`Attempting to reconnect alert channel (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
              cleanupSubscriptions();
              setupSubscriptions();
            }
          }, delay);
        } else if (status === 'TIMED_OUT') {
          console.warn('Alert channel subscription timed out');
        } else if (status === 'CLOSED') {
          console.log('Alert channel closed');
        }
      });

      isSubscribedRef.current = true;
      console.log('Real-time subscriptions setup complete');

    } catch (error) {
      console.error('Error setting up real-time subscriptions:', error);
      reconnectAttemptsRef.current++;
      cleanupSubscriptions();
      
      // Retry setup with exponential backoff
      const delay = Math.min(Math.pow(2, reconnectAttemptsRef.current) * 1000, 30000);
      setTimeout(() => {
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          console.log('Retrying subscription setup after error...');
          setupSubscriptions();
        }
      }, delay);
    }
  }, [handleIncidentNotification, handleSafetyAlert, cleanupSubscriptions]);

  // ENHANCED: Periodic cleanup of deduplication records
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const deduplicator = deduplicatorRef.current;
      const now = Date.now();
      const cutoff = now - deduplicator.maxAge;
      
      const initialSize = deduplicator.records.size;
      const toDelete: string[] = [];
      
      deduplicator.records.forEach((record, key) => {
        if (record.timestamp < cutoff) {
          toDelete.push(key);
        }
      });
      
      toDelete.forEach(key => deduplicator.records.delete(key));
      
      if (toDelete.length > 0) {
        console.log('🧹 Periodic cleanup of deduplication records:', {
          removed: toDelete.length,
          remaining: deduplicator.records.size,
          initialSize
        });
      }
    }, 60000); // Clean up every minute

    return () => clearInterval(cleanupInterval);
  }, []);

  // FIXED: Single effect with proper dependency management and cleanup
  useEffect(() => {
    // Setup subscriptions once
    setupSubscriptions();

    // Cleanup on unmount or when dependencies change
    return () => {
      cleanupSubscriptions();
    };
  }, []); // FIXED: Empty dependency array to prevent recreation

  // FIXED: Separate effect for location updates (if needed for filtering)
  useEffect(() => {
    if (latitude && longitude) {
      console.log('User location updated:', { latitude, longitude });
      // Location updates don't require subscription recreation
      // The notification service handles location-based filtering
    }
  }, [latitude, longitude]);

  // ENHANCED: Visibility change handler to manage notifications when tab is hidden/visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Tab hidden - notifications will be limited to urgent only');
      } else {
        console.log('Tab visible - all notifications enabled');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // FIXED: Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('useIncidentsRealtime unmounting, cleaning up...');
      cleanupSubscriptions();
      
      // Clear deduplication records on unmount
      deduplicatorRef.current.records.clear();
    };
  }, [cleanupSubscriptions]);

  // ENHANCED: Expose deduplication stats for debugging
  return {
    getDeduplicationStats,
    clearDeduplicationRecords: () => {
      deduplicatorRef.current.records.clear();
      console.log('🧹 Manually cleared all deduplication records');
    }
  };
};