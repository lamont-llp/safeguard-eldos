import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Shield, Route, Users } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/report', icon: Shield, label: 'Report' },
    { path: '/routes', icon: Route, label: 'Safe Routes' },
    { path: '/community', icon: Users, label: 'Community' },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex justify-around items-center">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'text-red-600 bg-red-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-6 h-6 mb-1 ${isActive ? 'scale-110' : ''}`} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;