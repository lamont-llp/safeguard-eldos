import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Clock, CheckCircle, AlertTriangle, Users, ThumbsUp, ThumbsDown, MessageSquare, X, Send, Loader2, RefreshCw, Wifi, WifiOff, ExternalLink, Info } from 'lucide-react';
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

// Enhanced error types for comprehensive error handling
type ErrorType = 
  | 'network' 
  | 'authentication' 
  | 'permission' 
  | 'validation' 
  | 'server' 
  | 'timeout' 
  | 'rate_limit'
  | 'maintenance'
  | 'abort'
  | 'unknown';

interface ErrorState {
  type: ErrorType;
  message: string;
  userMessage: string; // User-friendly message
  technicalDetails?: string; // Technical details for debugging
  retryable: boolean;
  timestamp: number;
  context: string; // What operation failed
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean; // Whether user can take action
  suggestedActions?: string[]; // Suggested user actions
  isExpected?: boolean; // Whether this is an expected error (like abort)
}

interface RetryState {
  count: number;
  maxRetries: number;
  backoffMultiplier: number;
  lastAttempt: number;
}

const IncidentCard: React.FC<IncidentCardProps> = ({ incident, onVerify }) => {
  const { isAuthenticated, profile } = useAuthContext();
  const [showVerificationPanel, setShowVerificationPanel] = useState(false);
  const [selectedVerificationType, setSelectedVerificationType] = useState<'confirm' | 'dispute' | 'additional_info' | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  
  // Enhanced error state management
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [retryState, setRetryState] = useState<RetryState>({
    count: 0,
    maxRetries: 3,
    backoffMultiplier: 2,
    lastAttempt: 0
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  // Component lifecycle management
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-retry if we have a network error and come back online
      if (errorState?.type === 'network' && errorState.retryable) {
        handleRetry();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [errorState]);

  // Enhanced error classification with detailed user guidance
  const classifyError = (error: any, context: string): ErrorState => {
    const timestamp = Date.now();
    const baseError = {
      timestamp,
      context,
      actionable: true,
      suggestedActions: [],
      isExpected: false
    };
    
    // ENHANCED: Handle AbortError as expected behavior
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      return {
        ...baseError,
        type: 'abort',
        message: 'Request was cancelled',
        userMessage: 'Request was cancelled',
        technicalDetails: `Request aborted: ${error.message || 'Component unmounted or request cancelled'}`,
        retryable: false,
        severity: 'low',
        actionable: false,
        isExpected: true,
        suggestedActions: []
      };
    }
    
    // Network errors
    if (!isOnline || error.name === 'NetworkError' || error.message?.includes('fetch') || error.code === 'NETWORK_ERROR') {
      return {
        ...baseError,
        type: 'network',
        message: 'Network connection failed',
        userMessage: 'No internet connection detected',
        technicalDetails: `Network error: ${error.message || 'Connection failed'}`,
        retryable: true,
        severity: 'medium',
        suggestedActions: [
          'Check your internet connection',
          'Try again when connection is restored',
          'Switch to mobile data if using WiFi'
        ]
      };
    }
    
    // Timeout errors
    if (error.name === 'TimeoutError' || error.message?.includes('timeout') || error.code === 'TIMEOUT') {
      return {
        ...baseError,
        type: 'timeout',
        message: 'Request timed out',
        userMessage: 'The request took too long to complete',
        technicalDetails: `Timeout after ${error.timeout || 'unknown'}ms`,
        retryable: true,
        severity: 'medium',
        suggestedActions: [
          'Try again in a moment',
          'Check your internet speed',
          'Contact support if this persists'
        ]
      };
    }
    
    // Authentication errors
    if (error.message?.includes('JWT') || error.message?.includes('auth') || error.status === 401 || error.code === 'UNAUTHORIZED') {
      return {
        ...baseError,
        type: 'authentication',
        message: 'Authentication failed',
        userMessage: 'Your session has expired',
        technicalDetails: `Auth error: ${error.message}`,
        retryable: false,
        severity: 'high',
        actionable: true,
        suggestedActions: [
          'Sign out and sign back in',
          'Refresh the page',
          'Clear browser cache if problem persists'
        ]
      };
    }
    
    // Permission errors
    if (error.message?.includes('permission') || error.message?.includes('RLS') || error.status === 403 || error.code === 'FORBIDDEN') {
      return {
        ...baseError,
        type: 'permission',
        message: 'Permission denied',
        userMessage: 'You don\'t have permission for this action',
        technicalDetails: `Permission error: ${error.message}`,
        retryable: false,
        severity: 'medium',
        actionable: false,
        suggestedActions: [
          'Contact an administrator',
          'Check if you have the required role',
          'Try signing out and back in'
        ]
      };
    }
    
    // Validation errors (duplicate verification, etc.)
    if (error.message?.includes('duplicate') || error.message?.includes('already verified') || error.status === 409 || error.code === 'CONFLICT') {
      return {
        ...baseError,
        type: 'validation',
        message: 'Duplicate verification',
        userMessage: 'You have already verified this incident',
        technicalDetails: `Validation error: ${error.message}`,
        retryable: false,
        severity: 'low',
        actionable: false,
        suggestedActions: [
          'Refresh the page to see updated status',
          'Your previous verification is still valid'
        ]
      };
    }
    
    // Rate limiting
    if (error.status === 429 || error.message?.includes('rate limit') || error.code === 'RATE_LIMITED') {
      return {
        ...baseError,
        type: 'rate_limit',
        message: 'Rate limit exceeded',
        userMessage: 'Too many requests. Please slow down',
        technicalDetails: `Rate limit: ${error.message}`,
        retryable: true,
        severity: 'medium',
        suggestedActions: [
          'Wait a moment before trying again',
          'Avoid rapid repeated actions',
          'Try again in a few minutes'
        ]
      };
    }
    
    // Server maintenance
    if (error.status === 503 || error.message?.includes('maintenance') || error.code === 'SERVICE_UNAVAILABLE') {
      return {
        ...baseError,
        type: 'maintenance',
        message: 'Service temporarily unavailable',
        userMessage: 'The service is temporarily down for maintenance',
        technicalDetails: `Maintenance: ${error.message}`,
        retryable: true,
        severity: 'high',
        suggestedActions: [
          'Try again in a few minutes',
          'Check our status page for updates',
          'Contact support if this persists'
        ]
      };
    }
    
    // Server errors
    if (error.status >= 500 || error.message?.includes('server') || error.message?.includes('internal') || error.code === 'INTERNAL_ERROR') {
      return {
        ...baseError,
        type: 'server',
        message: 'Server error occurred',
        userMessage: 'Something went wrong on our end',
        technicalDetails: `Server error ${error.status}: ${error.message}`,
        retryable: true,
        severity: 'high',
        suggestedActions: [
          'Try again in a moment',
          'Contact support if this continues',
          'Check our status page for known issues'
        ]
      };
    }
    
    // Unknown errors
    return {
      ...baseError,
      type: 'unknown',
      message: 'Unexpected error occurred',
      userMessage: 'An unexpected error occurred',
      technicalDetails: `Unknown error: ${error.message || JSON.stringify(error)}`,
      retryable: true,
      severity: 'medium',
      suggestedActions: [
        'Try refreshing the page',
        'Try again in a moment',
        'Contact support with error details'
      ]
    };
  };

  // Enhanced error handling with comprehensive logging and user feedback
  const handleError = (error: any, context: string) => {
    // ENHANCED: Don't log expected errors (like AbortError) as errors
    const errorState = classifyError(error, context);
    
    if (errorState.isExpected) {
      // For expected errors, just log at debug level
      console.debug(`Expected error in ${context}:`, {
        type: errorState.type,
        message: errorState.message,
        incidentId: incident.id
      });
      
      // Don't show expected errors to users unless in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Expected error (development mode):', errorState);
      }
      
      // Clear any existing error state for expected errors
      setErrorState(null);
      return;
    }
    
    // Log unexpected errors with full details
    console.group(`🚨 IncidentCard Error - ${context}`);
    console.error('Original error:', error);
    console.error('Error stack:', error.stack);
    console.error('Component state:', {
      incidentId: incident.id,
      isAuthenticated,
      isOnline,
      retryCount: retryState.count
    });
    console.groupEnd();
    
    if (!isMountedRef.current) return;
    
    setErrorState(errorState);
    
    // Auto-clear low severity errors after a delay
    if (errorState.severity === 'low') {
      setTimeout(() => {
        if (isMountedRef.current && Date.now() - errorState.timestamp > 5000) {
          clearError();
        }
      }, 5000);
    }
    
    // Log to external error tracking service (if available)
    if (window.gtag && !errorState.isExpected) {
      window.gtag('event', 'exception', {
        description: `${context}: ${errorState.message}`,
        fatal: errorState.severity === 'critical'
      });
    }
  };

  // Clear error state and reset retry counter
  const clearError = () => {
    setErrorState(null);
    setRetryState(prev => ({ ...prev, count: 0 }));
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
  };

  // Enhanced retry mechanism with exponential backoff and circuit breaker
  const handleRetry = async () => {
    if (!errorState?.retryable || retryState.count >= retryState.maxRetries) {
      setErrorState(prev => prev ? {
        ...prev,
        message: `Failed after ${retryState.maxRetries} attempts`,
        userMessage: 'Multiple attempts failed. Please try again later.',
        retryable: false,
        suggestedActions: [
          'Wait a few minutes before trying again',
          'Check your internet connection',
          'Contact support if this continues'
        ]
      } : null);
      return;
    }

    // Prevent rapid retries
    const timeSinceLastAttempt = Date.now() - retryState.lastAttempt;
    const minDelay = Math.pow(retryState.backoffMultiplier, retryState.count) * 1000;
    
    if (timeSinceLastAttempt < minDelay) {
      const remainingDelay = minDelay - timeSinceLastAttempt;
      retryTimeoutRef.current = setTimeout(handleRetry, remainingDelay);
      return;
    }

    setRetryState(prev => ({
      ...prev,
      count: prev.count + 1,
      lastAttempt: Date.now()
    }));
    
    clearError();
    
    // Retry the original operation based on context
    try {
      if (errorState.context === 'Verification check') {
        await checkUserVerification();
      } else if (errorState.context.includes('Verification')) {
        // Don't auto-retry verification submissions to avoid duplicates
        setErrorState(prev => prev ? {
          ...prev,
          userMessage: 'Please try your verification again manually',
          retryable: false
        } : null);
      }
    } catch (error) {
      handleError(error, `Retry ${errorState.context}`);
    }
  };

  // Enhanced verification check with comprehensive error handling
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
    }, 15000); // 15 second timeout

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

      // Only update state if component is still mounted
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

  // Enhanced verification handler with comprehensive error handling
  const handleVerification = async (
    type: 'confirm' | 'dispute' | 'additional_info',
    notes?: string,
    mode: 'quick' | 'detailed' = 'detailed'
  ) => {
    if (!onVerify) return;

    // Pre-flight checks
    if (!isOnline) {
      handleError(new Error('No internet connection'), 'Verification');
      return;
    }

    if (!isAuthenticated) {
      handleError(new Error('User not authenticated'), 'Verification');
      return;
    }

    setIsSubmitting(true);
    clearError();
    
    try {
      await onVerify(incident.id, type, notes);
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setHasVerified(true);
        
        // Only close panel and reset form for detailed mode
        if (mode === 'detailed') {
          resetVerificationForm();
        }
        
        // Clear any previous errors on success
        clearError();
        
        // Show success feedback
        if (window.gtag) {
          window.gtag('event', 'verification_success', {
            incident_id: incident.id,
            verification_type: type
          });
        }
      }
    } catch (error: any) {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        handleError(error, `Verification (${type})`);
      }
    } finally {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  // Use consolidated handler for detailed verification
  const handleVerificationSubmit = async () => {
    if (!selectedVerificationType) return;
    await handleVerification(selectedVerificationType, verificationNotes || undefined, 'detailed');
  };

  // Use consolidated handler for quick verification
  const handleQuickVerification = async (type: 'confirm' | 'dispute') => {
    await handleVerification(type, undefined, 'quick');
  };

  // Consolidated reset function for consistent state management
  const resetVerificationForm = () => {
    setShowVerificationPanel(false);
    setSelectedVerificationType(null);
    setVerificationNotes('');
    clearError();
  };

  // Initialize verification check
  useEffect(() => {
    checkUserVerification();
    
    // Cleanup function to abort the request if component unmounts or dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [incident.id, isAuthenticated, profile]);

  // Helper functions for UI
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

  // Enhanced error display component with comprehensive user guidance
  const ErrorDisplay = ({ error, onRetry, onDismiss }: { 
    error: ErrorState; 
    onRetry?: () => void; 
    onDismiss: () => void; 
  }) => {
    // Don't show expected errors to users (like AbortError)
    if (error.isExpected && process.env.NODE_ENV !== 'development') {
      return null;
    }

    const getErrorIcon = () => {
      switch (error.type) {
        case 'network':
          return <WifiOff className="w-5 h-5 text-red-600" />;
        case 'timeout':
          return <Clock className="w-5 h-5 text-amber-600" />;
        case 'authentication':
          return <Users className="w-5 h-5 text-red-600" />;
        case 'permission':
          return <AlertTriangle className="w-5 h-5 text-red-600" />;
        case 'validation':
          return <CheckCircle className="w-5 h-5 text-blue-600" />;
        case 'rate_limit':
          return <Clock className="w-5 h-5 text-amber-600" />;
        case 'maintenance':
          return <AlertTriangle className="w-5 h-5 text-orange-600" />;
        case 'server':
          return <AlertTriangle className="w-5 h-5 text-red-600" />;
        case 'abort':
          return <RefreshCw className="w-5 h-5 text-gray-600" />;
        default:
          return <AlertTriangle className="w-5 h-5 text-red-600" />;
      }
    };

    const getErrorColor = () => {
      if (error.isExpected) {
        return 'bg-gray-50 border-gray-200';
      }
      
      switch (error.severity) {
        case 'low':
          return 'bg-blue-50 border-blue-200';
        case 'medium':
          return 'bg-amber-50 border-amber-200';
        case 'high':
          return 'bg-red-50 border-red-200';
        case 'critical':
          return 'bg-red-100 border-red-300';
        default:
          return 'bg-gray-50 border-gray-200';
      }
    };

    const getTextColor = () => {
      if (error.isExpected) {
        return 'text-gray-800';
      }
      
      switch (error.severity) {
        case 'low':
          return 'text-blue-800';
        case 'medium':
          return 'text-amber-800';
        case 'high':
          return 'text-red-800';
        case 'critical':
          return 'text-red-900';
        default:
          return 'text-gray-800';
      }
    };

    return (
      <div className={`p-4 rounded-lg border ${getErrorColor()}`}>
        <div className="flex items-start space-x-3">
          {getErrorIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className={`font-medium ${getTextColor()}`}>
                {error.isExpected ? 'Request Cancelled' : error.userMessage}
              </h4>
              <button
                onClick={onDismiss}
                className={`${getTextColor()} hover:opacity-70 transition-opacity`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className={`text-sm mt-1 ${getTextColor()} opacity-80`}>
              {error.context}
            </p>

            {/* Suggested Actions - only for actionable errors */}
            {error.actionable && error.suggestedActions && error.suggestedActions.length > 0 && (
              <div className="mt-3">
                <p className={`text-xs font-medium ${getTextColor()}`}>What you can do:</p>
                <ul className={`text-xs mt-1 space-y-1 ${getTextColor()} opacity-80`}>
                  {error.suggestedActions.map((action, index) => (
                    <li key={index} className="flex items-start space-x-1">
                      <span>•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Action buttons */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-2">
                {error.retryable && onRetry && retryState.count < retryState.maxRetries && (
                  <button
                    onClick={onRetry}
                    disabled={!isOnline && error.type === 'network'}
                    className={`flex items-center space-x-1 text-xs font-medium px-3 py-1 rounded-md transition-colors ${getTextColor()} hover:bg-white hover:bg-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>
                      Retry {retryState.count > 0 && `(${retryState.count}/${retryState.maxRetries})`}
                    </span>
                  </button>
                )}
                
                {error.technicalDetails && process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={() => setShowErrorDetails(!showErrorDetails)}
                    className={`flex items-center space-x-1 text-xs font-medium px-3 py-1 rounded-md transition-colors ${getTextColor()} hover:bg-white hover:bg-opacity-50`}
                  >
                    <Info className="w-3 h-3" />
                    <span>{showErrorDetails ? 'Hide' : 'Show'} Details</span>
                  </button>
                )}
              </div>
              
              {/* Network status indicator */}
              <div className="flex items-center space-x-1">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-600" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-600" />
                )}
                <span className="text-xs text-gray-500">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            {/* Technical Details (collapsible) - only in development */}
            {showErrorDetails && error.technicalDetails && process.env.NODE_ENV === 'development' && (
              <div className="mt-3 p-2 bg-gray-100 rounded text-xs font-mono text-gray-700 overflow-x-auto">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">Technical Details:</span>
                  <button
                    onClick={() => navigator.clipboard?.writeText(error.technicalDetails || '')}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <pre className="whitespace-pre-wrap break-all">
                  {error.technicalDetails}
                </pre>
              </div>
            )}
          </div>
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

            {/* Enhanced Error Display */}
            {errorState && (
              <div className="mt-3">
                <ErrorDisplay
                  error={errorState}
                  onRetry={errorState.retryable ? handleRetry : undefined}
                  onDismiss={clearError}
                />
              </div>
            )}

            {/* Network Status Indicator */}
            {!isOnline && (
              <div className="mt-2 flex items-center space-x-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                <WifiOff className="w-3 h-3" />
                <span>You're offline. Some features may not work until connection is restored.</span>
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