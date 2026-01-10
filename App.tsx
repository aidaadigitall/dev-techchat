
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MobileHeader from './components/MobileHeader';
import { AppRoute, User, Branding } from './types';
import { APP_NAME } from './constants';
import { ToastProvider } from './components/ToastContext';
import { api, getToken, clearToken } from './services/api';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Kanban from './pages/Kanban';
import Contacts from './pages/Contacts';
import Campaigns from './pages/Campaigns';
import Tasks from './pages/Tasks';
import Automations from './pages/Automations';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Proposals from './pages/Proposals';

// Admin Pages
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminCompanies from './pages/SuperAdminCompanies';
import SuperAdminPlans from './pages/SuperAdminPlans';
import SuperAdminDatabase from './pages/SuperAdminDatabase';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [activeRoute, setActiveRoute] = useState<AppRoute>(AppRoute.DASHBOARD);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Current User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Branding State
  const [branding, setBranding] = useState<Branding>(() => {
    try {
        const saved = localStorage.getItem('app_branding');
        return saved ? JSON.parse(saved) : {
          appName: APP_NAME,
          primaryColor: '#00a884',
          logoUrl: ''
        };
    } catch {
        return { appName: APP_NAME, primaryColor: '#00a884', logoUrl: '' };
    }
  });
  
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);

  // --- Init Session ---
  useEffect(() => {
    const checkAuth = async () => {
       const token = getToken();
       if (token) {
           // Token exists, load user data
           try {
               const savedUser = localStorage.getItem('app_current_user');
               if (savedUser) {
                   const parsedUser = JSON.parse(savedUser);
                   setCurrentUser(parsedUser);
                   setIsAuthenticated(true);
                   
                   // Check Admin Mode Preference
                   const adminPref = localStorage.getItem('app_is_admin_mode') === 'true';
                   const isSuperAdmin = parsedUser.role === 'super_admin';
                   
                   if (isSuperAdmin && adminPref) {
                       setIsAdminMode(true);
                       setActiveRoute(AppRoute.ADMIN_DASHBOARD);
                   }
               } else {
                   // Se tem token mas não tem user salvo, logout
                   clearToken();
               }
           } catch (e) {
               console.error("Auth Error", e);
               clearToken();
           }
       }
       setLoadingSession(false);
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (data: { user: User, token: string }) => {
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      
      // Auto-redirect Super Admin
      if (data.user.role === 'super_admin') {
          setIsAdminMode(true);
          localStorage.setItem('app_is_admin_mode', 'true');
          setActiveRoute(AppRoute.ADMIN_DASHBOARD);
      }
  };

  const handleLogout = () => {
    clearToken();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setIsAdminMode(false);
    localStorage.removeItem('app_is_admin_mode');
  };

  const handleToggleAdmin = () => {
    if (currentUser?.role !== 'super_admin') return;
    
    const newMode = !isAdminMode;
    setIsAdminMode(newMode);
    localStorage.setItem('app_is_admin_mode', String(newMode));
    setActiveRoute(newMode ? AppRoute.ADMIN_DASHBOARD : AppRoute.DASHBOARD);
  };

  // Router Logic
  const renderContent = () => {
    if (isAdminMode) {
      switch (activeRoute) {
        case AppRoute.ADMIN_DASHBOARD: return <SuperAdminDashboard />;
        case AppRoute.ADMIN_COMPANIES: return <SuperAdminCompanies />;
        case AppRoute.ADMIN_PLANS: return <SuperAdminPlans />;
        case AppRoute.ADMIN_DATABASE: return <SuperAdminDatabase />;
        default: return <SuperAdminDashboard />;
      }
    }

    switch (activeRoute) {
      case AppRoute.DASHBOARD: return <Dashboard />;
      case AppRoute.CHAT: return <Chat />;
      case AppRoute.KANBAN: return <Kanban />;
      case AppRoute.CONTACTS: return <Contacts />;
      case AppRoute.CAMPAIGNS: return <Campaigns />;
      case AppRoute.PROPOSALS: return <Proposals />;
      case AppRoute.TASKS: return <Tasks />;
      case AppRoute.AUTOMATIONS: return <Automations />;
      case AppRoute.REPORTS: return <Reports />;
      case AppRoute.SETTINGS: 
        return <Settings 
          currentUser={currentUser!} 
          onUpdateUser={setCurrentUser} 
          branding={branding}
          onUpdateBranding={setBranding}
        />;
      default: return <Dashboard />;
    }
  };

  if (loadingSession) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                <p className="text-gray-400 text-sm">Carregando sistema SaaS...</p>
            </div>
        </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <ToastProvider>
        <Login branding={branding} onLoginSuccess={handleLoginSuccess} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="flex h-screen w-full bg-gray-50 overflow-hidden font-sans fixed inset-0">
        {/* Dynamic Styles for White Label */}
        <style>{`
          :root {
            --primary-color: ${branding.primaryColor};
          }
          .bg-purple-600 { background-color: var(--primary-color) !important; }
          .text-purple-600 { color: var(--primary-color) !important; }
          .border-purple-600 { border-color: var(--primary-color) !important; }
          .hover\\:bg-purple-700:hover { opacity: 0.9; background-color: var(--primary-color) !important; }
          .bg-purple-50 { background-color: ${branding.primaryColor}15 !important; }
          .bg-purple-100 { background-color: ${branding.primaryColor}25 !important; }
          .text-purple-700 { color: var(--primary-color) !important; filter: brightness(0.8); }
        `}</style>

        <Sidebar 
          activeRoute={activeRoute} 
          onNavigate={setActiveRoute} 
          isAdminMode={isAdminMode}
          onToggleAdminMode={handleToggleAdmin}
          currentUser={currentUser!}
          branding={branding}
          onLogout={handleLogout}
        />
        
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
            <div className="absolute left-0 top-0 h-full bg-white z-50 w-72 shadow-xl animate-slideInLeft">
              <Sidebar 
                activeRoute={activeRoute} 
                onNavigate={(route) => {
                  setActiveRoute(route);
                  setMobileMenuOpen(false);
                }}
                isAdminMode={isAdminMode}
                onToggleAdminMode={handleToggleAdmin}
                currentUser={currentUser!}
                branding={branding}
                onLogout={handleLogout}
              />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col h-full w-full relative overflow-hidden">
          <MobileHeader onToggleMenu={() => setMobileMenuOpen(true)} branding={branding} />
          <main className="flex-1 overflow-hidden relative w-full h-full">
            {renderContent()}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
};

export default App;
