import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { resolveOAuthAction } from './utils/authHelpers';
import { GoalsProvider } from './contexts/GoalsContext';
import { FastingProvider } from './contexts/FastingContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChangeEmail from './pages/ChangeEmail';
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
  const [loading, setloading] = useState(true);
  const [checkingOAuth, setCheckingOAuth] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
    // Check for recovery hash on initial render (before Supabase processes it)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const isRecovery = hashParams.get('type') === 'recovery';
    // Clear the hash immediately after reading to prevent loops on page reload
    if (isRecovery) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      // Set flag for auth listener to check (since hash is now cleared)
      sessionStorage.setItem('password_recovery_active', 'true');
    }
    return isRecovery;
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Don't set session if we're in recovery mode
      if (isPasswordRecovery) {
        console.log('Recovery mode active - not setting initial session');
        setSession(null);
      } else {
        setSession(session);
      }
      setloading(false);
    });

    // Listen for auth changes
    const { data: { subscription }, } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Handle password recovery event - set recovery mode and don't set session
      if (event === 'PASSWORD_RECOVERY') {
        console.log('PASSWORD_RECOVERY event - enabling recovery mode');
        sessionStorage.setItem('password_recovery_active', 'true');
        setIsPasswordRecovery(true);
        setSession(null);
        return;
      }

      // Skip setting session if we're already in recovery mode
      // Note: Hash is cleared on initial load, so we rely on isPasswordRecovery state
      if (event === 'SIGNED_IN') {
        // Check current recovery state - use a ref or check localStorage for persistence
        const recoveryActive = sessionStorage.getItem('password_recovery_active') === 'true';
        if (recoveryActive) {
          console.log('Recovery mode active - ignoring SIGNED_IN event');
          setSession(null);
          return;
        }
      }

      // IMPORTANT: Don't set session immediately - wait for OAuth checks to complete
      // This prevents the dashboard from flashing before blocking

      if (event === 'SIGNED_IN' && session?.user) {
        const isOAuth = session.user.app_metadata?.provider !== 'email';

        if (isOAuth) {
          // Check where the OAuth flow originated from
          const oauthOrigin = localStorage.getItem('oauth_flow_origin');

          if (oauthOrigin === 'register') {
            // Keep loading state active during OAuth checks
            setCheckingOAuth(true);

            // User clicked "Continue with Google" on register page.
            // Decide new-vs-existing from server timestamps only (see
            // authHelpers.js) - no client clock, no user_profile lookup.
            const action = resolveOAuthAction({ origin: 'register', user: session.user, hasProfile: null });

            if (action === 'block_existing') {
              await supabase.auth.signOut();
              localStorage.removeItem('oauth_flow_origin');
              localStorage.removeItem('oauth_account_check');
              localStorage.setItem('oauth_login_error', 'An account with this Google account already exists. Please login instead.');
              setCheckingOAuth(false);
              window.location.replace('/register');
              return;
            }

            // New account, or account age unknown - allow signup
            localStorage.removeItem('oauth_flow_origin');
            localStorage.removeItem('oauth_account_check');
            setCheckingOAuth(false);
            setSession(session);
            return;
          } else if (oauthOrigin === 'login') {
            // Keep loading state active during OAuth checks
            setCheckingOAuth(true);

            // User clicked "Continue with Google" on login page
            try {
              const { data: profileData, error: profileError } = await supabase
                .from('user_profile')
                .select('user_id')
                .eq('user_id', session.user.id)
                .maybeSingle();

              if (profileError) {
                // Profile state unknown (query failed) - fail open to
                // dashboard rather than treating it as a missing row.
                localStorage.removeItem('oauth_flow_origin');
                localStorage.removeItem('oauth_account_check');
                setCheckingOAuth(false);
                setSession(session);
                return;
              }

              const hasProfile = profileData !== null;
              const action = resolveOAuthAction({ origin: 'login', user: session.user, hasProfile });

              localStorage.removeItem('oauth_flow_origin');
              localStorage.removeItem('oauth_account_check');

              if (action === 'allow_to_profile') {
                // No profile row - never sign out over this; let them
                // finish setting up their profile instead of locking out.
                window.history.replaceState(null, '', '/profile');
                setCheckingOAuth(false);
                setSession(session);
                return;
              }

              // Existing account with a profile - allow login
              setCheckingOAuth(false);
              setSession(session);
              return;
            } catch (err) {
              console.error('Error checking profile:', err);
              // On error, default to allowing (fail open for better UX)
              localStorage.removeItem('oauth_flow_origin');
              localStorage.removeItem('oauth_account_check');
              setCheckingOAuth(false);
              setSession(session);
              return;
            }
          } else {
            // No origin stored (direct navigation or page refresh) - allow through
            localStorage.removeItem('oauth_flow_origin');
            localStorage.removeItem('oauth_account_check');
            setSession(session);
            return;
          }
        }
      }

      // For non-OAuth or SIGNED_OUT events, just set the session normally
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading || checkingOAuth) {
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
            <Route path="/change-email" element={<ChangeEmail />} />
            <Route path="/change-password" element={session && !isPasswordRecovery ? <ChangePassword /> : <Navigate to="/login" />} />
            <Route path="/profile" element={session && !isPasswordRecovery ? <Profile /> : <Navigate to="/login" />} />
            <Route path="/dashboard" element={session && !isPasswordRecovery ? <Dashboard /> : (isPasswordRecovery ? <Navigate to="/reset-password" /> : <Navigate to="/login" />)} />
            <Route path="/logging" element={session && !isPasswordRecovery ? <Logging /> : <Navigate to="/login" />} />
            <Route path="/progress" element={session && !isPasswordRecovery ? <Progress /> : <Navigate to="/login" />} />
            <Route path="/daily-view/:date" element={session && !isPasswordRecovery ? <DailyView /> : <Navigate to="/login" />} />
            <Route path="/gallery" element={session && !isPasswordRecovery ? <PhotoGallery /> : <Navigate to="/login" />} />
            <Route path="/recommendations" element={session && !isPasswordRecovery ? <RecommendationsPage /> : <Navigate to="/login" />} />
            <Route path="/pricing" element={session && !isPasswordRecovery ? <Pricing /> : <Navigate to="/login" />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
          </Routes>
        </Router>
      </FastingProvider>
    </GoalsProvider>
  );
}

export default App;