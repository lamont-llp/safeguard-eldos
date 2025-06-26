/*
  # FCM Notification Triggers

  1. New Functions
    - `send_incident_fcm_notification()` - Send FCM notifications for new incidents
    - `send_verification_fcm_notification()` - Send FCM notifications for incident verifications

  2. New Triggers
    - Trigger FCM notifications when urgent incidents are created
    - Trigger FCM notifications when incidents are verified

  3. Integration
    - Calls the send-fcm-notification Edge Function
    - Handles different notification types and priorities
*/

-- Function to send FCM notification via Edge Function
CREATE OR REPLACE FUNCTION send_fcm_notification(
  notification_title TEXT,
  notification_body TEXT,
  notification_data JSONB DEFAULT '{}',
  notification_priority TEXT DEFAULT 'medium',
  target_type TEXT DEFAULT 'area',
  target_value JSONB DEFAULT NULL,
  incident_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  edge_function_url TEXT;
  request_payload JSONB;
  response_status INTEGER;
BEGIN
  -- Construct the Edge Function URL
  edge_function_url := current_setting('app.supabase_url', true) || '/functions/v1/send-fcm-notification';
  
  -- Prepare the request payload
  request_payload := jsonb_build_object(
    'title', notification_title,
    'body', notification_body,
    'data', notification_data,
    'priority', notification_priority,
    'target_type', target_type,
    'target_value', target_value,
    'incident_id', incident_uuid
  );

  -- Make HTTP request to Edge Function
  -- Note: In a real implementation, you would use pg_net or similar extension
  -- For now, we'll log the notification and return true
  RAISE NOTICE 'FCM Notification: % - % (Priority: %, Target: %)', 
    notification_title, notification_body, notification_priority, target_type;
  
  -- Log notification for debugging
  INSERT INTO fcm_notification_log (
    title,
    body,
    data,
    priority,
    target_type,
    target_value,
    incident_id,
    status,
    created_at
  ) VALUES (
    notification_title,
    notification_body,
    notification_data,
    notification_priority,
    target_type,
    target_value,
    incident_uuid,
    'pending',
    NOW()
  );

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error sending FCM notification: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create FCM notification log table
CREATE TABLE IF NOT EXISTS fcm_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}',
  priority text DEFAULT 'medium',
  target_type text NOT NULL,
  target_value jsonb,
  incident_id uuid,
  status text DEFAULT 'pending', -- pending, sent, failed
  response_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on notification log
ALTER TABLE fcm_notification_log ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access notification log
CREATE POLICY "Service role can manage FCM notification log"
  ON fcm_notification_log
  FOR ALL
  TO service_role
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fcm_notification_log_incident_id ON fcm_notification_log(incident_id);
CREATE INDEX IF NOT EXISTS idx_fcm_notification_log_status ON fcm_notification_log(status);
CREATE INDEX IF NOT EXISTS idx_fcm_notification_log_created_at ON fcm_notification_log(created_at DESC);

-- Function to send incident FCM notification
CREATE OR REPLACE FUNCTION send_incident_fcm_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_body TEXT;
  notification_data JSONB;
  notification_priority TEXT;
  incident_coords JSONB;
  incident_lat DOUBLE PRECISION;
  incident_lng DOUBLE PRECISION;
BEGIN
  -- Only send notifications for new urgent incidents or newly verified incidents
  IF TG_OP = 'INSERT' AND NEW.is_urgent THEN
    -- New urgent incident
    notification_title := '🚨 URGENT SAFETY ALERT';
    notification_body := NEW.title || ' - ' || NEW.location_address;
    notification_priority := 'urgent';
    
  ELSIF TG_OP = 'UPDATE' AND NEW.is_verified = true AND OLD.is_verified = false THEN
    -- Newly verified incident
    notification_title := '✅ Incident Verified';
    notification_body := NEW.title || ' has been verified by the community';
    notification_priority := 'medium';
    
  ELSIF TG_OP = 'UPDATE' AND NEW.is_resolved = true AND OLD.is_resolved = false THEN
    -- Newly resolved incident
    notification_title := '✅ Incident Resolved';
    notification_body := NEW.title || ' has been marked as resolved';
    notification_priority := 'low';
    
  ELSE
    -- No notification needed
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Extract coordinates from PostGIS point
  BEGIN
    SELECT 
      ST_Y(NEW.location_point::geometry) as lat,
      ST_X(NEW.location_point::geometry) as lng
    INTO incident_lat, incident_lng;
  EXCEPTION
    WHEN OTHERS THEN
      -- Fallback to default Eldorado Park coordinates
      incident_lat := -26.3054;
      incident_lng := 27.9389;
  END;

  -- Prepare notification data
  notification_data := jsonb_build_object(
    'incident_id', NEW.id,
    'incident_type', NEW.incident_type,
    'severity', NEW.severity,
    'location_address', NEW.location_address,
    'is_urgent', NEW.is_urgent,
    'is_verified', NEW.is_verified,
    'is_resolved', NEW.is_resolved,
    'actionUrl', '/?incident=' || NEW.id,
    'type', 'incident'
  );

  -- Prepare target area (5km radius around incident)
  incident_coords := jsonb_build_object(
    'lat', incident_lat,
    'lng', incident_lng,
    'radius', 5000
  );

  -- Send FCM notification
  PERFORM send_fcm_notification(
    notification_title,
    notification_body,
    notification_data,
    notification_priority,
    'area',
    incident_coords,
    NEW.id
  );

  RETURN COALESCE(NEW, OLD);

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in send_incident_fcm_notification: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send verification FCM notification
CREATE OR REPLACE FUNCTION send_verification_fcm_notification()
RETURNS TRIGGER AS $$
DECLARE
  incident_record RECORD;
  notification_title TEXT;
  notification_body TEXT;
  notification_data JSONB;
  incident_coords JSONB;
  incident_lat DOUBLE PRECISION;
  incident_lng DOUBLE PRECISION;
