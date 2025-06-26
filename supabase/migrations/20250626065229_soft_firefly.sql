/*
  # FCM Tokens Table for Push Notifications

  1. New Tables
    - `fcm_tokens` - Store Firebase Cloud Messaging device tokens for users

  2. Security
    - Enable RLS on `fcm_tokens` table
    - Add policies for users to manage their own tokens

  3. Features
    - Unique constraint on token to prevent duplicates
    - Automatic cleanup of old tokens
    - User association for targeted notifications
*/

-- FCM tokens table for push notifications
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  device_info jsonb DEFAULT '{}', -- Store device/browser info
  is_active boolean DEFAULT true,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fcm_tokens
CREATE POLICY "Users can read own FCM tokens"
  ON fcm_tokens
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own FCM tokens"
  ON fcm_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own FCM tokens"
  ON fcm_tokens
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own FCM tokens"
  ON fcm_tokens
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_profile_id ON fcm_tokens(profile_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON fcm_tokens(token);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_is_active ON fcm_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_last_used ON fcm_tokens(last_used_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_fcm_tokens_updated_at 
  BEFORE UPDATE ON fcm_tokens 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old/inactive FCM tokens
CREATE OR REPLACE FUNCTION cleanup_old_fcm_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete tokens that haven't been used in 90 days
  DELETE FROM fcm_tokens 
  WHERE last_used_at < NOW() - INTERVAL '90 days'
    OR (is_active = false AND updated_at < NOW() - INTERVAL '30 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % old FCM tokens', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active FCM tokens for a user
CREATE OR REPLACE FUNCTION get_user_fcm_tokens(target_user_id UUID)
RETURNS TABLE(
  token TEXT,
  device_info JSONB,
  last_used_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.token,
    ft.device_info,
    ft.last_used_at
  FROM fcm_tokens ft
  WHERE ft.user_id = target_user_id
    AND ft.is_active = true
    AND ft.last_used_at > NOW() - INTERVAL '30 days'
  ORDER BY ft.last_used_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get FCM tokens for users in a specific area
CREATE OR REPLACE FUNCTION get_area_fcm_tokens(
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE(
  token TEXT,
  user_id UUID,
  profile_id UUID,
  device_info JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.token,
    ft.user_id,
    ft.profile_id,
    ft.device_info
  FROM fcm_tokens ft
  INNER JOIN profiles p ON ft.profile_id = p.id
  WHERE ft.is_active = true
    AND ft.last_used_at > NOW() - INTERVAL '7 days'
    AND p.notification_radius >= ST_Distance(
      ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geometry,
      ST_SetSRID(ST_MakePoint(0, 0), 4326)::geometry -- This would need actual user location
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update FCM token usage
CREATE OR REPLACE FUNCTION update_fcm_token_usage(token_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE fcm_tokens 
  SET 
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE token = token_text;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_old_fcm_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_fcm_tokens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_area_fcm_tokens(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_fcm_token_usage(TEXT) TO authenticated;

-- Add helpful comments
COMMENT ON TABLE fcm_tokens IS 'Firebase Cloud Messaging tokens for push notifications';
COMMENT ON FUNCTION cleanup_old_fcm_tokens() IS 'Removes old and inactive FCM tokens to keep the table clean';
COMMENT ON FUNCTION get_user_fcm_tokens(UUID) IS 'Gets active FCM tokens for a specific user';
COMMENT ON FUNCTION get_area_fcm_tokens(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) IS 'Gets FCM tokens for users within a geographic area';
COMMENT ON FUNCTION update_fcm_token_usage(TEXT) IS 'Updates the last used timestamp for an FCM token';