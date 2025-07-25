import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface PlacesPrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

interface PlacesResponse {
  predictions: PlacesPrediction[];
  status: string;
}

interface PlaceDetailsResponse {
  result: {
    place_id: string;
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    name: string;
    types: string[];
  };
  status: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY')

    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key not configured')
    }

    if (action === 'autocomplete') {
      const input = url.searchParams.get('input')
      const sessiontoken = url.searchParams.get('sessiontoken') || crypto.randomUUID()

      if (!input || input.length < 2) {
        return new Response(
          JSON.stringify({ predictions: [] }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }

      // Bias search towards Eldorado Park, Johannesburg
      const location = '-26.3054,27.9389' // Eldorado Park coordinates
      const radius = 10000 // 10km radius
      const components = 'country:za' // Restrict to South Africa

      const placesUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
      placesUrl.searchParams.set('input', input)
      placesUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY)
      placesUrl.searchParams.set('sessiontoken', sessiontoken)
      placesUrl.searchParams.set('location', location)
      placesUrl.searchParams.set('radius', radius.toString())
      placesUrl.searchParams.set('components', components)
      placesUrl.searchParams.set('types', 'establishment|geocode')

      const response = await fetch(placesUrl.toString())
      const data: PlacesResponse = await response.json()

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Places API error: ${data.status}`)
      }

      // Format predictions for our frontend
      const formattedPredictions = data.predictions.map(prediction => ({
        place_id: prediction.place_id,
        description: prediction.description,
        main_text: prediction.structured_formatting.main_text,
        secondary_text: prediction.structured_formatting.secondary_text,
        types: prediction.types
      }))

      return new Response(
        JSON.stringify({ 
          predictions: formattedPredictions,
          sessiontoken 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )

    } else if (action === 'details') {
      const placeId = url.searchParams.get('place_id')
      const sessiontoken = url.searchParams.get('sessiontoken')

      if (!placeId) {
        throw new Error('Place ID is required')
      }

      const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json')
      detailsUrl.searchParams.set('place_id', placeId)
      detailsUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY)
      detailsUrl.searchParams.set('fields', 'place_id,formatted_address,geometry,name,types')
      
      if (sessiontoken) {
        detailsUrl.searchParams.set('sessiontoken', sessiontoken)
      }

      const response = await fetch(detailsUrl.toString())
      const data: PlaceDetailsResponse = await response.json()

      if (data.status !== 'OK') {
        throw new Error(`Place Details API error: ${data.status}`)
      }

      const place = data.result
      return new Response(
        JSON.stringify({
          place_id: place.place_id,
          formatted_address: place.formatted_address,
          name: place.name,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          types: place.types
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )

    } else {
      throw new Error('Invalid action. Use "autocomplete" or "details"')
    }

  } catch (error) {
    console.error('Places API error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        predictions: [] 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})