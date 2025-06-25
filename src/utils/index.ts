/**
 * Utility Functions Index
 * 
 * Central export point for all utility functions
 */

// PostGIS utilities
export * from './postgisUtils';

// Re-export commonly used functions with shorter names
export {
  extractCoordinatesFromPostGIS as extractCoords,
  validateSouthAfricaCoordinates as isValidSACoords,
  validateEldoradoParkCoordinates as isValidEldoradoCoords,
  DEFAULT_ELDORADO_COORDINATES as defaultCoords,
  ELDORADO_PARK_AREAS as eldoradoAreas,
  formatCoordinates as formatCoords,
  calculateDistance as getDistance,
  isWithinEldoradoParkRadius as isNearEldorado
} from './postgisUtils';

// Additional utility functions can be added here as the project grows