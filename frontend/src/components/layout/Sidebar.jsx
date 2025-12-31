import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, memo, useCallback } from 'react';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';

const navItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/logging', label: 'Log Meals' },
  { path: '/progress', label: 'Progress' },
  { path: '/recommendations', label: 'AI Insights' },
];

const bottomItems = [
  { path: '/profile', label: 'Profile' },
];

function Sidebar({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = useCallback((path) => location.pathname === path, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const NavLink = ({ item }) => {
    const active = isActive(item.path);

    return (
      <Link
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={`
          flex items-center gap-3 px-4 py-3  transition-all duration-200 relative
          ${active 
            ? 'text-white bg-primary-700/10' 
            : 'text-white/60 hover:text-white hover:bg-white/5'
          }
        `}
      >
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-700" />
        )}
        {!collapsed && (
          <span className="font-medium whitespace-nowrap overflow-hidden">
            {item.label}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-black">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2  bg-[#0a0a0a] border border-white/10 text-white"
      >
        Menu
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <Motion.div             initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/80 z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <Motion.aside         initial={false}
        animate={{
          width: collapsed ? 0 : 260,
          x: mobileOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1024) ? -260 : 0
        }}
        className={`
          fixed lg:sticky top-0 left-0 h-screen z-50 lg:z-auto
          bg-[#0a0a0a] border-r border-white/10 flex flex-col overflow-hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <Link to="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <img src="/logo.png" alt="NutriSync" className="w-10 h-10 flex-shrink-0" />
            {!collapsed && (
              <span className="text-xl font-heading font-bold text-white whitespace-nowrap overflow-hidden">
                NutriSync
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-white/10 space-y-1">
          {bottomItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3  text-white/60 hover:text-red-500 hover:bg-red-500/10 transition-all duration-200"
          >
            {!collapsed && (
              <span className="font-medium whitespace-nowrap overflow-hidden">
                Log Out
              </span>
            )}
          </button>
        </div>

        {/* Collapse button - desktop only */}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6  bg-[#0a0a0a] border border-white/10 items-center justify-center text-white/60 hover:text-white transition-colors z-10"
          >
            {'<'}
          </button>
        )}
      </Motion.aside>

      {/* Expand button - shows when collapsed */}
      {collapsed && (
        <Motion.button           initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          onClick={() => setCollapsed(false)}
          className="hidden lg:flex fixed left-2 top-1/2 -translate-y-1/2 w-8 h-8  bg-[#0a0a0a] border border-white/10 items-center justify-center text-white/60 hover:text-white transition-all z-50 hover:w-10"
        >
          {'>'}
        </Motion.button>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 lg:ml-0">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}

// Memoize Sidebar to prevent unnecessary re-renders
// Note: children will always be a new reference, but that's okay
// The important part is that Sidebar's internal state persists
export default memo(Sidebar);
