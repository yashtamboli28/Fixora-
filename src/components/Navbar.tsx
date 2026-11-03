import React, { useState } from 'react';
import { Menu, Wrench, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type AppView =
  | 'landing'
  | 'discover'
  | 'customer-auth'
  | 'technician-onboarding'
  | 'customer-dashboard'
  | 'technician-dashboard'
  | 'admin-dashboard';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView, sectionId?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { profile, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = (view: AppView, sectionId?: string) => {
    setMobileOpen(false);
    onNavigate(view, sectionId);
  };

  const getDashboardTarget = (): AppView => {
    if (!profile) return 'customer-auth';
    if (profile.role === 'admin') return 'admin-dashboard';
    if (profile.role === 'technician') return 'technician-dashboard';
    return 'customer-dashboard';
  };

  const getDashboardLabel = () => {
    if (!profile) return 'Get Started';
    if (profile.role === 'admin') return 'Admin Console';
    if (profile.role === 'technician') return 'Technician Portal';
    return 'My Dashboard';
  };

  return (
    <header className="sticky top-0 z-40 bg-[#071120] text-white border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 lg:px-8 h-16">
        {/* Zone 1: Clean single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('landing')}
          className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-500"
        >
          <span className="w-8 h-8 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0">
            <Wrench className="w-4 h-4" />
          </span>
          <span>
            <span className="text-white">Fix</span>
            <span className="text-[#22C55E]">ora</span>
          </span>
        </button>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => handleNavClick('landing')}
            className={`hover:text-white underline-offset-8 hover:underline transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentView === 'landing' ? 'text-white underline decoration-[#22C55E]' : ''
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('landing', 'services')}
            className="hover:text-white underline-offset-8 hover:underline transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Services
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('landing', 'how-it-works')}
            className="hover:text-white underline-offset-8 hover:underline transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('discover')}
            className={`hover:text-white underline-offset-8 hover:underline transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentView === 'discover' ? 'text-white underline decoration-[#22C55E]' : ''
            }`}
          >
            Find a Technician
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('landing', 'about-us')}
            className="hover:text-white underline-offset-8 hover:underline transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            About Us
          </button>
        </nav>

        {/* Zone 3: Auth / Primary Action */}
        <div className="hidden md:flex items-center gap-5 shrink-0">
          {profile ? (
            <>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  handleNavClick('landing');
                }}
                className="text-sm font-semibold text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Logout
              </button>
              <button
                type="button"
                onClick={() => handleNavClick(getDashboardTarget())}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#16A34A] rounded-full hover:bg-[#15803D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {getDashboardLabel()}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleNavClick('landing', 'role-selection-login')}
                className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('landing', 'role-selection-signup')}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#16A34A] rounded-full hover:bg-[#15803D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Get Started
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle navigation menu"
          className="md:hidden p-2 rounded-lg text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-[#071120] border-t border-slate-800 px-4 pt-3 pb-5 space-y-2">
          <button
            type="button"
            onClick={() => handleNavClick('landing')}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('landing', 'services')}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Services
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('landing', 'how-it-works')}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('discover')}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Find a Technician
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('landing', 'about-us')}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            About Us
          </button>

          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
            {profile ? (
              <>
                <button
                  type="button"
                  onClick={() => handleNavClick(getDashboardTarget())}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#16A34A] rounded-xl hover:bg-[#15803D]"
                >
                  {getDashboardLabel()}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    handleNavClick('landing');
                  }}
                  className="w-full py-2.5 px-4 text-sm font-medium text-slate-300 border border-slate-700 rounded-xl hover:bg-slate-800"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleNavClick('landing', 'role-selection-login')}
                  className="w-full py-2.5 px-4 text-sm font-medium text-slate-200 border border-slate-700 rounded-xl hover:bg-slate-800"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('landing', 'role-selection-signup')}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#16A34A] rounded-xl hover:bg-[#15803D]"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
