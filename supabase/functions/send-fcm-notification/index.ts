import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface FCMMessage {
  to?: string;
  registration_ids?: string[];
  notification: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
  };
  data?: Record<string, string>;
  priority?: 'normal' | 'high';
  time_to_live?: number;
}

interface NotificationRequest {
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  target_type: 'user' | 'area' | 'all';
  target_value?: string | { lat: number; lng: number; radius: number };
  incident_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    // Get Firebase Server Key from environment
    const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')
    if (!FIREBASE_SERVER_KEY) {
      throw new Error('Firebase Server Key not configured')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const notificationRequest: NotificationRequest = await req.json()

    // Validate required fields
    if (!notificationRequest.title || !notificationRequest.body) {
      throw new Error('Title and body are required')
    }

    // Get FCM tokens based on target type
    let fcmTokens: string[] = []

    switch (notificationRequest.target_type) {
      case 'user':
        if (!notificationRequest.target_value) {
          throw new Error('User ID required for user targeting')
        }
        
        const { data: userTokens, error: userError } = await supabase
          .rpc('get_user_fcm_tokens', { target_user_id: notificationRequest.target_value })
        
        if (userError) throw userError
        fcmTokens = userTokens?.map((t: any) => t.token) || []
        break

      case 'area':
        if (!notificationRequest.target_value || typeof notificationRequest.target_value !== 'object') {
          throw new Error('Area coordinates required for area targeting')
        }
        
        const area = notificationRequest.target_value as { lat: number; lng: number; radius: number }
        const { data: areaTokens, error: areaError } = await supabase
          .rpc('get_area_fcm_tokens', {
            center_lat: area.lat,
            center_lng: area.lng,
            radius_meters: area.radius || 5000
          })
        
        if (areaError) throw areaError
        fcmTokens = areaTokens?.map((t: any) => t.token) || []
        break

      case 'all':
        const { data: allTokens, error: allError } = await supabase
          .from('fcm_tokens')
          .select('token')
          .eq('is_active', true)
          .gte('last_used_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        
        if (allError) throw allError
        fcmTokens = allTokens?.map((t: any) => t.token) || []
        break

      default:
        throw new Error('Invalid target type')
    }

    if (fcmTokens.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active FCM tokens found for target',
          sent_count: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare FCM message
    const fcmMessage: FCMMessage = {
      registration_ids: fcmTokens,
      notification: {
        title: notificationRequest.title,
        body: notificationRequest.body,
        icon: '/shield.svg',
        badge: '/shield.svg'
      },
      data: {
        ...notificationRequest.data,
        incident_id: notificationRequest.incident_id || '',
        priority: notificationRequest.priority || 'medium',
        timestamp: new Date().toISOString(),
        click_action: notificationRequest.data?.actionUrl || '/'
      },
      priority: notificationRequest.priority === 'urgent' ? 'high' : 'normal',
      time_to_live: 86400 // 24 hours
    }

    // Send FCM message
    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FIREBASE_SERVER_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fcmMessage)
    })

    const fcmResult = await fcmResponse.json()

    if (!fcmResponse.ok) {
      throw new Error(`FCM API error: ${fcmResult.error || 'Unknown error'}`)
    }

    // Process FCM response and clean up invalid tokens
    const invalidTokens: string[] = []
    
    if (fcmResult.results) {
      fcmResult.results.forEach((result: any, index: number) => {
        if (result.error) {
          const token = fcmTokens[index]
          
          // Mark tokens as inactive if they're invalid
          if (result.error === 'NotRegistered' || result.error === 'InvalidRegistration') {
            invalidTokens.push(token)
          }
          
          console.warn(`FCM error for token ${index}:`, result.error)
        }
      })
    }

    // Clean up invalid tokens
    if (invalidTokens.length > 0) {
      const { error: cleanupError } = await supabase
        .from('fcm_tokens')
        .update({ is_active: false })
        .in('token', invalidTokens)
      
      if (cleanupError) {
        console.error('Error cleaning up invalid tokens:', cleanupError)
      } else {
        console.log(`Cleaned up ${invalidTokens.length} invalid tokens`)
      }
    }

    // Calculate success metrics
    const successCount = fcmResult.success || 0
    const failureCount = fcmResult.failure || 0

    return new Response(
      JSON.stringify({
        success: true,
        message: 'FCM notification sent',
        sent_count: successCount,
        failed_count: failureCount,
        total_tokens: fcmTokens.length,
        invalid_tokens_cleaned: invalidTokens.length,
        fcm_response: {
          multicast_id: fcmResult.multicast_id,
          success: fcmResult.success,
          failure: fcmResult.failure
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('FCM notification error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})