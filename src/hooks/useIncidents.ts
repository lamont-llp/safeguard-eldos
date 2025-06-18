import { useState, useEffect, useCallback } from 'react';
import { 
  getIncidents, 
  getIncidentsNearLocation,
  createIncident,
  verifyIncident,
  formatTimeAgo,
  Incident
} from '../lib/supabase';
import { useAuth } from './useAuth';
import { useIncidentsContext } from '../contexts/IncidentsContext';

export const useIncidents = () => {
  const { incidents, dispatch } = useIncidentsContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  const loadIncidents = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await getIncidents(50);
      
      if (error) throw error;
      
      dispatch({ type: 'SET_INCIDENTS', payload: data || [] });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const loadIncidentsNearLocation = async (
    latitude: number, 
    longitude: number, 
    radiusMeters = 5000
  ) => {
    try {
      setLoading(true);
      const { data, error } = await getIncidentsNearLocation(
        latitude, 
        longitude, 
        radiusMeters
      );
      
      if (error) throw error;
      
      dispatch({ type: 'SET_INCIDENTS', payload: data || [] });
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
        dispatch({ type: 'ADD_INCIDENT', payload: data });
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
      const updatedIncident = incidents.find(incident => incident.id === incidentId);
      if (updatedIncident) {
        const newIncident = {
          ...updatedIncident,
          verification_count: updatedIncident.verification_count + (verificationType === 'confirm' ? 1 : 0),
          is_verified: updatedIncident.verification_count + 1 >= 3 // Verify after 3 confirmations
        };
        dispatch({ type: 'UPDATE_INCIDENT', payload: newIncident });
      }

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
    requestNotificationPermission,
    refresh: loadIncidents
  };
};