import React, { useState, useEffect } from 'react';
import { ArrowLeft, Navigation, MapPin, Clock, Shield, AlertTriangle, CheckCircle, Star, Plus, X, Send, Loader2, Filter, Route as RouteIcon, Users, Eye, ThumbsUp, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSafeRoutes } from '../hooks/useSafeRoutes';
import { useLocation } from '../hooks/useLocation';
import { useAuthContext } from '../contexts/AuthContext';
import { useAuthModal } from '../components/AuthModal';
import LocationAutocomplete from '../components/LocationAutocomplete';

const SafeRoutes = () => {
  const { isAuthenticated } = useAuthContext();
  const { openSignIn, AuthModal } = useAuthModal();
  const { latitude, longitude, hasLocation } = useLocation();
  const {
    routes,
    loading,
    error,
    findOptimalRoute,
    createNewRoute,
    rateRoute,
    getRouteStats,
    formatRouteDistance,
    formatRouteSafety,
    getRouteRecommendation,
    loadRoutesNearLocation
  } = useSafeRoutes();

  // Form states
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState<string | null>(null);
  const [filterBy, setFilterBy] = useState<'all' | 'safe' | 'patrol' | 'cctv'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [optimalRoutes, setOptimalRoutes] = useState<any[]>([]);

  // Create route form
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    start_address: '',
    end_address: '',
    lighting_quality: 'unknown' as const,
    patrol_coverage: false,
    cctv_coverage: false
  });
  const [createCoords, setCreateCoords] = useState({
    start: null as { lat: number; lng: number } | null,
    end: null as { lat: number; lng: number } | null
  });
  const [isCreating, setIsCreating] = useState(false);

  // Rating form
  const [ratingForm, setRatingForm] = useState({
    safety_rating: 5,
    lighting_rating: 5,
    cleanliness_rating: 5,
    comments: '',
    time_of_day: 'morning' as const
  });
  const [isRating, setIsRating] = useState(false);

  const popularDestinations = [
    'Eldorado Shopping Centre',
    'Eldorado Primary School',
    'Community Hall Extension 8',
    'Eldorado Clinic',
    'Library Eldorado Park',
    'Sports Complex',
    'Extension 9',
    'Klipriver Road'
  ];

  // Load routes near user location
  useEffect(() => {
    if (hasLocation && latitude && longitude) {
      loadRoutesNearLocation(latitude, longitude, 10000);
    }
  }, [hasLocation, latitude, longitude, loadRoutesNearLocation]);

  // Handle route search
  const handleRouteSearch = async () => {
    if (!originCoords || !destCoords) {
      alert('Please select both origin and destination locations');
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await findOptimalRoute(
        originCoords.lat,
        originCoords.lng,
        destCoords.lat,
        destCoords.lng
      );

      if (error) throw error;
      setOptimalRoutes(data || []);
    } catch (err: any) {
      console.error('Route search failed:', err);
      alert('Failed to find routes. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle create route
  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      openSignIn();
      return;
    }

    if (!createCoords.start || !createCoords.end) {
      alert('Please select both start and end locations');
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await createNewRoute({
        name: createForm.name,
        description: createForm.description,
        start_address: createForm.start_address,
        end_address: createForm.end_address,
        start_lat: createCoords.start.lat,
        start_lng: createCoords.start.lng,
        end_lat: createCoords.end.lat,
        end_lng: createCoords.end.lng,
        lighting_quality: createForm.lighting_quality,
        patrol_coverage: createForm.patrol_coverage,
        cctv_coverage: createForm.cctv_coverage
      });

      if (error) throw error;

      // Reset form
      setCreateForm({
        name: '',
        description: '',
        start_address: '',
        end_address: '',
        lighting_quality: 'unknown',
        patrol_coverage: false,
        cctv_coverage: false
      });
      setCreateCoords({ start: null, end: null });
      setShowCreateForm(false);
      
      alert('Safe route created successfully!');
    } catch (err: any) {
      console.error('Create route failed:', err);
      alert('Failed to create route. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle rate route
  const handleRateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !showRatingForm) {
      openSignIn();
      return;
    }

    setIsRating(true);
    try {
      const { data, error } = await rateRoute(showRatingForm, ratingForm);

      if (error) throw error;

      // Reset form
      setRatingForm({
        safety_rating: 5,
        lighting_rating: 5,
        cleanliness_rating: 5,
        comments: '',
        time_of_day: 'morning'
      });
      setShowRatingForm(null);
      
      alert('Route rating submitted successfully!');
    } catch (err: any) {
      console.error('Rate route failed:', err);
      alert('Failed to submit rating. Please try again.');
    } finally {
      setIsRating(false);
    }
  };

  // Filter routes
  const filteredRoutes = routes.filter(route => {
    switch (filterBy) {
      case 'safe':
        return route.safety_score >= 75;
      case 'patrol':
        return route.patrol_coverage;
      case 'cctv':
        return route.cctv_coverage;
      default:
        return true;
    }
  });

  const getRouteStatusColor = (safetyScore: number) => {
    if (safetyScore >= 75) return 'bg-green-100 text-green-800 border-green-200';
    if (safetyScore >= 50) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getRouteIcon = (safetyScore: number) => {
    if (safetyScore >= 75) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (safetyScore >= 50) return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    return <AlertTriangle className="w-5 h-5 text-red-600" />;
  };

  const routeStats = getRouteStats();

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="flex items-center space-x-4">
          <Link to="/" className="p-2 hover:bg-blue-500 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Safe Routes</h1>
            <p className="text-blue-100 text-sm">Community-verified safe paths</p>
          </div>
        </div>
      </div>

      <div className="px-6 mt-6 space-y-6">
        {/* Route Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Routes</p>
                <p className="text-2xl font-bold text-gray-900">{routeStats.total}</p>
              </div>
              <RouteIcon className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Avg Safety</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(routeStats.avgSafetyScore)}</p>
              </div>
              <Shield className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Route Planning */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Plan Your Route</h2>
          
          <div className="space-y-4">
            <LocationAutocomplete
              value={origin}
              onChange={(value, coords) => {
                setOrigin(value);
                if (coords) setOriginCoords(coords);
              }}
              placeholder="From (current location)"
              icon={<MapPin className="w-5 h-5 text-green-500" />}
              showCurrentLocation={true}
              onUseCurrentLocation={() => {
                if (hasLocation && latitude && longitude) {
                  setOriginCoords({ lat: latitude, lng: longitude });
                  setOrigin('Current Location');
                }
              }}
            />
            
            <LocationAutocomplete
              value={destination}
              onChange={(value, coords) => {
                setDestination(value);
                if (coords) setDestCoords(coords);
              }}
              placeholder="To (destination)"
              icon={<MapPin className="w-5 h-5 text-red-500" />}
            />
            
            <button 
              onClick={handleRouteSearch}
              disabled={!originCoords || !destCoords || isSearching}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Finding Routes...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5" />
                  <span>Find Safe Routes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Optimal Routes Results */}
        {optimalRoutes.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Routes</h3>
            <div className="space-y-3">
              {optimalRoutes.map((route, index) => (
                <div key={route.route_id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{route.route_name}</h4>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium">{route.safety_score}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{formatRouteDistance(route.total_distance)}</span>
                    <span>{route.estimated_duration} min</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Popular Destinations */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Popular Destinations</h3>
          <div className="grid grid-cols-2 gap-2">
            {popularDestinations.map((dest, index) => (
              <button
                key={index}
                onClick={() => setDestination(dest)}
                className="p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">{dest}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter and Create Route */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Routes ({routes.length})</option>
              <option value="safe">Safe Routes ({routes.filter(r => r.safety_score >= 75).length})</option>
              <option value="patrol">With Patrol ({routes.filter(r => r.patrol_coverage).length})</option>
              <option value="cctv">With CCTV ({routes.filter(r => r.cctv_coverage).length})</option>
            </select>
          </div>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Route</span>
          </button>
        </div>

        {/* Route List */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Routes</h3>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading routes...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-red-300 mx-auto mb-4" />
              <p className="text-red-600">Failed to load routes</p>
              <p className="text-gray-500 text-sm">{error}</p>
            </div>
          ) : filteredRoutes.length === 0 ? (
            <div className="text-center py-8">
              <RouteIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No routes found</p>
              <p className="text-gray-400 text-sm">Be the first to create a safe route!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRoutes.map((route, index) => {
                const recommendation = getRouteRecommendation(route);
                
                return (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRoute(index)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedRoute === index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getRouteIcon(route.safety_score)}
                        <div>
                          <h4 className="font-semibold text-gray-900">{route.name}</h4>
                          <div className="flex items-center space-x-3 text-sm text-gray-500">
                            <span className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{route.estimated_duration_minutes || 'N/A'} min</span>
                            </span>
                            <span>{formatRouteDistance(route)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="font-semibold text-gray-900">{route.safety_score}</span>
                        </div>
                        <span className="text-sm text-gray-500">Safety Score</span>
                      </div>
                    </div>
                    
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRouteStatusColor(route.safety_score)}`}>
                      {recommendation.recommendation}
                    </div>
                    
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-2">Route Features:</p>
                      <div className="flex flex-wrap gap-2">
                        {recommendation.features.map((feature, featureIndex) => (
                          <span
                            key={featureIndex}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Route Actions */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>From: {route.start_address}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRatingForm(route.id);
                          }}
                          className="flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Star className="w-4 h-4" />
                          <span>Rate</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Safety Tips */}
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900">Safety Tips</h3>
              <ul className="text-amber-800 text-sm mt-2 space-y-1">
                <li>• Travel in groups when possible</li>
                <li>• Avoid routes after 8 PM</li>
                <li>• Stay alert and aware of surroundings</li>
                <li>• Report any suspicious activity</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Create Route Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Create Safe Route</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateRoute} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Route Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g., School to Home Route"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Describe the route and any important notes"
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Location *</label>
                <LocationAutocomplete
                  value={createForm.start_address}
                  onChange={(value, coords) => {
                    setCreateForm({ ...createForm, start_address: value });
                    if (coords) setCreateCoords({ ...createCoords, start: coords });
                  }}
                  placeholder="Enter starting point"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Location *</label>
                <LocationAutocomplete
                  value={createForm.end_address}
                  onChange={(value, coords) => {
                    setCreateForm({ ...createForm, end_address: value });
                    if (coords) setCreateCoords({ ...createCoords, end: coords });
                  }}
                  placeholder="Enter destination"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lighting Quality</label>
                <select
                  value={createForm.lighting_quality}
                  onChange={(e) => setCreateForm({ ...createForm, lighting_quality: e.target.value as any })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="unknown">Unknown</option>
                  <option value="poor">Poor</option>
                  <option value="moderate">Moderate</option>
                  <option value="good">Good</option>
                  <option value="excellent">Excellent</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Patrol Coverage</label>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, patrol_coverage: !createForm.patrol_coverage })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      createForm.patrol_coverage ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        createForm.patrol_coverage ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">CCTV Coverage</label>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, cctv_coverage: !createForm.cctv_coverage })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      createForm.cctv_coverage ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        createForm.cctv_coverage ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!isAuthenticated || !createForm.name || !createForm.start_address || !createForm.end_address || !createCoords.start || !createCoords.end || isCreating}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Creating Route...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Create Route</span>
                  </>
                )}
              </button>

              {!isAuthenticated && (
                <p className="text-center text-sm text-gray-500">
                  <button
                    type="button"
                    onClick={openSignIn}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Sign in
                  </button>
                  {' '}to create routes
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Rate Route Modal */}
      {showRatingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Rate Route</h2>
              <button
                onClick={() => setShowRatingForm(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleRateRoute} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Safety Rating *</label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setRatingForm({ ...ratingForm, safety_rating: rating })}
                      className={`p-2 rounded-lg transition-colors ${
                        rating <= ratingForm.safety_rating
                          ? 'text-yellow-500'
                          : 'text-gray-300 hover:text-yellow-400'
                      }`}
                    >
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  ))}
                  <span className="text-sm text-gray-600 ml-2">{ratingForm.safety_rating}/5</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lighting Rating</label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setRatingForm({ ...ratingForm, lighting_rating: rating })}
                      className={`p-2 rounded-lg transition-colors ${
                        rating <= ratingForm.lighting_rating
                          ? 'text-yellow-500'
                          : 'text-gray-300 hover:text-yellow-400'
                      }`}
                    >
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  ))}
                  <span className="text-sm text-gray-600 ml-2">{ratingForm.lighting_rating}/5</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cleanliness Rating</label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setRatingForm({ ...ratingForm, cleanliness_rating: rating })}
                      className={`p-2 rounded-lg transition-colors ${
                        rating <= ratingForm.cleanliness_rating
                          ? 'text-yellow-500'
                          : 'text-gray-300 hover:text-yellow-400'
                      }`}
                    >
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  ))}
                  <span className="text-sm text-gray-600 ml-2">{ratingForm.cleanliness_rating}/5</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time of Day</label>
                <select
                  value={ratingForm.time_of_day}
                  onChange={(e) => setRatingForm({ ...ratingForm, time_of_day: e.target.value as any })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
                <textarea
                  value={ratingForm.comments}
                  onChange={(e) => setRatingForm({ ...ratingForm, comments: e.target.value })}
                  placeholder="Share your experience with this route"
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={!isAuthenticated || isRating}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {isRating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting Rating...</span>
                  </>
                ) : (
                  <>
                    <ThumbsUp className="w-5 h-5" />
                    <span>Submit Rating</span>
                  </>
                )}
              </button>

              {!isAuthenticated && (
                <p className="text-center text-sm text-gray-500">
                  <button
                    type="button"
                    onClick={openSignIn}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Sign in
                  </button>
                  {' '}to rate routes
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal />
    </div>
  );
};

export default SafeRoutes;