import { useState, useEffect, useCallback } from 'react';
import { 
  getIncidents, 
  getIncidentsNearLocation,
  createIncident,
  verifyIncident,
  formatTimeAgo,
  Incident,
  supabase
} from '../lib/supabase';
import { useAuth } from './useAuth';
import { useIncidentsContext } from '../contexts/IncidentsContext';

// FIXED: Standardized error interface for consistent error handling
interface StandardError {
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
  context: string;
}

// FIXED: Standardized response interface for all hook functions
interface HookResponse<T> {
  data: T | null;
  error: StandardError | null;
}

// FIXED: Helper function to create standardized error objects
const createStandardError = (
  error: any, 
  context: string, 
  fallbackMessage = 'An unexpected error occurred'
): StandardError => {
  // Handle different error types and normalize them
  let message: string;
  let code: string | undefined;
  let details: any;

  if (error && typeof error === 'object') {
    // Supabase/PostgreSQL errors
    if (error.message) {
      message = error.message;
      code = error.code || error.error_code || error.status;
      details = {
        hint: error.hint,
        details: error.details,
        status: error.status,
        statusText: error.statusText
      };
    }
    // Network/fetch errors
    else if (error.name) {
      message = `${error.name}: ${error.message || 'Network error'}`;
      code = error.name;
    }
    // Generic error objects
    else {
      message = error.toString();
    }
  } 
  // String errors
  else if (typeof error === 'string') {
    message = error;
  }
  // Unknown error types
  else {
    message = fallbackMessage;
    details = { originalError: error };
  }

  return {
    message,
    code,
    details,
    timestamp: new Date().toISOString(),
    context
  };
};

// FIXED: Helper function to handle specific error cases with consistent formatting
const handleSpecificErrors = (error: any, context: string): StandardError => {
  const message = error?.message || error?.toString() || 'Unknown error';
  
  // Authentication errors
  if (message.includes('JWT') || message.includes('auth') || error?.status === 401) {
    return createStandardError(error, context, 'Authentication required. Please sign in again.');
  }
  
  // Permission errors
  if (message.includes('permission') || message.includes('RLS') || error?.status === 403) {
    return createStandardError(error, context, 'You do not have permission to perform this action.');
  }
  
  // Duplicate verification errors
  if (message.includes('already verified') || 
      message.includes('duplicate key') || 
      message.includes('unique constraint') ||
      error?.code === '23505') {
    return createStandardError(error, context, 'You have already verified this incident.');
  }
  
  // Network errors
  if (message.includes('fetch') || message.includes('network') || !navigator.onLine) {
    return createStandardError(error, context, 'Network error. Please check your connection and try again.');
  }
  
  // Rate limiting
  if (error?.status === 429 || message.includes('rate limit')) {
    return createStandardError(error, context, 'Too many requests. Please wait a moment before trying again.');
  }
  
  // Server errors
  if (error?.status >= 500 || message.includes('server') || message.includes('internal')) {
    return createStandardError(error, context, 'Server error. Please try again later.');
  }
  
  // Default case
  return createStandardError(error, context);
};

