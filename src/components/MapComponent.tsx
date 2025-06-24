import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, Layers, Navigation, Zap, AlertTriangle, Shield, Users, Crosshair } from 'lucide-react';

interface MapComponentProps {
  latitude?: number;
  longitude?: number;
  incidents?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    incident_type: string;
    severity: string;
    title: string;
    is_verified: boolean;
    is_urgent: boolean;
    created_at: string;
  }>;
  safeRoutes?: Array<{
    id: string;
    name: string;
    start_lat: number;
    start_lng: number;
    end_lat: number;
    end_lng: number;
    safety_score: number;
    lighting_quality: string;
  }>;
  communityGroups?: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    member_count: number;
    group_type: string;
  }>;
  onIncidentClick?: (incident: any) => void;
  onRouteClick?: (route: any) => void;
  onMapClick?: (e: { lngLat: { lat: number; lng: number } }) => void;
  className?: string;
  showControls?: boolean;
  interactive?: boolean;
  zoom?: number;
  showUserLocation?: boolean;
}

const MapComponent: React.FC<MapComponentProps> = ({
  latitude = -26.3054,
  longitude = 27.9389, // Default to Eldorado Park coordinates
  incidents = [],
  safeRoutes = [],
  communityGroups = [],
  onIncidentClick,
  onRouteClick,
  onMapClick,
  className = "w-full h-64",
  showControls = true,
  interactive = true,
  zoom = 14,
  showUserLocation = true
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeLayer, setActiveLayer] = useState<'incidents' | 'routes' | 'groups'>('incidents');
  const [userLocationMarker, setUserLocationMarker] = useState<maplibregl.Marker | null>(null);
  const [selectedLocationMarker, setSelectedLocationMarker] = useState<maplibregl.Marker | null>(null);
  const [markers, setMarkers] = useState<maplibregl.Marker[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

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
      setMapLoaded(true);
    });

    // Add click handler for map
    if (onMapClick) {
      map.current.on('click', (e) => {
        onMapClick({ lngLat: { lat: e.lngLat.lat, lng: e.lngLat.lng } });
        
        // Add/update selected location marker
        if (selectedLocationMarker) {
          selectedLocationMarker.remove();
        }
        
        const marker = new maplibregl.Marker({
          color: '#DC2626',
          scale: 1.2
        })
          .setLngLat([e.lngLat.lng, e.lngLat.lat])
          .addTo(map.current!);
        
        setSelectedLocationMarker(marker);
      });
    }

    // Add navigation controls if interactive
    if (interactive && showControls) {
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    }

    return () => {
      // Clean up markers
      markers.forEach(marker => marker.remove());
      if (userLocationMarker) {
        userLocationMarker.remove();
      }
      if (selectedLocationMarker) {
        selectedLocationMarker.remove();
      }
      
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update map center when coordinates change
  useEffect(() => {
    if (map.current && latitude && longitude) {
      map.current.setCenter([longitude, latitude]);
      
      // Add or update user location marker
      if (showUserLocation) {
        if (userLocationMarker) {
          userLocationMarker.remove();
        }
        
        // Create custom user location marker
        const el = document.createElement('div');
        el.className = 'user-location-marker';
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#3B82F6';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.innerHTML = '•';
        el.style.color = 'white';
        el.style.fontSize = '12px';
        el.style.fontWeight = 'bold';
        
        const marker = new maplibregl.Marker(el)
          .setLngLat([longitude, latitude])
          .addTo(map.current);
        
        setUserLocationMarker(marker);
      }
    }
  }, [latitude, longitude, mapLoaded, showUserLocation]);

  // Clean up existing markers
  const cleanupMarkers = () => {
    markers.forEach(marker => marker.remove());
    setMarkers([]);
  };

  // Add incidents to map
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    cleanupMarkers();

    if (activeLayer === 'incidents') {
      const newMarkers: maplibregl.Marker[] = [];
      
      incidents.forEach(incident => {
        const el = document.createElement('div');
        el.className = 'incident-marker';
        el.style.width = '28px';
        el.style.height = '28px';
        el.style.borderRadius = '50%';
        el.style.cursor = 'pointer';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontSize = '12px';
        el.style.fontWeight = 'bold';
        el.style.color = 'white';
        
        // Color based on severity and urgency
        if (incident.is_urgent) {
          el.style.backgroundColor = '#DC2626'; // Red for urgent
          el.style.animation = 'pulse 2s infinite';
          el.innerHTML = '🚨';
        } else if (incident.severity === 'high' || incident.severity === 'critical') {
          el.style.backgroundColor = '#F59E0B'; // Orange for high
          el.innerHTML = '⚠️';
        } else {
          el.style.backgroundColor = '#10B981'; // Green for low/medium
          el.innerHTML = '📍';
        }

        // Add verification indicator
        if (incident.is_verified) {
          el.style.border = '3px solid #059669';
          const verifiedBadge = document.createElement('div');
          verifiedBadge.style.position = 'absolute';
          verifiedBadge.style.top = '-2px';
          verifiedBadge.style.right = '-2px';
          verifiedBadge.style.width = '12px';
          verifiedBadge.style.height = '12px';
          verifiedBadge.style.backgroundColor = '#059669';
          verifiedBadge.style.borderRadius = '50%';
          verifiedBadge.style.display = 'flex';
          verifiedBadge.style.alignItems = 'center';
          verifiedBadge.style.justifyContent = 'center';
          verifiedBadge.style.fontSize = '8px';
          verifiedBadge.style.color = 'white';
          verifiedBadge.innerHTML = '✓';
          el.style.position = 'relative';
          el.appendChild(verifiedBadge);
        }

        const marker = new maplibregl.Marker(el)
          .setLngLat([incident.longitude, incident.latitude])
          .addTo(map.current!);

        newMarkers.push(marker);

        // Add popup on click
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onIncidentClick) {
            onIncidentClick(incident);
          } else {
            new maplibregl.Popup({
              closeButton: true,
              closeOnClick: false
            })
              .setLngLat([incident.longitude, incident.latitude])
              .setHTML(`
                <div class="p-3 max-w-xs">
                  <h3 class="font-semibold text-sm mb-2">${incident.title}</h3>
                  <div class="space-y-1 text-xs">
                    <p class="text-gray-600">Type: ${incident.incident_type.replace('_', ' ')}</p>
                    <p class="text-gray-600">Severity: ${incident.severity}</p>
                    <p class="text-gray-500">${new Date(incident.created_at).toLocaleDateString()}</p>
                    ${incident.is_verified ? '<span class="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs">✓ Verified</span>' : ''}
                    ${incident.is_urgent ? '<span class="inline-block bg-red-100 text-red-800 px-2 py-1 rounded text-xs">🚨 Urgent</span>' : ''}
                  </div>
                </div>
              `)
              .addTo(map.current!);
          }
        });
      });
      
      setMarkers(newMarkers);
    }
  }, [incidents, mapLoaded, activeLayer, onIncidentClick]);

  // Add safe routes to map
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing route layers
    if (map.current.getLayer('routes')) {
      map.current.removeLayer('routes');
    }
    if (map.current.getSource('routes')) {
      map.current.removeSource('routes');
    }

    if (activeLayer === 'routes' && safeRoutes.length > 0) {
      const routeFeatures = safeRoutes.map(route => ({
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

      map.current.addSource('routes', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: routeFeatures
        }
      });

      map.current.addLayer({
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

      // Add route markers for start/end points
      cleanupMarkers();
      const newMarkers: maplibregl.Marker[] = [];

      safeRoutes.forEach(route => {
        // Start marker
        const startEl = document.createElement('div');
        startEl.style.width = '24px';
        startEl.style.height = '24px';
        startEl.style.borderRadius = '50%';
        startEl.style.backgroundColor = '#10B981';
        startEl.style.border = '3px solid white';
        startEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        startEl.style.display = 'flex';
        startEl.style.alignItems = 'center';
        startEl.style.justifyContent = 'center';
        startEl.style.color = 'white';
        startEl.style.fontSize = '12px';
        startEl.style.fontWeight = 'bold';
        startEl.innerHTML = 'S';
        startEl.style.cursor = 'pointer';

        const startMarker = new maplibregl.Marker(startEl)
          .setLngLat([route.start_lng, route.start_lat])
          .addTo(map.current!);

        // End marker
        const endEl = document.createElement('div');
        endEl.style.width = '24px';
        endEl.style.height = '24px';
        endEl.style.borderRadius = '50%';
        endEl.style.backgroundColor = '#DC2626';
        endEl.style.border = '3px solid white';
        endEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        endEl.style.display = 'flex';
        endEl.style.alignItems = 'center';
        endEl.style.justifyContent = 'center';
        endEl.style.color = 'white';
        endEl.style.fontSize = '12px';
        endEl.style.fontWeight = 'bold';
        endEl.innerHTML = 'E';
        endEl.style.cursor = 'pointer';

        const endMarker = new maplibregl.Marker(endEl)
          .setLngLat([route.end_lng, route.end_lat])
          .addTo(map.current!);

        newMarkers.push(startMarker, endMarker);

        // Add click handlers
        [startEl, endEl].forEach(el => {
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (onRouteClick) {
              onRouteClick(route);
            } else {
              new maplibregl.Popup()
                .setLngLat([route.start_lng, route.start_lat])
                .setHTML(`
                  <div class="p-3">
                    <h3 class="font-semibold text-sm mb-2">${route.name}</h3>
                    <div class="space-y-1 text-xs">
                      <p class="text-gray-600">Safety Score: ${route.safety_score}/100</p>
                      <p class="text-gray-600">Lighting: ${route.lighting_quality}</p>
                    </div>
                  </div>
                `)
                .addTo(map.current!);
            }
          });
        });
      });

      setMarkers(newMarkers);

      // Add click handler for route lines
      map.current.on('click', 'routes', (e) => {
        if (e.features && e.features[0] && onRouteClick) {
          const feature = e.features[0];
          const route = safeRoutes.find(r => r.id === feature.properties?.id);
          if (route) {
            onRouteClick(route);
          }
        }
      });

      // Change cursor on hover
      map.current.on('mouseenter', 'routes', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });

      map.current.on('mouseleave', 'routes', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
        }
      });
    }
  }, [safeRoutes, mapLoaded, activeLayer, onRouteClick]);

  // Add community groups to map
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    cleanupMarkers();

    if (activeLayer === 'groups') {
      const newMarkers: maplibregl.Marker[] = [];
      
      communityGroups.forEach(group => {
        const el = document.createElement('div');
        el.className = 'group-marker';
        el.style.width = '36px';
        el.style.height = '36px';
        el.style.borderRadius = '50%';
        el.style.cursor = 'pointer';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        el.style.backgroundColor = '#8B5CF6'; // Purple for groups
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontSize = '18px';
        el.innerHTML = '👥';

        const marker = new maplibregl.Marker(el)
          .setLngLat([group.longitude, group.latitude])
          .addTo(map.current!);

        newMarkers.push(marker);

        // Add popup on click
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          new maplibregl.Popup()
            .setLngLat([group.longitude, group.latitude])
            .setHTML(`
              <div class="p-3">
                <h3 class="font-semibold text-sm mb-2">${group.name}</h3>
                <div class="space-y-1 text-xs">
                  <p class="text-gray-600">Type: ${group.group_type.replace('_', ' ')}</p>
                  <p class="text-gray-600">Members: ${group.member_count}</p>
                </div>
              </div>
            `)
            .addTo(map.current!);
        });
      });
      
      setMarkers(newMarkers);
    }
  }, [communityGroups, mapLoaded, activeLayer]);

  const getLayerIcon = (layer: string) => {
    switch (layer) {
      case 'incidents':
        return <AlertTriangle className="w-4 h-4" />;
      case 'routes':
        return <Navigation className="w-4 h-4" />;
      case 'groups':
        return <Users className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
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
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden" />
      
      {/* Layer Controls */}
      {showControls && interactive && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 space-y-1">
          <div className="flex items-center space-x-1 text-xs text-gray-500 mb-2">
            <Layers className="w-3 h-3" />
            <span>Layers</span>
          </div>
          
          {[
            { id: 'incidents', label: 'Incidents', count: incidents.length },
            { id: 'routes', label: 'Routes', count: safeRoutes.length },
            { id: 'groups', label: 'Groups', count: communityGroups.length }
          ].map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setActiveLayer(id as any)}
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
      )}

      {/* Legend */}
      {showControls && interactive && (
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
                <span className="text-xs text-gray-600">Caution (&lt;50)</span>
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
      )}

      {/* Current Location Indicator */}
      {showUserLocation && latitude && longitude && (
        <div className="absolute bottom-4 right-4 bg-blue-600 text-white p-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <Crosshair className="w-4 h-4" />
            <span className="text-xs font-medium">Your Location</span>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

export default MapComponent;