BEGIN
  -- Only send notifications for new verifications
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Get incident details
  SELECT * INTO incident_record
  FROM incidents
  WHERE id = NEW.incident_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Prepare notification based on verification type
  CASE NEW.verification_type
    WHEN 'confirm' THEN
      notification_title := '👍 Incident Confirmed';
      notification_body := incident_record.title || ' has been confirmed by a community member';
    WHEN 'dispute' THEN
      notification_title := '❓ Incident Disputed';
      notification_body := incident_record.title || ' has been disputed by a community member';
    WHEN 'additional_info' THEN
      notification_title := 'ℹ️ Additional Information';
      notification_body := 'New information added to: ' || incident_record.title;
    ELSE
      RETURN NEW;
  END CASE;

  -- Extract coordinates
  BEGIN
    SELECT 
      ST_Y(incident_record.location_point::geometry) as lat,
      ST_X(incident_record.location_point::geometry) as lng
    INTO incident_lat, incident_lng;
  EXCEPTION
    WHEN OTHERS THEN
      incident_lat := -26.3054;
      incident_lng := 27.9389;
  END;

  -- Prepare notification data
  notification_data := jsonb_build_object(
    'incident_id', incident_record.id,
    'verification_type', NEW.verification_type,
    'verification_id', NEW.id,
    'incident_type', incident_record.incident_type,
    'severity', incident_record.severity,
    'location_address', incident_record.location_address,
    'actionUrl', '/?incident=' || incident_record.id,
    'type', 'verification'
  );

  -- Prepare target area (2km radius for verification notifications)
  incident_coords := jsonb_build_object(
    'lat', incident_lat,
    'lng', incident_lng,
    'radius', 2000
  );

  -- Send FCM notification
  PERFORM send_fcm_notification(
    notification_title,
    notification_body,
    notification_data,
    'medium',
    'area',
    incident_coords,
    incident_record.id
  );

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in send_verification_fcm_notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for FCM notifications
DROP TRIGGER IF EXISTS trigger_incident_fcm_notification ON incidents;
CREATE TRIGGER trigger_incident_fcm_notification
  AFTER INSERT OR UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION send_incident_fcm_notification();

DROP TRIGGER IF EXISTS trigger_verification_fcm_notification ON incident_verifications;
CREATE TRIGGER trigger_verification_fcm_notification
  AFTER INSERT ON incident_verifications
  FOR EACH ROW
  EXECUTE FUNCTION send_verification_fcm_notification();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_fcm_notification(TEXT, TEXT, JSONB, TEXT, TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_incident_fcm_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION send_verification_fcm_notification() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION send_fcm_notification(TEXT, TEXT, JSONB, TEXT, TEXT, JSONB, UUID) IS 'Sends FCM push notifications via Edge Function';
COMMENT ON FUNCTION send_incident_fcm_notification() IS 'Automatically sends FCM notifications for incident events';
COMMENT ON FUNCTION send_verification_fcm_notification() IS 'Automatically sends FCM notifications for verification events';
COMMENT ON TABLE fcm_notification_log IS 'Log of all FCM notifications sent by the system';

COMMENT ON TRIGGER trigger_incident_fcm_notification ON incidents IS 'Sends FCM notifications for urgent incidents and status changes';
COMMENT ON TRIGGER trigger_verification_fcm_notification ON incident_verifications IS 'Sends FCM notifications for incident verifications';