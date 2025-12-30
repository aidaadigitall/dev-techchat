import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import Sidebar from './components/Sidebar';
import MobileHeader from './components/MobileHeader';
import { AppRoute, User, Branding } from './types';
import { MOCK_USERS, APP_NAME } from './constants';
import { ToastProvider } from './components/ToastContext';

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
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [activeRoute, setActiveRoute] = useState<AppRoute>(AppRoute.DASHBOARD);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // State for Current User (Profile Management)
  const [currentUser, setCurrentUser] = useState<User>(() => {
    // Fallback default user for UI rendering if auth data is minimal
    return MOCK_USERS[0] || {
      id: 'default_admin',
      name: 'Admin User',
      email: 'admin@techchat.com',
      role: 'super_admin',
      avatar: '',
      status: 'active',
      companyId: 'comp1'
    };
  });
  
  // State for Visual Identity (White Label)
  const [branding, setBranding] = useState<Branding>(() => {
    try {
        const saved = localStorage.getItem('app_branding');
        return saved ? JSON.parse(saved) : {
          appName: APP_NAME,
          primaryColor: '#00a884', // Default WhatsApp Green Style
          logoUrl: '' // Empty by default, user can set in settings
        };
    } catch (e) {
        return { appName: APP_NAME, primaryColor: '#00a884', logoUrl: '' };
    }
  });
  
  // Simulation State for Role Switching
  const [isAdminMode, setIsAdminMode] = useState(false);

  // --- Auth & Session Management ---
  useEffect(() => {
    // 1. Check active session (Supabase or Mock)
    const initSession = async () => {
        try {
            const { data: { session: supabaseSession } } = await supabase.auth.getSession();
            
            if (supabaseSession) {
                setSession(supabaseSession);
                syncUser(supabaseSession.user);
            } else {
                // Fallback: Check for Mock Session in LocalStorage
                const mockSession = localStorage.getItem('mock_session');
                if (mockSession) {
                    const parsed = JSON.parse(mockSession);
                    setSession(parsed);
                    syncUser(parsed.user);
                }
            }
        } catch (e) {
            console.error("Auth check error", e);
        } finally {
            setLoadingSession(false);
        }
    };

    initSession();

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
          setSession(session);
          syncUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncUser = (authUser: any) => {
    // Check if it's the Super Admin Credential
    const isSuperAdminEmail = authUser.email === 'admin@techchat.com';
    
    if (isSuperAdminEmail) {
      setIsAdminMode(true);
      setActiveRoute(AppRoute.ADMIN_DASHBOARD);
    }

    setCurrentUser(prev => ({
        ...prev,
        id: authUser.id,
        email: authUser.email || prev.email,
        name: authUser.user_metadata?.full_name || prev.name || 'Usuário',
        role: isSuperAdminEmail ? 'super_admin' : (authUser.app_metadata?.role || 'admin') 
    }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('mock_session'); // Clear mock session
    setSession(null);
    setIsAdminMode(false); // Reset admin mode on logout
  };

  // Update document title and localStorage when branding changes
  useEffect(() => {
    document.title = branding.appName;
    localStorage.setItem('app_branding', JSON.stringify(branding));
  }, [branding]);

  // Save user to localStorage (optional caching)
  useEffect(() => {
    localStorage.setItem('app_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

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
      case AppRoute.CHAT: return <Chat branding={branding} />;
      case AppRoute.KANBAN: return <Kanban />;
      case AppRoute.CONTACTS: return <Contacts />;
      case AppRoute.CAMPAIGNS: return <Campaigns />;
      case AppRoute.PROPOSALS: return <Proposals />;
      case AppRoute.TASKS: return <Tasks />;
      case AppRoute.AUTOMATIONS: return <Automations />;
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
    setActiveRoute(newMode ? AppRoute.ADMIN_DASHBOARD : AppRoute.DASHBOARD);
  };

  // --- Render ---

  if (loadingSession) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
    );
  }

  if (!session) {
    return (
      <ToastProvider>
        <Login branding={branding} onLoginSuccess={(s) => setSession(s)} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
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
          onLogout={handleLogout}
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
                onLogout={handleLogout}
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
    </ToastProvider>
  );
};

export default App;