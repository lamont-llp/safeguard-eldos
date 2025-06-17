import React, { useState } from 'react';
import { Shield, Phone, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const EmergencyButton = () => {
  const [isPressed, setIsPressed] = useState(false);

  const handleEmergencyPress = () => {
    setIsPressed(true);
    // Simulate emergency alert
    setTimeout(() => {
      alert('Emergency alert sent to community! Help is on the way.');
      setIsPressed(false);
    }, 2000);
  };

  return (
    <div className="flex space-x-4">
      <button
        onClick={handleEmergencyPress}
        disabled={isPressed}
        className={`flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white p-6 rounded-2xl shadow-lg transform transition-all duration-200 ${
          isPressed ? 'scale-95' : 'hover:scale-105'
        }`}
      >
        <div className="flex flex-col items-center space-y-2">
          {isPressed ? (
            <>
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="font-bold text-lg">Sending Alert...</span>
            </>
          ) : (
            <>
              <Shield className="w-12 h-12 text-white" />
              <span className="font-bold text-lg">EMERGENCY</span>
              <span className="text-red-100 text-sm">Tap for immediate help</span>
            </>
          )}
        </div>
      </button>

      <Link
        to="/report"
        className="bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex flex-col items-center justify-center space-y-2"
      >
        <AlertCircle className="w-8 h-8 text-gray-600" />
        <span className="font-medium text-sm">Report</span>
      </Link>
    </div>
  );
};

export default EmergencyButton;