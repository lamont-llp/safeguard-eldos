import { createClient } from '@supabase/supabase-js';

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
  is_verified: boolean;
  verification_count: number;
  is_urgent: boolean;
  is_resolved: boolean;
  resolved_at?: string;
  media_urls?: string[];
  blockchain_hash?: string;
  created_at: string;
  updated_at: string;
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
    .single();
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

// Incident helper functions
export const createIncident = async (incidentData: Partial<Incident>) => {
  const { data, error } = await supabase
    .from('incidents')
    .insert([incidentData])
    .select()
    .single();
  return { data, error };
};

export const getIncidents = async (limit = 50) => {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
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
  return { data, error };
};

export const verifyIncident = async (incidentId: string, verificationType: 'confirm' | 'dispute' | 'additional_info', notes?: string) => {
  const { data, error } = await supabase
    .from('incident_verifications')
    .insert([{
      incident_id: incidentId,
      verification_type: verificationType,
      notes
    }])
    .select()
    .single();
  return { data, error };
};

// Safe routes helper functions
export const getSafeRoutes = async () => {
  const { data, error } = await supabase
    .from('safe_routes')
    .select('*')
    .eq('is_active', true)
    .order('safety_score', { ascending: false });
  return { data, error };
};

export const createSafeRoute = async (routeData: Partial<SafeRoute>) => {
  const { data, error } = await supabase
    .from('safe_routes')
    .insert([routeData])
    .select()
    .single();
  return { data, error };
};

export const rateSafeRoute = async (routeId: string, ratings: {
  safety_rating: number;
  lighting_rating?: number;
  cleanliness_rating?: number;
  comments?: string;
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
}) => {
  const { data, error } = await supabase
    .from('route_ratings')
    .insert([{
      route_id: routeId,
      ...ratings
    }])
    .select()
    .single();
  return { data, error };
};

// Community groups helper functions
export const getCommunityGroups = async () => {
  const { data, error } = await supabase
    .from('community_groups')
    .select('*')
    .eq('is_active', true)
    .order('member_count', { ascending: false });
  return { data, error };
};

export const joinCommunityGroup = async (groupId: string) => {
  const { data, error } = await supabase
    .from('group_memberships')
    .insert([{
      group_id: groupId,
      role: 'member'
    }])
    .select()
    .single();
  return { data, error };
};

// Community events helper functions
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
  return { data, error };
};

export const registerForEvent = async (eventId: string, status: 'attending' | 'maybe' | 'not_attending' = 'attending') => {
  const { data, error } = await supabase
    .from('event_attendees')
    .insert([{
      event_id: eventId,
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

// Real-time subscriptions
export const subscribeToIncidents = (callback: (payload: any) => void) => {
  return supabase
    .channel('incidents')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'incidents' }, 
      callback
    )
    .subscribe();
};

export const subscribeToSafetyAlerts = (callback: (payload: any) => void) => {
  return supabase
    .channel('safety_alerts')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'incidents', filter: 'is_urgent=eq.true' }, 
      callback
    )
    .subscribe();
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