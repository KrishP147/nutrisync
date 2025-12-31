import { Link } from 'react-router-dom';
import { motion as Motion } from 'motion/react';
import {
  Camera,
  BarChart3,
  Target,
  Zap,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Utensils,
  Database,
  Sparkles,
  ChevronDown
} from 'lucide-react';

export default function Landing() {
  const features = [
    {
      icon: Camera,
      title: "AI Photo Analysis",
      description: "Snap a photo and get instant AI-powered nutritional breakdowns with clinical precision.",
      color: "secondary"
    },
    {
      icon: Database,
      title: "300K+ Foods Database",
      description: "Access a comprehensive food database with detailed macro and micronutrient data.",
      color: "amber"
    },
    {
      icon: Target,
      title: "Personalized Goals",
      description: "Set custom nutrition targets based on your health objectives and lifestyle.",
      color: "purple"
    },
    {
      icon: Sparkles,
      title: "Smart Insights",
      description: "Receive AI-driven suggestions to optimize your diet and fill nutritional gaps.",
      color: "primary"
    }
  ];

  const stats = [
    { value: "300K+", label: "Foods in Database", color: "text-primary-500" },
    { value: "95%", label: "AI Accuracy", color: "text-secondary-500" },
    { value: "24/7", label: "Tracking", color: "text-amber-500" }
  ];

  const benefits = [
    "Track macros and micronutrients with precision",
    "AI-powered meal recognition and analysis",
    "Comprehensive progress visualization",
    "Personalized dietary recommendations",
    "Secure cloud sync across all devices",
    "Export detailed nutrition reports"
  ];

  const howItWorks = [
    { step: "01", title: "Upload Photo", description: "Take a photo of your meal or search our database" },
    { step: "02", title: "Get Analysis", description: "AI instantly identifies foods and calculates nutrition" },
    { step: "03", title: "Track Progress", description: "Monitor your goals with beautiful visualizations" }
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="NutriSync" className="w-10 h-10" />
            <span className="text-xl font-heading font-bold text-white">NutriSync</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <Link to="/login" className="text-white/70 hover:text-white transition-colors font-medium text-sm sm:text-base">
              Login
            </Link>
            <Link to="/register" className="btn-primary text-sm sm:text-base px-3 sm:px-4">
              <span className="hidden sm:inline">Get Started</span>
              <span className="sm:hidden">Start</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image - Lighter overlay */}
        <div className="absolute inset-0">
          <img
            src="/images/stock photo 1.jpg"
            alt="Healthy nutrition"
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-24">
          <Motion.div             initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700/20 border border-primary-700/30 text-primary-500 text-sm font-medium mb-8">
              <Zap size={16} />
              AI-Powered Nutrition Tracking
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-heading font-bold text-white mb-6 leading-tight">
              Track Nutrition
              <br />
              <span className="text-primary-500">with AI</span>
            </h1>

            <p className="text-xl md:text-2xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
              Professional-grade meal tracking. Snap a photo, get instant analysis. Make data-driven nutrition decisions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-primary text-lg px-8 py-4">
                Get Started Free
                <ArrowRight size={20} />
              </Link>
              <Link to="/login" className="btn-outline text-lg px-8 py-4">
                View Demo
              </Link>
            </div>
          </Motion.div>

          {/* Stats Row */}
          <Motion.div             initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className={`text-4xl md:text-5xl font-mono font-bold ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-white/50 text-sm mt-2">{stat.label}</div>
              </div>
            ))}
          </Motion.div>
        </div>

      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
          <Motion.div             initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
              Powerful Features
            </h2>
            <p className="text-xl text-white/50 max-w-2xl mx-auto">
              Everything you need to track, analyze, and optimize your nutrition
            </p>
          </Motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => {
              const featureImages = [
                '/pexels-nutrisense-inc-683752192-17947739.jpg',  // Woman with food - main image
                '/pexels-mastercowley-1153369.jpg',
                '/pexels-ella-olsson-572949-1640773.jpg',
                '/pexels-ella-olsson-572949-1640777.jpg'
              ];

              return (
                <Motion.div                   key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="card-hover p-0 overflow-hidden"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={featureImages[index]}
                      alt={feature.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                  </div>
                  <div className="p-8">
                    <h3 className="text-2xl font-heading font-semibold text-white mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-white/60 text-lg leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </Motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <Motion.div             initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
              How It Works
            </h2>
            <p className="text-xl text-white/50">Three simple steps to better nutrition</p>
          </Motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorks.map((item, index) => (
              <Motion.div                 key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="text-center"
              >
                <div className="text-6xl font-mono font-bold text-green-500/40 mb-4">{item.step}</div>
                <h3 className="text-xl font-heading font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-white/60">{item.description}</p>
              </Motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Image Section */}
      <section className="relative min-h-[60vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/stock photo 2.jpg"
            alt="Fresh healthy food"
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
        </div>

        <Motion.div           initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-7xl mx-auto px-6"
        >
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary-500/20 border border-secondary-500/30 text-secondary-400 text-sm font-medium mb-6">
              <TrendingUp size={16} />
              Progress Tracking
            </div>
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
              Track Your Progress
            </h2>
            <p className="text-xl text-white/80 leading-relaxed mb-8">
              Monitor your nutrition metrics in real-time with comprehensive data visualization and trend analysis.
            </p>
            <Link to="/register" className="btn-secondary">
              Start Tracking
              <ArrowRight size={18} />
            </Link>
          </div>
        </Motion.div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <Motion.div               initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
                Data-Driven
                <span className="text-secondary-500"> Nutrition </span>
                Decisions
              </h2>
              <p className="text-xl text-white/60 mb-10 leading-relaxed">
                NutriSync provides professional-grade tools to understand your eating patterns, identify nutritional gaps, and optimize your diet.
              </p>

              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <Motion.div                     key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-6 h-6 bg-primary-700/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={16} className="text-primary-500" />
                    </div>
                    <span className="text-white/80">{benefit}</span>
                  </Motion.div>
                ))}
              </div>
            </Motion.div>

            <Motion.div               initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              {/* Mock dashboard preview */}
              <div className="card p-6 glow-green">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-primary-700/20 flex items-center justify-center">
                    <Utensils size={24} className="text-primary-500" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Today's Nutrition</h4>
                    <p className="text-white/50 text-sm font-mono">2,150 / 2,400 kcal</p>
                  </div>
                </div>

                {/* Mock progress bars */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white/60">Protein</span>
                      <span className="text-secondary-500 font-mono">145g / 180g</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill bg-secondary-500" style={{ width: '80%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white/60">Carbs</span>
                      <span className="text-amber-500 font-mono">220g / 280g</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill bg-amber-500" style={{ width: '78%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white/60">Fat</span>
                      <span className="text-purple-500 font-mono">65g / 80g</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill bg-purple-500" style={{ width: '81%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </Motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-6 bg-black border-y border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-white/40 text-sm uppercase tracking-wider mb-8">Trusted by nutrition enthusiasts</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <p className="text-3xl font-mono font-bold text-white">50+</p>
              <p className="text-white/50 text-sm">Active Users</p>
            </div>
            <div>
              <p className="text-3xl font-mono font-bold text-white">1,000+</p>
              <p className="text-white/50 text-sm">Meals Tracked</p>
            </div>
            <div>
              <p className="text-3xl font-mono font-bold text-white">95%</p>
              <p className="text-white/50 text-sm">Accuracy Rate</p>
            </div>
            <div>
              <p className="text-3xl font-mono font-bold text-white">4.9</p>
              <p className="text-white/50 text-sm">User Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-[#0a0a0a]">
        <Motion.div           initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="card p-12 md:p-16 border-primary-700/30 glow-green">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
              Ready to Transform Your Nutrition?
            </h2>
            <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto">
              Join users who track their nutrition with professional-grade precision
            </p>
            <Link to="/register" className="btn-primary text-lg px-10 py-4">
              Get Started Free
              <ArrowRight size={20} />
            </Link>
          </div>
        </Motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="NutriSync" className="w-8 h-8" />
              <span className="text-white/60 text-sm">
                2025 NutriSync. Professional nutrition tracking.
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/40">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <span className="text-white/20">|</span>
              <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <span className="text-white/20">|</span>
              <a href="mailto:krishnet1@hotmail.com" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
