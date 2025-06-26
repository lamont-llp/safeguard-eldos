import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { IncidentsProvider } from './contexts/IncidentsContext';
import { AuthProvider } from './contexts/AuthContext';
import { useIncidentsRealtime } from './hooks/useIncidentsRealtime';
import { useNotifications } from './hooks/useNotifications';
import { useLocation } from './hooks/useLocation';
import { isMessagingSupported } from './lib/firebase';
import Dashboard from './pages/Dashboard';
import ReportIncident from './pages/ReportIncident';
import SafeRoutes from './pages/SafeRoutes';
import Community from './pages/Community';
import Navigation from './components/Navigation';
import AuthModal from './components/AuthModal';
import LoadingSpinner from './components/LoadingSpinner';

const AppContent = () => {
  const { loading } = useAuth();
  const { latitude, longitude } = useLocation();
  const { requestPermission } = useNotifications();
  
  // Initialize real-time subscriptions once at the app level
  useIncidentsRealtime();

  useEffect(() => {
    // Initialize notifications when app loads
    const initializeNotifications = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        // Don't auto-request permission, let user decide
        console.log('Notifications available but not requested yet');
      }
    };

    initializeNotifications();
  }, []);

  useEffect(() => {
    // Register service workers for PWA and FCM functionality
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        // Register Firebase messaging service worker if FCM is supported
        if (isMessagingSupported()) {
          navigator.serviceWorker.register('/firebase-messaging-sw.js')
            .then((registration) => {
              console.log('Firebase SW registered: ', registration);
            })
            .catch((registrationError) => {
              console.log('Firebase SW registration failed: ', registrationError);
              
              // Fallback to regular service worker
              navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                  console.log('Fallback SW registered: ', registration);
                })
                .catch((fallbackError) => {
                  console.log('Fallback SW registration failed: ', fallbackError);
                });
            });
        } else {
          // Register regular service worker if FCM is not supported
          navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
              console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
              console.log('SW registration failed: ', registrationError);
            });
        }
      });
    }
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl relative">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/report" element={<ReportIncident />} />
            <Route path="/routes" element={<SafeRoutes />} />
            <Route path="/community" element={<Community />} />
          </Routes>
          <Navigation />
          <AuthModal />
        </div>
      </div>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <IncidentsProvider>
        <AppContent />
      </IncidentsProvider>
    </AuthProvider>
  );
}

export default App;