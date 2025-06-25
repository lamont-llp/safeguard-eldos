import { useState, useEffect } from 'react';

type SetValue<T> = T | ((val: T) => T);

/**
 * Custom hook for safe localStorage operations with error handling
 * @param key - localStorage key
 * @param initialValue - fallback value if localStorage is unavailable or key doesn't exist
 * @returns [value, setValue, error, isAvailable]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: SetValue<T>) => void, string | null, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean>(false);

  // Check if localStorage is available
  const checkLocalStorageAvailability = (): boolean => {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  };

  // Initialize value from localStorage
  useEffect(() => {
    const available = checkLocalStorageAvailability();
    setIsAvailable(available);

    if (!available) {
      setError('localStorage is not available in this environment');
      return;
    }

    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        const parsed = JSON.parse(item);
        setStoredValue(parsed);
      }
      setError(null);
    } catch (err: any) {
      console.warn(`Failed to read localStorage key "${key}":`, err);
      setError(`Failed to read from localStorage: ${err.message}`);
      setStoredValue(initialValue);
    }
  }, [key, initialValue]);

  // Set value in localStorage
  const setValue = (value: SetValue<T>) => {
    try {
      setError(null);
      
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      setStoredValue(valueToStore);

      // Only attempt to write to localStorage if it's available
      if (isAvailable) {
        localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (err: any) {
      console.warn(`Failed to write to localStorage key "${key}":`, err);
      setError(`Failed to write to localStorage: ${err.message}`);
    }
  };

  return [storedValue, setValue, error, isAvailable];
}

/**
 * Safe localStorage operations without React hooks
 */
export const safeLocalStorage = {
  /**
   * Safely get item from localStorage
   */
  getItem: (key: string, fallback: any = null): any => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return fallback;
      }
      
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (error) {
      console.warn(`Failed to get localStorage item "${key}":`, error);
      return fallback;
    }
  },

  /**
   * Safely set item in localStorage
   */
  setItem: (key: string, value: any): boolean => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Failed to set localStorage item "${key}":`, error);
      return false;
    }
  },

  /**
   * Safely remove item from localStorage
   */
  removeItem: (key: string): boolean => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove localStorage item "${key}":`, error);
      return false;
    }
  },

  /**
   * Check if localStorage is available
   */
  isAvailable: (): boolean => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Clear all localStorage items (with error handling)
   */
  clear: (): boolean => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
      return false;
    }
  }
};