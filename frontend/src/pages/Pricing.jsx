import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { useState } from 'react';

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = [
    {
      name: 'Free',
      price: { monthly: 0, yearly: 0 },
      description: 'Perfect for getting started',
      features: [
        '30 days meal history',
        '10 AI photo analyses/month',
        'USDA food database access',
        'Basic nutrition insights',
        'Progress tracking',
        'Goal setting',
      ],
      limitations: [
        'Limited history (30 days)',
        'Ad-supported',
        'Limited AI analyses',
      ],
      cta: 'Current Plan',
      highlighted: false,
      disabled: false,
    },
    {
      name: 'Premium',
      price: { monthly: 2.99, yearly: 29.99 },
      description: 'Unlock all features',
      badge: 'Coming Soon',
      features: [
        'Unlimited meal history',
        'Unlimited AI photo analyses',
        'Advanced nutrition charts',
        'Custom macro goals',
        'Weight tracking',
        'Data export (CSV/PDF)',
        'Ad-free experience',
        'Priority AI responses',
        'Email support',
        'Future features included',
      ],
      limitations: [],
      cta: 'Notify Me',
      highlighted: true,
      disabled: true,
    },
  ];

  return (
    <Sidebar>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-heading font-bold text-white mb-4"
          >
            Simple, Transparent Pricing
          </motion.h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Start free, upgrade when you're ready. No hidden fees.
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center items-center gap-4"
        >
          <span className={billingCycle === 'monthly' ? 'text-white font-medium' : 'text-white/50'}>
            Monthly
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className="relative w-14 h-7 bg-white/10  transition-colors hover:bg-white/20"
          >
            <motion.div
              animate={{ x: billingCycle === 'yearly' ? 28 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-1 w-5 h-5 bg-primary-700 "
            />
          </button>
          <span className={billingCycle === 'yearly' ? 'text-white font-medium' : 'text-white/50'}>
            Yearly
            <span className="ml-2 text-xs text-green-400">(Save 17%)</span>
          </span>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 mt-12">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              className={`card p-8 relative ${
                plan.highlighted ? 'border-2 border-primary-700 shadow-lg shadow-primary-700/20' : ''
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary-700 text-white px-4 py-1  text-sm font-medium">
                    {plan.badge}
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-heading font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-white/60 text-sm mb-4">{plan.description}</p>

                {/* Price */}
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-mono font-bold text-white">
                    ${billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly}
                  </span>
                  <span className="text-white/50">
                    /{billingCycle === 'yearly' ? 'year' : 'month'}
                  </span>
                </div>

                {billingCycle === 'yearly' && plan.price.yearly > 0 && (
                  <p className="text-sm text-white/40 mt-2">
                    ${(plan.price.yearly / 12).toFixed(2)}/month billed annually
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-green-400 flex-shrink-0 mt-0.5">✓</span>
                    <span className="text-white/80">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                disabled={plan.disabled}
                className={`w-full py-3  font-medium transition ${
                  plan.highlighted
                    ? 'bg-primary-700 text-white hover:bg-primary-600 disabled:bg-primary-700/50 disabled:cursor-not-allowed'
                    : 'bg-white/10 text-white hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed'
                }`}
                onClick={() => {
                  if (plan.disabled) {
                    alert('Premium plan coming soon! We\'ll notify you when it\'s available.');
                  }
                }}
              >
                {plan.cta}
              </button>

              {/* Limitations */}
              {plan.limitations.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-xs text-white/40 mb-2">Limitations:</p>
                  <ul className="space-y-1">
                    {plan.limitations.map((limitation, i) => (
                      <li key={i} className="text-xs text-white/50">
                        • {limitation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16"
        >
          <h2 className="text-2xl font-heading font-bold text-white text-center mb-8">
            Frequently Asked Questions
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                q: 'Can I upgrade from Free to Premium anytime?',
                a: 'Yes! Once Premium launches, you can upgrade at any time. Your data will be preserved.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We will accept all major credit cards, debit cards, and digital wallets through Stripe.',
              },
              {
                q: 'Can I cancel my subscription?',
                a: 'Absolutely. Cancel anytime with no questions asked. You\'ll retain Premium access until the end of your billing period.',
              },
              {
                q: 'Is my data secure?',
                a: 'Yes. We use industry-standard encryption and never share your personal data with third parties.',
              },
            ].map((faq, i) => (
              <div key={i} className="card p-6">
                <h3 className="text-lg font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-white/60">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-16 card p-8 bg-gradient-to-r from-primary-700/20 to-secondary-500/20 border border-primary-700/30"
        >
          <h2 className="text-2xl font-heading font-bold text-white mb-2">
            Ready to take control of your nutrition?
          </h2>
          <p className="text-white/60 mb-6">
            Start tracking your meals today with our free plan.
          </p>
          <Link
            to="/dashboard"
            className="inline-block px-8 py-3 bg-primary-700 text-white  font-medium hover:bg-primary-600 transition"
          >
            Get Started Free
          </Link>
        </motion.div>
      </div>
    </Sidebar>
  );
}
