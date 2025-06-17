/*
  # SafeGuard Eldos Database Schema

  1. New Tables
    - `profiles` - User profiles with anonymous IDs and reputation scores
    - `incidents` - Community incident reports with location and verification
    - `safe_routes` - Community-verified safe paths and routes
    - `community_groups` - Neighborhood watch groups and coordination
    - `incident_verifications` - Community verification of incident reports
    - `route_ratings` - User ratings and feedback for safe routes
    - `community_events` - Scheduled community safety events
    - `emergency_contacts` - Local emergency and community contacts

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Community verification system for incident accuracy
    - Anonymous reporting with privacy protection

  3. Features
    - Real-time incident reporting and alerts
    - Community verification and reputation system
    - Safe route planning with danger zone avoidance
    - Neighborhood watch group coordination
    - Emergency contact management
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- User profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  reputation_score integer DEFAULT 0,
  community_role text DEFAULT 'member' CHECK (community_role IN ('member', 'leader', 'moderator', 'admin')),
  area_of_interest text,
  notification_radius integer DEFAULT 1000, -- meters
  language_preference text DEFAULT 'en' CHECK (language_preference IN ('en', 'af', 'zu', 'st')),
  emergency_contact text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  incident_type text NOT NULL CHECK (incident_type IN ('theft', 'suspicious_activity', 'gang_activity', 'drugs', 'vandalism', 'resolved', 'other')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  description text,
  location_point geography(POINT, 4326) NOT NULL,
  location_address text NOT NULL,
  location_area text,
  is_verified boolean DEFAULT false,
  verification_count integer DEFAULT 0,
  is_urgent boolean DEFAULT false,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  media_urls text[],
  blockchain_hash text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Incident verifications table
CREATE TABLE IF NOT EXISTS incident_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES incidents(id) ON DELETE CASCADE,
  verifier_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  verification_type text NOT NULL CHECK (verification_type IN ('confirm', 'dispute', 'additional_info')),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(incident_id, verifier_id)
);

-- Safe routes table
CREATE TABLE IF NOT EXISTS safe_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  start_point geography(POINT, 4326) NOT NULL,
  end_point geography(POINT, 4326) NOT NULL,
  route_path geography(LINESTRING, 4326),
  start_address text NOT NULL,
  end_address text NOT NULL,
  distance_meters integer,
  estimated_duration_minutes integer,
  safety_score integer DEFAULT 50 CHECK (safety_score >= 0 AND safety_score <= 100),
  lighting_quality text DEFAULT 'unknown' CHECK (lighting_quality IN ('poor', 'moderate', 'good', 'excellent', 'unknown')),
  patrol_coverage boolean DEFAULT false,
  cctv_coverage boolean DEFAULT false,
  recent_incidents_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  time_restrictions text, -- JSON string for time-based restrictions
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Route ratings table
CREATE TABLE IF NOT EXISTS route_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES safe_routes(id) ON DELETE CASCADE,
  rater_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  safety_rating integer NOT NULL CHECK (safety_rating >= 1 AND safety_rating <= 5),
  lighting_rating integer CHECK (lighting_rating >= 1 AND lighting_rating <= 5),
  cleanliness_rating integer CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  comments text,
  time_of_day text CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'night')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(route_id, rater_id)
);

-- Community groups table
CREATE TABLE IF NOT EXISTS community_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  area_polygon geography(POLYGON, 4326),
  area_name text NOT NULL,
  leader_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  member_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  meeting_schedule text, -- JSON string for meeting times
  patrol_schedule text, -- JSON string for patrol times
  contact_info text, -- JSON string for contact details
  group_type text DEFAULT 'neighborhood_watch' CHECK (group_type IN ('neighborhood_watch', 'school_safety', 'business_district', 'youth_group', 'other')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Community group memberships
CREATE TABLE IF NOT EXISTS group_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES community_groups(id) ON DELETE CASCADE,
  member_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('member', 'coordinator', 'leader')),
  joined_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(group_id, member_id)
);

-- Community events table
CREATE TABLE IF NOT EXISTS community_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES community_groups(id) ON DELETE CASCADE,
  organizer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  event_type text NOT NULL CHECK (event_type IN ('meeting', 'patrol', 'workshop', 'training', 'social', 'emergency_response')),
  location_point geography(POINT, 4326),
  location_address text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  max_attendees integer,
  current_attendees integer DEFAULT 0,
  is_public boolean DEFAULT true,
  requirements text, -- JSON string for event requirements
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Event attendees table
CREATE TABLE IF NOT EXISTS event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES community_events(id) ON DELETE CASCADE,
  attendee_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'attending' CHECK (status IN ('attending', 'maybe', 'not_attending')),
  registered_at timestamptz DEFAULT now(),
  UNIQUE(event_id, attendee_id)
);

-- Emergency contacts table
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organization text,
  contact_type text NOT NULL CHECK (contact_type IN ('police', 'medical', 'fire', 'community_leader', 'security', 'other')),
  phone_number text NOT NULL,
  area_served text,
  is_24_7 boolean DEFAULT false,
  languages_spoken text[], -- Array of language codes
  notes text,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE safe_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Incidents policies
CREATE POLICY "Anyone can read incidents"
  ON incidents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create incidents"
  ON incidents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own incidents"
  ON incidents
  FOR UPDATE
  TO authenticated
  USING (reporter_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Incident verifications policies
CREATE POLICY "Anyone can read verifications"
  ON incident_verifications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create verifications"
  ON incident_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (verifier_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Safe routes policies
CREATE POLICY "Anyone can read safe routes"
  ON safe_routes
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can create routes"
  ON safe_routes
  FOR INSERT
  TO authenticated
  WITH CHECK (creator_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own routes"
  ON safe_routes
  FOR UPDATE
  TO authenticated
  USING (creator_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Route ratings policies
CREATE POLICY "Anyone can read route ratings"
  ON route_ratings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create ratings"
  ON route_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (rater_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Community groups policies
CREATE POLICY "Anyone can read active groups"
  ON community_groups
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Group leaders can update their groups"
  ON community_groups
  FOR UPDATE
  TO authenticated
  USING (leader_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Group memberships policies
CREATE POLICY "Members can read group memberships"
  ON group_memberships
  FOR SELECT
  TO authenticated
  USING (member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR 
         group_id IN (SELECT group_id FROM group_memberships WHERE member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "Users can join groups"
  ON group_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Community events policies
CREATE POLICY "Anyone can read public events"
  ON community_events
  FOR SELECT
  TO authenticated
  USING (is_public = true OR organizer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Group members can create events"
  ON community_events
  FOR INSERT
  TO authenticated
  WITH CHECK (organizer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Event attendees policies
CREATE POLICY "Users can read event attendees"
  ON event_attendees
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can register for events"
  ON event_attendees
  FOR INSERT
  TO authenticated
  WITH CHECK (attendee_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Emergency contacts policies
CREATE POLICY "Anyone can read verified emergency contacts"
  ON emergency_contacts
  FOR SELECT
  TO authenticated
  USING (is_verified = true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents USING GIST (location_point);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_type_severity ON incidents (incident_type, severity);
CREATE INDEX IF NOT EXISTS idx_safe_routes_points ON safe_routes USING GIST (start_point, end_point);
CREATE INDEX IF NOT EXISTS idx_safe_routes_safety_score ON safe_routes (safety_score DESC);
CREATE INDEX IF NOT EXISTS idx_community_groups_area ON community_groups USING GIST (area_polygon);
CREATE INDEX IF NOT EXISTS idx_profiles_anonymous_id ON profiles (anonymous_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON community_events (start_time);

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safe_routes_updated_at BEFORE UPDATE ON safe_routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_community_groups_updated_at BEFORE UPDATE ON community_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_community_events_updated_at BEFORE UPDATE ON community_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample emergency contacts
INSERT INTO emergency_contacts (name, organization, contact_type, phone_number, area_served, is_24_7, languages_spoken, is_verified) VALUES
('South African Police Service', 'SAPS', 'police', '10111', 'Eldorado Park', true, ARRAY['en', 'af', 'zu'], true),
('Emergency Medical Services', 'EMS', 'medical', '10177', 'Eldorado Park', true, ARRAY['en', 'af'], true),
('Fire Department', 'City of Johannesburg', 'fire', '10111', 'Eldorado Park', true, ARRAY['en', 'af'], true),
('Eldorado Park Community Policing Forum', 'CPF', 'community_leader', '011-123-4567', 'Eldorado Park', false, ARRAY['en', 'af', 'zu'], true),
('Private Security Response', 'Local Security', 'security', '011-987-6543', 'Eldorado Park', true, ARRAY['en', 'af'], true);