import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, Clock, MapPin, Users, TrendingUp } from 'lucide-react';
import EmergencyButton from '../components/EmergencyButton';
import IncidentCard from '../components/IncidentCard';
import SafetyStatus from '../components/SafetyStatus';

const Dashboard = () => {
  const [incidents] = useState([
    {
      id: 1,
      type: 'suspicious_activity',
      location: 'Klipriver Road & Extension 8',
      time: '2 minutes ago',
      severity: 'medium',
      verified: true,
      description: 'Unknown individuals loitering near school',
    },
    {
      id: 2,
      type: 'theft',
      location: 'Eldorado Shopping Centre',
      time: '15 minutes ago',
      severity: 'high',
      verified: true,
      description: 'Reported bag snatching incident',
    },
    {
      id: 3,
      type: 'resolved',
      location: 'Extension 4, Block B',
      time: '1 hour ago',
      severity: 'low',
      verified: true,
      description: 'All clear - patrol completed',
    },
  ]);

  const safetyMetrics = {
    activeIncidents: 3,
    communityMembers: 1247,
    safeRoutes: 12,
    responseTime: '4 min',
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">SafeGuard Eldos</h1>
            <p className="text-red-100 text-sm">Eldorado Park Community Safety</p>
          </div>
          <Shield className="w-10 h-10 text-red-200" />
        </div>
        
        <SafetyStatus />
      </div>

      {/* Emergency Button */}
      <div className="px-6 -mt-8 relative z-10">
        <EmergencyButton />
      </div>

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
        
        <div className="space-y-3">
          {incidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
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
              <p className="text-blue-700 text-sm mt-1">Join our neighborhood watch patrol at 7 PM. Meet at Extension 8 Community Hall.</p>
              <button className="mt-2 text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors">
                Learn More →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;