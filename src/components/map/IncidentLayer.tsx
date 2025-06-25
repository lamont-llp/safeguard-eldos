import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { MapContextType } from './MapContainer';

export interface MapIncident {
  id: string;
  latitude: number;
  longitude: number;
  incident_type: string;
  severity: string;
  title: string;
  is_verified: boolean;
  is_urgent: boolean;
  created_at: string;
}

interface IncidentLayerProps {
  mapContext: MapContextType;
  incidents: MapIncident[];
  isActive: boolean;
  onIncidentClick?: (incident: MapIncident) => void;
}

interface MarkerRecord {
  marker: maplibregl.Marker;
  cleanup: () => void;
}

const IncidentLayer: React.FC<IncidentLayerProps> = ({
  mapContext,
  incidents,
  isActive,
  onIncidentClick
}) => {
  const markersRef = useRef<MarkerRecord[]>([]);
  const { map, mapLoaded, handleError, isMounted } = mapContext;

  // Create incident marker element
  const createIncidentMarker = useCallback((incident: MapIncident): HTMLElement => {
    const el = document.createElement('div');
    el.className = 'incident-marker';
    el.style.cssText = `
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      color: white;
      position: relative;
    `;
    
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
      verifiedBadge.style.cssText = `
        position: absolute;
        top: -2px;
        right: -2px;
        width: 12px;
        height: 12px;
        background-color: #059669;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 8px;
        color: white;
      `;
      verifiedBadge.innerHTML = '✓';
      el.appendChild(verifiedBadge);
    }

    return el;
  }, []);

  // Create marker with event handlers
  const createMarkerRecord = useCallback((incident: MapIncident): MarkerRecord | null => {
    try {
      if (!map) return null;

      const el = createIncidentMarker(incident);
      
      const marker = new maplibregl.Marker(el)
        .setLngLat([incident.longitude, incident.latitude])
        .addTo(map);

      // Add click handler
      const clickHandler = (e: Event) => {
        try {
          e.stopPropagation();
          if (onIncidentClick) {
            onIncidentClick(incident);
          } else {
            // Default popup
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
              .addTo(map);
          }
        } catch (error) {
          handleError(error, 'Incident marker click');
        }
      };

      el.addEventListener('click', clickHandler);

      // Cleanup function
      const cleanup = () => {
        try {
          el.removeEventListener('click', clickHandler);
          marker.remove();
        } catch (error) {
          console.warn('Error cleaning up incident marker:', error);
        }
      };

      return { marker, cleanup };
    } catch (error) {
      handleError(error, 'Creating incident marker');
      return null;
    }
  }, [map, createIncidentMarker, onIncidentClick, handleError]);

  // Clean up all markers
  const cleanupMarkers = useCallback(() => {
    markersRef.current.forEach(markerRecord => {
      try {
        markerRecord.cleanup();
      } catch (error) {
        console.warn('Error cleaning up marker:', error);
      }
    });
    markersRef.current = [];
  }, []);

  // Update markers when incidents change
  useEffect(() => {
    if (!map || !mapLoaded || !isMounted()) return;

    try {
      // Clean up existing markers
      cleanupMarkers();

      // Only create markers if this layer is active
      if (isActive) {
        const newMarkers = incidents
          .map(incident => createMarkerRecord(incident))
          .filter((marker): marker is MarkerRecord => marker !== null);

        markersRef.current = newMarkers;

        console.log(`✅ Created ${newMarkers.length} incident markers`);
      }
    } catch (error) {
      handleError(error, 'Updating incident markers');
    }
  }, [map, mapLoaded, incidents, isActive, createMarkerRecord, cleanupMarkers, handleError, isMounted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupMarkers();
    };
  }, [cleanupMarkers]);

  // This component doesn't render anything directly
  return null;
};

export default IncidentLayer;