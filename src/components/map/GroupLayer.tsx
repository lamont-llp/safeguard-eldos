import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { MapContextType } from './MapContainer';

export interface MapCommunityGroup {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  member_count: number;
  group_type: string;
}

interface GroupLayerProps {
  mapContext: MapContextType;
  groups: MapCommunityGroup[];
  isActive: boolean;
  onGroupClick?: (group: MapCommunityGroup) => void;
}

interface MarkerRecord {
  marker: maplibregl.Marker;
  cleanup: () => void;
}

const GroupLayer: React.FC<GroupLayerProps> = ({
  mapContext,
  groups,
  isActive,
  onGroupClick
}) => {
  const markersRef = useRef<MarkerRecord[]>([]);
  const { map, mapLoaded, handleError, isMounted } = mapContext;

  // Create group marker element
  const createGroupMarker = useCallback((group: MapCommunityGroup): HTMLElement => {
    const el = document.createElement('div');
    el.className = 'group-marker';
    el.style.cssText = `
      width: 36px;
      height: 36px;
      border-radius: 50%;
      cursor: pointer;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      background-color: #8B5CF6;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      position: relative;
    `;
    el.innerHTML = '👥';

    // Add member count badge
    if (group.member_count > 0) {
      const badge = document.createElement('div');
      badge.style.cssText = `
        position: absolute;
        top: -2px;
        right: -2px;
        background-color: #059669;
        color: white;
        border-radius: 50%;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        border: 2px solid white;
      `;
      badge.innerHTML = group.member_count > 99 ? '99+' : group.member_count.toString();
      el.appendChild(badge);
    }

    return el;
  }, []);

  // Create marker with event handlers
  const createMarkerRecord = useCallback((group: MapCommunityGroup): MarkerRecord | null => {
    try {
      if (!map) return null;

      const el = createGroupMarker(group);
      
      const marker = new maplibregl.Marker(el)
        .setLngLat([group.longitude, group.latitude])
        .addTo(map);

      // Add click handler
      const clickHandler = (e: Event) => {
        try {
          e.stopPropagation();
          if (onGroupClick) {
            onGroupClick(group);
          } else {
            // Default popup
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
              .addTo(map);
          }
        } catch (error) {
          handleError(error, 'Group marker click');
        }
      };

      el.addEventListener('click', clickHandler);

      // Cleanup function
      const cleanup = () => {
        try {
          el.removeEventListener('click', clickHandler);
          marker.remove();
        } catch (error) {
          console.warn('Error cleaning up group marker:', error);
        }
      };

      return { marker, cleanup };
    } catch (error) {
      handleError(error, 'Creating group marker');
      return null;
    }
  }, [map, createGroupMarker, onGroupClick, handleError]);

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

  // Update markers when groups change
  useEffect(() => {
    if (!map || !mapLoaded || !isMounted()) return;

    try {
      // Clean up existing markers
      cleanupMarkers();

      // Only create markers if this layer is active
      if (isActive) {
        const newMarkers = groups
          .map(group => createMarkerRecord(group))
          .filter((marker): marker is MarkerRecord => marker !== null);

        markersRef.current = newMarkers;

        console.log(`✅ Created ${newMarkers.length} group markers`);
      }
    } catch (error) {
      handleError(error, 'Updating group markers');
    }
  }, [map, mapLoaded, groups, isActive, createMarkerRecord, cleanupMarkers, handleError, isMounted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupMarkers();
    };
  }, [cleanupMarkers]);

  // This component doesn't render anything directly
  return null;
};

export default GroupLayer;