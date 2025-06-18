import { useState, useEffect } from 'react';
import { 
  SafeRoute, 
  OptimalRoute,
  getSafeRoutes,
  getSafeRoutesNearLocation,
  findOptimalSafeRoute,
  calculateRouteSafetyScore,
  createSafeRoute,
  rateSafeRoute,
  formatDistance,
  formatSafetyScore
} from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';

export const useSafeRoutes = () => {
  const [routes, setRoutes] = useState<SafeRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuthContext();

  useEffect(() => {
    loadSafeRoutes();
  }, []);

  const loadSafeRoutes = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await getSafeRoutes();
      
      if (error) throw error;
      
      setRoutes(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRoutesNearLocation = async (
    latitude: number,
    longitude: number,
    radiusMeters = 10000
  ) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await getSafeRoutesNearLocation(
        latitude,
        longitude,
        radiusMeters
      );
      
      if (error) throw error;
      
      setRoutes(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const findOptimalRoute = async (
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    maxDetourMeters = 2000
  ): Promise<{ data: OptimalRoute[] | null; error: any }> => {
    try {
      const { data, error } = await findOptimalSafeRoute(
        startLat,
        startLng,
        endLat,
        endLng,
        maxDetourMeters
      );
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  };

  const calculateSafetyScore = async (
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    bufferMeters = 500
  ) => {
    try {
      const { data, error } = await calculateRouteSafetyScore(
        startLat,
        startLng,
        endLat,
        endLng,
        bufferMeters
      );
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  };

  const createNewRoute = async (routeData: {
    name: string;
    description?: string;
    start_address: string;
    end_address: string;
    start_lat: number;
    start_lng: number;
    end_lat: number;
    end_lng: number;
    lighting_quality?: SafeRoute['lighting_quality'];
    patrol_coverage?: boolean;
    cctv_coverage?: boolean;
  }) => {
    try {
      if (!profile) {
        throw new Error('Must be logged in to create routes');
      }

      // Calculate safety score for the new route
      const { data: safetyScore } = await calculateSafetyScore(
        routeData.start_lat,
        routeData.start_lng,
        routeData.end_lat,
        routeData.end_lng
      );

      const { data, error } = await createSafeRoute({
        creator_id: profile.id,
        name: routeData.name,
        description: routeData.description,
        start_address: routeData.start_address,
        end_address: routeData.end_address,
        start_point: `POINT(${routeData.start_lng} ${routeData.start_lat})`,
        end_point: `POINT(${routeData.end_lng} ${routeData.end_lat})`,
        safety_score: safetyScore || 50,
        lighting_quality: routeData.lighting_quality || 'unknown',
        patrol_coverage: routeData.patrol_coverage || false,
        cctv_coverage: routeData.cctv_coverage || false
      });

      if (error) throw error;

      // Add to local state
      if (data) {
        setRoutes(prev => [data, ...prev]);
      }

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  };

  const rateRoute = async (
    routeId: string,
    ratings: {
      safety_rating: number;
      lighting_rating?: number;
      cleanliness_rating?: number;
      comments?: string;
      time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
    }
  ) => {
    try {
      if (!profile) {
        throw new Error('Must be logged in to rate routes');
      }

      const { data, error } = await rateSafeRoute(routeId, ratings);
      
      if (error) throw error;

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  };

  const getRoutesByQuality = (quality: SafeRoute['lighting_quality']) => {
    return routes.filter(route => route.lighting_quality === quality);
  };

  const getRoutesBySafetyScore = (minScore: number) => {
    return routes.filter(route => route.safety_score >= minScore);
  };

  const getRoutesWithFeatures = (features: {
    patrol?: boolean;
    cctv?: boolean;
    highSafety?: boolean;
  }) => {
    return routes.filter(route => {
      if (features.patrol && !route.patrol_coverage) return false;
      if (features.cctv && !route.cctv_coverage) return false;
      if (features.highSafety && route.safety_score < 75) return false;
      return true;
    });
  };

  const getRouteStats = () => {
    const total = routes.length;
    const withPatrol = routes.filter(r => r.patrol_coverage).length;
    const withCCTV = routes.filter(r => r.cctv_coverage).length;
    const highSafety = routes.filter(r => r.safety_score >= 75).length;
    
    const avgSafetyScore = total > 0 
      ? routes.reduce((sum, route) => sum + route.safety_score, 0) / total 
      : 0;
    
    const byLighting = routes.reduce((acc, route) => {
      acc[route.lighting_quality] = (acc[route.lighting_quality] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      withPatrol,
      withCCTV,
      highSafety,
      avgSafetyScore,
      byLighting,
      patrolCoverage: total > 0 ? (withPatrol / total) * 100 : 0,
      cctvCoverage: total > 0 ? (withCCTV / total) * 100 : 0,
      safetyRate: total > 0 ? (highSafety / total) * 100 : 0
    };
  };

  const formatRouteDistance = (route: SafeRoute) => {
    if (route.distance_meters) {
      return formatDistance(route.distance_meters);
    }
    return 'Unknown';
  };

  const formatRouteSafety = (route: SafeRoute) => {
    return formatSafetyScore(route.safety_score);
  };

  const getRouteRecommendation = (route: SafeRoute) => {
    const safety = formatSafetyScore(route.safety_score);
    const features = [];
    
    if (route.patrol_coverage) features.push('Patrol coverage');
    if (route.cctv_coverage) features.push('CCTV monitoring');
    if (route.lighting_quality === 'good' || route.lighting_quality === 'excellent') {
      features.push('Well lit');
    }
    
    return {
      safety,
      features,
      recommendation: route.safety_score >= 75 ? 'Recommended' : 
                    route.safety_score >= 50 ? 'Use with caution' : 'Not recommended'
    };
  };

  return {
    routes,
    loading,
    error,
    loadSafeRoutes,
    loadRoutesNearLocation,
    findOptimalRoute,
    calculateSafetyScore,
    createNewRoute,
    rateRoute,
    getRoutesByQuality,
    getRoutesBySafetyScore,
    getRoutesWithFeatures,
    getRouteStats,
    formatRouteDistance,
    formatRouteSafety,
    getRouteRecommendation,
    refresh: loadSafeRoutes
  };
};