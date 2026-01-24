import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle, Info, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isOAuthAccount, setIsOAuthAccount] = useState(false);
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if this is an OAuth-only account (no password set yet)
    const checkAuthProvider = async () => {
      // Check sessionStorage for recovery flag (set by App.jsx when hash was detected)
      const recoveryActive = sessionStorage.getItem('password_recovery_active') === 'true';

      // Also check URL hash as fallback (in case user navigated directly)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const tokenType = hashParams.get('type');
      const accessToken = hashParams.get('access_token');

      console.log('Recovery active from sessionStorage:', recoveryActive);
      console.log('URL hash type:', tokenType);
      console.log('Has access token:', !!accessToken);

      // If coming from password reset email (recovery flag set or hash present)
      // ALWAYS show password reset form, never redirect
      if (recoveryActive || tokenType === 'recovery' || accessToken) {
        console.log('Password reset link detected - showing reset form');
        setIsRecoverySession(true);
        setIsOAuthAccount(false);
        return;
      }

      // Only if NOT from password reset link, check if user is OAuth-only
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const provider = user.app_metadata?.provider;
        const hasOAuthProvider = provider === 'google' || provider === 'github' || provider === 'facebook';

        console.log('User provider:', provider);
        console.log('Setting isOAuthAccount:', hasOAuthProvider);

        setIsOAuthAccount(hasOAuthProvider);
      }
    };

    checkAuthProvider();
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      setError('Password must include at least one special character');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
      } else {
        console.log('Password updated successfully');
        console.log('Was recovery session:', isRecoverySession);
        console.log('Is OAuth account:', isOAuthAccount);

        // If they came from a password reset link, sign them out regardless of OAuth
        if (isRecoverySession) {
          console.log('Recovery session - signing out user');
          // Clear the URL hash and recovery flag to prevent recovery loop
          window.history.replaceState(null, '', window.location.pathname);
          sessionStorage.removeItem('password_recovery_active');
          await supabase.auth.signOut();
          setSuccess(true);
        } else if (isOAuthAccount) {
          // For OAuth accounts navigating manually, don't sign out - just redirect
          console.log('OAuth account - staying logged in');
          setSuccess(true);
          setTimeout(() => navigate('/dashboard'), 2000);
        } else {
          // For regular accounts, sign out so they can log in with new password
          console.log('Regular account - signing out');
          await supabase.auth.signOut();
          setSuccess(true);
        }
        setLoading(false);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="card p-8 max-w-md w-full border border-white/10">
        <div className="text-center mb-8">
          <div className="w-16 h-16  bg-primary-700/20 flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-primary-500" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-white mb-2">
            {isOAuthAccount ? 'Set Password' : 'Reset Password'}
          </h1>
          <p className="text-white/50">
            {isOAuthAccount ? 'Add a password to your account' : 'Enter your new password below'}
          </p>
        </div>

        {isOAuthAccount && !success && (
          <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-3 mb-6 flex items-start gap-3">
            <Info size={20} className="mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium mb-1">Google Account Detected</p>
              <p className="text-blue-300/80">
                You can set a password here to enable login with both Google and email/password.
              </p>
            </div>
          </div>
        )}

        {success ? (
          <div className="space-y-6">
            <div className="bg-primary-700/10 border border-primary-700/30 text-primary-500 px-4 py-4 flex items-center gap-3">
              <CheckCircle size={20} />
              <span>
                {isOAuthAccount
                  ? 'Password set successfully! You can now login with email/password or Google.'
                  : 'Password updated successfully!'}
              </span>
            </div>
            <button
              onClick={() => navigate(isOAuthAccount ? '/dashboard' : '/login')}
              className="w-full btn-primary py-3"
            >
              {isOAuthAccount ? 'Go to Dashboard' : 'Go to Login'}
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3  mb-6 flex items-center gap-3">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pr-12"
                    placeholder="Enter new password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="text-xs text-white/40 mt-2">
                  Must be at least 8 characters with a special character
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input pr-12"
                    placeholder="Confirm new password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 disabled:opacity-50"
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
