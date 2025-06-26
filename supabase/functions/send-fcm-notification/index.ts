import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface FCMv1Message {
  message: {
    token?: string;
    topic?: string;
    condition?: string;
    notification?: {
      title: string;
      body: string;
      image?: string;
    };
    data?: Record<string, string>;
    android?: {
      priority: 'NORMAL' | 'HIGH';
      notification?: {
        icon?: string;
        color?: string;
        sound?: string;
        tag?: string;
        click_action?: string;
        body_loc_key?: string;
        body_loc_args?: string[];
        title_loc_key?: string;
        title_loc_args?: string[];
        channel_id?: string;
        ticker?: string;
        sticky?: boolean;
        event_time?: string;
        local_only?: boolean;
        notification_priority?: 'PRIORITY_UNSPECIFIED' | 'PRIORITY_MIN' | 'PRIORITY_LOW' | 'PRIORITY_DEFAULT' | 'PRIORITY_HIGH' | 'PRIORITY_MAX';
        default_sound?: boolean;
        default_vibrate_timings?: boolean;
        default_light_settings?: boolean;
        vibrate_timings?: string[];
        visibility?: 'VISIBILITY_UNSPECIFIED' | 'PRIVATE' | 'PUBLIC' | 'SECRET';
        notification_count?: number;
      };
    };
    webpush?: {
      headers?: Record<string, string>;
      data?: Record<string, string>;
      notification?: {
        title?: string;
        body?: string;
        icon?: string;
        badge?: string;
        image?: string;
        tag?: string;
        requireInteraction?: boolean;
        silent?: boolean;
        timestamp?: number;
        renotify?: boolean;
        actions?: Array<{
          action: string;
          title: string;
          icon?: string;
        }>;
      };
      fcm_options?: {
        link?: string;
        analytics_label?: string;
      };
    };
    apns?: {
      headers?: Record<string, string>;
      payload?: {
        aps?: {
          alert?: {
            title?: string;
            subtitle?: string;
            body?: string;
            'launch-image'?: string;
            'title-loc-key'?: string;
            'title-loc-args'?: string[];
            'action-loc-key'?: string;
            'loc-key'?: string;
            'loc-args'?: string[];
          };
          badge?: number;
          sound?: string | {
            critical?: number;
            name?: string;
            volume?: number;
          };
          'thread-id'?: string;
          category?: string;
          'content-available'?: number;
          'mutable-content'?: number;
          'target-content-id'?: string;
          'interruption-level'?: 'passive' | 'active' | 'time-sensitive' | 'critical';
          'relevance-score'?: number;
        };
      };
      fcm_options?: {
        analytics_label?: string;
        image?: string;
      };
    };
    fcm_options?: {
      analytics_label?: string;
    };
  };
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

// JWT helper functions for OAuth 2.0
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function createJWT(serviceAccount: any): string {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, // 1 hour
    iat: now
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  // Note: In a real implementation, you would need to sign this with the private key
  // For now, we'll use a placeholder - you'll need to implement RSA signing
  const signature = 'placeholder_signature';
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function getAccessToken(serviceAccount: any): Promise<string> {
  try {
    // Create JWT
    const jwt = createJWT(serviceAccount);
    
    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!response.ok) {
      throw new Error(`OAuth token request failed: ${response.status}`);
    }

    const tokenData = await response.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
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
    // Get Firebase Service Account Key from environment
    const FIREBASE_SERVICE_ACCOUNT_KEY = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY')
    if (!FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error('Firebase Service Account Key not configured')
    }

    // Parse service account key
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (error) {
      throw new Error('Invalid Firebase Service Account Key format');
    }

    if (!serviceAccount.project_id) {
      throw new Error('Invalid service account: missing project_id');
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

    // Get OAuth 2.0 access token
    const accessToken = await getAccessToken(serviceAccount);

    // Prepare notification data for FCM v1 API
    const notificationData: Record<string, string> = {};
    if (notificationRequest.data) {
      Object.keys(notificationRequest.data).forEach(key => {
        notificationData[key] = String(notificationRequest.data![key]);
      });
    }

    // Add standard data fields
    notificationData.incident_id = notificationRequest.incident_id || '';
    notificationData.priority = notificationRequest.priority || 'medium';
    notificationData.timestamp = new Date().toISOString();
    notificationData.click_action = notificationRequest.data?.actionUrl || '/';

    // Determine if this is a high priority notification
    const isHighPriority = notificationRequest.priority === 'urgent' || notificationRequest.priority === 'high';

    // Send notifications to each token (FCM v1 API requires individual requests)
    const results = [];
    const invalidTokens: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const token of fcmTokens) {
      try {
        // Prepare FCM v1 message
        const fcmMessage: FCMv1Message = {
          message: {
            token: token,
            notification: {
              title: notificationRequest.title,
              body: notificationRequest.body,
              image: '/shield.svg'
            },
            data: notificationData,
            webpush: {
              notification: {
                icon: '/shield.svg',
                badge: '/shield.svg',
                tag: 'safeguard-notification',
                requireInteraction: isHighPriority,
                silent: false,
                timestamp: Date.now(),
                actions: [
                  {
                    action: 'view',
                    title: 'View Details'
                  },
                  {
                    action: 'dismiss',
                    title: 'Dismiss'
                  }
                ]
              },
              fcm_options: {
                link: notificationRequest.data?.actionUrl || '/'
              }
            },
            android: {
              priority: isHighPriority ? 'HIGH' : 'NORMAL',
              notification: {
                icon: 'shield',
                color: '#DC2626',
                tag: 'safeguard-notification',
                click_action: notificationRequest.data?.actionUrl || '/',
                channel_id: 'safety_alerts',
                notification_priority: isHighPriority ? 'PRIORITY_HIGH' : 'PRIORITY_DEFAULT'
              }
            },
            apns: {
              payload: {
                aps: {
                  alert: {
                    title: notificationRequest.title,
                    body: notificationRequest.body
                  },
                  badge: 1,
                  sound: isHighPriority ? 'default' : 'default',
                  'interruption-level': isHighPriority ? 'time-sensitive' : 'active'
                }
              }
            }
          }
        };

        // Send to FCM v1 API
        const fcmResponse = await fetch(
          `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(fcmMessage)
          }
        );

        const fcmResult = await fcmResponse.json();

        if (fcmResponse.ok) {
          successCount++;
          results.push({ token, success: true, messageId: fcmResult.name });
        } else {
          failureCount++;
          
          // Check for invalid token errors
          if (fcmResult.error?.details?.some((detail: any) => 
            detail.errorCode === 'UNREGISTERED' || 
            detail.errorCode === 'INVALID_ARGUMENT'
          )) {
            invalidTokens.push(token);
          }
          
          results.push({ 
            token, 
            success: false, 
            error: fcmResult.error?.message || 'Unknown error' 
          });
        }
      } catch (error) {
        failureCount++;
        results.push({ 
          token, 
          success: false, 
          error: error.message || 'Network error' 
        });
      }
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

    // Update notification log
    const { error: logError } = await supabase
      .from('fcm_notification_log')
      .update({
        status: successCount > 0 ? 'sent' : 'failed',
        response_data: {
          success_count: successCount,
          failure_count: failureCount,
          total_tokens: fcmTokens.length,
          invalid_tokens_cleaned: invalidTokens.length,
          results: results.slice(0, 10) // Limit stored results for performance
        },
        updated_at: new Date().toISOString()
      })
      .eq('incident_id', notificationRequest.incident_id)
      .eq('title', notificationRequest.title)
      .order('created_at', { ascending: false })
      .limit(1);

    if (logError) {
      console.warn('Error updating notification log:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'FCM v1 notifications sent',
        sent_count: successCount,
        failed_count: failureCount,
        total_tokens: fcmTokens.length,
        invalid_tokens_cleaned: invalidTokens.length,
        api_version: 'v1',
        results_sample: results.slice(0, 5) // Return sample of results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('FCM v1 notification error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false,
        api_version: 'v1'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})