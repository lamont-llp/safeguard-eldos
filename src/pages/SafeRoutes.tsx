import React, { useState } from 'react';
import { ArrowLeft, Navigation, MapPin, Clock, Shield, AlertTriangle, CheckCircle, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const SafeRoutes = () => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedRoute, setSelectedRoute] = useState(0);

  const routes = [
    {
      id: 1,
      name: 'Main Route',
      duration: '12 min walk',
      distance: '850m',
      safetyScore: 95,
      incidents: 0,
      lighting: 'good',
      features: ['Well-lit streets', 'Community patrol area', 'CCTV coverage'],
      status: 'safe',
    },
    {
      id: 2,
      name: 'School Route',
      duration: '15 min walk',
      distance: '1.1km',
      safetyScore: 87,
      incidents: 1,
      lighting: 'moderate',
      features: ['School patrol times', 'Busy during day', 'Some dark spots'],
      status: 'caution',
    },
    {
      id: 3,
      name: 'Back Route',
      duration: '18 min walk',
      distance: '1.3km',
      safetyScore: 72,
      incidents: 2,
      lighting: 'poor',
      features: ['Quieter streets', 'Recent incidents', 'Avoid after dark'],
      status: 'warning',
    },
  ];

  const popularDestinations = [
    'Eldorado Shopping Centre',
    'Eldorado Primary School',
    'Community Hall',
    'Clinic',
    'Library',
    'Sports Complex',
  ];

  const getRouteStatusColor = (status: string) => {
    switch (status) {
      case 'safe':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'caution':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'warning':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRouteIcon = (status: string) => {
    switch (status) {
      case 'safe':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'caution':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Shield className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="flex items-center space-x-4">
          <Link to="/" className="p-2 hover:bg-blue-500 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Safe Routes</h1>
            <p className="text-blue-100 text-sm">Community-verified safe paths</p>
          </div>
        </div>
      </div>

      <div className="px-6 mt-6 space-y-6">
        {/* Route Planning */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Plan Your Route</h2>
          
          <div className="space-y-4">
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-green-500" />
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="From (current location)"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-red-500" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="To (destination)"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2">
              <Navigation className="w-5 h-5" />
              <span>Find Safe Routes</span>
            </button>
          </div>
        </div>

        {/* Popular Destinations */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Popular Destinations</h3>
          <div className="grid grid-cols-2 gap-2">
            {popularDestinations.map((destination, index) => (
              <button
                key={index}
                onClick={() => setDestination(destination)}
                className="p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">{destination}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Route Options */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Routes</h3>
          <div className="space-y-3">
            {routes.map((route, index) => (
              <div
                key={route.id}
                onClick={() => setSelectedRoute(index)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedRoute === index
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getRouteIcon(route.status)}
                    <div>
                      <h4 className="font-semibold text-gray-900">{route.name}</h4>
                      <div className="flex items-center space-x-3 text-sm text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{route.duration}</span>
                        </span>
                        <span>{route.distance}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="font-semibold text-gray-900">{route.safetyScore}</span>
                    </div>
                    <span className="text-sm text-gray-500">Safety Score</span>
                  </div>
                </div>
                
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRouteStatusColor(route.status)}`}>
                  {route.incidents === 0 ? 'No recent incidents' : `${route.incidents} recent incident${route.incidents > 1 ? 's' : ''}`}
                </div>
                
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">Route Features:</p>
                  <div className="flex flex-wrap gap-2">
                    {route.features.map((feature, featureIndex) => (
                      <span
                        key={featureIndex}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Tips */}
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900">Safety Tips</h3>
              <ul className="text-amber-800 text-sm mt-2 space-y-1">
                <li>• Travel in groups when possible</li>
                <li>• Avoid routes after 8 PM</li>
                <li>• Stay alert and aware of surroundings</li>
                <li>• Report any suspicious activity</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafeRoutes;