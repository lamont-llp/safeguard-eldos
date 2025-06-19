import { useEffect } from 'react';
import { createIncidentsChannel, createSafetyAlertsChannel } from '../lib/supabase';
import { useIncidentsContext } from '../contexts/IncidentsContext';
import { useNotifications } from './useNotifications';
import { useLocation } from './useLocation';

export const useIncidentsRealtime = () => {
  const { addIncident, updateIncident, removeIncident } = useIncidentsContext();
  const { showNotification } = useNotifications();
  const { latitude, longitude, getLocationString } = useLocation();

  useEffect(() => {
    // Create channels
    const incidentChannel = createIncidentsChannel((payload) => {
      if (payload.eventType === 'INSERT') {
        const incident = payload.new;
        addIncident(incident);

        // Show notification for new incidents
        showNotification({
          type: 'incident',
          title: `New ${incident.severity} incident reported`,
          message: incident.title,
          priority: incident.severity === 'critical' ? 'urgent' : 
                   incident.severity === 'high' ? 'high' : 'medium',
          location: incident.location_address ? {
            latitude: 0, // Would need to extract from PostGIS point
            longitude: 0,
            address: incident.location_address
          } : undefined,
          actionUrl: '/',
          data: incident
        });

      } else if (payload.eventType === 'UPDATE') {
        const incident = payload.new;
        updateIncident(incident);

        // Show notification for incident updates (like verification)
        if (incident.is_verified && !payload.old.is_verified) {
          showNotification({
            type: 'verification',
            title: 'Incident Verified',
            message: `${incident.title} has been verified by the community`,
            priority: 'medium',
            actionUrl: '/',
            data: incident
          });
        }

        if (incident.is_resolved && !payload.old.is_resolved) {
          showNotification({
            type: 'incident',
            title: 'Incident Resolved',
            message: `${incident.title} has been marked as resolved`,
            priority: 'low',
            actionUrl: '/',
            data: incident
          });
        }

      } else if (payload.eventType === 'DELETE') {
        removeIncident(payload.old.id);
      }
    });

    const alertChannel = createSafetyAlertsChannel((payload) => {
      if (payload.eventType === 'INSERT' && payload.new.is_urgent) {
        const incident = payload.new;
        
        // Show urgent notification
        showNotification({
          type: 'safety_alert',
          title: '🚨 URGENT SAFETY ALERT',
          message: `${incident.title} - ${incident.location_address}`,
          priority: 'urgent',
          location: incident.location_address ? {
            latitude: 0, // Would need to extract from PostGIS point
            longitude: 0,
            address: incident.location_address
          } : undefined,
          actionUrl: '/',
          data: incident
        });

        // Also show browser notification immediately if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🚨 SafeGuard Eldos - URGENT ALERT', {
            body: `${incident.title} - ${incident.location_address}`,
            icon: '/shield.svg',
            tag: 'urgent-alert',
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200]
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