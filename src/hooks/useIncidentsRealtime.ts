import { useEffect } from 'react';
import { createIncidentsChannel, createSafetyAlertsChannel } from '../lib/supabase';
import { useIncidentsContext } from '../contexts/IncidentsContext';

export const useIncidentsRealtime = () => {
  const { addIncident, updateIncident, removeIncident } = useIncidentsContext();

  useEffect(() => {
    // Create channels
    const incidentChannel = createIncidentsChannel((payload) => {
      if (payload.eventType === 'INSERT') {
        addIncident(payload.new);
      } else if (payload.eventType === 'UPDATE') {
        updateIncident(payload.new);
      } else if (payload.eventType === 'DELETE') {
        removeIncident(payload.old.id);
      }
    });

    const alertChannel = createSafetyAlertsChannel((payload) => {
      if (payload.eventType === 'INSERT' && payload.new.is_urgent) {
        // Show urgent notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('SafeGuard Eldos - Urgent Alert', {
            body: `${payload.new.title} - ${payload.new.location_address}`,
            icon: '/shield.svg',
            tag: 'urgent-alert'
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
  }, [addIncident, updateIncident, removeIncident]);
};