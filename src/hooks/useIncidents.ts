import { useState, useEffect } from 'react';
import { 
  supabase, 
  Incident, 
  getIncidents, 
  getIncidentsNearLocation,
  createIncident,
  verifyIncident,
  createIncidentsChannel,
  createSafetyAlertsChannel,
  formatTimeAgo
} from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';

export const useIncidents = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuthContext();

  useEffect(() => {
    loadIncidents();
    
    // Create channels and subscribe to real-time incident updates
    const incidentChannel = createIncidentsChannel((payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        setIncidents(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        setIncidents(prev => 
          prev.map(incident => 
            incident.id === payload.new.id ? payload.new : incident
          )
        );
      } else if (payload.eventType === 'DELETE' && payload.old) {
        setIncidents(prev => 
          prev.filter(incident => incident.id !== payload.old.id)
        );
      }
    });

    // Subscribe to safety alerts
    const alertChannel = createSafetyAlertsChannel((payload) => {
      if (payload.eventType === 'INSERT' && payload.new && payload.new.is_urgent) {
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

    // Subscribe to the channels
    const incidentSubscription = incidentChannel.subscribe();
    const alertSubscription = alertChannel.subscribe();

    return () => {
      incidentSubscription.unsubscribe();
      alertSubscription.unsubscribe();
    };
  }, []);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await getIncidents(50);
      
      if (error) throw error;
      
      setIncidents(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadIncidentsNearLocation = async (
    latitude: number, 
    longitude: number, 
    radiusMeters = 5000
  ) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await getIncidentsNearLocation(
        latitude, 
        longitude, 
        radiusMeters
      );
      
      if (error) throw error;
      
      setIncidents(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reportIncident = async (incidentData: {
    incident_type: Incident['incident_type'];
    severity: Incident['severity'];
    title: string;
    description?: string;
    location_address: string;
    location_area?: string;
    latitude: number;
    longitude: number;
    is_urgent?: boolean;
    media_urls?: string[];
  }) => {
    try {
      if (!profile) {
        throw new Error('Must be logged in to report incidents');
      }

      const { data, error } = await createIncident({
        reporter_id: profile.id,
        incident_type: incidentData.incident_type,
        severity: incidentData.severity,
        title: incidentData.title,
        description: incidentData.description,
        location_address: incidentData.location_address,
        location_area: incidentData.location_area,
        location_point: `POINT(${incidentData.longitude} ${incidentData.latitude})`,
        is_urgent: incidentData.is_urgent || false,
        media_urls: incidentData.media_urls || []
      });

      if (error) throw error;

      // Add to local state immediately for optimistic updates
      if (data) {
        setIncidents(prev => [data, ...prev]);
      }

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  };

  const verifyIncidentReport = async (
    incidentId: string, 
    verificationType: 'confirm' | 'dispute' | 'additional_info',
    notes?: string
  ) => {
    try {
      if (!profile) {
        throw new Error('Must be logged in to verify incidents');
      }

      const { data, error } = await verifyIncident(incidentId, verificationType, notes);
      
      if (error) throw error;

      // Update local incident verification count
      setIncidents(prev => 
        prev.map(incident => {
          if (incident.id === incidentId) {
            return {
              ...incident,
              verification_count: incident.verification_count + (verificationType === 'confirm' ? 1 : 0),
              is_verified: incident.verification_count + 1 >= 3 // Verify after 3 confirmations
            };
          }
          return incident;
        })
      );

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  };

  const getIncidentsByType = (type: Incident['incident_type']) => {
    return incidents.filter(incident => incident.incident_type === type);
  };

  const getIncidentsBySeverity = (severity: Incident['severity']) => {
    return incidents.filter(incident => incident.severity === severity);
  };

  const getRecentIncidents = (hours = 24) => {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    
    return incidents.filter(incident => 
      new Date(incident.created_at) > cutoff
    );
  };

  const getIncidentsWithTimeAgo = () => {
    return incidents.map(incident => ({
      ...incident,
      timeAgo: formatTimeAgo(incident.created_at)
    }));
  };

  const getIncidentStats = () => {
    const total = incidents.length;
    const resolved = incidents.filter(i => i.is_resolved).length;
    const urgent = incidents.filter(i => i.is_urgent).length;
    const verified = incidents.filter(i => i.is_verified).length;
    const recent = getRecentIncidents(24).length;
    
    const byType = incidents.reduce((acc, incident) => {
      acc[incident.incident_type] = (acc[incident.incident_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const bySeverity = incidents.reduce((acc, incident) => {
      acc[incident.severity] = (acc[incident.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      resolved,
      urgent,
      verified,
      recent,
      byType,
      bySeverity,
      resolutionRate: total > 0 ? (resolved / total) * 100 : 0,
      verificationRate: total > 0 ? (verified / total) * 100 : 0
    };
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  };

  return {
    incidents,
    loading,
    error,
    loadIncidents,
    loadIncidentsNearLocation,
    reportIncident,
    verifyIncidentReport,
    getIncidentsByType,
    getIncidentsBySeverity,
    getRecentIncidents,
    getIncidentsWithTimeAgo,
    getIncidentStats,
    requestNotificationPermission,
    refresh: loadIncidents
  };
};