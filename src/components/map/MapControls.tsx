import React from 'react';
import { Layers, Navigation, Users, AlertTriangle, Crosshair } from 'lucide-react';

interface MapControlsProps {
  activeLayer: 'incidents' | 'routes' | 'groups';
  onLayerChange: (layer: 'incidents' | 'routes' | 'groups') => void;
  incidentCount: number;
  routeCount: number;
  groupCount: number;
  showUserLocation?: boolean;
  userLatitude?: number;
  userLongitude?: number;
}

const MapControls: React.FC<MapControlsProps> = ({
  activeLayer,
  onLayerChange,
  incidentCount,
  routeCount,
  groupCount,
  showUserLocation = false,
  userLatitude,
  userLongitude
}) => {
  const getLayerIcon = (layer: string) => {
    switch (layer) {
      case 'incidents':
        return <AlertTriangle className="w-4 h-4" />;
      case 'routes':
        return <Navigation className="w-4 h-4" />;
      case 'groups':
        return <Users className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  const getLayerColor = (layer: string) => {
    switch (layer) {
      case 'incidents':
        return activeLayer === layer ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200';
      case 'routes':
        return activeLayer === layer ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200';
      case 'groups':
        return activeLayer === layer ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 hover:bg-gray-200';
    }
  };

  return (
    <>
      {/* Layer Controls */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 space-y-1">
        <div className="flex items-center space-x-1 text-xs text-gray-500 mb-2">
          <Layers className="w-3 h-3" />
          <span>Layers</span>
        </div>
        
        {[
          { id: 'incidents', label: 'Incidents', count: incidentCount },
          { id: 'routes', label: 'Routes', count: routeCount },
          { id: 'groups', label: 'Groups', count: groupCount }
        ].map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => onLayerChange(id as any)}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${getLayerColor(id)}`}
          >
            <div className="flex items-center space-x-2">
              {getLayerIcon(id)}
              <span>{label}</span>
            </div>
            <span className="text-xs">{count}</span>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
        <div className="text-xs font-medium text-gray-700 mb-2">Legend</div>
        
        {activeLayer === 'incidents' && (
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-white text-xs">🚨</div>
              <span className="text-xs text-gray-600">Urgent</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs">⚠️</div>
              <span className="text-xs text-gray-600">High Severity</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">📍</div>
              <span className="text-xs text-gray-600">Low/Medium</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-600 border border-white"></div>
              <span className="text-xs text-gray-600">Verified</span>
            </div>
          </div>
        )}
        
        {activeLayer === 'routes' && (
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-green-500"></div>
              <span className="text-xs text-gray-600">Safe (75+)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-orange-500"></div>
              <span className="text-xs text-gray-600">Moderate (50-74)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-red-500"></div>
              <span className="text-xs text-gray-600">Caution (50)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">S</div>
              <span className="text-xs text-gray-600">Start</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">E</div>
              <span className="text-xs text-gray-600">End</span>
            </div>
          </div>
        )}
        
        {activeLayer === 'groups' && (
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs">👥</div>
              <span className="text-xs text-gray-600">Community Groups</span>
            </div>
          </div>
        )}
      </div>

      {/* Current Location Indicator */}
      {showUserLocation && userLatitude && userLongitude && (
        <div className="absolute bottom-4 right-4 bg-blue-600 text-white p-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <Crosshair className="w-4 h-4" />
            <span className="text-xs font-medium">Your Location</span>
          </div>
        </div>
      )}
    </>
  );
};

export default MapControls;