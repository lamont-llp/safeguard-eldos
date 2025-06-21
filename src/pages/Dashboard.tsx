import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Clock, MapPin, Users, TrendingUp, Bell } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAuthModal } from '../components/AuthModal';
import { useIncidents } from '../hooks/useIncidents';
import EmergencyButton from '../components/EmergencyButton';
import IncidentCard from '../components/IncidentCard';
import SafetyStatus from '../components/SafetyStatus';
import { useNotifications } from '../hooks/useNotifications';
import NotificationCenter from './NotificationCenter';

const Dashboard = () => {
  const { isAuthenticated, profile } = useAuth();
  const { openSignUp, AuthModal } = useAuthModal();
  const { incidents, loading, verifyIncidentReport } = useIncidents();
  const [showWelcome, setShowWelcome] = useState(false);
  const { unreadCount } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  const safetyMetrics = {
    activeIncidents: incidents.filter(i => !i.is_resolved).length,
    communityMembers: 1247,
    safeRoutes: 12,
    responseTime: '4 min',
  };

  useEffect(() => {
    // Show welcome message for new users
    if (!isAuthenticated && !localStorage.getItem('welcomeShown')) {
      setShowWelcome(true);
      localStorage.setItem('welcomeShown', 'true');
    }
  }, [isAuthenticated]);

  const handleJoinCommunity = () => {
    setShowWelcome(false);
    openSignUp();
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
                <Bell className="w-6 h-6 text-red-100">
                 {/* Notifications Button */}
          <button
            onClick={handleNotificationClick}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 ${
              showNotifications
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="relative">
              <Bell className="w-6 h-6 mb-1" />
                {isAuthenticated && unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-xs font-medium">
                {isAuthenticated ? 'Alerts' : 'Sign In'}
              </span>
            </button>
                </Bell>
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
                <p className="text-gray-500 text-sm">Safe Routes</p>
                <p className="text-2xl font-bold text-gray-900">{safetyMetrics.safeRoutes}</p>
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
          <TrendingUp className="w-5 h-5 text-gray-400" />
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading incidents...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.slice(0, 5).map((incident) => (
              <IncidentCard 
                key={incident.id} 
                incident={incident} 
                onVerify={verifyIncidentReport}
              />
            ))}
            {incidents.length === 0 && (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No recent incidents reported</p>
                <p className="text-gray-400 text-sm">Your community is safe!</p>
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