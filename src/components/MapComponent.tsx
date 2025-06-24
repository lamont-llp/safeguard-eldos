import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, Layers, Navigation, Zap, AlertTriangle, Shield, Users } from 'lucide-react';

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
  zoom = 14
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeLayer, setActiveLayer] = useState<'incidents' | 'routes' | 'groups'>('incidents');
  const [userLocationMarker, setUserLocationMarker] = useState<maplibregl.Marker | null>(null);
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
      if (userLocationMarker) {
        userLocationMarker.remove();
      }
      
      const marker = new maplibregl.Marker({
        color: '#3B82F6',
        scale: 0.8
      })
        .setLngLat([longitude, latitude])
        .addTo(map.current);
      
      setUserLocationMarker(marker);
    }
  }, [latitude, longitude, mapLoaded]);

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
        el.style.width = '24px';
        el.style.height = '24px';
        el.style.borderRadius = '50%';
        el.style.cursor = 'pointer';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        
        // Color based on severity and urgency
        if (incident.is_urgent) {
          el.style.backgroundColor = '#DC2626'; // Red for urgent
          el.style.animation = 'pulse 2s infinite';
        } else if (incident.severity === 'high' || incident.severity === 'critical') {
          el.style.backgroundColor = '#F59E0B'; // Orange for high
        } else {
          el.style.backgroundColor = '#10B981'; // Green for low/medium
        }

        // Add verification indicator
        if (incident.is_verified) {
          el.innerHTML = '✓';
          el.style.color = 'white';
          el.style.fontSize = '12px';
          el.style.fontWeight = 'bold';
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
            new maplibregl.Popup()
              .setLngLat([incident.longitude, incident.latitude])
              .setHTML(`
                <div class="p-2">
                  <h3 class="font-semibold text-sm">${incident.title}</h3>
                  <p class="text-xs text-gray-600">${incident.incident_type}</p>
                  <p class="text-xs text-gray-500">${new Date(incident.created_at).toLocaleDateString()}</p>
                  ${incident.is_verified ? '<span class="text-xs text-green-600">✓ Verified</span>' : ''}
                  ${incident.is_urgent ? '<span class="text-xs text-red-600">🚨 Urgent</span>' : ''}
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
          'line-width': 4,
          'line-opacity': 0.8
        }
      });

      // Add click handler for routes
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
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.borderRadius = '50%';
        el.style.cursor = 'pointer';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.backgroundColor = '#8B5CF6'; // Purple for groups
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        
        // Add group icon
        el.innerHTML = '👥';
        el.style.fontSize = '16px';

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
              <div class="p-2">
                <h3 class="font-semibold text-sm">${group.name}</h3>
                <p class="text-xs text-gray-600">${group.group_type}</p>
                <p class="text-xs text-gray-500">${group.member_count} members</p>
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
                <div className="w-3 h-3 rounded-full bg-red-600"></div>
                <span className="text-xs text-gray-600">Urgent</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-xs text-gray-600">High Severity</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-600">Low/Medium</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs">✓</span>
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
                <span className="text-xs text-gray-600">Caution (<50)</span>
              </div>
            </div>
          )}
          
          {activeLayer === 'groups' && (
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs">👥</div>
                <span className="text-xs text-gray-600">Community Groups</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Location Indicator */}
      {latitude && longitude && (
        <div className="absolute bottom-4 right-4 bg-blue-600 text-white p-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
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
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default MapComponent;