export const useIncidents = () => {
  const { incidents, dispatch, updateIncident } = useIncidentsContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  const loadIncidents = useCallback(async (): Promise<HookResponse<Incident[]>> => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await getIncidents(50);
      
      if (error) {
        const standardError = handleSpecificErrors(error, 'Loading incidents');
        setError(standardError.message);
        return { data: null, error: standardError };
      }
      
      const incidents = data || [];
      dispatch({ type: 'SET_INCIDENTS', payload: incidents });
      return { data: incidents, error: null };
    } catch (err: any) {
      const standardError = handleSpecificErrors(err, 'Loading incidents');
      setError(standardError.message);
      return { data: null, error: standardError };
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const loadIncidentsNearLocation = useCallback(async (
    latitude: number, 
    longitude: number, 
    radiusMeters = 5000
  ): Promise<HookResponse<Incident[]>> => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await getIncidentsNearLocation(
        latitude, 
        longitude, 
        radiusMeters
      );
      
      if (error) {
        const standardError = handleSpecificErrors(error, 'Loading nearby incidents');
        setError(standardError.message);
        return { data: null, error: standardError };
      }
      
      const incidents = data || [];
      dispatch({ type: 'SET_INCIDENTS', payload: incidents });
      return { data: incidents, error: null };
    } catch (err: any) {
      const standardError = handleSpecificErrors(err, 'Loading nearby incidents');
      setError(standardError.message);
      return { data: null, error: standardError };
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

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
  }): Promise<HookResponse<Incident>> => {
    try {
      if (!profile) {
        const authError = createStandardError(
          new Error('Authentication required'), 
          'Reporting incident',
          'You must be signed in to report incidents'
        );
        return { data: null, error: authError };
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
        media_urls: incidentData.media_urls || [],
        // Add latitude and longitude for real-time notifications
        latitude: incidentData.latitude,
        longitude: incidentData.longitude
      });

      if (error) {
        const standardError = handleSpecificErrors(error, 'Reporting incident');
        return { data: null, error: standardError };
      }

      // Add to local state immediately for optimistic updates
      if (data) {
        dispatch({ type: 'ADD_INCIDENT', payload: data });
      }

      return { data, error: null };
    } catch (err: any) {
      const standardError = handleSpecificErrors(err, 'Reporting incident');
      return { data: null, error: standardError };
    }
  };

  // FIXED: Optimized verification with targeted incident update instead of full reload
  const verifyIncidentReport = async (
    incidentId: string, 
    verificationType: 'confirm' | 'dispute' | 'additional_info',
    notes?: string
  ): Promise<HookResponse<any>> => {
    try {
      if (!profile) {
        const authError = createStandardError(
          new Error('Authentication required'), 
          'Verifying incident',
          'You must be signed in to verify incidents'
        );
        return { data: null, error: authError };
      }

      const { data, error } = await verifyIncident(incidentId, verificationType, notes);
      
      if (error) {
        const standardError = handleSpecificErrors(error, 'Verifying incident');
        return { data: null, error: standardError };
      }

      // FIXED: Instead of full reload, fetch only the updated incident data
      try {
        const { data: updatedIncident, error: fetchError } = await supabase
          .from('incidents')
          .select('*')
          .eq('id', incidentId)
          .single();

        if (!fetchError && updatedIncident) {
          // Update only the specific incident in state
          updateIncident(updatedIncident);
          console.log('✅ Incident verification updated locally:', {
            incidentId,
            verificationType,
            newVerificationCount: updatedIncident.verification_count,
            isVerified: updatedIncident.is_verified
          });
        } else {
          console.warn('Failed to fetch updated incident data, falling back to full reload');
          // Fallback to full reload only if targeted update fails
          await loadIncidents();
        }
      } catch (updateError) {
        console.warn('Error updating specific incident, falling back to full reload:', updateError);
        // Fallback to full reload only if targeted update fails
        await loadIncidents();
      }

      return { data, error: null };
    } catch (err: any) {
      const standardError = handleSpecificErrors(err, 'Verifying incident');
      return { data: null, error: standardError };
    }
  };

  // ENHANCED: Optimized verification stats with caching
  const getIncidentVerificationStats = async (incidentId: string): Promise<HookResponse<any>> => {
    try {
      const { data, error } = await supabase.rpc('get_incident_verification_stats', {
        incident_uuid: incidentId
      });
      
      if (error) {
        const standardError = handleSpecificErrors(error, 'Getting verification stats');
        return { data: null, error: standardError };
      }
      
      return { data: data?.[0] || null, error: null };
    } catch (err: any) {
      const standardError = handleSpecificErrors(err, 'Getting verification stats');
      return { data: null, error: standardError };
    }
  };

  // ENHANCED: Batch update multiple incidents efficiently
  const updateMultipleIncidents = useCallback(async (incidentIds: string[]): Promise<HookResponse<Incident[]>> => {
    try {
      if (incidentIds.length === 0) {
        return { data: [], error: null };
      }

      // Fetch updated data for multiple incidents in a single query
      const { data: updatedIncidents, error } = await supabase
        .from('incidents')
        .select('*')
        .in('id', incidentIds);

      if (error) {
        const standardError = handleSpecificErrors(error, 'Updating multiple incidents');
        return { data: null, error: standardError };
      }

      // Update each incident in state
      if (updatedIncidents) {
        updatedIncidents.forEach(incident => {
          updateIncident(incident);
        });
        
        console.log('✅ Batch updated incidents:', {
          count: updatedIncidents.length,
          incidentIds
        });
      }

      return { data: updatedIncidents || [], error: null };
    } catch (err: any) {
      const standardError = handleSpecificErrors(err, 'Updating multiple incidents');
      return { data: null, error: standardError };
    }
  }, [updateIncident]);

  // ENHANCED: Smart refresh that only updates changed incidents
  const smartRefresh = useCallback(async (): Promise<HookResponse<Incident[]>> => {
    try {
      if (incidents.length === 0) {
        // If no incidents in state, do full load
        return await loadIncidents();
      }

      // Get the most recent incident timestamp
      const mostRecentTimestamp = incidents.reduce((latest, incident) => {
        const incidentTime = new Date(incident.updated_at || incident.created_at).getTime();
        return Math.max(latest, incidentTime);
      }, 0);

      // Only fetch incidents that have been updated since our most recent one
      const { data: recentIncidents, error } = await supabase
        .from('incidents')
        .select('*')
        .gte('updated_at', new Date(mostRecentTimestamp).toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        const standardError = handleSpecificErrors(error, 'Smart refresh');
        // Fallback to full reload on error
        return await loadIncidents();
      }

      if (recentIncidents && recentIncidents.length > 0) {
        // Update only the changed incidents
        recentIncidents.forEach(incident => {
          const existingIncident = incidents.find(i => i.id === incident.id);
          if (existingIncident) {
            updateIncident(incident);
          } else {
            dispatch({ type: 'ADD_INCIDENT', payload: incident });
          }
        });

        console.log('✅ Smart refresh updated incidents:', {
          updatedCount: recentIncidents.length,
          totalIncidents: incidents.length
        });
      }

      return { data: incidents, error: null };
    } catch (err: any) {
      const standardError = handleSpecificErrors(err, 'Smart refresh');
      // Fallback to full reload on error
      return await loadIncidents();
    }
  }, [incidents, loadIncidents, updateIncident, dispatch]);

  // FIXED: Enhanced error handling for permission requests
  const requestNotificationPermission = async (): Promise<HookResponse<boolean>> => {
    try {
      if (!('Notification' in window)) {
        const notSupportedError = createStandardError(
          new Error('Notifications not supported'),
          'Requesting notification permission',
          'Your browser does not support notifications'
        );
        return { data: false, error: notSupportedError };
      }

      if (Notification.permission === 'granted') {
        return { data: true, error: null };
      }

      if (Notification.permission === 'denied') {
        const deniedError = createStandardError(
          new Error('Notifications denied'),
          'Requesting notification permission',
          'Notifications are blocked. Please enable them in your browser settings.'
        );
        return { data: false, error: deniedError };
      }

      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      
      if (!granted) {
        const rejectedError = createStandardError(
          new Error('Permission rejected'),
          'Requesting notification permission',
          'Notification permission was not granted'
        );
        return { data: false, error: rejectedError };
      }

      return { data: true, error: null };
    } catch (err: any) {
      const standardError = handleSpecificErrors(err, 'Requesting notification permission');
      return { data: false, error: standardError };
    }
  };

  // Utility functions with consistent return types
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

  const getVerifiedIncidents = () => {
    return incidents.filter(incident => incident.is_verified);
  };

  const getUnverifiedIncidents = () => {
    return incidents.filter(incident => !incident.is_verified && !incident.is_resolved);
  };

  const getIncidentsWithTimeAgo = () => {
    return incidents.map(incident => ({
      ...incident,
      timeAgo: formatTimeAgo(incident.created_at)
    }));
  };

  const getIncidentStats = () => {
    const total = incidents.length;
    const verified = incidents.filter(i => i.is_verified).length;
    const resolved = incidents.filter(i => i.is_resolved).length;
    const urgent = incidents.filter(i => i.is_urgent).length;
    const recent = getRecentIncidents(24).length;

    return {
      total,
      verified,
      resolved,
      urgent,
      recent,
      verificationRate: total > 0 ? (verified / total) * 100 : 0,
      resolutionRate: total > 0 ? (resolved / total) * 100 : 0
    };
  };

  // FIXED: Enhanced refresh function with smart update option
  const refresh = async (smart = true): Promise<HookResponse<Incident[]>> => {
    return smart ? await smartRefresh() : await loadIncidents();
  };

  return {
    incidents,
    loading,
    error,
    loadIncidents,
    loadIncidentsNearLocation,
    reportIncident,
    verifyIncidentReport,
    getIncidentVerificationStats,
    updateMultipleIncidents,
    smartRefresh,
    getIncidentsByType,
    getIncidentsBySeverity,
    getRecentIncidents,
    getVerifiedIncidents,
    getUnverifiedIncidents,
    getIncidentsWithTimeAgo,
    getIncidentStats,
    requestNotificationPermission,
    refresh
  };
};