import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Shield, Route, Users, User } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { useAuthModal } from './AuthModal';
import UserProfile from './UserProfile';

const Navigation = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuthContext();
  const { openSignIn, AuthModal } = useAuthModal();
  const [showProfile, setShowProfile] = useState(false);

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/report', icon: Shield, label: 'Report' },
    { path: '/routes', icon: Route, label: 'Safe Routes' },
    { path: '/community', icon: Users, label: 'Community' },
  ];

  const handleProfileClick = () => {
    if (isAuthenticated) {
      setShowProfile(true);
    } else {
      openSignIn();
    }
  };

  return (
    <>
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
          
          {/* Profile/Auth Button */}
          <button
            onClick={handleProfileClick}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 ${
              showProfile
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="relative">
              <User className="w-6 h-6 mb-1" />
              {isAuthenticated && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>
            <span className="text-xs font-medium">
              {isAuthenticated ? 'Profile' : 'Sign In'}
            </span>
          </button>
        </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal />

      {/* User Profile Modal */}
      <UserProfile 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)} 
      />
    </>
  );
};

export default Navigation;