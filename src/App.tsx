import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, type AppView } from './components/Navbar';
import { Footer } from './components/Footer';
import { LocationModal } from './components/LocationModal';
import { LandingView } from './views/LandingView';
import { DiscoveryView } from './views/DiscoveryView';
import { CustomerAuthView } from './views/CustomerAuthView';
import { TechnicianOnboardingView } from './views/TechnicianOnboardingView';
import { CustomerDashboardView } from './views/CustomerDashboardView';
import { TechnicianDashboardView } from './views/TechnicianDashboardView';
import { AdminDashboardView } from './views/AdminDashboardView';
import type { PublicTechnician } from './types/marketplace';

const MarketplaceShell: React.FC = () => {
  const { profile, loading } = useAuth();

  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [authRole, setAuthRole] = useState<'customer' | 'technician'>('customer');
  const [roleSelectionIntent, setRoleSelectionIntent] = useState<'signup' | 'login'>(
    'signup'
  );
  const [locationModalOpen, setLocationModalOpen] = useState<boolean>(false);

  // Repair booking intent state
  const [selectedDeviceIntent, setSelectedDeviceIntent] = useState<string>('all');
  const [selectedProblemIntent, setSelectedProblemIntent] = useState<string>('');
  const [preselectedTechnician, setPreselectedTechnician] =
    useState<PublicTechnician | null>(null);

  const handleNavigate = (view: AppView, sectionOrMode?: string) => {
    if (view === 'customer-auth') {
      if (sectionOrMode === 'technician-login') {
        setAuthMode('login');
        setAuthRole('technician');
      } else if (sectionOrMode === 'login') {
        setAuthMode('login');
        setAuthRole('customer');
      } else {
        setAuthMode('signup');
        setAuthRole('customer');
      }
    }

    let scrollTargetId = sectionOrMode;

    if (view === 'landing') {
      if (sectionOrMode === 'role-selection-login') {
        setRoleSelectionIntent('login');
        scrollTargetId = 'role-selection';
      } else if (sectionOrMode === 'role-selection-signup') {
        setRoleSelectionIntent('signup');
        scrollTargetId = 'role-selection';
      } else if (sectionOrMode === 'role-selection') {
        scrollTargetId = 'role-selection';
      }
    }

    setCurrentView(view);

    if (view === 'landing' && scrollTargetId) {
      setTimeout(() => {
        const el = document.getElementById(scrollTargetId!);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectRepairIntent = (deviceType: string, problem?: string) => {
    setSelectedDeviceIntent(deviceType);
    setSelectedProblemIntent(problem || '');
    setPreselectedTechnician(null);

    if (profile?.role === 'customer') {
      setCurrentView('customer-dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setCurrentView('discover');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBookTechnician = (tech: PublicTechnician) => {
    setPreselectedTechnician(tech);
    if (!profile) {
      setAuthMode('signup');
      setAuthRole('customer');
      setCurrentView('customer-auth');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (profile.role === 'admin') {
      setCurrentView('admin-dashboard');
      return;
    }
    if (profile.role === 'technician') {
      setCurrentView('technician-dashboard');
      return;
    }
    setCurrentView('customer-dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccessRedirect = (
    role: 'customer' | 'technician' | 'admin',
    needsLocationSetup: boolean
  ) => {
    if (role === 'admin') {
      setCurrentView('admin-dashboard');
    } else if (role === 'technician') {
      setCurrentView('technician-dashboard');
    } else {
      setCurrentView('customer-dashboard');
      if (needsLocationSetup) {
        setLocationModalOpen(true);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-600">
        Loading Fixora Marketplace...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar currentView={currentView} onNavigate={handleNavigate} />

      <main className="flex-1">
        {currentView === 'landing' && (
          <LandingView
            roleSelectionIntent={roleSelectionIntent}
            onChangeRoleIntent={setRoleSelectionIntent}
            onNavigate={handleNavigate}
            onSelectRepairIntent={handleSelectRepairIntent}
            onBookTechnician={handleBookTechnician}
          />
        )}

        {currentView === 'discover' && (
          <DiscoveryView
            initialDeviceFilter={selectedDeviceIntent}
            initialProblemFilter={selectedProblemIntent}
            onOpenLocationModal={() => setLocationModalOpen(true)}
            onBookTechnician={handleBookTechnician}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'customer-auth' && (
          <CustomerAuthView
            initialMode={authMode}
            authRole={authRole}
            onSuccessRedirect={handleAuthSuccessRedirect}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'technician-onboarding' && (
          <TechnicianOnboardingView onNavigate={handleNavigate} />
        )}

        {currentView === 'customer-dashboard' && (
          <CustomerDashboardView
            initialTab={preselectedTechnician ? 'book' : 'overview'}
            preselectedDevice={
              selectedDeviceIntent !== 'all' ? selectedDeviceIntent : undefined
            }
            preselectedProblem={selectedProblemIntent || undefined}
            preselectedTechnician={preselectedTechnician}
            onClearPreselectedTechnician={() => setPreselectedTechnician(null)}
            onOpenLocationModal={() => setLocationModalOpen(true)}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'technician-dashboard' && (
          <TechnicianDashboardView onNavigate={handleNavigate} />
        )}

        {currentView === 'admin-dashboard' && (
          <AdminDashboardView onNavigate={handleNavigate} />
        )}
      </main>

      <Footer onNavigate={handleNavigate} />

      <LocationModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MarketplaceShell />
    </AuthProvider>
  );
}
