/**
 * PostGIS Coordinate Extraction Utility
 * 
 * Comprehensive utility for extracting coordinates from various PostGIS point formats
 * with robust error handling, validation, and fallback mechanisms.
 */

// Types for coordinate data
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface CoordinateExtractionResult {
  coordinates: Coordinates | null;
  source: 'postgis_point' | 'direct_fields' | 'geojson' | 'area_fallback' | 'default_fallback';
  confidence: 'high' | 'medium' | 'low';
  originalData?: any;
  error?: string;
}

export interface PostGISPoint {
  location_point?: any;
  latitude?: number | string;
  longitude?: number | string;
  location_address?: string;
  location_area?: string;
  [key: string]: any;
}

// South Africa coordinate bounds for validation
const SOUTH_AFRICA_BOUNDS = {
  minLatitude: -35.0,
  maxLatitude: -22.0,
  minLongitude: 16.0,
  maxLongitude: 33.0
};

// Eldorado Park area-specific coordinate mappings
const ELDORADO_PARK_AREAS: Record<string, Coordinates> = {
  // Extensions
  'extension 1': { latitude: -26.3020, longitude: 27.9350 },
  'extension 2': { latitude: -26.3030, longitude: 27.9360 },
  'extension 3': { latitude: -26.3040, longitude: 27.9370 },
  'extension 4': { latitude: -26.3050, longitude: 27.9380 },
  'extension 5': { latitude: -26.3060, longitude: 27.9390 },
  'extension 6': { latitude: -26.3070, longitude: 27.9400 },
  'extension 7': { latitude: -26.3080, longitude: 27.9410 },
  'extension 8': { latitude: -26.3090, longitude: 27.9420 },
  'extension 9': { latitude: -26.3100, longitude: 27.9430 },
  'extension 10': { latitude: -26.3110, longitude: 27.9440 },
  'extension 11': { latitude: -26.3120, longitude: 27.9450 },
  'extension 12': { latitude: -26.3130, longitude: 27.9460 },
  'extension 13': { latitude: -26.3140, longitude: 27.9470 },
  
  // Key locations
  'shopping centre': { latitude: -26.3054, longitude: 27.9389 },
  'shopping center': { latitude: -26.3054, longitude: 27.9389 },
  'eldorado shopping centre': { latitude: -26.3054, longitude: 27.9389 },
  'eldorado shopping center': { latitude: -26.3054, longitude: 27.9389 },
  'main road': { latitude: -26.3050, longitude: 27.9395 },
  'klipriver road': { latitude: -26.3040, longitude: 27.9410 },
  'klip river road': { latitude: -26.3040, longitude: 27.9410 },
  'golden highway': { latitude: -26.3045, longitude: 27.9385 },
  
  // Educational facilities
  'school': { latitude: -26.3045, longitude: 27.9395 },
  'eldorado primary school': { latitude: -26.3045, longitude: 27.9395 },
  'eldorado high school': { latitude: -26.3048, longitude: 27.9392 },
  'primary school': { latitude: -26.3045, longitude: 27.9395 },
  'high school': { latitude: -26.3048, longitude: 27.9392 },
  
  // Healthcare facilities
  'clinic': { latitude: -26.3050, longitude: 27.9400 },
  'eldorado clinic': { latitude: -26.3050, longitude: 27.9400 },
  'community clinic': { latitude: -26.3050, longitude: 27.9400 },
  'health clinic': { latitude: -26.3050, longitude: 27.9400 },
  
  // Community facilities
  'community hall': { latitude: -26.3060, longitude: 27.9380 },
  'community center': { latitude: -26.3060, longitude: 27.9380 },
  'community centre': { latitude: -26.3060, longitude: 27.9380 },
  'hall': { latitude: -26.3060, longitude: 27.9380 },
  'library': { latitude: -26.3055, longitude: 27.9385 },
  'eldorado library': { latitude: -26.3055, longitude: 27.9385 },
  'public library': { latitude: -26.3055, longitude: 27.9385 },
  
  // Sports facilities
  'sports complex': { latitude: -26.3065, longitude: 27.9375 },
  'sports centre': { latitude: -26.3065, longitude: 27.9375 },
  'sports center': { latitude: -26.3065, longitude: 27.9375 },
  'stadium': { latitude: -26.3065, longitude: 27.9375 },
  'soccer field': { latitude: -26.3062, longitude: 27.9378 },
  'football field': { latitude: -26.3062, longitude: 27.9378 },
  
  // Transport
  'eldorado park station': { latitude: -26.3035, longitude: 27.9420 },
  'train station': { latitude: -26.3035, longitude: 27.9420 },
  'station': { latitude: -26.3035, longitude: 27.9420 },
  'taxi rank': { latitude: -26.3052, longitude: 27.9388 },
  'bus stop': { latitude: -26.3051, longitude: 27.9390 },
  
  // Religious facilities
  'church': { latitude: -26.3058, longitude: 27.9383 },
  'mosque': { latitude: -26.3056, longitude: 27.9387 },
  'temple': { latitude: -26.3059, longitude: 27.9381 },
  
  // Commercial areas
  'shops': { latitude: -26.3053, longitude: 27.9390 },
  'market': { latitude: -26.3054, longitude: 27.9388 },
  'spaza shop': { latitude: -26.3055, longitude: 27.9392 },
  'tuck shop': { latitude: -26.3055, longitude: 27.9392 }
};

