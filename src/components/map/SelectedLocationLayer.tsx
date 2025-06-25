import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { MapContextType } from './MapContainer';

interface SelectedLocationLayerProps {
  mapContext: MapContextType;
  selectedLocation?: { lat: number; lng: number } | null;
}

const SelectedLocationLayer: React.FC<SelectedLocationLayerProps> = ({
  mapContext,
  selectedLocation
}) => {
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const { map, mapLoaded, handleError, isMounted } = mapContext;

  // Clean up existing marker
  const cleanupMarker = useCallback(() => {
    if (markerRef.current) {
      try {
        markerRef.current.remove();
        markerRef.current = null;
      } catch (error) {
        console.warn('Error cleaning up selected location marker:', error);
      }
    }
  }, []);

  // Update selected location marker
  useEffect(() => {
    if (!map || !mapLoaded || !isMounted()) return;

    try {
      // Clean up existing marker
      cleanupMarker();

      // Create new marker if location is selected
      if (selectedLocation) {
        const marker = new maplibregl.Marker({
          color: '#DC2626',
          scale: 1.2
        })
          .setLngLat([selectedLocation.lng, selectedLocation.lat])
          .addTo(map);
        
        markerRef.current = marker;

        console.log('✅ Created selected location marker');
      }
    } catch (error) {
      handleError(error, 'Updating selected location marker');
    }
  }, [map, mapLoaded, selectedLocation, cleanupMarker, handleError, isMounted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupMarker();
    };
  }, [cleanupMarker]);

  // This component doesn't render anything directly
  return null;
};

export default SelectedLocationLayer;