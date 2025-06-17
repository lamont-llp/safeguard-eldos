import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Dashboard from './pages/Dashboard';
import ReportIncident from './pages/ReportIncident';
import SafeRoutes from './pages/SafeRoutes';
import Community from './pages/Community';
import Navigation from './components/Navigation';
import AuthModal from './components/AuthModal';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const { loading } = useAuth();

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
}

export default App;