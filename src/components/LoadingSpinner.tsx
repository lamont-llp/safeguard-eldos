import React from 'react';
import { Shield } from 'lucide-react';

const LoadingSpinner = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <Shield className="w-16 h-16 text-white mx-auto mb-4 animate-pulse" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">SafeGuard Eldos</h1>
        <p className="text-red-100">Loading community safety platform...</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;