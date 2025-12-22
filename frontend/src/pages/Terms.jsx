import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
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
          <h1 className="text-4xl font-heading font-bold text-white mb-4">Terms of Service</h1>
          <p className="text-white/50">Last updated: January 2025</p>
        </div>

        <div className="bg-[#111] border border-white/10 p-8">
          <div className="space-y-8 text-white/70 leading-relaxed">

            <section>
              <h2 className="text-xl font-heading font-semibold text-white mb-4">Agreement to Terms</h2>
              <p>By accessing or using NutriSync, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
            </section>

            <section>
              <h2 className="text-xl font-heading font-semibold text-white mb-4">Account Registration</h2>
              <p className="mb-3">When you create an account, you agree to:</p>
              <ul className="space-y-2 ml-4">
                <li>• Provide accurate, current, and complete information</li>
                <li>• Maintain the security of your account</li>
                <li>• Be at least 13 years of age (users under 18 should have parental consent)</li>
                <li>• Maintain only one account per person</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-heading font-semibold text-white mb-4">Acceptable Use</h2>
              <p className="mb-3">You agree not to:</p>
              <ul className="space-y-2 ml-4">
                <li>• Use the service in any way that violates applicable laws</li>
                <li>• Attempt to gain unauthorized access to the service</li>
                <li>• Upload viruses, malware, or malicious code</li>
                <li>• Submit false or misleading information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-heading font-semibold text-white mb-4">Medical Disclaimer</h2>
              <p className="mb-3">NutriSync is a nutrition tracking tool and is not intended to provide medical advice. Important:</p>
              <ul className="space-y-2 ml-4">
                <li>• Nutritional information is for informational purposes only</li>
                <li>• Always consult a physician for medical conditions or dietary changes</li>
                <li>• AI-generated estimates may contain inaccuracies</li>
                <li>• Never disregard professional medical advice</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-heading font-semibold text-white mb-4">User Content</h2>
              <p className="mb-3">You retain all rights to content you upload. By uploading, you grant us a license to:</p>
              <ul className="space-y-2 ml-4">
                <li>• Process your data using AI for nutritional analysis</li>
                <li>• Store your meal logs and photos securely</li>
                <li>• Generate analytics and personalized recommendations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-heading font-semibold text-white mb-4">Limitation of Liability</h2>
              <p>NutriSync and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.</p>
            </section>

            <section>
              <h2 className="text-xl font-heading font-semibold text-white mb-4">Service Availability</h2>
              <p className="mb-3">We do not guarantee that the service will be:</p>
              <ul className="space-y-2 ml-4">
                <li>• Uninterrupted, timely, secure, or error-free</li>
                <li>• Available at all times</li>
                <li>• Free from viruses or harmful components</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-heading font-semibold text-white mb-4">Account Termination</h2>
              <p className="mb-3">We may terminate your account for:</p>
              <ul className="space-y-2 ml-4">
                <li>• Breach of these Terms of Service</li>
                <li>• Fraudulent, abusive, or illegal activity</li>
                <li>• Legal requirements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-heading font-semibold text-white mb-4">Changes to Terms</h2>
              <p>We may modify these Terms at any time. Material changes will be communicated with at least 30 days notice.</p>
            </section>

            <section>
              <h2 className="text-xl font-heading font-semibold text-white mb-4">Contact</h2>
              <p>
                Questions about these Terms? Contact us at{' '}
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
