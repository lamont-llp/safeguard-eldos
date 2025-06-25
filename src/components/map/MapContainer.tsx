import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AlertTriangle } from 'lucide-react';

// Types
export interface MapContextType {
  map: maplibregl.Map | null;
  mapLoaded: boolean;
  addEventListener: (event: string, handler: any) => void;
  removeEventListener: (event: string, handler: any) => void;
  handleError: (error: any, context: string) => void;
  isMounted: () => boolean;
}

interface MapContainerProps {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  interactive?: boolean;
  showControls?: boolean;
  className?: string;
  onMapClick?: (e: { lngLat: { lat: number; lng: number } }) => void;
  children: (context: MapContextType) => React.ReactNode;
}

interface ErrorState {
  hasError: boolean;
  message: string;
  context: string;
  timestamp: number;
}

const MapContainer: React.FC<MapContainerProps> = ({
  latitude = -26.3054,
  longitude = 27.9389,
  zoom = 14,
  interactive = true,
  showControls = true,
  className = "w-full h-64",
  onMapClick,
  children
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    message: '',
    context: '',
    timestamp: 0
  });

  // Track component mount status and event listeners
  const isMountedRef = useRef(true);
  const eventListenersRef = useRef<Array<{ event: string; handler: any }>>([]);

  // Error handling
  const handleError = useCallback((error: any, context: string) => {
    console.error(`MapContainer error in ${context}:`, error);
    
    if (!isMountedRef.current) return;
    
    setErrorState({
      hasError: true,
      message: error.message || 'An unexpected error occurred',
      context,
      timestamp: Date.now()
    });
  }, []);

  // Safe state update helper
  const safeSetState = useCallback((updateFn: () => void) => {
    if (isMountedRef.current) {
      try {
        updateFn();
      } catch (error) {
        handleError(error, 'State update');
      }
    }
  }, [handleError]);

  // Event listener management
  const addEventListener = useCallback((event: string, handler: any) => {
    try {
      if (map.current) {
        map.current.on(event, handler);
        eventListenersRef.current.push({ event, handler });
      }
    } catch (error) {
      handleError(error, `Adding event listener for ${event}`);
    }
  }, [handleError]);

  const removeEventListener = useCallback((event: string, handler: any) => {
    try {
      if (map.current) {
        map.current.off(event, handler);
        eventListenersRef.current = eventListenersRef.current.filter(
          listener => !(listener.event === event && listener.handler === handler)
        );
      }
    } catch (error) {
      handleError(error, `Removing event listener for ${event}`);
    }
  }, [handleError]);

  // Check if component is mounted
  const isMounted = useCallback(() => isMountedRef.current, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'osm': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'osm',
              type: 'raster',
              source: 'osm'
            }
          ]
        },
        center: [longitude, latitude],
        zoom: zoom,
        interactive: interactive
      });

      map.current.on('load', () => {
        safeSetState(() => {
          setMapLoaded(true);
        });
      });

      map.current.on('error', (e) => {
        handleError(e.error, 'Map initialization');
      });

      // Add map click handler if provided
      if (onMapClick) {
        const mapClickHandler = (e: any) => {
          try {
            onMapClick({ lngLat: { lat: e.lngLat.lat, lng: e.lngLat.lng } });
          } catch (error) {
            handleError(error, 'Map click handler');
          }
        };

        addEventListener('click', mapClickHandler);
      }

      // Add navigation controls if interactive
      if (interactive && showControls) {
        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      }

    } catch (error) {
      handleError(error, 'Map initialization');
    }

    return () => {
      isMountedRef.current = false;
      
      // Clean up event listeners
      eventListenersRef.current.forEach(({ event, handler }) => {
        try {
          map.current?.off(event, handler);
        } catch (error) {
          console.warn(`Error removing event listener for ${event}:`, error);
        }
      });
      eventListenersRef.current = [];

      // Remove map
      if (map.current) {
        try {
          map.current.remove();
          map.current = null;
        } catch (error) {
          console.warn('Error removing map:', error);
        }
      }
    };
  }, [longitude, latitude, zoom, interactive, showControls, onMapClick, addEventListener, handleError, safeSetState]);

  // Error boundary
  if (errorState.hasError) {
    return (
      <div className={`${className} flex items-center justify-center bg-red-50 border border-red-200 rounded-lg`}>
        <div className="text-center p-4">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium">Map Error</p>
          <p className="text-red-600 text-sm">{errorState.message}</p>
          <p className="text-red-500 text-xs mt-1">Context: {errorState.context}</p>
          <button
            onClick={() => {
              setErrorState({ hasError: false, message: '', context: '', timestamp: 0 });
              window.location.reload();
            }}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
          >
            Reload Map
          </button>
        </div>
      </div>
    );
  }

  const mapContext: MapContextType = {
    map: map.current,
    mapLoaded,
    addEventListener,
    removeEventListener,
    handleError,
    isMounted
  };

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden" />
      
      {/* Loading Overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Render children with map context */}
      {mapLoaded && children(mapContext)}
    </div>
  );
};

export default MapContainer;