import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { MapContextType } from './MapContainer';

interface UserLocationLayerProps {
  mapContext: MapContextType;
  latitude?: number;
  longitude?: number;
  showUserLocation?: boolean;
}

const UserLocationLayer: React.FC<UserLocationLayerProps> = ({
  mapContext,
  latitude,
  longitude,
  showUserLocation = true
}) => {
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const { map, mapLoaded, handleError, isMounted } = mapContext;

  // Create user location marker element
  const createUserLocationMarker = useCallback((): HTMLElement => {
    const el = document.createElement('div');
    el.className = 'user-location-marker';
    el.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: #3B82F6;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: bold;
    `;
    el.innerHTML = '•';
    return el;
  }, []);

  // Clean up existing marker
  const cleanupMarker = useCallback(() => {
    if (markerRef.current) {
      try {
        markerRef.current.remove();
        markerRef.current = null;
      } catch (error) {
        console.warn('Error cleaning up user location marker:', error);
      }
    }
  }, []);

  // Update user location marker
  useEffect(() => {
    if (!map || !mapLoaded || !isMounted()) return;

    try {
      // Clean up existing marker
      cleanupMarker();

      // Create new marker if location is available and should be shown
      if (showUserLocation && latitude && longitude) {
        const el = createUserLocationMarker();
        
        const marker = new maplibregl.Marker(el)
          .setLngLat([longitude, latitude])
          .addTo(map);
        
        markerRef.current = marker;

        console.log('✅ Created user location marker');
      }
    } catch (error) {
      handleError(error, 'Updating user location marker');
    }
  }, [map, mapLoaded, latitude, longitude, showUserLocation, createUserLocationMarker, cleanupMarker, handleError, isMounted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupMarker();
    };
  }, [cleanupMarker]);

  // This component doesn't render anything directly
  return null;
};

export default UserLocationLayer;