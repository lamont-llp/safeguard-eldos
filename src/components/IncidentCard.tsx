import React, { useState } from 'react';
import { MapPin, Clock, CheckCircle, AlertTriangle, Users, ThumbsUp, ThumbsDown, MessageSquare, Shield } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { useIncidents } from '../hooks/useIncidents';
import { formatTimeAgo } from '../lib/supabase';

interface Incident {
  id: string;
  incident_type: string;
  severity: string;
  title: string;
  description?: string;
  location_address: string;
  location_area?: string;
  is_verified: boolean;
  verification_count: number;
  is_urgent: boolean;
  is_resolved: boolean;
  created_at: string;
}

interface IncidentCardProps {
  incident: Incident;
}

const IncidentCard: React.FC<IncidentCardProps> = ({ incident }) => {
  // Defensive check to prevent rendering with null/undefined incident
  if (!incident || !incident.id) {
    console.warn('IncidentCard received invalid incident:', incident);
    return null;
  }

  // Call hooks unconditionally at the top level
  const authContext = useAuthContext();
  const incidentsHook = useIncidents();
  
  // Extract values with defensive checks
  const isAuthenticated = authContext?.isAuthenticated || false;
  const verifyIncidentReport = incidentsHook?.verifyIncidentReport;

  const [isVerifying, setIsVerifying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
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
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'theft':
        return 'Theft/Robbery';
      case 'suspicious_activity':
        return 'Suspicious Activity';
      case 'gang_activity':
        return 'Gang Activity';
      case 'drugs':
        return 'Drug Activity';
      case 'vandalism':
        return 'Vandalism';
      case 'resolved':
        return 'Resolved';
      default:
        return 'Other';
    }
  };

  const handleVerification = async (type: 'confirm' | 'dispute') => {
    if (!isAuthenticated || !verifyIncidentReport) {
      console.warn('Cannot verify: not authenticated or verification function not available');
      return;
    }
    
    setIsVerifying(true);
    try {
      await verifyIncidentReport(incident.id, type, verificationNotes);
      setVerificationNotes('');
      setShowDetails(false);
    } catch (error) {
      console.error('Failed to verify incident:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  // Defensive time formatting
  let timeAgo = 'Unknown time';
  try {
    if (incident.created_at) {
      timeAgo = formatTimeAgo(incident.created_at);
    }
  } catch (error) {
    console.error('Failed to format time:', error);
  }

  // Ensure required fields have fallbacks
  const safeIncident = {
    title: incident.title || 'Untitled Incident',
    incident_type: incident.incident_type || 'other',
    severity: incident.severity || 'low',
    location_address: incident.location_address || 'Unknown location',
    verification_count: incident.verification_count || 0,
    is_verified: incident.is_verified || false,
    is_urgent: incident.is_urgent || false,
    is_resolved: incident.is_resolved || false,
    ...incident
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border transition-all hover:shadow-md ${
      safeIncident.is_urgent ? 'border-red-300 bg-red-50' : 'border-gray-200'
    }`}>
      {/* Urgent Banner */}
      {safeIncident.is_urgent && (
        <div className="bg-red-600 text-white px-4 py-2 rounded-t-xl flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">URGENT ALERT</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">{getTypeEmoji(safeIncident.incident_type)}</div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 truncate">
                  {safeIncident.title}
                </h3>
                <p className="text-sm text-gray-600">{getTypeLabel(safeIncident.incident_type)}</p>
              </div>
              
              <div className="flex items-center space-x-2 ml-2">
                {safeIncident.is_verified && (
                  <div className="flex items-center space-x-1 text-blue-600">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-medium">Verified</span>
                  </div>
                )}
                {safeIncident.is_resolved && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Resolved</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{safeIncident.location_address}</span>
              </div>
              
              {safeIncident.location_area && (
                <div className="text-sm text-gray-500">
                  Area: {safeIncident.location_area}
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{timeAgo}</span>
                </div>
                
                <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(safeIncident.severity)}`}>
                  {getSeverityIcon(safeIncident.severity)}
                  <span className="capitalize">{safeIncident.severity}</span>
                </div>
              </div>

              {/* Description */}
              {safeIncident.description && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{safeIncident.description}</p>
                </div>
              )}

              {/* Verification Status */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {safeIncident.verification_count} verification{safeIncident.verification_count !== 1 ? 's' : ''}
                  </span>
                </div>

                {isAuthenticated && !safeIncident.is_resolved && (
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors"
                  >
                    {showDetails ? 'Hide' : 'Verify'}
                  </button>
                )}
              </div>

              {/* Verification Actions */}
              {showDetails && isAuthenticated && verifyIncidentReport && (
                <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-3">Help verify this incident</h4>
                  
                  <textarea
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    placeholder="Add any additional information (optional)"
                    className="w-full p-3 border border-blue-200 rounded-lg text-sm resize-none"
                    rows={2}
                  />
                  
                  <div className="flex space-x-3 mt-3">
                    <button
                      onClick={() => handleVerification('confirm')}
                      disabled={isVerifying}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center justify-center space-x-1"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>Confirm</span>
                    </button>
                    
                    <button
                      onClick={() => handleVerification('dispute')}
                      disabled={isVerifying}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-red-700 disabled:bg-red-400 transition-colors flex items-center justify-center space-x-1"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      <span>Dispute</span>
                    </button>
                  </div>
                  
                  <p className="text-xs text-blue-700 mt-2 text-center">
                    Your verification helps the community assess incident accuracy
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentCard;