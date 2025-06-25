import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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

// ENHANCED: Interface for tracking event listeners to prevent memory leaks
interface EventListenerRecord {
  element: HTMLElement;
  event: string;
  handler: EventListener;
  cleanup: () => void;
}

// ENHANCED: Interface for tracking markers with their associated cleanup functions
interface MarkerRecord {
  id: string;
  type: 'incident' | 'route_start' | 'route_end' | 'group' | 'user_location' | 'selected_location';
  marker: maplibregl.Marker;
  eventListeners: EventListenerRecord[];
  cleanup: () => void;
  data?: any; // Associated data for the marker
}

// FIXED: Unified marker state interface to prevent race conditions
interface MarkerState {
  incidents: MarkerRecord[];
  routeStarts: MarkerRecord[];
  routeEnds: MarkerRecord[];
  groups: MarkerRecord[];
  userLocation: MarkerRecord | null;
  selectedLocation: MarkerRecord | null;
  layers: string[]; // Track active map layers
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
  // ... rest of the component code ...
}

export default MapComponent;