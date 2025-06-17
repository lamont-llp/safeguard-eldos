import React from 'react';
import { Shield, TrendingUp, AlertTriangle } from 'lucide-react';

const SafetyStatus = () => {
  // Simulate safety metrics
  const safetyLevel = 72; // out of 100
  const trend = 'improving'; // improving, declining, stable
  const lastUpdate = '2 minutes ago';

  const getSafetyColor = (level: number) => {
    if (level >= 80) return 'text-green-400';
    if (level >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'declining':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default:
        return <Shield className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="mt-6 bg-red-500 bg-opacity-20 backdrop-blur-sm rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">Area Safety Status</h3>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`text-2xl font-bold ${getSafetyColor(safetyLevel)}`}>
              {safetyLevel}%
            </span>
            <div className="flex items-center space-x-1">
              {getTrendIcon(trend)}
              <span className="text-red-100 text-sm capitalize">{trend}</span>
            </div>
          </div>
          <p className="text-red-100 text-xs mt-1">Updated {lastUpdate}</p>
        </div>
        
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${safetyLevel}, 100`}
              className={getSafetyColor(safetyLevel)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyStatus;