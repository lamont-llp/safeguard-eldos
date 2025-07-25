import { createClient } from '@supabase/supabase-js';
import { 
  extractCoordinatesFromPostGIS, 
  type CoordinateExtractionResult,
  type Coordinates 
} from '../utils/postgisUtils';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Database types
export interface Profile {
  id: string;
  user_id: string;
  anonymous_id: string;
  reputation_score: number;
  community_role: 'member' | 'leader' | 'moderator' | 'admin';
  area_of_interest?: string;
  notification_radius: number;
  language_preference: 'en' | 'af' | 'zu' | 'st';
  emergency_contact?: string;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  reporter_id?: string;
  incident_type: 'theft' | 'suspicious_activity' | 'gang_activity' | 'drugs' | 'vandalism' | 'resolved' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description?: string;
  location_point: any; // PostGIS geography type
  location_address: string;
  location_area?: string;
  latitude?: number; // Added for real-time notifications
  longitude?: number; // Added for real-time notifications
  is_verified: boolean;
  verification_count: number;
  is_urgent: boolean;
  is_resolved: boolean;
  resolved_at?: string;
  media_urls?: string[];
  blockchain_hash?: string;
  created_at: string;
  updated_at: string;
  distance_meters?: number; // Added for spatial queries
  // ENHANCED: Add extracted coordinates for consistent access
  extracted_coordinates?: Coordinates;
  coordinate_extraction?: CoordinateExtractionResult;
}

export interface SafeRoute {
  id: string;
  creator_id?: string;
  name: string;
  description?: string;
  start_point: any; // PostGIS geography type
  end_point: any; // PostGIS geography type
  route_path?: any; // PostGIS geography type
  start_address: string;
  end_address: string;
  distance_meters?: number;
  estimated_duration_minutes?: number;
  safety_score: number;
  lighting_quality: 'poor' | 'moderate' | 'good' | 'excellent' | 'unknown';
  patrol_coverage: boolean;
  cctv_coverage: boolean;
  recent_incidents_count: number;
  is_active: boolean;
  time_restrictions?: string;
  created_at: string;
  updated_at: string;
  distance_to_start?: number; // Added for spatial queries
  distance_to_end?: number; // Added for spatial queries
  // ENHANCED: Add extracted coordinates for consistent access
  start_coordinates?: Coordinates;
  end_coordinates?: Coordinates;
  start_extraction?: CoordinateExtractionResult;
  end_extraction?: CoordinateExtractionResult;
}

export interface CommunityGroup {
  id: string;
  name: string;
  description?: string;
  area_polygon?: any; // PostGIS geography type
  area_name: string;
  leader_id?: string;
  member_count: number;
  is_active: boolean;
  meeting_schedule?: string;
  patrol_schedule?: string;
  contact_info?: string;
  group_type: 'neighborhood_watch' | 'school_safety' | 'business_district' | 'youth_group' | 'other';
  created_at: string;
  updated_at: string;
  distance_meters?: number; // Added for spatial queries
  // ENHANCED: Add extracted coordinates for consistent access
  center_coordinates?: Coordinates;
  coordinate_extraction?: CoordinateExtractionResult;
}

export interface CommunityEvent {
  id: string;
  group_id: string;
  organizer_id?: string;
  title: string;
  description?: string;
  event_type: 'meeting' | 'patrol' | 'workshop' | 'training' | 'social' | 'emergency_response';
  location_point?: any; // PostGIS geography type
  location_address?: string;
  start_time: string;
  end_time?: string;
  max_attendees?: number;
  current_attendees: number;
  is_public: boolean;
  requirements?: string;
  created_at: string;
  updated_at: string;
  // ENHANCED: Add extracted coordinates for consistent access
  extracted_coordinates?: Coordinates;
  coordinate_extraction?: CoordinateExtractionResult;
}

export interface EmergencyContact {
  id: string;
  name: string;
  organization?: string;
  contact_type: 'police' | 'medical' | 'fire' | 'community_leader' | 'security' | 'other';
  phone_number: string;
  area_served?: string;
  is_24_7: boolean;
  languages_spoken?: string[];
  notes?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface SafetyHeatmapPoint {
  lat: number;
  lng: number;
  incident_count: number;
  severity_score: number;
}

export interface OptimalRoute {
  route_id: string;
  route_name: string;
  total_distance: number;
  safety_score: number;
  estimated_duration: number;
  waypoints: {
    start_connection: number;
    route_distance: number;
    end_connection: number;
  };
}

export interface IncidentVerificationStats {
  incident_id: string;
  total_verifications: number;
  confirm_count: number;
  dispute_count: number;
  additional_info_count: number;
  verification_score: number;
  is_verified: boolean;
  verification_percentage: number;
}

// ENHANCED: Coordinate extraction helper functions
export const extractIncidentCoordinates = (incident: Incident): Incident => {
  const extraction = extractCoordinatesFromPostGIS({
    location_point: incident.location_point,
    latitude: incident.latitude,
    longitude: incident.longitude,
    location_address: incident.location_address,
    location_area: incident.location_area
  });

  return {
    ...incident,
    extracted_coordinates: extraction.coordinates || undefined,
    coordinate_extraction: extraction,
    // Update legacy fields for backward compatibility
    latitude: extraction.coordinates?.latitude || incident.latitude,
    longitude: extraction.coordinates?.longitude || incident.longitude
  };
};

export const extractSafeRouteCoordinates = (route: SafeRoute): SafeRoute => {
  const startExtraction = extractCoordinatesFromPostGIS({
    location_point: route.start_point,
    location_address: route.start_address
  });

  const endExtraction = extractCoordinatesFromPostGIS({
    location_point: route.end_point,
    location_address: route.end_address
  });

  return {
    ...route,
    start_coordinates: startExtraction.coordinates || undefined,
    end_coordinates: endExtraction.coordinates || undefined,
    start_extraction: startExtraction,
    end_extraction: endExtraction
  };
};

export const extractCommunityGroupCoordinates = (group: CommunityGroup): CommunityGroup => {
  const extraction = extractCoordinatesFromPostGIS({
    location_point: group.area_polygon, // Use polygon center if available
    location_address: group.area_name
  });

  return {
    ...group,
    center_coordinates: extraction.coordinates || undefined,
    coordinate_extraction: extraction
  };
};

export const extractEventCoordinates = (event: CommunityEvent): CommunityEvent => {
  const extraction = extractCoordinatesFromPostGIS({
    location_point: event.location_point,
    location_address: event.location_address
  });

  return {
    ...event,
    extracted_coordinates: extraction.coordinates || undefined,
    coordinate_extraction: extraction
  };
};

// ENHANCED: Batch coordinate extraction for multiple records
export const batchExtractIncidentCoordinates = (incidents: Incident[]): Incident[] => {
  return incidents.map(extractIncidentCoordinates);
};

export const batchExtractSafeRouteCoordinates = (routes: SafeRoute[]): SafeRoute[] => {
  return routes.map(extractSafeRouteCoordinates);
};

export const batchExtractCommunityGroupCoordinates = (groups: CommunityGroup[]): CommunityGroup[] => {
  return groups.map(extractCommunityGroupCoordinates);
};

export const batchExtractEventCoordinates = (events: CommunityEvent[]): CommunityEvent[] => {
  return events.map(extractEventCoordinates);
};

// Auth helper functions
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

// Profile helper functions
export const createProfile = async (profileData: Partial<Profile>) => {
  const { data, error } = await supabase
    .from('profiles')
    .insert([profileData])
    .select()
    .single();
  return { data, error };
};

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return { data, error };
};

export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();
  return { data, error };
};

// ENHANCED: Incident helper functions with automatic coordinate extraction
export const createIncident = async (incidentData: Partial<Incident>) => {
  const { data, error } = await supabase
    .from('incidents')
    .insert([incidentData])
    .select()
    .single();
  
  if (data && !error) {
    // Extract coordinates from the returned data
    const enhancedData = extractIncidentCoordinates(data);
    return { data: enhancedData, error };
  }
  
  return { data, error };
};

export const getIncidents = async (limit = 50) => {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (data && !error) {
    // Extract coordinates for all incidents
    const enhancedData = batchExtractIncidentCoordinates(data);
    return { data: enhancedData, error };
  }
  
  return { data, error };
};

