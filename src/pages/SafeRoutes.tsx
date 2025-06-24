import React, { useState, useEffect } from 'react';
import { ArrowLeft, Navigation, MapPin, Clock, Shield, AlertTriangle, CheckCircle, Star, Plus, X, Send, Loader2, Filter, Route as RouteIcon, Users, Eye, ThumbsUp, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSafeRoutes } from '../hooks/useSafeRoutes';
import { useLocation } from '../hooks/useLocation';
import { useAuthContext } from '../contexts/AuthContext';
import { useAuthModal } from '../components/AuthModal';

const SafeRoutes = () => {
  const { isAuthenticated } = useAuthContext();
  const { openSignIn, AuthModal } = useAuthModal();
  const { latitude, longitude, getLocationString } = useLocation();
  const {
    routes,
    loading,
    error,
    loadRoutesNearLocation,
    findOptimalRoute,
    createNewRoute,
    rateRoute,
    getRouteStats,
    formatRouteDistance,
    formatRouteSafety,
    getRouteRecommendation
  } = useSafeRoutes();

  const [activeTab, setActiveTab] = useState('find');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [optimalRoutes, setOptimalRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [routeToRate, setRouteToRate] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [filterSafety, setFilterSafety] = useState('all');

  // Create route form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    start_address: '',
    end_address: '',
    start_lat: null,
    start_lng: null,
    end_lat: null,
    end_lng: null,
    lighting_quality: 'unknown',
    patrol_coverage: false,
    cctv_coverage: false
  });
  const [isCreating, setIsCreating] = useState(false);

  // Rating form state
  const [ratingForm, setRatingForm] = useState({
    safety_rating: 5,
    lighting_rating: 5,
    cleanliness_rating: 5,
    comments: '',
    time_of_day: 'morning'
  });
  const [isRating, setIsRating] = useState(false);

  const popularDestinations = [
    'Eldorado Shopping Centre',
    'Eldorado Primary School',
    'Community Hall',
    'Clinic',
    'Library',
    'Sports Complex',
    'Extension 8',
    'Extension 9',
    'Klipriver Road',
    'Main Road'
  ];

  useEffect(() => {
    // Load routes near user's location when available
    if (latitude && longitude) {
      loadRoutesNearLocation(latitude, longitude, 10000);
      
      // Set current location as origin
      getLocationString().then(address => {
        setOrigin(address);
      });
    }
  }, [latitude, longitude]);

  const handleFindRoutes = async () => {
    if (!origin || !destination) {
      setSearchError('Please enter both origin and destination');
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setOptimalRoutes([]);

    try {
      // For demo purposes, we'll use the current location as start coordinates
      // In a real app, you'd geocode the addresses
      if (latitude && longitude) {
        const { data, error } = await findOptimalRoute(
          latitude,
          longitude,
          latitude + 0.01, // Mock destination coordinates
          longitude + 0.01,
          2000
        );

        if (error) throw error;

        setOptimalRoutes(data || []);
      } else {
        throw new Error('Location not available');
      }
    } catch (err) {
      setSearchError(err.message || 'Failed to find routes');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateRoute = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      openSignIn();
      return;
    }

    if (!createForm.name || !createForm.start_address || !createForm.end_address) {
      return;
    }

    setIsCreating(true);

    try {
      // For demo purposes, use current location as start coordinates
      const routeData = {
        ...createForm,
        start_lat: latitude || 0,
        start_lng: longitude || 0,
        end_lat: (latitude || 0) + 0.01, // Mock end coordinates
        end_lng: (longitude || 0) + 0.01
      };

      const { data, error } = await createNewRoute(routeData);

      if (error) throw error;

      // Reset form and close modal
      setCreateForm({
        name: '',
        description: '',
        start_address: '',
        end_address: '',
        start_lat: null,
        start_lng: null,
        end_lat: null,
        end_lng: null,
        lighting_quality: 'unknown',
        patrol_coverage: false,
        cctv_coverage: false
      });
      setShowCreateForm(false);
      
      // Refresh routes
      if (latitude && longitude) {
        loadRoutesNearLocation(latitude, longitude, 10000);
      }
    } catch (err) {
      console.error('Failed to create route:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRateRoute = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated || !routeToRate) {
      return;
    }

    setIsRating(true);

    try {
      const { error } = await rateRoute(routeToRate.id, ratingForm);

      if (error) throw error;

      // Reset form and close modal
      setRatingForm({
        safety_rating: 5,
        lighting_rating: 5,
        cleanliness_rating: 5,
        comments: '',
        time_of_day: 'morning'
      });
      setShowRatingModal(false);
      setRouteToRate(null);
    } catch (err) {
      console.error('Failed to rate route:', err);
    } finally {
      setIsRating(false);
    }
  };

  const getRouteStatusColor = (safetyScore) => {
    if (safetyScore >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (safetyScore >= 60) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getRouteIcon = (safetyScore) => {
    if (safetyScore >= 80) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (safetyScore >= 60) return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    return <AlertTriangle className="w-5 h-5 text-red-600" />;
  };

  const filteredRoutes = routes.filter(route => {
    if (filterSafety === 'all') return true;
    if (filterSafety === 'safe') return route.safety_score >= 75;
    if (filterSafety === 'moderate') return route.safety_score >= 50 && route.safety_score < 75;
    if (filterSafety === 'caution') return route.safety_score < 50;
    return true;
  });

  const routeStats = getRouteStats();

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="flex items-center space-x-4">
          <Link to="/" className="p-2 hover:bg-blue-500 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Safe Routes</h1>
            <p className="text-blue-100 text-sm">Community-verified safe paths</p>
          </div>
          {isAuthenticated && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-500 hover:bg-blue-400 text-white p-2 rounded-lg transition-colors"
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 mt-6">
        <div className="bg-gray-100 p-1 rounded-lg grid grid-cols-3 gap-1">
          {[
            { id: 'find', label: 'Find Routes', icon: Navigation },
            { id: 'browse', label: 'Browse', icon: RouteIcon },
            { id: 'stats', label: 'Stats', icon: Shield },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 mt-6">
        {/* Find Routes Tab */}
        {activeTab === 'find' && (
          <div className="space-y-6">
            {/* Route Planning */}
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Plan Your Route</h2>
              
              <div className="space-y-4">
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-green-500" />
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="From (current location)"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-red-500" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="To (destination)"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {searchError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-800 text-sm">{searchError}</p>
                  </div>
                )}
                
                <button
                  onClick={handleFindRoutes}
                  disabled={isSearching || !origin || !destination}
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

            {/* Optimal Routes Results */}
            {optimalRoutes.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Routes</h3>
                <div className="space-y-3">
                  {optimalRoutes.map((route, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {getRouteIcon(route.safety_score)}
                          <div>
                            <h4 className="font-semibold text-gray-900">{route.route_name}</h4>
                            <div className="flex items-center space-x-3 text-sm text-gray-500">
                              <span className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{route.estimated_duration} min</span>
                              </span>
                              <span>{formatRouteDistance({ distance_meters: route.total_distance })}</span>
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
                        {formatRouteSafety({ safety_score: route.safety_score }).label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Browse Routes Tab */}
        {activeTab === 'browse' && (
          <div className="space-y-6">
            {/* Filter */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Community Routes</h2>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filterSafety}
                  onChange={(e) => setFilterSafety(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Routes</option>
                  <option value="safe">Safe (75+)</option>
                  <option value="moderate">Moderate (50-74)</option>
                  <option value="caution">Use Caution (&lt;50)</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-gray-500">Loading routes...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRoutes.map((route) => {
                  const recommendation = getRouteRecommendation(route);
                  return (
                    <div key={route.id} className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {getRouteIcon(route.safety_score)}
                          <div>
                            <h3 className="font-semibold text-gray-900">{route.name}</h3>
                            <p className="text-gray-600 text-sm">{route.description}</p>
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

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-gray-500 text-sm">From</p>
                          <p className="font-medium text-gray-900 text-sm">{route.start_address}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">To</p>
                          <p className="font-medium text-gray-900 text-sm">{route.end_address}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{route.estimated_duration_minutes || 'N/A'} min</span>
                          </span>
                          <span>{formatRouteDistance(route)}</span>
                        </div>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRouteStatusColor(route.safety_score)}`}>
                          {recommendation.recommendation}
                        </div>
                      </div>

                      {/* Route Features */}
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Features:</p>
                        <div className="flex flex-wrap gap-2">
                          <span className={`px-2 py-1 text-xs rounded-md ${route.lighting_quality === 'good' || route.lighting_quality === 'excellent' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                            {route.lighting_quality} lighting
                          </span>
                          {route.patrol_coverage && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                              Patrol coverage
                            </span>
                          )}
                          {route.cctv_coverage && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-md">
                              CCTV monitoring
                            </span>
                          )}
                          {route.recent_incidents_count === 0 && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">
                              No recent incidents
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setSelectedRoute(route)}
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-sm font-medium">View Details</span>
                        </button>
                        
                        {isAuthenticated ? (
                          <button
                            onClick={() => {
                              setRouteToRate(route);
                              setShowRatingModal(true);
                            }}
                            className="flex items-center space-x-1 text-green-600 hover:text-green-800 transition-colors"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span className="text-sm font-medium">Rate Route</span>
                          </button>
                        ) : (
                          <button
                            onClick={openSignIn}
                            className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span className="text-sm font-medium">Sign in to Rate</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredRoutes.length === 0 && (
                  <div className="text-center py-8">
                    <RouteIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No routes found matching your criteria</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Route Statistics</h2>
            
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
                    <p className="text-gray-500 text-sm">High Safety</p>
                    <p className="text-2xl font-bold text-gray-900">{routeStats.highSafety}</p>
                  </div>
                  <Shield className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">With Patrol</p>
                    <p className="text-2xl font-bold text-gray-900">{routeStats.withPatrol}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-500" />
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Avg Safety</p>
                    <p className="text-2xl font-bold text-gray-900">{Math.round(routeStats.avgSafetyScore)}</p>
                  </div>
                  <Star className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h3 className="font-semibold text-gray-900 mb-4">Coverage Statistics</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Patrol Coverage</span>
                  <span className="font-medium text-gray-900">{Math.round(routeStats.patrolCoverage)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">CCTV Coverage</span>
                  <span className="font-medium text-gray-900">{Math.round(routeStats.cctvCoverage)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">High Safety Rate</span>
                  <span className="font-medium text-gray-900">{Math.round(routeStats.safetyRate)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Safety Tips */}
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mt-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900">Safety Tips</h3>
              <ul className="text-amber-800 text-sm mt-2 space-y-1">
                <li>• Travel in groups when possible</li>
                <li>• Avoid routes after 8 PM unless well-lit</li>
                <li>• Stay alert and aware of surroundings</li>
                <li>• Report any suspicious activity</li>
                <li>• Share your route with trusted contacts</li>
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
                  placeholder="e.g., Safe Path to School"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Describe the route and any important details"
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Address *</label>
                <input
                  type="text"
                  value={createForm.start_address}
                  onChange={(e) => setCreateForm({ ...createForm, start_address: e.target.value })}
                  placeholder="Starting point address"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Address *</label>
                <input
                  type="text"
                  value={createForm.end_address}
                  onChange={(e) => setCreateForm({ ...createForm, end_address: e.target.value })}
                  placeholder="Destination address"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lighting Quality</label>
                <select
                  value={createForm.lighting_quality}
                  onChange={(e) => setCreateForm({ ...createForm, lighting_quality: e.target.value })}
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
                disabled={isCreating || !createForm.name || !createForm.start_address || !createForm.end_address}
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
            </form>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && routeToRate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Rate Route</h2>
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setRouteToRate(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <h3 className="font-medium text-gray-900">{routeToRate.name}</h3>
                <p className="text-sm text-gray-600">{routeToRate.start_address} → {routeToRate.end_address}</p>
              </div>

              <form onSubmit={handleRateRoute} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Safety Rating *</label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setRatingForm({ ...ratingForm, safety_rating: rating })}
                        className={`p-1 ${rating <= ratingForm.safety_rating ? 'text-yellow-500' : 'text-gray-300'}`}
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
                        className={`p-1 ${rating <= ratingForm.lighting_rating ? 'text-yellow-500' : 'text-gray-300'}`}
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
                        className={`p-1 ${rating <= ratingForm.cleanliness_rating ? 'text-yellow-500' : 'text-gray-300'}`}
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
                    onChange={(e) => setRatingForm({ ...ratingForm, time_of_day: e.target.value })}
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
                  disabled={isRating}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
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
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal />
    </div>
  );
};

export default SafeRoutes;