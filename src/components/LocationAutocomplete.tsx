import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, X, Navigation2, Loader2 } from 'lucide-react';

interface LocationSuggestion {
  id: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

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
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Popular locations in Eldorado Park area
  const popularLocations = [
    { name: "Eldorado Shopping Centre", lat: -26.3054, lng: 27.9389 },
    { name: "Eldorado Primary School", lat: -26.3045, lng: 27.9395 },
    { name: "Community Hall Extension 8", lat: -26.3060, lng: 27.9380 },
    { name: "Eldorado Clinic", lat: -26.3050, lng: 27.9400 },
    { name: "Library Eldorado Park", lat: -26.3055, lng: 27.9385 },
    { name: "Sports Complex", lat: -26.3065, lng: 27.9375 },
    { name: "Extension 9", lat: -26.3070, lng: 27.9390 },
    { name: "Klipriver Road", lat: -26.3040, lng: 27.9410 },
    { name: "Main Road Eldorado", lat: -26.3050, lng: 27.9395 },
    { name: "Eldorado Park Station", lat: -26.3035, lng: 27.9420 }
  ];

  // Geocoding function using Nominatim (OpenStreetMap)
  const searchLocations = async (query: string): Promise<LocationSuggestion[]> => {
    if (query.length < 3) return [];

    try {
      // Bias search towards Eldorado Park area
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query + " Eldorado Park Johannesburg South Africa")}&` +
        `format=json&` +
        `limit=8&` +
        `countrycodes=za&` +
        `viewbox=27.9200,-26.3200,27.9600,-26.2900&` +
        `bounded=1&` +
        `addressdetails=1&` +
        `extratags=1`
      );

      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();
      
      return data.map((item: any, index: number) => ({
        id: `${item.place_id || index}`,
        display_name: item.display_name,
        lat: item.lat,
        lon: item.lon,
        type: item.type || 'location',
        importance: parseFloat(item.importance || '0')
      }));
    } catch (error) {
      console.warn('Geocoding error:', error);
      return [];
    }
  };

  // Filter popular locations based on query
  const getPopularSuggestions = (query: string): LocationSuggestion[] => {
    if (!query) return [];
    
    const filtered = popularLocations.filter(location =>
      location.name.toLowerCase().includes(query.toLowerCase())
    );

    return filtered.map((location, index) => ({
      id: `popular-${index}`,
      display_name: location.name,
      lat: location.lat.toString(),
      lon: location.lng.toString(),
      type: 'popular',
      importance: 1
    }));
  };

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length >= 2) {
      setIsLoading(true);
      
      debounceRef.current = setTimeout(async () => {
        try {
          const [geocodedResults, popularResults] = await Promise.all([
            searchLocations(value),
            Promise.resolve(getPopularSuggestions(value))
          ]);

          // Combine and sort results
          const allResults = [
            ...popularResults.map(r => ({ ...r, isPopular: true })),
            ...geocodedResults.map(r => ({ ...r, isPopular: false }))
          ];

          // Remove duplicates and sort by relevance
          const uniqueResults = allResults
            .filter((result, index, self) => 
              index === self.findIndex(r => 
                r.display_name.toLowerCase() === result.display_name.toLowerCase()
              )
            )
            .sort((a, b) => {
              // Popular locations first
              if (a.isPopular && !b.isPopular) return -1;
              if (!a.isPopular && b.isPopular) return 1;
              // Then by importance
              return b.importance - a.importance;
            })
            .slice(0, 8);

          setSuggestions(uniqueResults);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Search error:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: LocationSuggestion) => {
    const coordinates = {
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    };

    onChange(suggestion.display_name, coordinates);
    
    if (onLocationSelect) {
      onLocationSelect({
        address: suggestion.display_name,
        lat: coordinates.lat,
        lng: coordinates.lng
      });
    }

    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex]);
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
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Format display name for better readability
  const formatDisplayName = (displayName: string, isPopular: boolean) => {
    if (isPopular) return displayName;
    
    // Simplify long addresses
    const parts = displayName.split(',');
    if (parts.length > 3) {
      return `${parts[0]}, ${parts[1]}, ${parts[parts.length - 2]}`;
    }
    return displayName;
  };

  // Get suggestion icon
  const getSuggestionIcon = (suggestion: LocationSuggestion & { isPopular?: boolean }) => {
    if (suggestion.isPopular) {
      return <div className="w-2 h-2 bg-blue-500 rounded-full"></div>;
    }
    
    switch (suggestion.type) {
      case 'school':
      case 'university':
        return '🏫';
      case 'hospital':
      case 'clinic':
        return '🏥';
      case 'shop':
      case 'mall':
        return '🏪';
      case 'restaurant':
        return '🍽️';
      case 'fuel':
        return '⛽';
      default:
        return <MapPin className="w-4 h-4 text-gray-400" />;
    }
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
            if (suggestions.length > 0) {
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
        {showCurrentLocation && onUseCurrentLocation && !disabled && (
          <button
            type="button"
            onClick={onUseCurrentLocation}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-700 transition-colors p-1"
            title="Use current location"
          >
            <Navigation2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSuggestionSelect(suggestion)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getSuggestionIcon(suggestion as any)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {formatDisplayName(suggestion.display_name, (suggestion as any).isPopular)}
                  </p>
                  {(suggestion as any).isPopular && (
                    <p className="text-xs text-blue-600 mt-1">Popular location</p>
                  )}
                  {suggestion.type && !(suggestion as any).isPopular && (
                    <p className="text-xs text-gray-500 mt-1 capitalize">
                      {suggestion.type.replace('_', ' ')}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions && suggestions.length === 0 && !isLoading && value.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="text-center text-gray-500">
            <Search className="w-6 h-6 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No locations found</p>
            <p className="text-xs mt-1">Try a different search term</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;