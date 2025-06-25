import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Clock, CheckCircle, AlertTriangle, Users, ThumbsUp, ThumbsDown, MessageSquare, X, Send, Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase, formatTimeAgo } from '../lib/supabase';

interface Incident {
  id: string;
  reporter_id?: string;
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

// Enhanced error types for better error handling
type ErrorType = 
  | 'network' 
  | 'authentication' 
  | 'permission' 
  | 'validation' 
  | 'server' 
  | 'timeout' 
  | 'unknown';

interface ErrorState {
  type: ErrorType;
  message: string;
  retryable: boolean;
  timestamp: number;
}

const IncidentCard: React.FC<IncidentCardProps> = ({ incident, onVerify }) => {
  const { isAuthenticated, profile } = useAuthContext();
  const [showVerificationPanel, setShowVerificationPanel] = useState(false);
  const [selectedVerificationType, setSelectedVerificationType] = useState<'confirm' | 'dispute' | 'additional_info' | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  
  // FIXED: Enhanced error state management
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // FIXED: Add mounted ref to track component mount status
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // FIXED: Cleanup mounted ref on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // FIXED: Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // FIXED: Enhanced error classification
  const classifyError = (error: any): ErrorState => {
    const timestamp = Date.now();
    
    // Network errors
    if (!isOnline || error.name === 'NetworkError' || error.message?.includes('fetch')) {
      return {
        type: 'network',
        message: 'No internet connection. Please check your network and try again.',
        retryable: true,
        timestamp
      };
    }
    
    // Timeout errors
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return {
        type: 'timeout',
        message: 'Request timed out. Please try again.',
        retryable: true,
        timestamp
      };
    }
    
    // Authentication errors
    if (error.message?.includes('JWT') || error.message?.includes('auth') || error.status === 401) {
      return {
        type: 'authentication',
        message: 'Authentication expired. Please sign in again.',
        retryable: false,
        timestamp
      };
    }
    
    // Permission errors
    if (error.message?.includes('permission') || error.message?.includes('RLS') || error.status === 403) {
      return {
        type: 'permission',
        message: 'You don\'t have permission to perform this action.',
        retryable: false,
        timestamp
      };
    }
    
    // Validation errors (duplicate verification, etc.)
    if (error.message?.includes('duplicate') || error.message?.includes('already verified') || error.status === 409) {
      return {
        type: 'validation',
        message: 'You have already verified this incident.',
        retryable: false,
        timestamp
      };
    }
    
    // Server errors
    if (error.status >= 500 || error.message?.includes('server') || error.message?.includes('internal')) {
      return {
        type: 'server',
        message: 'Server error occurred. Please try again in a moment.',
        retryable: true,
        timestamp
      };
    }
    
    // Unknown errors
    return {
      type: 'unknown',
      message: error.message || 'An unexpected error occurred. Please try again.',
      retryable: true,
      timestamp
    };
  };

  // FIXED: Enhanced error handling with retry logic
  const handleError = (error: any, context: string) => {
    console.error(`${context} error:`, error);
    
    if (!isMountedRef.current) return;
    
    const errorState = classifyError(error);
    setErrorState(errorState);
    
    // Auto-clear certain errors after a delay
    if (errorState.type === 'network' || errorState.type === 'timeout') {
      setTimeout(() => {
        if (isMountedRef.current && Date.now() - errorState.timestamp > 5000) {
          setErrorState(null);
        }
      }, 5000);
    }
  };

  // FIXED: Clear error state
  const clearError = () => {
    setErrorState(null);
    setRetryCount(0);
  };

