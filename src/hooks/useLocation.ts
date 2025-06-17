import { useState, useEffect } from 'react';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

export const useLocation = (options?: PositionOptions) => {
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: true
  });

  const [watchId, setWatchId] = useState<number | null>(null);

  const defaultOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000, // 5 minutes
    ...options
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser',
        loading: false
      }));
      return;
    }

    setLocation(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false
        });
      },
      (error) => {
        let errorMessage = 'Unknown location error';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }

        setLocation(prev => ({
          ...prev,
          error: errorMessage,
          loading: false
        }));
      },
      defaultOptions
    );
  };

  const watchLocation = () => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser',
        loading: false
      }));
      return;
    }

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false
        });
      },
      (error) => {
        let errorMessage = 'Unknown location error';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }

        setLocation(prev => ({
          ...prev,
          error: errorMessage,
          loading: false
        }));
      },
      defaultOptions
    );

    setWatchId(id);
  };

  const stopWatching = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };

  const calculateDistance = (lat2: number, lon2: number): number | null => {
    if (location.latitude === null || location.longitude === null) {
      return null;
    }

    const R = 6371e3; // Earth's radius in meters
    const φ1 = location.latitude * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2 - location.latitude) * Math.PI/180;
    const Δλ = (lon2 - location.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const getLocationString = async (): Promise<string> => {
    if (location.latitude === null || location.longitude === null) {
      return 'Location unavailable';
    }

    try {
      // Use reverse geocoding if available
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.longitude},${location.latitude}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          return data.features[0].place_name;
        }
      }
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
    }

    // Fallback to coordinates
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  };

  useEffect(() => {
    getCurrentLocation();

    return () => {
      stopWatching();
    };
  }, []);

  return {
    ...location,
    getCurrentLocation,
    watchLocation,
    stopWatching,
    calculateDistance,
    getLocationString,
    hasLocation: location.latitude !== null && location.longitude !== null
  };
};