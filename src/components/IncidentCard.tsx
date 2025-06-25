import React, { useState, useEffect } from 'react';
import { MapPin, Clock, CheckCircle, AlertTriangle, Users, ThumbsUp, ThumbsDown, MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase, formatTimeAgo } from '../lib/supabase';

interface Incident {
  id: string;
  incident_type: string;
  location_address: string;
  created_at: string;
  severity: string;
  is_verified: boolean;
  verification_count: number;
  title: string;
  description?: string;
  is_resolved: boolean;
  latitude?: number;
  longitude?: number;
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
  const { isAuthenticated, profile } = useAuthContext();
  const [showVerificationPanel, setShowVerificationPanel] = useState(false);
  const [selectedVerificationType, setSelectedVerificationType] = useState<'confirm' | 'dispute' | 'additional_info' | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [verificationError, setVerificationError] = useState('');

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

  // Check if user has already verified this incident - FIXED: Added AbortController for cleanup
  useEffect(() => {
    // Create AbortController for this effect
    const abortController = new AbortController();
    
    const checkUserVerification = async () => {
      if (!isAuthenticated || !profile) {
        setHasVerified(false);
        return;
      }

      setIsCheckingVerification(true);
      setVerificationError('');
      
      try {
        const { data, error } = await supabase
          .from('incident_verifications')
          .select('id')
          .eq('incident_id', incident.id)
          .eq('verifier_id', profile.id)
          .maybeSingle()
          .abortSignal(abortController.signal); // Add abort signal

        // Check if the request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" which is expected
          console.error('Error checking verification status:', error);
          setHasVerified(false);
          setVerificationError('Failed to check verification status');
        } else {
          setHasVerified(!!data);
        }
      } catch (error: any) {
        // Don't set error state if the request was aborted (component unmounted)
        if (!abortController.signal.aborted) {
          console.error('Error checking verification status:', error);
          setHasVerified(false);
          setVerificationError('Failed to check verification status');
        }
      } finally {
        // Only update loading state if component is still mounted
        if (!abortController.signal.aborted) {
          setIsCheckingVerification(false);
        }
      }
    };

    checkUserVerification();

    // Cleanup function to abort the request if component unmounts or dependencies change
    return () => {
      abortController.abort();
    };
  }, [incident.id, isAuthenticated, profile]);

  const handleVerificationSubmit = async () => {
    if (!selectedVerificationType || !onVerify) return;

    setIsSubmitting(true);
    setVerificationError('');
    
    try {
      await onVerify(incident.id, selectedVerificationType, verificationNotes || undefined);
      setHasVerified(true);
      setShowVerificationPanel(false);
      setSelectedVerificationType(null);
      setVerificationNotes('');
    } catch (error: any) {
      console.error('Verification failed:', error);
      setVerificationError(error.message || 'Failed to submit verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickVerification = async (type: 'confirm' | 'dispute') => {
    if (!onVerify) return;

    setIsSubmitting(true);
    setVerificationError('');
    
    try {
      await onVerify(incident.id, type);
      setHasVerified(true);
    } catch (error: any) {
      console.error('Quick verification failed:', error);
      setVerificationError(error.message || 'Failed to submit verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVerificationTypeInfo = (type: 'confirm' | 'dispute' | 'additional_info') => {
    switch (type) {
      case 'confirm':
        return {
          label: 'Confirm Incident',
          description: 'I can verify this incident happened',
          icon: <ThumbsUp className="w-5 h-5" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200'
        };
      case 'dispute':
        return {
          label: 'Dispute Incident',
          description: 'I believe this incident is inaccurate',
          icon: <ThumbsDown className="w-5 h-5" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200'
        };
      case 'additional_info':
        return {
          label: 'Add Information',
          description: 'I have additional details about this incident',
          icon: <MessageSquare className="w-5 h-5" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200'
        };
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
      {/* Main Card Content */}
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">{getTypeEmoji(incident.incident_type)}</div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 truncate">
                {incident.title}
              </h3>
              <div className="flex items-center space-x-2">
                {incident.is_verified && (
                  <div className="flex items-center space-x-1 text-blue-600">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-medium">Verified</span>
                  </div>
                )}
                {incident.is_resolved && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Resolved</span>
                  </div>
                )}
              </div>
            </div>
            
            {incident.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {incident.description}
              </p>
            )}
            
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

            {/* Verification Status */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {incident.verification_count} verification{incident.verification_count !== 1 ? 's' : ''}
                </span>
              </div>
              
              {/* Verification Buttons */}
              {isAuthenticated && onVerify && !incident.is_resolved && (
                <div className="flex items-center space-x-2">
                  {isCheckingVerification ? (
                    <div className="flex items-center space-x-1 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">Checking...</span>
                    </div>
                  ) : hasVerified ? (
                    <div className="flex items-center space-x-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">You verified this</span>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleQuickVerification('confirm')}
                        disabled={isSubmitting}
                        className="flex items-center space-x-1 px-3 py-1 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ThumbsUp className="w-4 h-4" />
                        )}
                        <span className="text-xs font-medium">Confirm</span>
                      </button>
                      
                      <button
                        onClick={() => setShowVerificationPanel(true)}
                        className="flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs font-medium">More</span>
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Authentication Notice */}
              {!isAuthenticated && (
                <div className="text-xs text-gray-500">
                  Sign in to verify
                </div>
              )}
            </div>

            {/* Verification Error */}
            {verificationError && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                {verificationError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verification Panel */}
      {showVerificationPanel && !hasVerified && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Verify Incident</h4>
            <button
              onClick={() => {
                setShowVerificationPanel(false);
                setSelectedVerificationType(null);
                setVerificationNotes('');
                setVerificationError('');
              }}
              className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Verification Type Selection */}
          <div className="space-y-3 mb-4">
            {(['confirm', 'dispute', 'additional_info'] as const).map((type) => {
              const info = getVerificationTypeInfo(type);
              return (
                <button
                  key={type}
                  onClick={() => setSelectedVerificationType(type)}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    selectedVerificationType === type
                      ? `${info.bgColor} border-current ${info.color}`
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={selectedVerificationType === type ? info.color : 'text-gray-400'}>
                      {info.icon}
                    </div>
                    <div>
                      <div className={`font-medium ${selectedVerificationType === type ? info.color : 'text-gray-900'}`}>
                        {info.label}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {info.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Notes Input */}
          {selectedVerificationType && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes {selectedVerificationType === 'additional_info' ? '(Required)' : '(Optional)'}
                </label>
                <textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder={
                    selectedVerificationType === 'confirm' 
                      ? 'Describe what you witnessed or any additional details...'
                      : selectedVerificationType === 'dispute'
                      ? 'Explain why you believe this incident is inaccurate...'
                      : 'Provide additional information about this incident...'
                  }
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  required={selectedVerificationType === 'additional_info'}
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Your verification will be anonymous to the community
                </p>
                <button
                  onClick={handleVerificationSubmit}
                  disabled={
                    isSubmitting || 
                    (selectedVerificationType === 'additional_info' && !verificationNotes.trim())
                  }
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Verification</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Authentication Notice */}
          {!isAuthenticated && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 text-sm">
                <strong>Sign in required:</strong> You need to be signed in to verify incidents and help keep the community safe.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IncidentCard;