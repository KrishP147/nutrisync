import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black/90 border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.svg" alt="NutriSync" className="w-10 h-10" />
            <span className="text-xl font-heading font-bold text-white">NutriSync</span>
          </Link>
          <Link to="/login" className="btn-ghost text-sm">
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto px-6 py-16"
      >
        <div className="mb-12">
          <h1 className="text-4xl font-heading font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-white/50">Last updated: January 2025</p>
        </div>

        <div className="bg-[#111] border border-white/10 p-8">
          <div className="space-y-8 text-white/70 leading-relaxed">

            <section>
              <h2 className="text-xl font-heading font-semibold text-white mb-4">Introduction</h2>
              <p>We are committed to protecting your privacy and being transparent about how we use your data. This Privacy Policy explains what information we collect, how we use it, and your rights.</p>
            </section>

            <section>
              <h2 className="text-xl font-heading font-semibold text-white mb-4">Information We Collect</h2>
              <ul className="space-y-2 ml-4">
                <li>• <strong className="text-white">Account Information:</strong> Email address and basic profile information from Google OAuth (name, profile picture)</li>
                <li>• <strong className="text-white">Nutrition Data:</strong> Meal logs, nutritional information, food photos, and personal nutrition goals</li>
                <li>• <strong className="text-white">Usage Data:</strong> Information about how you interact with our service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-heading font-semibold text-white mb-4">How We Use Your Information</h2>
              <ul className="space-y-2 ml-4">
                <li>• <strong className="text-white">Authentication:</strong> To verify your identity and allow secure account access</li>
                <li>• <strong className="text-white">Service Delivery:</strong> To provide nutrition tracking, meal analysis, and personalized insights</li>
                <li>• <strong className="text-white">AI Analysis:</strong> Food photos are analyzed using Google Gemini AI for nutritional estimates</li>
                <li>• <strong className="text-white">Improvement:</strong> To improve our services and develop new features</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-heading font-semibold text-white mb-4">Google Data Usage</h2>
              <p>We use Google OAuth exclusively for authentication. We only access your basic profile information (email, name, profile picture). We do not access Gmail, Drive, Calendar, or other Google services. Your Google credentials are never stored on our servers.</p>
            </section>

            <section>
              <h2 className="text-xl font-heading font-semibold text-white mb-4">Data Storage and Security</h2>
              <p>Your data is stored securely using Supabase. We implement industry-standard security measures including encryption, secure authentication, and regular security audits.</p>
            </section>

            <section>
              <h2 className="text-xl font-heading font-semibold text-white mb-4">Your Rights</h2>
              <ul className="space-y-2 ml-4">
                <li>• <strong className="text-white">Access:</strong> View all your stored data within your account dashboard</li>
                <li>• <strong className="text-white">Correction:</strong> Update or correct your information through profile settings</li>
                <li>• <strong className="text-white">Deletion:</strong> Delete your account and all associated data at any time</li>
                <li>• <strong className="text-white">Export:</strong> Request a copy of your data by contacting us</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-heading font-semibold text-white mb-4">Data Sharing</h2>
              <p className="mb-3">We do not sell, rent, or share your personal information with third parties for marketing. We only share data with:</p>
              <ul className="space-y-2 ml-4">
                <li>• <strong className="text-white">Service Providers:</strong> Supabase (database) and Google Gemini (AI analysis)</li>
                <li>• <strong className="text-white">Legal Requirements:</strong> If required by law or valid legal requests</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-heading font-semibold text-white mb-4">Contact</h2>
              <p>
                Questions about this Privacy Policy? Contact us at{' '}
                <a href="mailto:krishnet1@hotmail.com" className="text-primary-500 hover:text-primary-400">
                  krishnet1@hotmail.com
                </a>
              </p>
            </section>

          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <Link to="/" className="btn-primary">
            <ArrowLeft size={18} />
            Back to Home
          </Link>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-white/40">
          <p>2025 NutriSync. Professional nutrition tracking.</p>
        </div>
      </footer>
    </div>
  );
}
