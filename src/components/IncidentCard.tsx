import React from 'react';
import { MapPin, Clock, CheckCircle, AlertTriangle, Users } from 'lucide-react';

interface Incident {
  id: string;
  incident_type: string;
  location_address: string;
  created_at: string;
  severity: string;
  is_verified: boolean;
  title: string;
}

interface IncidentCardProps {
  incident: Incident;
  onVerify?: (
    incidentId: string, 
    type: 'confirm' | 'dispute' | 'additional_info', 
    notes?: string
  ) => Promise<void>;
}

const IncidentCard: React.FC<IncidentCardProps> = ({ incident, onVerify }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'theft':
        return '🚨';
      case 'suspicious_activity':
        return '👀';
      case 'gang_activity':
        return '⚠️';
      case 'drugs':
        return '💊';
      case 'vandalism':
        return '🔨';
      case 'resolved':
        return '✅';
      default:
        return '📋';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-3">
        <div className="text-2xl">{getTypeEmoji(incident.incident_type)}</div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 truncate">
              {incident.title}
            </h3>
            {incident.is_verified && (
              <div className="flex items-center space-x-1 text-blue-600">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">Verified</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{incident.location_address}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{formatTimeAgo(incident.created_at)}</span>
              </div>
              
              <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(incident.severity)}`}>
                {getSeverityIcon(incident.severity)}
                <span className="capitalize">{incident.severity}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentCard;