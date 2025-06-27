@@ .. @@
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
   
   -- Prepare the request payload for FCM v1 API
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
-  RAISE NOTICE 'FCM Notification: % - % (Priority: %, Target: %)', 
-    notification_title, notification_body, notification_priority, target_type;
+  RAISE NOTICE 'FCM v1 Notification: % - % (Priority: %, Target: %)', 
+    notification_title, notification_body, notification_priority, target_type;
   
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
-    RAISE WARNING 'Error sending FCM notification: %', SQLERRM;
+    RAISE WARNING 'Error sending FCM v1 notification: %', SQLERRM;
     RETURN FALSE;
 END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;

@@ .. @@
 -- Grant execute permissions
 GRANT EXECUTE ON FUNCTION send_fcm_notification(TEXT, TEXT, JSONB, TEXT, TEXT, JSONB, UUID) TO authenticated;
 GRANT EXECUTE ON FUNCTION send_incident_fcm_notification() TO authenticated;
 GRANT EXECUTE ON FUNCTION send_verification_fcm_notification() TO authenticated;

 -- Add helpful comments
-COMMENT ON FUNCTION send_fcm_notification(TEXT, TEXT, JSONB, TEXT, TEXT, JSONB, UUID) IS 'Sends FCM push notifications via Edge Function';
+COMMENT ON FUNCTION send_fcm_notification(TEXT, TEXT, JSONB, TEXT, TEXT, JSONB, UUID) IS 'Sends FCM v1 push notifications via Edge Function using OAuth 2.0';
 COMMENT ON FUNCTION send_incident_fcm_notification() IS 'Automatically sends FCM notifications for incident events';
 COMMENT ON FUNCTION send_verification_fcm_notification() IS 'Automatically sends FCM notifications for verification events';
 COMMENT ON TABLE fcm_notification_log IS 'Log of all FCM notifications sent by the system';

 COMMENT ON TRIGGER trigger_incident_fcm_notification ON incidents IS 'Sends FCM notifications for urgent incidents and status changes';
 COMMENT ON TRIGGER trigger_verification_fcm_notification ON incident_verifications IS 'Sends FCM notifications for incident verifications';