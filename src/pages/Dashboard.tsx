import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Clock, MapPin, Users, TrendingUp, Bell, Map, Navigation2, Crosshair } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAuthModal } from '../components/AuthModal';
import { useIncidents } from '../hooks/useIncidents';
import { useLocation } from '../hooks/useLocation';
import { useLocalStorage } from '../hooks/useLocalStorage';
import EmergencyButton from '../components/EmergencyButton';
import IncidentCard from '../components/IncidentCard';
import SafetyStatus from '../components/SafetyStatus';
import MapComponent from '../components/MapComponent';
import { useNotifications } from '../hooks/useNotifications';
import NotificationCenter from '../components/NotificationCenter';

const Dashboard = () => {
  const { isAuthenticated, profile } = useAuth();
  const { openSignUp, openSignIn, AuthModal } = useAuthModal();
  const { incidents, loading, verifyIncidentReport, loadIncidentsNearLocation } = useIncidents();
  const { latitude, longitude, hasLocation, getCurrentLocation, error: locationError } = useLocation();
  
  // FIXED: Use safe localStorage hook instead of direct localStorage access
  const [welcomeShown, setWelcomeShown, localStorageError] = useLocalStorage('welcomeShown', false);
  const [showWelcome, setShowWelcome] = useState(false);
  
  const { unreadCount } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [locationStatus, setLocationStatus] = useState('detecting');

  const safetyMetrics = {
    activeIncidents: incidents.filter(i => !i.is_resolved).length,
    communityMembers: 1247,
    safeRoutes: 12,
    responseTime: '4 min',
  };

  // FIXED: Safe welcome message handling with error handling
  useEffect(() => {
    // Show welcome message for new users, but only if localStorage is working
    if (!isAuthenticated && !welcomeShown && !localStorageError) {
      setShowWelcome(true);
    }
  }, [isAuthenticated, welcomeShown, localStorageError]);

  useEffect(() => {
    // Update location status and load nearby incidents
    if (hasLocation && latitude && longitude) {
      setLocationStatus('located');
      // Load incidents within 5km radius
      loadIncidentsNearLocation(latitude, longitude, 5000);
    } else if (locationError) {
      setLocationStatus('error');
    } else {
      setLocationStatus('detecting');
    }
  }, [hasLocation, latitude, longitude, locationError, loadIncidentsNearLocation]);

  // FIXED: Safe welcome dismissal with error handling
  const handleJoinCommunity = () => {
    setShowWelcome(false);
    // Only set localStorage if it's available and working
    if (!localStorageError) {
      setWelcomeShown(true);
    }
    openSignUp();
  };

  // FIXED: Safe welcome dismissal for "Maybe Later"
  const handleDismissWelcome = () => {
    setShowWelcome(false);
    // Only set localStorage if it's available and working
    if (!localStorageError) {
      setWelcomeShown(true);
    }
  };

  const handleNotificationClick = () => {
    if (isAuthenticated) {
      setShowNotifications(true);
    } else {
      openSignIn();
    }
  };

  const handleIncidentMapClick = (incident) => {
    setSelectedIncident(incident);
    setShowMap(false);
  };

  const handleGetLocation = () => {
    setLocationStatus('detecting');
    getCurrentLocation();
  };

  const getLocationStatusInfo = () => {
    switch (locationStatus) {
      case 'detecting':
        return {
          icon: <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>,
          text: 'Detecting location...',
          color: 'text-blue-600'
        };
      case 'located':
        return {
          icon: <Crosshair className="w-4 h-4 text-green-600" />,
          text: 'Location detected',
          color: 'text-green-600'
        };
      case 'error':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
          text: 'Location unavailable',
          color: 'text-red-600'
        };
      default:
        return {
          icon: <MapPin className="w-4 h-4 text-gray-400" />,
          text: 'Location unknown',
          color: 'text-gray-400'
        };
    }
  };

  const locationInfo = getLocationStatusInfo();

  // Convert incidents for map display - FIXED: Use actual incident coordinates
  const mapIncidents = incidents.map(incident => {
    // Extract coordinates from PostGIS point or use provided lat/lng
    let incidentLat = incident.latitude;
    let incidentLng = incident.longitude;
    
    // If coordinates aren't directly available, try to extract from location_point
    if (!incidentLat || !incidentLng) {
      // For now, use default coordinates if incident coordinates are missing
      // In a real implementation, you would parse the PostGIS POINT data
      incidentLat = -26.3054; // Default to Eldorado Park
      incidentLng = 27.9389;
    }
    
    return {
      id: incident.id,
      latitude: incidentLat,
      longitude: incidentLng,
      incident_type: incident.incident_type,
      severity: incident.severity,
      title: incident.title,
      is_verified: incident.is_verified,
      is_urgent: incident.is_urgent,
      created_at: incident.created_at
    };
  });

  return (
    <div className="pb-20">
      {/* Welcome Banner for Anonymous Users - FIXED: Enhanced error handling */}
      {showWelcome && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 m-4 rounded-2xl shadow-lg">
          <div className="flex items-start space-x-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2">Welcome to SafeGuard Eldos!</h3>
              <p className="text-blue-100 text-sm mb-4">
                Join our community to unlock features like incident verification, safe route creation, and community groups.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleJoinCommunity}
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                >
                  Join Community
                </button>
                <button
                  onClick={handleDismissWelcome}
                  className="text-blue-100 hover:text-white transition-colors"
                >
                  Maybe Later
                </button>
              </div>
              
              {/* FIXED: Show localStorage error if present */}
              {localStorageError && (
                <div className="mt-3 p-2 bg-blue-800 bg-opacity-50 rounded text-xs text-blue-100">
                  <p>⚠️ Settings may not persist: {localStorageError}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">SafeGuard Eldos</h1>
            <p className="text-red-100 text-sm">
              {isAuthenticated && profile 
                ? `Welcome back, Community ${profile.community_role}`
                : 'Eldorado Park Community Safety'
              }
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {isAuthenticated && (
              <button
                onClick={handleNotificationClick}
                className="bg-red-500 bg-opacity-30 p-2 rounded-lg hover:bg-opacity-50 transition-colors relative"
              >
                <Bell className="w-6 h-6 text-red-100" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </div>
                )}
              </button>
            )}
            <Shield className="w-10 h-10 text-red-200" />
          </div>
        </div>
        
        <SafetyStatus />
      </div>

      {/* Location Status Bar */}
      <div className="px-6 -mt-4 relative z-10">
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {locationInfo.icon}
              <div>
                <p className={`font-medium ${locationInfo.color}`}>{locationInfo.text}</p>
                {hasLocation && (
                  <p className="text-xs text-gray-500">
                    Monitoring {incidents.length} incidents in your area
                  </p>
                )}
                {locationError && (
                  <p className="text-xs text-red-500">{locationError}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {hasLocation && (
                <button
                  onClick={() => setShowMap(!showMap)}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showMap 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  <Map className="w-4 h-4" />
                  <span>{showMap ? 'Hide Map' : 'Show Map'}</span>
                </button>
              )}
              {!hasLocation && (
                <button
                  onClick={handleGetLocation}
                  className="flex items-center space-x-1 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                >
                  <Navigation2 className="w-4 h-4" />
                  <span>Enable Location</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Button */}
      <div className="px-6 -mt-8 relative z-10">
        <EmergencyButton />
      </div>

      {/* Map View */}
      {showMap && hasLocation && (
        <div className="px-6 mt-6">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Area Safety Map</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{incidents.length} incidents nearby</span>
                </div>
              </div>
            </div>
            <MapComponent
              latitude={latitude}
              longitude={longitude}
              incidents={mapIncidents}
              onIncidentClick={handleIncidentMapClick}
              className="h-80"
              showControls={true}
              interactive={true}
              zoom={15}
            />
          </div>
        </div>
      )}

      {/* User Status */}
      {isAuthenticated && profile && (
        <div className="px-6 mt-6">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-xl border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Community Status</h3>
                <p className="text-sm text-gray-600">
                  Reputation: {profile.reputation_score} points • {profile.community_role}
                </p>
                {hasLocation && (
                  <p className="text-xs text-gray-500 mt-1">
                    Monitoring {profile.notification_radius}m radius around your location
                  </p>
                )}
              </div>
              <div className="bg-green-500 p-2 rounded-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="px-6 mt-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Active Incidents</p>
                <p className="text-2xl font-bold text-gray-900">{safetyMetrics.activeIncidents}</p>
                {hasLocation && (
                  <p className="text-xs text-gray-500">In your area</p>
                )}
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Community</p>
                <p className="text-2xl font-bold text-gray-900">{safetyMetrics.communityMembers}</p>
                <p className="text-xs text-gray-500">Active members</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Safe Routes</p>
                <p className="text-2xl font-bold text-gray-900">{safetyMetrics.safeRoutes}</p>
                <p className="text-xs text-gray-500">Verified paths</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Response</p>
                <p className="text-2xl font-bold text-gray-900">{safetyMetrics.responseTime}</p>
                <p className="text-xs text-gray-500">Avg response</p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Location-Based Insights */}
      {hasLocation && (
        <div className="px-6 mt-6">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900">Location-Based Insights</h3>
                <div className="mt-2 space-y-1 text-sm text-blue-800">
                  <p>• {incidents.filter(i => !i.is_resolved).length} active incidents in your monitoring area</p>
                  <p>• {incidents.filter(i => i.is_verified).length} community-verified reports</p>
                  <p>• {incidents.filter(i => new Date(i.created_at) > new Date(Date.now() - 24*60*60*1000)).length} incidents reported in the last 24 hours</p>
                </div>
                {!showMap && (
                  <button
                    onClick={() => setShowMap(true)}
                    className="mt-2 text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors"
                  >
                    View on Map →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Incidents */}
      <div className="px-6 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {hasLocation ? 'Nearby Activity' : 'Recent Activity'}
          </h2>
          <TrendingUp className="w-5 h-5 text-gray-400" />
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading incidents...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Show selected incident from map first */}
            {selectedIncident && (
              <div className="border-2 border-blue-500 rounded-xl">
                <IncidentCard 
                  incident={selectedIncident} 
                  onVerify={verifyIncidentReport}
                />
              </div>
            )}
            
            {incidents.slice(0, selectedIncident ? 4 : 5).map((incident) => (
              incident.id !== selectedIncident?.id && (
                <IncidentCard 
                  key={incident.id} 
                  incident={incident} 
                  onVerify={verifyIncidentReport}
                />
              )
            ))}
            
            {incidents.length === 0 && (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No recent incidents reported</p>
                <p className="text-gray-400 text-sm">
                  {hasLocation ? 'Your area is safe!' : 'Enable location to see nearby incidents'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Community Update Banner */}
      <div className="px-6 mt-8">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
          <div className="flex items-start space-x-3">
            <div className="bg-blue-500 rounded-full p-2">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">Community Patrol Tonight</h3>
              <p className="text-blue-700 text-sm mt-1">
                Join our neighborhood watch patrol at 7 PM. Meet at Extension 8 Community Hall.
              </p>
              {hasLocation && (
                <p className="text-blue-600 text-xs mt-1">
                  📍 2.3km from your location
                </p>
              )}
              <button className="mt-2 text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors">
                Learn More →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal />

      {/* Notification Center */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  );
};

export default Dashboard;