import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { MapContextType } from './MapContainer';

export interface MapSafeRoute {
  id: string;
  name: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  safety_score: number;
  lighting_quality: string;
}

interface RouteLayerProps {
  mapContext: MapContextType;
  routes: MapSafeRoute[];
  isActive: boolean;
  onRouteClick?: (route: MapSafeRoute) => void;
}

interface MarkerRecord {
  marker: maplibregl.Marker;
  cleanup: () => void;
}

interface LayerState {
  layerExists: boolean;
  sourceExists: boolean;
  lastRouteData: string;
}

const RouteLayer: React.FC<RouteLayerProps> = ({
  mapContext,
  routes,
  isActive,
  onRouteClick
}) => {
  const markersRef = useRef<MarkerRecord[]>([]);
  const layerStateRef = useRef<LayerState>({
    layerExists: false,
    sourceExists: false,
    lastRouteData: ''
  });
  const { map, mapLoaded, addEventListener, removeEventListener, handleError, isMounted } = mapContext;

  // Create route marker element
  const createRouteMarker = useCallback((type: 'start' | 'end'): HTMLElement => {
    const el = document.createElement('div');
    el.style.cssText = `
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: ${type === 'start' ? '#10B981' : '#DC2626'};
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
    `;
    el.innerHTML = type === 'start' ? 'S' : 'E';
    return el;
  }, []);

  // Create marker with event handlers
  const createMarkerRecord = useCallback((
    route: MapSafeRoute, 
    type: 'start' | 'end'
  ): MarkerRecord | null => {
    try {
      if (!map) return null;

      const el = createRouteMarker(type);
      const coordinates: [number, number] = type === 'start' 
        ? [route.start_lng, route.start_lat]
        : [route.end_lng, route.end_lat];
      
      const marker = new maplibregl.Marker(el)
        .setLngLat(coordinates)
        .addTo(map);

      // Add click handler
      const clickHandler = (e: Event) => {
        try {
          e.stopPropagation();
          if (onRouteClick) {
            onRouteClick(route);
          } else {
            // Default popup
            new maplibregl.Popup()
              .setLngLat(coordinates)
              .setHTML(`
                <div class="p-3">
                  <h3 class="font-semibold text-sm mb-2">${route.name}</h3>
                  <div class="space-y-1 text-xs">
                    <p class="text-gray-600">Safety Score: ${route.safety_score}/100</p>
                    <p class="text-gray-600">Lighting: ${route.lighting_quality}</p>
                    <p class="text-gray-500 mt-2">📍 Route ${type === 'start' ? 'Start' : 'End'}</p>
                  </div>
                </div>
              `)
              .addTo(map);
          }
        } catch (error) {
          handleError(error, 'Route marker click');
        }
      };

      el.addEventListener('click', clickHandler);

      // Cleanup function
      const cleanup = () => {
        try {
          el.removeEventListener('click', clickHandler);
          marker.remove();
        } catch (error) {
          console.warn('Error cleaning up route marker:', error);
        }
      };

      return { marker, cleanup };
    } catch (error) {
      handleError(error, 'Creating route marker');
      return null;
    }
  }, [map, createRouteMarker, onRouteClick, handleError]);

  // Manage route lines layer
  const manageRouteLines = useCallback((forceUpdate = false) => {
    try {
      if (!map || !isActive) return;

      const currentRouteData = JSON.stringify(routes);
      const layerState = layerStateRef.current;
      
      const needsUpdate = forceUpdate || 
                         currentRouteData !== layerState.lastRouteData;

      if (!needsUpdate && layerState.layerExists) {
        return;
      }

      // Remove existing layers
      if (layerState.layerExists && map.getLayer('routes')) {
        map.removeLayer('routes');
      }
      if (layerState.sourceExists && map.getSource('routes')) {
        map.removeSource('routes');
      }

      layerStateRef.current = {
        layerExists: false,
        sourceExists: false,
        lastRouteData: currentRouteData
      };

      // Add new layers if we have routes
      if (routes.length > 0) {
        const routeFeatures = routes.map(route => ({
          type: 'Feature',
          properties: {
            id: route.id,
            name: route.name,
            safety_score: route.safety_score,
            lighting_quality: route.lighting_quality
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [route.start_lng, route.start_lat],
              [route.end_lng, route.end_lat]
            ]
          }
        }));

        // Add source
        map.addSource('routes', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: routeFeatures
          }
        });

        // Add layer
        map.addLayer({
          id: 'routes',
          type: 'line',
          source: 'routes',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': [
              'case',
              ['>=', ['get', 'safety_score'], 75], '#10B981', // Green for safe
              ['>=', ['get', 'safety_score'], 50], '#F59E0B', // Orange for moderate
              '#DC2626' // Red for unsafe
            ],
            'line-width': 5,
            'line-opacity': 0.8
          }
        });

        layerStateRef.current.layerExists = true;
        layerStateRef.current.sourceExists = true;

        // Add click handler for route lines
        const routeLineClickHandler = (e: any) => {
          try {
            if (e.features && e.features[0]) {
              const feature = e.features[0];
              const route = routes.find(r => r.id === feature.properties?.id);
              if (route) {
                if (onRouteClick) {
                  onRouteClick(route);
                } else {
                  new maplibregl.Popup({
                    closeButton: true,
                    closeOnClick: false
                  })
                    .setLngLat([e.lngLat.lng, e.lngLat.lat])
                    .setHTML(`
                      <div class="p-3">
                        <h3 class="font-semibold text-sm mb-2">${route.name}</h3>
                        <div class="space-y-1 text-xs">
                          <p class="text-gray-600">Safety Score: ${route.safety_score}/100</p>
                          <p class="text-gray-600">Lighting: ${route.lighting_quality}</p>
                          <p class="text-gray-500 mt-2">📍 Clicked at: ${e.lngLat.lat.toFixed(6)}, ${e.lngLat.lng.toFixed(6)}</p>
                        </div>
                      </div>
                    `)
                    .addTo(map);
                }
              }
            }
          } catch (error) {
            handleError(error, 'Route line click handler');
          }
        };

        addEventListener('click', routeLineClickHandler);
      }
    } catch (error) {
      handleError(error, 'Managing route lines');
    }
  }, [map, routes, isActive, onRouteClick, addEventListener, handleError]);

  // Clean up all markers
  const cleanupMarkers = useCallback(() => {
    markersRef.current.forEach(markerRecord => {
      try {
        markerRecord.cleanup();
      } catch (error) {
        console.warn('Error cleaning up route marker:', error);
      }
    });
    markersRef.current = [];
  }, []);

  // Clean up route lines
  const cleanupRouteLines = useCallback(() => {
    try {
      if (!map) return;

      const layerState = layerStateRef.current;
      
      if (layerState.layerExists && map.getLayer('routes')) {
        map.removeLayer('routes');
      }
      if (layerState.sourceExists && map.getSource('routes')) {
        map.removeSource('routes');
      }

      layerStateRef.current = {
        layerExists: false,
        sourceExists: false,
        lastRouteData: ''
      };
    } catch (error) {
      console.warn('Error cleaning up route lines:', error);
    }
  }, [map]);

  // Update routes when data changes
  useEffect(() => {
    if (!map || !mapLoaded || !isMounted()) return;

    try {
      // Clean up existing markers
      cleanupMarkers();

      if (isActive) {
        // Manage route lines
        manageRouteLines();

        // Create route markers
        const newMarkers: MarkerRecord[] = [];
        
        routes.forEach(route => {
          const startMarker = createMarkerRecord(route, 'start');
          const endMarker = createMarkerRecord(route, 'end');
          
          if (startMarker) newMarkers.push(startMarker);
          if (endMarker) newMarkers.push(endMarker);
        });

        markersRef.current = newMarkers;

        console.log(`✅ Created ${newMarkers.length} route markers and route lines`);
      } else {
        // Clean up route lines when not active
        cleanupRouteLines();
      }
    } catch (error) {
      handleError(error, 'Updating route layer');
    }
  }, [map, mapLoaded, routes, isActive, createMarkerRecord, cleanupMarkers, manageRouteLines, cleanupRouteLines, handleError, isMounted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupMarkers();
      cleanupRouteLines();
    };
  }, [cleanupMarkers, cleanupRouteLines]);

  // This component doesn't render anything directly
  return null;
};

export default RouteLayer;