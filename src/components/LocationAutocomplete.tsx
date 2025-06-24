import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, X, Navigation2, Loader2, Star } from 'lucide-react';
import { usePlacesAutocomplete } from '../hooks/usePlacesAutocomplete';
import { useLocation } from '../hooks/useLocation';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
  onLocationSelect?: (location: { address: string; lat: number; lng: number }) => void;
  showCurrentLocation?: boolean;
  onUseCurrentLocation?: () => void;
  disabled?: boolean;
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Enter address or location",
  className = "",
  icon,
  onLocationSelect,
  showCurrentLocation = false,
  onUseCurrentLocation,
  disabled = false
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [localPredictions, setLocalPredictions] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const { latitude, longitude, hasLocation } = useLocation();
  const {
    predictions,
    isLoading,
    error,
    debouncedSearch,
    getPlaceDetails,
    clearPredictions
  } = usePlacesAutocomplete();

  // Popular locations in Eldorado Park area
  const popularLocations = [
    { name: "Eldorado Shopping Centre", lat: -26.3054, lng: 27.9389, types: ['shopping_mall'] },
    { name: "Eldorado Primary School", lat: -26.3045, lng: 27.9395, types: ['school'] },
    { name: "Community Hall Extension 8", lat: -26.3060, lng: 27.9380, types: ['community_center'] },
    { name: "Eldorado Clinic", lat: -26.3050, lng: 27.9400, types: ['hospital'] },
    { name: "Library Eldorado Park", lat: -26.3055, lng: 27.9385, types: ['library'] },
    { name: "Sports Complex Eldorado", lat: -26.3065, lng: 27.9375, types: ['gym'] },
    { name: "Extension 9 Eldorado Park", lat: -26.3070, lng: 27.9390, types: ['sublocality'] },
    { name: "Klipriver Road", lat: -26.3040, lng: 27.9410, types: ['route'] },
    { name: "Main Road Eldorado Park", lat: -26.3050, lng: 27.9395, types: ['route'] },
    { name: "Eldorado Park Station", lat: -26.3035, lng: 27.9420, types: ['transit_station'] }
  ];

  // Filter popular locations based on query
  const getPopularSuggestions = (query: string) => {
    if (!query || query.length < 2) return [];
    
    return popularLocations
      .filter(location =>
        location.name.toLowerCase().includes(query.toLowerCase())
      )
      .map((location, index) => ({
        place_id: `popular-${index}`,
        description: location.name,
        main_text: location.name,
        secondary_text: "Popular location in Eldorado Park",
        types: location.types,
        isPopular: true,
        coordinates: { lat: location.lat, lng: location.lng }
      }));
  };

  // Combine Google Places predictions with popular locations
  useEffect(() => {
    const popularSuggestions = getPopularSuggestions(value);
    const googlePredictions = predictions.map(p => ({ ...p, isPopular: false }));
    
    // Combine and deduplicate
    const combined = [...popularSuggestions, ...googlePredictions];
    const unique = combined.filter((item, index, self) =>
      index === self.findIndex(t => 
        t.main_text.toLowerCase() === item.main_text.toLowerCase()
      )
    );
    
    setLocalPredictions(unique.slice(0, 8));
  }, [predictions, value]);

  // Handle input change with debounced search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);
    
    if (newValue.length >= 2) {
      debouncedSearch(newValue);
      setShowSuggestions(true);
    } else {
      clearPredictions();
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = async (suggestion: any) => {
    setShowSuggestions(false);
    setSelectedIndex(-1);
    
    if (suggestion.isPopular && suggestion.coordinates) {
      // Use popular location coordinates directly
      onChange(suggestion.main_text, suggestion.coordinates);
      
      if (onLocationSelect) {
        onLocationSelect({
          address: suggestion.main_text,
          lat: suggestion.coordinates.lat,
          lng: suggestion.coordinates.lng
        });
      }
    } else {
      // Get details from Google Places API
      const details = await getPlaceDetails(suggestion.place_id);
      
      if (details) {
        const coordinates = {
          lat: details.latitude,
          lng: details.longitude
        };
        
        onChange(details.formatted_address, coordinates);
        
        if (onLocationSelect) {
          onLocationSelect({
            address: details.formatted_address,
            lat: coordinates.lat,
            lng: coordinates.lng
          });
        }
      } else {
        // Fallback to description only
        onChange(suggestion.description);
      }
    }
    
    inputRef.current?.blur();
  };

  // Handle current location
  const handleUseCurrentLocation = () => {
    if (hasLocation && latitude && longitude && onUseCurrentLocation) {
      onChange('Current Location', { lat: latitude, lng: longitude });
      onUseCurrentLocation();
      setShowSuggestions(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || localPredictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < localPredictions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : localPredictions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < localPredictions.length) {
          handleSuggestionSelect(localPredictions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear input
  const handleClear = () => {
    onChange('');
    clearPredictions();
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Get suggestion icon
  const getSuggestionIcon = (suggestion: any) => {
    if (suggestion.isPopular) {
      return <Star className="w-4 h-4 text-yellow-500" />;
    }
    
    const types = suggestion.types || [];
    
    if (types.includes('school') || types.includes('university')) return '🏫';
    if (types.includes('hospital') || types.includes('clinic')) return '🏥';
    if (types.includes('shopping_mall') || types.includes('store')) return '🏪';
    if (types.includes('restaurant') || types.includes('food')) return '🍽️';
    if (types.includes('gas_station')) return '⛽';
    if (types.includes('bank')) return '🏦';
    if (types.includes('church')) return '⛪';
    if (types.includes('park')) return '🌳';
    if (types.includes('transit_station')) return '🚉';
    if (types.includes('route') || types.includes('street_address')) return '🛣️';
    
    return <MapPin className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="relative">
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (localPredictions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full ${icon ? 'pl-12' : 'pl-4'} ${
            value || showCurrentLocation ? 'pr-20' : 'pr-4'
          } py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
        />

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          </div>
        )}

        {/* Clear button */}
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Current location button */}
        {showCurrentLocation && hasLocation && !disabled && (
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-700 transition-colors p-1"
            title="Use current location"
          >
            <Navigation2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-1 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && localPredictions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {localPredictions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSuggestionSelect(suggestion)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getSuggestionIcon(suggestion)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.main_text}
                  </p>
                  {suggestion.secondary_text && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {suggestion.secondary_text}
                    </p>
                  )}
                  {suggestion.isPopular && (
                    <div className="flex items-center space-x-1 mt-1">
                      <Star className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs text-yellow-600">Popular</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions && localPredictions.length === 0 && !isLoading && value.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="text-center text-gray-500">
            <Search className="w-6 h-6 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No locations found</p>
            <p className="text-xs mt-1">Try a different search term</p>
          </div>
        </div>
      )}

      {/* Powered by Google */}
      {showSuggestions && localPredictions.some(p => !p.isPopular) && (
        <div className="absolute z-40 right-2 -bottom-6">
          <img 
            src="https://developers.google.com/maps/documentation/places/web-service/images/powered_by_google_on_white.png" 
            alt="Powered by Google"
            className="h-4"
          />
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;