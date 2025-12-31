import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { motion as Motion } from 'motion/react';
import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Check for OAuth login error on mount
  useEffect(() => {
    const oauthError = localStorage.getItem('oauth_login_error');
    if (oauthError) {
      setError(oauthError);
      localStorage.removeItem('oauth_login_error');
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          data: {
            remember: rememberMe
          }
        }
      });

      if (error) {
        setError(error.message);
      } else {
        navigate('/dashboard');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Store that OAuth flow started from login page
      localStorage.setItem('oauth_flow_origin', 'login');
      // Set a flag indicating this is a login attempt
      localStorage.setItem('oauth_account_check', 'login_attempt');

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        setError(error.message);
        localStorage.removeItem('oauth_flow_origin');
        localStorage.removeItem('oauth_account_check');
      }
    } catch {
      setError('Failed to connect to Google. Please try again.');
      localStorage.removeItem('oauth_flow_origin');
      localStorage.removeItem('oauth_account_check');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Motion.div           initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 mb-12">
            <img src="/logo.png" alt="NutriSync" className="w-10 h-10" />
            <span className="text-xl font-heading font-bold text-white">NutriSync</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-heading font-bold text-white mb-2">Welcome back</h1>
            <p className="text-white/50">Login to continue tracking your nutrition</p>
          </div>

          {/* Error Message */}
          {error && (
            <Motion.div               initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 mb-6"
            >
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{error}</span>
                {error.includes('No account found') && (
                  <div className="mt-2">
                    <Link to="/register" className="text-primary-500 hover:text-primary-400 font-medium underline">
                      Go to Signup
                    </Link>
                  </div>
                )}
              </div>
            </Motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="input-label">Email</label>
              <div className="relative">
                <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-3 pl-12 text-white placeholder-white/30 focus:outline-none focus:border-primary-700"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-white/70">Password</label>
                <Link to="/forgot-password" className="text-sm text-primary-500 hover:text-primary-400">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-3 pl-12 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-primary-700"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 border-white/20 bg-[#0a0a0a] text-primary-700 focus:ring-primary-700 focus:ring-offset-black"
              />
              <label htmlFor="remember" className="text-sm text-white/60">
                Remember me for 30 days
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? 'Logging in...' : 'Login'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-sm text-white/40">or continue with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="btn-outline w-full py-3"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>

          {/* Signup link */}
          <p className="mt-8 text-center text-white/50">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-500 hover:text-primary-400 font-medium">
              Signup
            </Link>
          </p>
        </Motion.div>
      </div>

      {/* Right side - Image/Branding */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#0a0a0a]">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-700/20 via-transparent to-secondary-500/20" />
          <div className="absolute inset-0 flex items-center justify-center p-12">
            <div className="text-center">
              <img src="/logo.png" alt="NutriSync" className="w-24 h-24 mx-auto mb-8" />
              <h2 className="text-3xl font-heading font-bold text-white mb-4">
                Track Your Nutrition
              </h2>
              <p className="text-white/50 text-lg max-w-sm">
                Professional-grade meal tracking and analysis to help you achieve your health goals
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
