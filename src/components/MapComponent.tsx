import React, { useState, useMemo } from 'react';
import {
  MapContainer,
  IncidentLayer,
  RouteLayer,
  GroupLayer,
  MapControls,
  UserLocationLayer,
  SelectedLocationLayer,
  type MapIncident,
  type MapSafeRoute,
  type MapCommunityGroup
} from './map';

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
  onIncidentClick?: (incident: MapIncident) => void;
  onRouteClick?: (route: MapSafeRoute) => void;
  onMapClick?: (e: { lngLat: { lat: number; lng: number } }) => void;
  className?: string;
  showControls?: boolean;
  interactive?: boolean;
  zoom?: number;
  showUserLocation?: boolean;
}

const MapComponent: React.FC<MapComponentProps> = ({
  latitude = -26.3054,
  longitude = 27.9389,
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
  const [activeLayer, setActiveLayer] = useState<'incidents' | 'routes' | 'groups'>('incidents');
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Transform data to match layer component interfaces
  const mapIncidents: MapIncident[] = useMemo(() => 
    incidents.map(incident => ({
      id: incident.id,
      latitude: incident.latitude,
      longitude: incident.longitude,
      incident_type: incident.incident_type,
      severity: incident.severity,
      title: incident.title,
      is_verified: incident.is_verified,
      is_urgent: incident.is_urgent,
      created_at: incident.created_at
    })), [incidents]);

  const mapRoutes: MapSafeRoute[] = useMemo(() => 
    safeRoutes.map(route => ({
      id: route.id,
      name: route.name,
      start_lat: route.start_lat,
      start_lng: route.start_lng,
      end_lat: route.end_lat,
      end_lng: route.end_lng,
      safety_score: route.safety_score,
      lighting_quality: route.lighting_quality
    })), [safeRoutes]);

  const mapGroups: MapCommunityGroup[] = useMemo(() => 
    communityGroups.map(group => ({
      id: group.id,
      name: group.name,
      latitude: group.latitude,
      longitude: group.longitude,
      member_count: group.member_count,
      group_type: group.group_type
    })), [communityGroups]);

  // Handle map click with selected location tracking
  const handleMapClick = (e: { lngLat: { lat: number; lng: number } }) => {
    setSelectedLocation(e.lngLat);
    onMapClick?.(e);
  };

  return (
    <MapContainer
      latitude={latitude}
      longitude={longitude}
      zoom={zoom}
      interactive={interactive}
      showControls={showControls}
      className={className}
      onMapClick={handleMapClick}
    >
      {(mapContext) => (
        <>
          {/* Data Layers */}
          <IncidentLayer
            mapContext={mapContext}
            incidents={mapIncidents}
            isActive={activeLayer === 'incidents'}
            onIncidentClick={onIncidentClick}
          />
          
          <RouteLayer
            mapContext={mapContext}
            routes={mapRoutes}
            isActive={activeLayer === 'routes'}
            onRouteClick={onRouteClick}
          />
          
          <GroupLayer
            mapContext={mapContext}
            groups={mapGroups}
            isActive={activeLayer === 'groups'}
            onGroupClick={(group) => {
              // Handle group click if needed
              console.log('Group clicked:', group);
            }}
          />

          {/* Location Layers */}
          <UserLocationLayer
            mapContext={mapContext}
            latitude={latitude}
            longitude={longitude}
            showUserLocation={showUserLocation}
          />

          <SelectedLocationLayer
            mapContext={mapContext}
            selectedLocation={selectedLocation}
          />

          {/* Controls */}
          {showControls && interactive && (
            <MapControls
              activeLayer={activeLayer}
              onLayerChange={setActiveLayer}
              incidentCount={mapIncidents.length}
              routeCount={mapRoutes.length}
              groupCount={mapGroups.length}
              showUserLocation={showUserLocation}
              userLatitude={latitude}
              userLongitude={longitude}
            />
          )}

          {/* CSS Animations */}
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.7; transform: scale(1.1); }
            }
            .incident-marker[style*="animation"] {
              animation: pulse 2s infinite;
            }
          `}</style>
        </>
      )}
    </MapContainer>
  );
};

export default MapComponent;