export const getIncidentsNearLocation = async (
  latitude: number, 
  longitude: number, 
  radiusMeters = 5000,
  limit = 50
) => {
  const { data, error } = await supabase.rpc('get_incidents_near_location', {
    lat: latitude,
    lng: longitude,
    radius_meters: radiusMeters,
    result_limit: limit
  });
  
  if (data && !error) {
    // Extract coordinates for all incidents
    const enhancedData = batchExtractIncidentCoordinates(data);
    return { data: enhancedData, error };
  }
  
  return { data, error };
};

export const verifyIncident = async (
  incidentId: string, 
  verificationType: 'confirm' | 'dispute' | 'additional_info', 
  notes?: string
) => {
  // First, get the current user's profile
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');

  // The server-side trigger will handle updating verification counts
  const { data, error } = await supabase
    .from('incident_verifications')
    .insert([{
      incident_id: incidentId,
      verifier_id: profile.id,
      verification_type: verificationType,
      notes
    }])
    .select()
    .single();
  
  return { data, error };
};

// Get incident verification statistics
export const getIncidentVerificationStats = async (incidentId: string): Promise<{ data: IncidentVerificationStats | null; error: any }> => {
  const { data, error } = await supabase.rpc('get_incident_verification_stats', {
    incident_uuid: incidentId
  });
  
  if (error) return { data: null, error };
  
  return { data: data?.[0] || null, error: null };
};

// Check if user has already verified an incident
export const hasUserVerifiedIncident = async (incidentId: string): Promise<{ data: boolean; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: false, error: null };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) return { data: false, error: null };

    const { data, error } = await supabase
      .from('incident_verifications')
      .select('id')
      .eq('incident_id', incidentId)
      .eq('verifier_id', profile.id)
      .maybeSingle();

    if (error) return { data: false, error };

    return { data: !!data, error: null };
  } catch (err) {
    return { data: false, error: err };
  }
};

// ENHANCED: Safe routes helper functions with automatic coordinate extraction
export const getSafeRoutes = async () => {
  const { data, error } = await supabase
    .from('safe_routes')
    .select('*')
    .eq('is_active', true)
    .order('safety_score', { ascending: false });
  
  if (data && !error) {
    // Extract coordinates for all routes
    const enhancedData = batchExtractSafeRouteCoordinates(data);
    return { data: enhancedData, error };
  }
  
  return { data, error };
};

export const getSafeRoutesNearLocation = async (
  latitude: number,
  longitude: number,
  radiusMeters = 10000,
  limit = 20
) => {
  const { data, error } = await supabase.rpc('get_safe_routes_near_location', {
    lat: latitude,
    lng: longitude,
    radius_meters: radiusMeters,
    result_limit: limit
  });
  
  if (data && !error) {
    // Extract coordinates for all routes
    const enhancedData = batchExtractSafeRouteCoordinates(data);
    return { data: enhancedData, error };
  }
  
  return { data, error };
};

export const findOptimalSafeRoute = async (
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  maxDetourMeters = 2000
): Promise<{ data: OptimalRoute[] | null; error: any }> => {
  const { data, error } = await supabase.rpc('find_optimal_safe_route', {
    start_lat: startLat,
    start_lng: startLng,
    end_lat: endLat,
    end_lng: endLng,
    max_detour_meters: maxDetourMeters
  });
  return { data, error };
};

export const calculateRouteSafetyScore = async (
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  bufferMeters = 500
) => {
  const { data, error } = await supabase.rpc('calculate_route_safety_score', {
    route_start_lat: startLat,
    route_start_lng: startLng,
    route_end_lat: endLat,
    route_end_lng: endLng,
    buffer_meters: bufferMeters
  });
  return { data, error };
};

export const createSafeRoute = async (routeData: Partial<SafeRoute>) => {
  const { data, error } = await supabase
    .from('safe_routes')
    .insert([routeData])
    .select()
    .single();
  
  if (data && !error) {
    // Extract coordinates from the returned data
    const enhancedData = extractSafeRouteCoordinates(data);
    return { data: enhancedData, error };
  }
  
  return { data, error };
};

