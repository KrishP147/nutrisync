import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';

export default function ChangeEmail() {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a valid session from the email link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Invalid or expired email change link. Please try again.');
      } else {
        // Email change is handled automatically by Supabase when user clicks the link
        setSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      }
    };
    
    checkSession();
  }, [navigate]);

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full border border-white/10">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-primary-400" />
            </div>
            <h1 className="text-3xl font-heading font-bold text-white mb-2">Email Updated!</h1>
            <p className="text-white/70 mb-6">
              Your email has been successfully updated. Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full border border-white/10">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-red-400" />
            </div>
            <h1 className="text-3xl font-heading font-bold text-white mb-2">Error</h1>
            <p className="text-white/70 mb-6">{error}</p>
            <button
              onClick={() => navigate('/profile')}
              className="btn-primary w-full"
            >
              Back to Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="card p-8 max-w-md w-full border border-white/10">
        <div className="text-center">
          <div className="w-16 h-16 bg-secondary-500/20 flex items-center justify-center mx-auto mb-4">
            <Mail size={32} className="text-secondary-400 animate-pulse" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-white mb-2">Verifying...</h1>
          <p className="text-white/70">
            Please wait while we update your email address.
          </p>
        </div>
      </div>
    </div>
  );
}
