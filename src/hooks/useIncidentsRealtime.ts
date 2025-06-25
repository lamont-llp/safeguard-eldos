import { useEffect } from 'react';
import { createIncidentsChannel, createSafetyAlertsChannel } from '../lib/supabase';
import { useIncidentsContext } from '../contexts/IncidentsContext';
import { useNotifications } from './useNotifications';
import { useLocation } from './useLocation';

export const useIncidentsRealtime = () => {
  const { addIncident, updateIncident, removeIncident } = useIncidentsContext();
  const { showNotification } = useNotifications();
  const { latitude, longitude, getLocationString } = useLocation();

  // FIXED: Extract coordinates from PostGIS point data
  const extractCoordinatesFromPoint = (locationPoint: any): { latitude: number; longitude: number } | null => {
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
  };

  // FIXED: Get fallback coordinates for incidents without valid location data
  const getFallbackCoordinates = (incident: any): { latitude: number; longitude: number } => {
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
  };

  // FIXED: Get accurate incident coordinates with comprehensive fallback
  const getIncidentCoordinates = (incident: any): { latitude: number; longitude: number } => {
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
  };

  useEffect(() => {
    // Create channels
    const incidentChannel = createIncidentsChannel((payload) => {
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
    });

    const alertChannel = createSafetyAlertsChannel((payload) => {
      if (payload.eventType === 'INSERT' && payload.new.is_urgent) {
        const incident = payload.new;
        
        // FIXED: Get actual incident coordinates for urgent alerts
        const incidentCoords = getIncidentCoordinates(incident);
        
        // Show urgent notification
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

        // Also show browser notification immediately if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🚨 SafeGuard Eldos - URGENT ALERT', {
            body: `${incident.title} - ${incident.location_address}`,
            icon: '/shield.svg',
            tag: 'urgent-alert',
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200],
            data: {
              incidentId: incident.id,
              coordinates: incidentCoords,
              timestamp: new Date().toISOString()
            }
          });
        }
      }
    });

    // Subscribe to channels
    const incidentSubscription = incidentChannel.subscribe();
    const alertSubscription = alertChannel.subscribe();

    return () => {
      incidentSubscription.unsubscribe();
      alertSubscription.unsubscribe();
    };
  }, [addIncident, updateIncident, removeIncident, showNotification, latitude, longitude]);
};