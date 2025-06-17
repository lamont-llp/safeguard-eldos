import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Clock, MapPin, Users, TrendingUp, Bell, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useIncidents } from '../hooks/useIncidents';
import { useAuthModal } from '../components/AuthModal';
import EmergencyButton from '../components/EmergencyButton';
import IncidentCard from '../components/IncidentCard';
import SafetyStatus from '../components/SafetyStatus';

const Dashboard = () => {
  const { isAuthenticated, profile } = useAuth();
  const { 
    incidents, 
    loading, 
    error, 
    getRecentIncidents, 
    getIncidentsByType,
    getIncidentsBySeverity,
    requestNotificationPermission,
    refresh
  } = useIncidents();
  const { openSignUp, AuthModal } = useAuthModal();
  const [showWelcome, setShowWelcome] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Show welcome message for new users
    if (!isAuthenticated && !localStorage.getItem('welcomeShown')) {
      setShowWelcome(true);
      localStorage.setItem('welcomeShown', 'true');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Request notification permission for authenticated users
    if (isAuthenticated) {
      requestNotificationPermission();
    }
  }, [isAuthenticated]);

  const handleJoinCommunity = () => {
    setShowWelcome(false);
    openSignUp();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Calculate safety metrics
  const recentIncidents = getRecentIncidents(24);
  const criticalIncidents = getIncidentsBySeverity('critical');
  const highIncidents = getIncidentsBySeverity('high');
  const activeIncidents = incidents.filter(i => !i.is_resolved);
  const resolvedToday = incidents.filter(i => 
    i.is_resolved && 
    new Date(i.created_at).toDateString() === new Date().toDateString()
  );

  const safetyMetrics = {
    activeIncidents: activeIncidents.length,
    communityMembers: 1247, // This would come from a real count
    safeRoutes: 12, // This would come from safe routes data
    responseTime: '4 min', // This would be calculated from actual data
    recentIncidents: recentIncidents.length,
    resolvedToday: resolvedToday.length
  };

  return (
    <div className="pb-20">
      {/* Welcome Banner for Anonymous Users */}
      {showWelcome && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 m-4 rounded-2xl shadow-lg">
          <div className="flex items-start space-x-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2">Welcome to SafeGuard Eldos!</h3>
              <p className="text-blue-100 text-sm mb-4">
                Join our community to report incidents, verify reports, and help keep Eldorado Park safe.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleJoinCommunity}
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                >
                  Join Community
                </button>
                <button
                  onClick={() => setShowWelcome(false)}
                  className="text-blue-100 hover:text-white transition-colors"
                >
                  Maybe Later
                </button>
              </div>
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
              <div className="bg-red-500 bg-opacity-30 p-2 rounded-lg">
                <Bell className="w-6 h-6 text-red-100" />
              </div>
            )}
            <Shield className="w-10 h-10 text-red-200" />
          </div>
        </div>
        
        <SafetyStatus />
      </div>

      {/* Emergency Button */}
      <div className="px-6 -mt-8 relative z-10">
        <EmergencyButton />
      </div>

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
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Community</p>
                <p className="text-2xl font-bold text-gray-900">{safetyMetrics.communityMembers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Resolved Today</p>
                <p className="text-2xl font-bold text-gray-900">{safetyMetrics.resolvedToday}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Response</p>
                <p className="text-2xl font-bold text-gray-900">{safetyMetrics.responseTime}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="px-6 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm">Refresh</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 text-sm">Failed to load incidents: {error}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-4 rounded-xl shadow-sm border animate-pulse">
                <div className="flex space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : incidents.length > 0 ? (
          <div className="space-y-3">
            {incidents.slice(0, 10).map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Incidents</h3>
            <p className="text-gray-600">
              Great news! No incidents have been reported recently in your area.
            </p>
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
              <button className="mt-2 text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors">
                Learn More →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal />
    </div>
  );
};

export default Dashboard;