import React, { useState, useEffect } from 'react';
import { ArrowLeft, Camera, Mic, MapPin, Shield, AlertCircle, Clock, Phone, Send, Loader2, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useIncidents } from '../hooks/useIncidents';
import { useLocation } from '../hooks/useLocation';
import { useAuthModal } from '../components/AuthModal';

const ReportIncident = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();
  const { reportIncident } = useIncidents();
  const { latitude, longitude, getLocationString, getCurrentLocation } = useLocation();
  const { openSignIn, AuthModal } = useAuthModal();

  const [selectedType, setSelectedType] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationArea, setLocationArea] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  const incidentTypes = [
    { 
      id: 'theft', 
      label: 'Theft/Robbery', 
      icon: '🚨', 
      color: 'bg-red-100 text-red-800 border-red-200',
      description: 'Theft, robbery, or burglary'
    },
    { 
      id: 'suspicious_activity', 
      label: 'Suspicious Activity', 
      icon: '👀', 
      color: 'bg-amber-100 text-amber-800 border-amber-200',
      description: 'Unusual or concerning behavior'
    },
    { 
      id: 'gang_activity', 
      label: 'Gang Activity', 
      icon: '⚠️', 
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      description: 'Gang-related incidents'
    },
    { 
      id: 'drugs', 
      label: 'Drug Activity', 
      icon: '💊', 
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      description: 'Drug dealing or substance abuse'
    },
    { 
      id: 'vandalism', 
      label: 'Vandalism', 
      icon: '🔨', 
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      description: 'Property damage or graffiti'
    },
    { 
      id: 'other', 
      label: 'Other', 
      icon: '📝', 
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      description: 'Other safety concerns'
    },
  ];

  const severityLevels = [
    { id: 'low', label: 'Low', color: 'bg-green-100 text-green-800', description: 'Minor concern' },
    { id: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800', description: 'Moderate concern' },
    { id: 'high', label: 'High', color: 'bg-orange-100 text-orange-800', description: 'Serious concern' },
    { id: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800', description: 'Immediate danger' },
  ];

  useEffect(() => {
    // Auto-populate location when available
    if (latitude && longitude) {
      getLocationString().then(address => {
        setLocationAddress(address);
      });
    }
  }, [latitude, longitude]);

  useEffect(() => {
    // Auto-generate title based on type and severity
    if (selectedType && selectedSeverity) {
      const typeLabel = incidentTypes.find(t => t.id === selectedType)?.label || '';
      const severityLabel = severityLevels.find(s => s.id === selectedSeverity)?.label || '';
      setTitle(`${severityLabel} ${typeLabel} Incident`);
    }
  }, [selectedType, selectedSeverity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isAuthenticated) {
      openSignIn();
      return;
    }

    if (!selectedType || !title || !locationAddress) {
      setError('Please fill in all required fields');
      return;
    }

    if (!latitude || !longitude) {
      setError('Location is required. Please enable location services or enter manually.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await reportIncident({
        incident_type: selectedType as any,
        severity: selectedSeverity as any,
        title,
        description,
        location_address: locationAddress,
        location_area: locationArea,
        latitude,
        longitude,
        is_urgent: isUrgent
      });

      if (error) throw error;

      setShowSuccess(true);
      
      // Reset form after successful submission
      setTimeout(() => {
        setShowSuccess(false);
        navigate('/');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to submit incident report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGetCurrentLocation = () => {
    getCurrentLocation();
    setLocationAddress('Getting location...');
  };

  const handleEmergencyCall = () => {
    window.open('tel:10111', '_self');
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Report Submitted</h2>
          <p className="text-gray-600 mb-4">
            Your incident report has been submitted successfully. The community has been notified.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-blue-800 text-sm">
              <strong>Anonymous & Secure:</strong> Your identity remains protected while helping keep the community safe.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
        <div className="flex items-center space-x-4">
          <Link to="/" className="p-2 hover:bg-red-500 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Report Incident</h1>
            <p className="text-red-100 text-sm">
              {isAuthenticated ? 'Anonymous & Secure' : 'Sign in to report incidents'}
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Contact Bar */}
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-6 mt-4 rounded-r-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 font-medium">Emergency? Call 10111</span>
          </div>
          <button 
            onClick={handleEmergencyCall}
            className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center space-x-1"
          >
            <Phone className="w-4 h-4" />
            <span>Call 10111</span>
          </button>
        </div>
      </div>

      {/* Authentication Notice */}
      {!isAuthenticated && (
        <div className="bg-blue-50 border border-blue-200 p-4 mx-6 mt-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Sign In Required</h3>
              <p className="text-blue-700 text-sm mt-1">
                You need to sign in to report incidents. Your identity will remain anonymous to the community.
              </p>
              <button
                onClick={openSignIn}
                className="mt-2 text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors"
              >
                Sign In Now →
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="px-6 mt-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-800 text-sm font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Incident Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            What type of incident? *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {incidentTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedType(type.id)}
                className={`p-4 border-2 rounded-xl text-left transition-all ${
                  selectedType === type.id
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">{type.icon}</div>
                <div className="font-medium text-sm text-gray-900">{type.label}</div>
                <div className="text-xs text-gray-500 mt-1">{type.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Severity Level */}
        {selectedType && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              How serious is this incident? *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {severityLevels.map((severity) => (
                <button
                  key={severity.id}
                  type="button"
                  onClick={() => setSelectedSeverity(severity.id)}
                  className={`p-3 border-2 rounded-lg text-left transition-all ${
                    selectedSeverity === severity.id
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${severity.color}`}>
                    {severity.label}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{severity.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Title */}
        {selectedType && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Incident Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the incident"
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
            />
          </div>
        )}

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location *
          </label>
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="Enter specific address or landmark"
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-12"
                required
              />
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-600 hover:text-red-700 transition-colors"
              >
                <MapPin className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={locationArea}
              onChange={(e) => setLocationArea(e.target.value)}
              placeholder="Area/Extension (e.g., Extension 8)"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>

        {/* Urgency Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <h3 className="font-medium text-gray-900">Mark as Urgent</h3>
            <p className="text-sm text-gray-500">Notify community immediately for critical situations</p>
          </div>
          <button
            type="button"
            onClick={() => setIsUrgent(!isUrgent)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isUrgent ? 'bg-red-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isUrgent ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Details
          </label>
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more details about what you observed (optional)"
              rows={4}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
            />
            <div className="absolute bottom-3 right-3 flex space-x-2">
              <button
                type="button"
                onClick={() => setIsRecording(!isRecording)}
                className={`p-2 rounded-lg transition-colors ${
                  isRecording ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg transition-colors"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>
          </div>
          {isRecording && (
            <div className="mt-2 flex items-center space-x-2 text-red-600">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Recording... Tap mic to stop</span>
            </div>
          )}
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Your Privacy is Protected</h3>
              <p className="text-blue-700 text-sm mt-1">
                Reports are anonymous to the community. Only you and verified moderators can see your identity.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isAuthenticated || !selectedType || !title || !locationAddress || isSubmitting}
          className="w-full bg-red-600 text-white py-4 px-6 rounded-xl font-semibold text-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Submitting Report...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Submit Report</span>
            </>
          )}
        </button>

        <p className="text-center text-xs text-gray-500 mt-4">
          By submitting, you agree to our community safety guidelines and confirm the information is accurate
        </p>
      </form>

      {/* Auth Modal */}
      <AuthModal />
    </div>
  );
};

export default ReportIncident;