  // FIXED: Retry mechanism with exponential backoff
  const retryOperation = async (operation: () => Promise<void>, maxRetries = 3) => {
    if (retryCount >= maxRetries) {
      setErrorState(prev => prev ? {
        ...prev,
        message: `Failed after ${maxRetries} attempts. Please try again later.`,
        retryable: false
      } : null);
      return;
    }

    setRetryCount(prev => prev + 1);
    clearError();
    
    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.pow(2, retryCount) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      await operation();
    } catch (error) {
      handleError(error, 'Retry operation');
    }
  };

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

  // FIXED: Enhanced verification check with comprehensive error handling
  useEffect(() => {
    const checkUserVerification = async () => {
      if (!isAuthenticated || !profile) {
        setHasVerified(false);
        return;
      }

      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, 10000); // 10 second timeout

      setIsCheckingVerification(true);
      clearError();
      
      try {
        const { data, error } = await supabase
          .from('incident_verifications')
          .select('id')
          .eq('incident_id', incident.id)
          .eq('verifier_id', profile.id)
          .maybeSingle()
          .abortSignal(abortControllerRef.current.signal);

        clearTimeout(timeoutId);

        // Check if the request was aborted
        if (abortControllerRef.current.signal.aborted) {
          return;
        }

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" which is expected
          throw error;
        }

        // FIXED: Only update state if component is still mounted
        if (isMountedRef.current) {
          setHasVerified(!!data);
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        // Don't handle error if the request was aborted (component unmounted)
        if (!abortControllerRef.current.signal.aborted && isMountedRef.current) {
          handleError(error, 'Verification check');
          setHasVerified(false);
        }
      } finally {
        // Only update loading state if component is still mounted
        if (!abortControllerRef.current.signal.aborted && isMountedRef.current) {
          setIsCheckingVerification(false);
        }
      }
    };

    checkUserVerification();

    // Cleanup function to abort the request if component unmounts or dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [incident.id, isAuthenticated, profile]);

  // FIXED: Enhanced verification handler with comprehensive error handling
  const handleVerification = async (
    type: 'confirm' | 'dispute' | 'additional_info',
    notes?: string,
    mode: 'quick' | 'detailed' = 'detailed'
  ) => {
    if (!onVerify) return;

    // Check network connectivity
    if (!isOnline) {
      handleError(new Error('No internet connection'), 'Verification');
      return;
    }

    setIsSubmitting(true);
    clearError();
    
    try {
      await onVerify(incident.id, type, notes);
      
      // FIXED: Only update state if component is still mounted
      if (isMountedRef.current) {
        setHasVerified(true);
        
        // Only close panel and reset form for detailed mode
        if (mode === 'detailed') {
          setShowVerificationPanel(false);
          setSelectedVerificationType(null);
          setVerificationNotes('');
        }
        
        // Clear any previous errors on success
        clearError();
      }
    } catch (error: any) {
      // FIXED: Only update state if component is still mounted
      if (isMountedRef.current) {
        handleError(error, 'Verification');
      }
    } finally {
      // FIXED: Only update state if component is still mounted
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  // FIXED: Use consolidated handler for detailed verification
  const handleVerificationSubmit = async () => {
    if (!selectedVerificationType) return;
    await handleVerification(selectedVerificationType, verificationNotes || undefined, 'detailed');
  };

  // FIXED: Use consolidated handler for quick verification
  const handleQuickVerification = async (type: 'confirm' | 'dispute') => {
    await handleVerification(type, undefined, 'quick');
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

  // FIXED: Consolidated reset function for consistent state management
  const resetVerificationForm = () => {
    setShowVerificationPanel(false);
    setSelectedVerificationType(null);
    setVerificationNotes('');
    clearError();
  };

  // FIXED: Enhanced error display component
  const ErrorDisplay = ({ error, onRetry, onDismiss }: { 
    error: ErrorState; 
    onRetry?: () => void; 
    onDismiss: () => void; 
  }) => {
    const getErrorIcon = () => {
      switch (error.type) {
        case 'network':
          return <WifiOff className="w-4 h-4 text-red-600" />;
        case 'timeout':
          return <Clock className="w-4 h-4 text-amber-600" />;
        case 'authentication':
          return <Users className="w-4 h-4 text-red-600" />;
        case 'permission':
          return <AlertTriangle className="w-4 h-4 text-red-600" />;
        case 'validation':
          return <CheckCircle className="w-4 h-4 text-blue-600" />;
        case 'server':
          return <AlertTriangle className="w-4 h-4 text-red-600" />;
        default:
          return <AlertTriangle className="w-4 h-4 text-red-600" />;
      }
    };

    const getErrorColor = () => {
      switch (error.type) {
        case 'validation':
          return 'bg-blue-50 border-blue-200 text-blue-800';
        case 'timeout':
          return 'bg-amber-50 border-amber-200 text-amber-800';
        default:
          return 'bg-red-50 border-red-200 text-red-800';
      }
    };

    return (
      <div className={`p-3 rounded-lg border ${getErrorColor()}`}>
        <div className="flex items-start space-x-3">
          {getErrorIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {error.type === 'network' && 'Connection Error'}
              {error.type === 'timeout' && 'Request Timeout'}
              {error.type === 'authentication' && 'Authentication Required'}
              {error.type === 'permission' && 'Permission Denied'}
              {error.type === 'validation' && 'Already Verified'}
              {error.type === 'server' && 'Server Error'}
              {error.type === 'unknown' && 'Error'}
            </p>
            <p className="text-xs mt-1">{error.message}</p>
            
            {/* Action buttons */}
            <div className="flex items-center space-x-2 mt-2">
              {error.retryable && onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center space-x-1 text-xs font-medium hover:underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              )}
              <button
                onClick={onDismiss}
                className="text-xs font-medium hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
          
          {/* Network status indicator */}
          {error.type === 'network' && (
            <div className="flex items-center space-x-1">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" />
              )}
            </div>
          )}
        </div>
      </div>
    );
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
                        disabled={isSubmitting || !isOnline}
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
                        disabled={!isOnline}
                        className="flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* FIXED: Enhanced Error Display */}
            {errorState && (
              <div className="mt-3">
                <ErrorDisplay
                  error={errorState}
                  onRetry={errorState.retryable ? () => retryOperation(async () => {
                    if (errorState.type === 'network' && !isOnline) {
                      throw new Error('Still offline');
                    }
                    // Re-run the verification check
                    const checkVerification = async () => {
                      if (!isAuthenticated || !profile) return;
                      
                      const { data, error } = await supabase
                        .from('incident_verifications')
                        .select('id')
                        .eq('incident_id', incident.id)
                        .eq('verifier_id', profile.id)
                        .maybeSingle();

                      if (error && error.code !== 'PGRST116') throw error;
                      if (isMountedRef.current) setHasVerified(!!data);
                    };
                    
                    await checkVerification();
                  }) : undefined}
                  onDismiss={clearError}
                />
              </div>
            )}

            {/* Network Status Indicator */}
            {!isOnline && (
              <div className="mt-2 flex items-center space-x-2 text-xs text-amber-600">
                <WifiOff className="w-3 h-3" />
                <span>Offline - Some features may not work</span>
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
              onClick={resetVerificationForm}
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
                  disabled={!isOnline}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
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
                  disabled={!isOnline}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                    !isOnline ||
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