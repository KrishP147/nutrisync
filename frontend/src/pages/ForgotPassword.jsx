import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
      } else {
        setSuccess(true);
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
          <div className="w-16 h-16  bg-secondary-500/20 flex items-center justify-center mx-auto mb-4">
            <Mail size={32} className="text-secondary-400" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-white mb-2">Forgot Password?</h1>
          <p className="text-white/50">
            {success 
              ? "Check your email for a password reset link" 
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="bg-primary-700/10 border border-primary-700/30 text-primary-500 px-4 py-4  flex items-start gap-3">
              <CheckCircle size={20} className="mt-0.5 flex-shrink-0" />
              <span>
                We've sent a password reset link to <strong>{email}</strong>. 
                Please check your email and click the link to reset your password.
              </span>
            </div>
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-primary-500 hover:text-primary-400 font-medium transition"
            >
              <ArrowLeft size={16} />
              Return to Login
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3  mb-6 flex items-center gap-3">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 disabled:opacity-50"
              >
                {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-white/50">
              Remember your password?{' '}
              <Link to="/login" className="text-primary-500 hover:text-primary-400 font-medium transition">
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