export const rateSafeRoute = async (routeId: string, ratings: {
  safety_rating: number;
  lighting_rating?: number;
  cleanliness_rating?: number;
  comments?: string;
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
}) => {
  // Get current user's profile
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');

  const { data, error } = await supabase
    .from('route_ratings')
    .insert([{
      route_id: routeId,
      rater_id: profile.id,
      ...ratings
    }])
    .select()
    .single();
  return { data, error };
};

// ENHANCED: Community groups helper functions with automatic coordinate extraction
export const getCommunityGroups = async () => {
  const { data, error } = await supabase
    .from('community_groups')
    .select('*')
    .eq('is_active', true)
    .order('member_count', { ascending: false });
  
  if (data && !error) {
    // Extract coordinates for all groups
    const enhancedData = batchExtractCommunityGroupCoordinates(data);
    return { data: enhancedData, error };
  }
  
  return { data, error };
};

export const getCommunityGroupsForLocation = async (
  latitude: number,
  longitude: number,
  radiusMeters = 5000
) => {
  const { data, error } = await supabase.rpc('get_community_groups_for_location', {
    lat: latitude,
    lng: longitude,
    radius_meters: radiusMeters
  });
  
  if (data && !error) {
    // Extract coordinates for all groups
    const enhancedData = batchExtractCommunityGroupCoordinates(data);
    return { data: enhancedData, error };
  }
  
  return { data, error };
};

export const joinCommunityGroup = async (groupId: string) => {
  // Get current user's profile
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');

  const { data, error } = await supabase
    .from('group_memberships')
    .insert([{
      group_id: groupId,
      member_id: profile.id,
      role: 'member'
    }])
    .select()
    .single();
  return { data, error };
};

// ENHANCED: Community events helper functions with automatic coordinate extraction
export const getCommunityEvents = async (limit = 20) => {
  const { data, error } = await supabase
    .from('community_events')
    .select(`
      *,
      community_groups (name, area_name)
    `)
    .eq('is_public', true)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(limit);
  
  if (data && !error) {
    // Extract coordinates for all events
    const enhancedData = batchExtractEventCoordinates(data);
    return { data: enhancedData, error };
  }
  
  return { data, error };
};

export const registerForEvent = async (eventId: string, status: 'attending' | 'maybe' | 'not_attending' = 'attending') => {
  // Get current user's profile
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');

  const { data, error } = await supabase
    .from('event_attendees')
    .insert([{
      event_id: eventId,
      attendee_id: profile.id,
      status
    }])
    .select()
    .single();
  return { data, error };
};

// Emergency contacts helper functions
export const getEmergencyContacts = async () => {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('*')
    .eq('is_verified', true)
    .order('contact_type', { ascending: true });
  return { data, error };
};

// Safety analytics with PostGIS
export const getSafetyHeatmap = async (
  centerLat: number,
  centerLng: number,
  radiusMeters = 5000,
  gridSize = 50
): Promise<{ data: SafetyHeatmapPoint[] | null; error: any }> => {
  const { data, error } = await supabase.rpc('get_safety_heatmap', {
    center_lat: centerLat,
    center_lng: centerLng,
    radius_meters: radiusMeters,
    grid_size: gridSize
  });
  return { data, error };
};

export const updateRouteSafetyMetrics = async () => {
  const { data, error } = await supabase.rpc('update_route_safety_metrics');
  return { data, error };
};

// Real-time subscriptions - Return channels before subscribing
export const createIncidentsChannel = (callback: (payload: any) => void) => {
  return supabase
    .channel('incidents')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'incidents' }, 
      callback
    );
};

export const createSafetyAlertsChannel = (callback: (payload: any) => void) => {
  return supabase
    .channel('safety_alerts')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'incidents', filter: 'is_urgent=eq.true' }, 
      callback
    );
};

// Utility functions
export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
};

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

// Format distance for display
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    return `${(meters / 1000).toFixed(1)}km`;
  }
};

// Format safety score for display
export const formatSafetyScore = (score: number): { label: string; color: string } => {
  if (score >= 90) return { label: 'Very Safe', color: 'text-green-600' };
  if (score >= 75) return { label: 'Safe', color: 'text-green-500' };
  if (score >= 60) return { label: 'Moderate', color: 'text-yellow-500' };
  if (score >= 40) return { label: 'Caution', color: 'text-orange-500' };
  return { label: 'High Risk', color: 'text-red-600' };
};