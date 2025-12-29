import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MobileHeader from './components/MobileHeader';
import SpeedInsights from './components/SpeedInsights';
import { AppRoute, User, Branding } from './types';
import { MOCK_USERS } from './constants';

// Tenant Pages
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Kanban from './pages/Kanban';
import Contacts from './pages/Contacts';
import Campaigns from './pages/Campaigns';
import Tasks from './pages/Tasks';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

// Admin Pages
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminCompanies from './pages/SuperAdminCompanies';
import SuperAdminPlans from './pages/SuperAdminPlans';
import SuperAdminDatabase from './pages/SuperAdminDatabase';

const App: React.FC = () => {
  const [activeRoute, setActiveRoute] = useState<AppRoute>(AppRoute.DASHBOARD);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // State for Current User (Profile Management)
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);
  
  // State for Visual Identity (White Label)
  const [branding, setBranding] = useState<Branding>({
    appName: 'OmniConnect',
    primaryColor: '#00a884', // Default WhatsApp Green Style
    logoUrl: ''
  });
  
  // Simulation State for Role Switching
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Update document title when app name changes
  useEffect(() => {
    document.title = branding.appName;
  }, [branding.appName]);

  // Router Logic
  const renderContent = () => {
    // If in Admin Mode, restrict routes
    if (isAdminMode) {
      switch (activeRoute) {
        case AppRoute.ADMIN_DASHBOARD: return <SuperAdminDashboard />;
        case AppRoute.ADMIN_COMPANIES: return <SuperAdminCompanies />;
        case AppRoute.ADMIN_PLANS: return <SuperAdminPlans />;
        case AppRoute.ADMIN_DATABASE: return <SuperAdminDatabase />;
        default: return <SuperAdminDashboard />; // Fallback for admin
      }
    }

    // Tenant Routes
    switch (activeRoute) {
      case AppRoute.DASHBOARD: return <Dashboard />;
      case AppRoute.CHAT: return <Chat />;
      case AppRoute.KANBAN: return <Kanban />;
      case AppRoute.CONTACTS: return <Contacts />;
      case AppRoute.CAMPAIGNS: return <Campaigns />;
      case AppRoute.TASKS: return <Tasks />;
      case AppRoute.REPORTS: return <Reports />;
      case AppRoute.SETTINGS: 
        return <Settings 
          currentUser={currentUser} 
          onUpdateUser={setCurrentUser} 
          branding={branding}
          onUpdateBranding={setBranding}
        />;
      default: return <Dashboard />;
    }
  };

  const handleToggleAdmin = () => {
    const newMode = !isAdminMode;
    setIsAdminMode(newMode);
    // Reset route when switching modes
    setActiveRoute(newMode ? AppRoute.ADMIN_DASHBOARD : AppRoute.DASHBOARD);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <SpeedInsights />
      {/* Dynamic Styles for White Label */}
      <style>{`
        :root {
          --primary-color: ${branding.primaryColor};
        }
        /* Override Tailwind Purple classes with dynamic primary color */
        .bg-purple-600 { background-color: var(--primary-color) !important; }
        .text-purple-600 { color: var(--primary-color) !important; }
        .border-purple-600 { border-color: var(--primary-color) !important; }
        
        .hover\\:bg-purple-700:hover { opacity: 0.9; background-color: var(--primary-color) !important; }
        
        .bg-purple-50 { background-color: ${branding.primaryColor}15 !important; } /* ~8% opacity */
        .bg-purple-100 { background-color: ${branding.primaryColor}25 !important; } /* ~15% opacity */
        
        .text-purple-700 { color: var(--primary-color) !important; filter: brightness(0.8); }
        .border-purple-200 { border-color: ${branding.primaryColor}40 !important; }
        
        .focus\\:ring-purple-500:focus { --tw-ring-color: var(--primary-color) !important; }
        .focus\\:border-purple-500:focus { border-color: var(--primary-color) !important; }
      `}</style>

      <Sidebar 
        activeRoute={activeRoute} 
        onNavigate={setActiveRoute} 
        isAdminMode={isAdminMode}
        onToggleAdminMode={handleToggleAdmin}
        currentUser={currentUser}
        branding={branding}
      />
      
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="absolute left-0 top-0 h-full bg-white z-50">
             <Sidebar 
               activeRoute={activeRoute} 
               onNavigate={(route) => {
                 setActiveRoute(route);
                 setMobileMenuOpen(false);
               }}
               isAdminMode={isAdminMode}
               onToggleAdminMode={handleToggleAdmin}
               currentUser={currentUser}
               branding={branding}
             />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col h-full w-full relative">
        <MobileHeader onToggleMenu={() => setMobileMenuOpen(true)} branding={branding} />
        <main className="flex-1 overflow-hidden relative">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;