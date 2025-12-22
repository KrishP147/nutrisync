import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { GoalsProvider } from './contexts/GoalsContext';
import { FastingProvider } from './contexts/FastingContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Logging from './pages/Logging';
import Progress from './pages/Progress';
import DailyView from './pages/DailyView';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import PhotoGallery from './pages/PhotoGallery';
import RecommendationsPage from './pages/RecommendationsPage';
import Pricing from './pages/Pricing';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setloading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setloading(false);
    });

    // Listen for auth changes
    const { data: { subscription }, } = supabase.auth.onAuthStateChange((event, session) => {
      // Don't set session for password recovery events
      // Let the ResetPassword component handle it
      if (event === 'PASSWORD_RECOVERY') {
        setSession(null);
      } else {
        setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-matrix-green-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <GoalsProvider>
      <FastingProvider>
        <Router>
          <Routes>
            <Route path="/" element={!session ? <Landing /> : <Navigate to="/dashboard" />} />
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" />} />
            <Route path="/register" element={!session ? <Register /> : <Navigate to="/dashboard" />} />
            <Route path="/forgot-password" element={!session ? <ForgotPassword /> : <Navigate to="/dashboard" />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/change-password" element={session ? <ChangePassword /> : <Navigate to="/login" />} />
            <Route path="/profile" element={session ? <Profile /> : <Navigate to="/login" />} />
            <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/logging" element={session ? <Logging /> : <Navigate to="/login" />} />
            <Route path="/progress" element={session ? <Progress /> : <Navigate to="/login" />} />
            <Route path="/daily-view/:date" element={session ? <DailyView /> : <Navigate to="/login" />} />
            <Route path="/gallery" element={session ? <PhotoGallery /> : <Navigate to="/login" />} />
            <Route path="/recommendations" element={session ? <RecommendationsPage /> : <Navigate to="/login" />} />
            <Route path="/pricing" element={session ? <Pricing /> : <Navigate to="/login" />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
          </Routes>
        </Router>
      </FastingProvider>
    </GoalsProvider>
  );
}

export default App;