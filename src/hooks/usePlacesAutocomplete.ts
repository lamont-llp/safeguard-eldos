import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface PlacePrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  types: string[];
}

interface PlaceDetails {
  place_id: string;
  formatted_address: string;
  name: string;
  latitude: number;
  longitude: number;
  types: string[];
}

// Add a type for valid actions
export type PlacesAction = 'autocomplete' | 'details';

export const usePlacesAutocomplete = () => {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string>('');
  const debounceRef = useRef<NodeJS.Timeout>();

  // Generate a new session token
  const generateSessionToken = () => {
    const token = crypto.randomUUID();
    setSessionToken(token);
    return token;
  };

  // Initialize session token
  useEffect(() => {
    generateSessionToken();
  }, []);

  // Get the Supabase function URL and auth token
  const getFunctionUrl = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL environment variable is not set');
    }
    return `${supabaseUrl}/functions/v1/places-autocomplete`;
  };

  const getAuthToken = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      throw new Error(`Authentication error: ${error.message}`);
    }
    if (!session?.access_token) {
      throw new Error('No valid session found. Please sign in.');
    }
    return session.access_token;
  };

  // Search for place predictions
  const searchPlaces = async (input: string, action: PlacesAction = 'autocomplete'): Promise<PlacePrediction[]> => {
    if (action !== 'autocomplete') {
      setError('Invalid action for searchPlaces.');
      setPredictions([]);
      return [];
    }
    if (input.length < 2) {
      setPredictions([]);
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
<<<<<<< HEAD
      const functionUrl = getFunctionUrl();
      const authToken = await getAuthToken();

      // Construct URL with query parameters
      const url = new URL(functionUrl);
      url.searchParams.set('action', 'autocomplete');
      url.searchParams.set('input', input);
      url.searchParams.set('sessiontoken', sessionToken);

      console.log('Making places autocomplete request to:', url.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        }
||||||| parent of 1128666 (Enhance usePlacesAutocomplete hook with action types for search and details)
      const { data, error } = await supabase.functions.invoke('places-autocomplete', {
        body: null,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }, {
        query: {
          action: 'autocomplete',
          input: input,
          sessiontoken: sessionToken
        }
=======
      const params = new URLSearchParams({
        action: action,
        input: input,
        sessiontoken: sessionToken
>>>>>>> 1128666 (Enhance usePlacesAutocomplete hook with action types for search and details)
      });
      const { data, error } = await supabase.functions.invoke(
        `places-autocomplete?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const results = data.predictions || [];
      setPredictions(results);
      return results;
    } catch (err: any) {
      console.error('Places autocomplete error:', err);
      setError(err.message || 'Failed to search places');
      setPredictions([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Get place details by place_id
  const getPlaceDetails = async (placeId: string, action: PlacesAction = 'details'): Promise<PlaceDetails | null> => {
    if (action !== 'details') {
      setError('Invalid action for getPlaceDetails.');
      return null;
    }
    setIsLoading(true);
    setError(null);

    try {
<<<<<<< HEAD
      const functionUrl = getFunctionUrl();
      const authToken = await getAuthToken();

      // Construct URL with query parameters
      const url = new URL(functionUrl);
      url.searchParams.set('action', 'details');
      url.searchParams.set('place_id', placeId);
      url.searchParams.set('sessiontoken', sessionToken);

      console.log('Making place details request to:', url.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        }
||||||| parent of 1128666 (Enhance usePlacesAutocomplete hook with action types for search and details)
      const { data, error } = await supabase.functions.invoke('places-autocomplete', {
        body: null,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }, {
        query: {
          action: 'details',
          place_id: placeId,
          sessiontoken: sessionToken
        }
=======
      const params = new URLSearchParams({
        action: action,
        place_id: placeId,
        sessiontoken: sessionToken
>>>>>>> 1128666 (Enhance usePlacesAutocomplete hook with action types for search and details)
      });
      const { data, error } = await supabase.functions.invoke(
        `places-autocomplete?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Generate new session token after using place details
      generateSessionToken();

      return data;
    } catch (err: any) {
      console.error('Place details error:', err);
      setError(err.message || 'Failed to get place details');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = (input: string, delay = 300) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchPlaces(input, 'autocomplete');
    }, delay);
  };

  // Clear predictions
  const clearPredictions = () => {
    setPredictions([]);
    setError(null);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    predictions,
    isLoading,
    error,
    searchPlaces,
    debouncedSearch,
    getPlaceDetails,
    clearPredictions,
    sessionToken
  };
};