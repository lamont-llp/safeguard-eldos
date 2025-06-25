import { useEffect, useRef, useCallback } from 'react';
import { createIncidentsChannel, createSafetyAlertsChannel } from '../lib/supabase';
import { useIncidentsContext } from '../contexts/IncidentsContext';
import { useNotifications } from './useNotifications';
import { useLocation } from './useLocation';

export const useIncidentsRealtime = () => {
  const { addIncident, updateIncident, removeIncident } = useIncidentsContext();
  const { showNotification } = useNotifications();
  const { latitude, longitude, getLocationString } = useLocation();

  // Use refs to track active subscriptions and prevent memory leaks
  const incidentChannelRef = useRef<any>(null);
  const alertChannelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

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

  // FIXED: Safe browser notification with comprehensive error handling
  const showSafeBrowserNotification = useCallback((title: string, options: NotificationOptions) => {
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

    try {
      // Validate notification options
      const safeOptions: NotificationOptions = {
        ...options,
        // Ensure icon and badge are valid URLs
        icon: options.icon || '/shield.svg',
        badge: options.badge || '/shield.svg',
        // Ensure tag is a string
        tag: typeof options.tag === 'string' ? options.tag : 'safeguard-notification',
        // Ensure data is serializable
        data: options.data ? JSON.parse(JSON.stringify(options.data)) : undefined
      };

      // Create notification with error handling
      const notification = new Notification(title, safeOptions);

      // Handle notification events
      notification.onshow = () => {
        console.log('Browser notification shown successfully');
      };

      notification.onerror = (event) => {
        console.error('Browser notification error:', event);
      };

      notification.onclose = () => {
        console.log('Browser notification closed');
      };

      notification.onclick = () => {
        try {
          window.focus();
          if (options.data?.actionUrl) {
            window.location.href = options.data.actionUrl;
          }
          notification.close();
        } catch (error) {
          console.error('Error handling notification click:', error);
        }
      };

      // Auto-close non-urgent notifications
      if (!safeOptions.requireInteraction) {
        setTimeout(() => {
          try {
            notification.close();
          } catch (error) {
            console.warn('Error auto-closing notification:', error);
          }
        }, 5000);
      }

      return true;

    } catch (error) {
      console.error('Failed to create browser notification:', error);
      
      // Log specific error types for debugging
      if (error instanceof TypeError) {
        console.error('Notification TypeError - likely invalid options:', error.message);
      } else if (error instanceof DOMException) {
        console.error('Notification DOMException - browser restriction:', error.message);
      } else {
        console.error('Unknown notification error:', error);
      }

      // Attempt to request permission again if it was denied
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
  }, []);

  // FIXED: Enhanced vibration with error handling
  const safeVibrate = useCallback((pattern: number | number[]) => {
    try {
      if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
        const success = navigator.vibrate(pattern);
        if (!success) {
          console.warn('Vibration request failed or was ignored');
        }
        return success;
      } else {
        console.warn('Vibration API not supported');
        return false;
      }
    } catch (error) {
      console.error('Error triggering vibration:', error);
      return false;
    }
  }, []);

  // FIXED: Stabilize notification handler to prevent subscription recreation
  const handleIncidentNotification = useCallback((payload: any) => {
    if (payload.eventType === 'INSERT') {
      const incident = payload.new;
      addIncident(incident);

      // FIXED: Get actual incident coordinates instead of hardcoded (0,0)
      const incidentCoords = getIncidentCoordinates(incident);

      // Show notification for new incidents
      showNotification({
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
          // Add extracted coordinates to the incident data
          extracted_latitude: incidentCoords.latitude,
          extracted_longitude: incidentCoords.longitude
        }
      });

    } else if (payload.eventType === 'UPDATE') {
      const incident = payload.new;
      updateIncident(incident);

      // FIXED: Get actual incident coordinates for update notifications
      const incidentCoords = getIncidentCoordinates(incident);

      // Show notification for incident updates (like verification)
      if (incident.is_verified && !payload.old.is_verified) {
        showNotification({
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
          }
        });
      }

      if (incident.is_resolved && !payload.old.is_resolved) {
        showNotification({
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
          }
        });
      }

    } else if (payload.eventType === 'DELETE') {
      removeIncident(payload.old.id);
    }
  }, [addIncident, updateIncident, removeIncident, showNotification, getIncidentCoordinates]);

  // FIXED: Stabilize safety alert handler with enhanced error handling
  const handleSafetyAlert = useCallback((payload: any) => {
    if (payload.eventType === 'INSERT' && payload.new.is_urgent) {
      const incident = payload.new;
      
      // FIXED: Get actual incident coordinates for urgent alerts
      const incidentCoords = getIncidentCoordinates(incident);
      
      // Show urgent notification through notification service
      showNotification({
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
        }
      });

      // FIXED: Safe browser notification with comprehensive error handling
      const notificationSuccess = showSafeBrowserNotification('🚨 SafeGuard Eldos - URGENT ALERT', {
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
      });

      // FIXED: Safe vibration with error handling
      if (notificationSuccess) {
        safeVibrate([200, 100, 200, 100, 200]);
      }

      // Log urgent alert for monitoring
      console.log('🚨 URGENT SAFETY ALERT processed:', {
        incidentId: incident.id,
        location: incident.location_address,
        coordinates: incidentCoords,
        browserNotification: notificationSuccess,
        timestamp: new Date().toISOString()
      });
    }
  }, [showNotification, getIncidentCoordinates, showSafeBrowserNotification, safeVibrate]);

  // FIXED: Cleanup function to properly unsubscribe from channels
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
  }, []);

  // FIXED: Setup subscriptions with proper cleanup and memory leak prevention
  const setupSubscriptions = useCallback(() => {
    // Prevent duplicate subscriptions
    if (isSubscribedRef.current) {
      console.log('Subscriptions already active, skipping setup');
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

      // Subscribe to channels with enhanced error handling
      const incidentSubscription = incidentChannel.subscribe((status: string) => {
        console.log('Incident channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to incident updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to incident channel');
          // Attempt to reconnect after a delay
          setTimeout(() => {
            if (isSubscribedRef.current) {
              console.log('Attempting to reconnect incident channel...');
              cleanupSubscriptions();
              setupSubscriptions();
            }
          }, 5000);
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
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to alert channel');
          // Attempt to reconnect after a delay
          setTimeout(() => {
            if (isSubscribedRef.current) {
              console.log('Attempting to reconnect alert channel...');
              cleanupSubscriptions();
              setupSubscriptions();
            }
          }, 5000);
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
      cleanupSubscriptions();
      
      // Retry setup after a delay
      setTimeout(() => {
        console.log('Retrying subscription setup after error...');
        setupSubscriptions();
      }, 10000);
    }
  }, [handleIncidentNotification, handleSafetyAlert, cleanupSubscriptions]);

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

  // FIXED: Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('useIncidentsRealtime unmounting, cleaning up...');
      cleanupSubscriptions();
    };
  }, [cleanupSubscriptions]);
};