// Default coordinates for Eldorado Park center
const DEFAULT_ELDORADO_COORDINATES: Coordinates = {
  latitude: -26.3054,
  longitude: 27.9389
};

/**
 * Validates if coordinates are within South Africa bounds
 */
export function validateSouthAfricaCoordinates(lat: number, lng: number): boolean {
  return (
    lat >= SOUTH_AFRICA_BOUNDS.minLatitude &&
    lat <= SOUTH_AFRICA_BOUNDS.maxLatitude &&
    lng >= SOUTH_AFRICA_BOUNDS.minLongitude &&
    lng <= SOUTH_AFRICA_BOUNDS.maxLongitude
  );
}

/**
 * Validates if coordinates are within reasonable Eldorado Park area
 */
export function validateEldoradoParkCoordinates(lat: number, lng: number): boolean {
  // Eldorado Park is roughly within these bounds
  const eldoradoBounds = {
    minLat: -26.32,
    maxLat: -26.29,
    minLng: 27.92,
    maxLng: 27.96
  };
  
  return (
    lat >= eldoradoBounds.minLat &&
    lat <= eldoradoBounds.maxLat &&
    lng >= eldoradoBounds.minLng &&
    lng <= eldoradoBounds.maxLng
  );
}

/**
 * Extracts coordinates from PostGIS POINT string formats
 * Supports various PostGIS point representations:
 * - POINT(longitude latitude)
 * - SRID=4326;POINT(longitude latitude)
 * - POINT (longitude latitude) [with space]
 * - POINT(longitude,latitude) [with comma]
 */
