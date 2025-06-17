import React, { useState } from 'react';
import { ArrowLeft, Camera, Mic, MapPin, Shield, AlertCircle, Clock, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

const ReportIncident = () => {
  const [selectedType, setSelectedType] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const incidentTypes = [
    { id: 'theft', label: 'Theft/Robbery', icon: '🚨', color: 'bg-red-100 text-red-800 border-red-200' },
    { id: 'suspicious', label: 'Suspicious Activity', icon: '👀', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    { id: 'gang', label: 'Gang Activity', icon: '⚠️', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    { id: 'drugs', label: 'Drug Activity', icon: '💊', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    { id: 'vandalism', label: 'Vandalism', icon: '🔨', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { id: 'other', label: 'Other', icon: '📝', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate report submission
    alert('Incident reported successfully. Community has been notified.');
  };

  const getCurrentLocation = () => {
    setLocation('Getting location...');
    // Simulate geolocation
    setTimeout(() => {
      setLocation('Klipriver Road, Extension 8, Eldorado Park');
    }, 1000);
  };

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
            <p className="text-red-100 text-sm">Anonymous & Secure</p>
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
          <button className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center space-x-1">
            <Phone className="w-4 h-4" />
            <span>Call 10111</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-6 mt-6 space-y-6">
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
                } ${type.color}`}
              >
                <div className="text-2xl mb-2">{type.icon}</div>
                <div className="font-medium text-sm">{type.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location *
          </label>
          <div className="relative">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter or detect location"
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-12"
            />
            <button
              type="button"
              onClick={getCurrentLocation}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-600 hover:text-red-700"
            >
              <MapPin className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Urgency Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <h3 className="font-medium text-gray-900">Mark as Urgent</h3>
            <p className="text-sm text-gray-500">Notify community immediately</p>
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
            Description
          </label>
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you observed (optional)"
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
                Reports are anonymous. No personal information is stored or shared.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!selectedType || !location}
          className="w-full bg-red-600 text-white py-4 px-6 rounded-xl font-semibold text-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
        >
          <Shield className="w-5 h-5" />
          <span>Submit Report</span>
        </button>

        <p className="text-center text-xs text-gray-500 mt-4">
          By submitting, you agree to our community safety guidelines
        </p>
      </form>
    </div>
  );
};

export default ReportIncident;