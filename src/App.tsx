import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ReportIncident from './pages/ReportIncident';
import SafeRoutes from './pages/SafeRoutes';
import Community from './pages/Community';
import Navigation from './components/Navigation';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/report" element={<ReportIncident />} />
            <Route path="/routes" element={<SafeRoutes />} />
            <Route path="/community" element={<Community />} />
          </Routes>
          <Navigation />
        </div>
      </div>
    </Router>
  );
}

export default App;