export function extractFromPostGISPoint(locationPoint: any): CoordinateExtractionResult {
  if (!locationPoint) {
    return {
      coordinates: null,
      source: 'postgis_point',
      confidence: 'low',
      error: 'No location_point data provided'
    };
  }

  try {
    let pointString: string;
    
    // Handle different input types
    if (typeof locationPoint === 'string') {
      pointString = locationPoint;
    } else if (typeof locationPoint === 'object' && locationPoint.toString) {
      pointString = locationPoint.toString();
    } else {
      return {
        coordinates: null,
        source: 'postgis_point',
        confidence: 'low',
        originalData: locationPoint,
        error: 'Invalid location_point format - not a string or convertible to string'
      };
    }

    // Clean up the string
    pointString = pointString.trim();

    // Multiple regex patterns to handle different PostGIS formats
    const patterns = [
      // Standard: POINT(longitude latitude)
      /POINT\s*\(\s*([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s*\)/i,
      
      // With SRID: SRID=4326;POINT(longitude latitude)
      /SRID=\d+;\s*POINT\s*\(\s*([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s*\)/i,
      
      // With comma separator: POINT(longitude,latitude)
      /POINT\s*\(\s*([+-]?\d*\.?\d+)\s*,\s*([+-]?\d*\.?\d+)\s*\)/i,
      
      // Relaxed format with extra spaces
      /POINT\s*\(\s*([+-]?\d*\.?\d+)\s*[,\s]\s*([+-]?\d*\.?\d+)\s*\)/i
    ];

    let match: RegExpMatchArray | null = null;
    let patternUsed = -1;

    // Try each pattern until one matches
    for (let i = 0; i < patterns.length; i++) {
      match = pointString.match(patterns[i]);
      if (match) {
        patternUsed = i;
        break;
      }
    }

    if (!match) {
      return {
        coordinates: null,
        source: 'postgis_point',
        confidence: 'low',
        originalData: locationPoint,
        error: `No valid POINT pattern found in: "${pointString}"`
      };
    }

    // Extract coordinates (PostGIS uses longitude, latitude order)
    const longitude = parseFloat(match[1]);
    const latitude = parseFloat(match[2]);

    // Validate parsed numbers
    if (isNaN(longitude) || isNaN(latitude)) {
      return {
        coordinates: null,
        source: 'postgis_point',
        confidence: 'low',
        originalData: locationPoint,
        error: `Invalid coordinate values: longitude=${match[1]}, latitude=${match[2]}`
      };
    }

    // Validate coordinate ranges
    if (!validateSouthAfricaCoordinates(latitude, longitude)) {
      return {
        coordinates: null,
        source: 'postgis_point',
        confidence: 'low',
        originalData: locationPoint,
        error: `Coordinates outside South Africa bounds: lat=${latitude}, lng=${longitude}`
      };
    }

    // Determine confidence based on validation
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    
    if (validateEldoradoParkCoordinates(latitude, longitude)) {
      confidence = 'high';
    } else if (validateSouthAfricaCoordinates(latitude, longitude)) {
      confidence = 'medium';
    }

    return {
      coordinates: { latitude, longitude },
      source: 'postgis_point',
      confidence,
      originalData: locationPoint
    };

  } catch (error) {
    return {
      coordinates: null,
      source: 'postgis_point',
      confidence: 'low',
      originalData: locationPoint,
      error: `Error parsing PostGIS point: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Extracts coordinates from GeoJSON Point format
 */
export function extractFromGeoJSON(geoJsonPoint: any): CoordinateExtractionResult {
  if (!geoJsonPoint || typeof geoJsonPoint !== 'object') {
    return {
      coordinates: null,
      source: 'geojson',
      confidence: 'low',
      error: 'No GeoJSON data provided or invalid format'
    };
  }

  try {
    // Check for GeoJSON Point format
    if (geoJsonPoint.type === 'Point' && Array.isArray(geoJsonPoint.coordinates)) {
      const [longitude, latitude] = geoJsonPoint.coordinates;
      
      if (typeof longitude === 'number' && typeof latitude === 'number') {
        if (validateSouthAfricaCoordinates(latitude, longitude)) {
          const confidence = validateEldoradoParkCoordinates(latitude, longitude) ? 'high' : 'medium';
          
          return {
            coordinates: { latitude, longitude },
            source: 'geojson',
            confidence,
            originalData: geoJsonPoint
          };
        } else {
          return {
            coordinates: null,
            source: 'geojson',
            confidence: 'low',
            originalData: geoJsonPoint,
            error: `GeoJSON coordinates outside South Africa bounds: lat=${latitude}, lng=${longitude}`
          };
        }
      }
    }

    return {
      coordinates: null,
      source: 'geojson',
      confidence: 'low',
      originalData: geoJsonPoint,
      error: 'Invalid GeoJSON Point format or missing coordinates'
    };

  } catch (error) {
    return {
      coordinates: null,
      source: 'geojson',
      confidence: 'low',
      originalData: geoJsonPoint,
      error: `Error parsing GeoJSON: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Extracts coordinates from direct latitude/longitude fields
 */
export function extractFromDirectFields(data: PostGISPoint): CoordinateExtractionResult {
  if (!data) {
    return {
      coordinates: null,
      source: 'direct_fields',
      confidence: 'low',
      error: 'No data provided'
    };
  }

  try {
    const { latitude: latField, longitude: lngField } = data;
    
    if (latField == null || lngField == null) {
      return {
        coordinates: null,
        source: 'direct_fields',
        confidence: 'low',
        error: 'Missing latitude or longitude fields'
      };
    }

    // Convert to numbers
    const latitude = typeof latField === 'string' ? parseFloat(latField) : Number(latField);
    const longitude = typeof lngField === 'string' ? parseFloat(lngField) : Number(lngField);

    // Validate numbers
    if (isNaN(latitude) || isNaN(longitude)) {
      return {
        coordinates: null,
        source: 'direct_fields',
        confidence: 'low',
        originalData: { latitude: latField, longitude: lngField },
        error: `Invalid coordinate values: latitude=${latField}, longitude=${lngField}`
      };
    }

    // Validate ranges
    if (!validateSouthAfricaCoordinates(latitude, longitude)) {
      return {
        coordinates: null,
        source: 'direct_fields',
        confidence: 'low',
        originalData: { latitude: latField, longitude: lngField },
        error: `Coordinates outside South Africa bounds: lat=${latitude}, lng=${longitude}`
      };
    }

    // Determine confidence
    const confidence = validateEldoradoParkCoordinates(latitude, longitude) ? 'high' : 'medium';

    return {
      coordinates: { latitude, longitude },
      source: 'direct_fields',
      confidence,
      originalData: { latitude: latField, longitude: lngField }
    };

  } catch (error) {
    return {
      coordinates: null,
      source: 'direct_fields',
      confidence: 'low',
      originalData: data,
      error: `Error extracting from direct fields: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Attempts to find coordinates based on area/address text matching
 */
export function extractFromAreaFallback(data: PostGISPoint): CoordinateExtractionResult {
  if (!data) {
    return {
      coordinates: null,
      source: 'area_fallback',
      confidence: 'low',
      error: 'No data provided'
    };
  }

  try {
    // Combine location text from various fields
    const locationTexts = [
      data.location_area,
      data.location_address,
      data.area_name,
      data.address,
      data.location
    ].filter(Boolean).map(text => String(text).toLowerCase().trim());

    if (locationTexts.length === 0) {
      return {
        coordinates: null,
        source: 'area_fallback',
        confidence: 'low',
        error: 'No location text available for area matching'
      };
    }

    // Try to match against known areas
    for (const locationText of locationTexts) {
      for (const [areaKey, coordinates] of Object.entries(ELDORADO_PARK_AREAS)) {
        if (locationText.includes(areaKey)) {
          return {
            coordinates,
            source: 'area_fallback',
            confidence: 'medium',
            originalData: { matchedText: locationText, matchedArea: areaKey }
          };
        }
      }
    }

    // Try partial matches for extensions
    for (const locationText of locationTexts) {
      const extensionMatch = locationText.match(/ext(?:ension)?\s*(\d+)/i);
      if (extensionMatch) {
        const extNumber = parseInt(extensionMatch[1]);
        const extKey = `extension ${extNumber}`;
        
        if (ELDORADO_PARK_AREAS[extKey]) {
          return {
            coordinates: ELDORADO_PARK_AREAS[extKey],
            source: 'area_fallback',
            confidence: 'medium',
            originalData: { matchedText: locationText, matchedArea: extKey }
          };
        }
      }
    }

    return {
      coordinates: null,
      source: 'area_fallback',
      confidence: 'low',
      originalData: { searchedTexts: locationTexts },
      error: 'No matching areas found in location text'
    };

  } catch (error) {
    return {
      coordinates: null,
      source: 'area_fallback',
      confidence: 'low',
      originalData: data,
      error: `Error in area fallback: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Main function to extract coordinates from PostGIS data
 * Tries multiple extraction methods in order of preference
 */
export function extractCoordinatesFromPostGIS(data: PostGISPoint): CoordinateExtractionResult {
  if (!data) {
    return {
      coordinates: DEFAULT_ELDORADO_COORDINATES,
      source: 'default_fallback',
      confidence: 'low',
      error: 'No data provided, using default Eldorado Park coordinates'
    };
  }

  const extractionMethods = [
    // 1. Try PostGIS point format first (highest priority)
    () => extractFromPostGISPoint(data.location_point),
    
    // 2. Try direct latitude/longitude fields
    () => extractFromDirectFields(data),
    
    // 3. Try GeoJSON format (if location_point is GeoJSON)
    () => extractFromGeoJSON(data.location_point),
    
    // 4. Try area-based fallback
    () => extractFromAreaFallback(data)
  ];

  const results: CoordinateExtractionResult[] = [];

  // Try each method and collect results
  for (const method of extractionMethods) {
    try {
      const result = method();
      results.push(result);
      
      // Return first successful extraction with high or medium confidence
      if (result.coordinates && (result.confidence === 'high' || result.confidence === 'medium')) {
        return result;
      }
    } catch (error) {
      results.push({
        coordinates: null,
        source: 'postgis_point',
        confidence: 'low',
        error: `Method failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  // If no method succeeded, return default coordinates with error details
  return {
    coordinates: DEFAULT_ELDORADO_COORDINATES,
    source: 'default_fallback',
    confidence: 'low',
    originalData: data,
    error: `All extraction methods failed. Attempted: ${results.map(r => `${r.source}(${r.error || 'no error'})`).join(', ')}`
  };
}

/**
 * Batch extract coordinates from multiple PostGIS records
 */
export function batchExtractCoordinates(records: PostGISPoint[]): CoordinateExtractionResult[] {
  if (!Array.isArray(records)) {
    return [];
  }

  return records.map((record, index) => {
    try {
      const result = extractCoordinatesFromPostGIS(record);
      return {
        ...result,
        originalData: { ...result.originalData, recordIndex: index }
      };
    } catch (error) {
      return {
        coordinates: DEFAULT_ELDORADO_COORDINATES,
        source: 'default_fallback',
        confidence: 'low',
        originalData: { record, recordIndex: index },
        error: `Batch extraction failed for record ${index}: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  });
}

/**
 * Get statistics about coordinate extraction results
 */
export function getExtractionStats(results: CoordinateExtractionResult[]) {
  const stats = {
    total: results.length,
    successful: 0,
    bySource: {} as Record<string, number>,
    byConfidence: {} as Record<string, number>,
    errors: 0,
    errorTypes: {} as Record<string, number>
  };

  results.forEach(result => {
    if (result.coordinates) {
      stats.successful++;
    }
    
    if (result.error) {
      stats.errors++;
      const errorType = result.error.split(':')[0] || 'unknown';
      stats.errorTypes[errorType] = (stats.errorTypes[errorType] || 0) + 1;
    }
    
    stats.bySource[result.source] = (stats.bySource[result.source] || 0) + 1;
    stats.byConfidence[result.confidence] = (stats.byConfidence[result.confidence] || 0) + 1;
  });

  return {
    ...stats,
    successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0,
    highConfidenceRate: stats.total > 0 ? ((stats.byConfidence.high || 0) / stats.total) * 100 : 0
  };
}

/**
 * Utility to format coordinates for display
 */
export function formatCoordinates(coords: Coordinates, precision = 6): string {
  return `${coords.latitude.toFixed(precision)}, ${coords.longitude.toFixed(precision)}`;
}

/**
 * Utility to calculate distance between two coordinate points
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = coord1.latitude * Math.PI / 180;
  const φ2 = coord2.latitude * Math.PI / 180;
  const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if coordinates are within a certain radius of Eldorado Park center
 */
export function isWithinEldoradoParkRadius(coords: Coordinates, radiusMeters = 5000): boolean {
  const distance = calculateDistance(coords, DEFAULT_ELDORADO_COORDINATES);
  return distance <= radiusMeters;
}

// Export default coordinates and area mappings for external use
export { DEFAULT_ELDORADO_COORDINATES, ELDORADO_PARK_AREAS, SOUTH_AFRICA_BOUNDS };