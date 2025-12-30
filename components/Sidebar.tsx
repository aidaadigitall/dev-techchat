import React from 'react';
import { NavItem, AppRoute, User, Branding } from '../types';
import { NAVIGATION_ITEMS } from '../constants';
import { LogOut, Crown, LayoutTemplate } from 'lucide-react';

interface SidebarProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  isAdminMode: boolean;
  onToggleAdminMode: () => void;
  currentUser: User;
  branding: Branding;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeRoute, onNavigate, isAdminMode, onToggleAdminMode, currentUser, branding, onLogout }) => {
  
  // Filter items based on mode
  const displayedItems = NAVIGATION_ITEMS.filter(item => 
    isAdminMode ? item.type === 'admin' : item.type === 'general' || !item.type
  );

  return (
    <aside className="w-64 h-full bg-white border-r border-gray-200 flex flex-col hidden md:flex transition-colors duration-300">
      <div className={`h-16 flex items-center px-6 border-b border-gray-200 ${isAdminMode ? 'bg-gray-900' : ''}`}>
        {branding.logoUrl && !isAdminMode ? (
           <img src={branding.logoUrl} alt="Logo" className="h-8 w-auto mr-3 object-contain" />
        ) : (
           <div 
             className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${isAdminMode ? 'bg-white text-black' : 'text-white'}`}
             style={{backgroundColor: isAdminMode ? undefined : branding.primaryColor}}
           >
              <span className="font-bold text-xl">{branding.appName.charAt(0)}</span>
           </div>
        )}
        
        <div className="flex flex-col">
          <span className={`text-lg font-bold tracking-tight truncate max-w-[140px] ${isAdminMode ? 'text-white' : 'text-gray-800'}`}>
            {isAdminMode ? 'Super Admin' : branding.appName}
          </span>
          {isAdminMode && <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Painel Geral</span>}
        </div>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1">
        {displayedItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 group ${
              activeRoute === item.id
                ? isAdminMode ? 'bg-gray-800 text-white' : 'bg-purple-50 text-purple-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className={`mr-3 ${activeRoute === item.id ? (isAdminMode ? 'text-white' : 'text-purple-600') : 'text-gray-400 group-hover:text-gray-500'}`}>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 space-y-2">
        {/* Toggle Admin Mode Simulator */}
        <button 
           onClick={onToggleAdminMode}
           className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded-md transition-colors border ${
             isAdminMode 
              ? 'bg-purple-600 text-white border-purple-700 hover:bg-purple-700' 
              : 'bg-gray-900 text-white border-gray-800 hover:bg-gray-800'
           }`}
        >
          {isAdminMode ? <LayoutTemplate size={16} className="mr-2"/> : <Crown size={16} className="mr-2"/>}
          {isAdminMode ? 'Voltar ao App' : 'Painel Super Admin'}
        </button>

        <div 
          onClick={() => onNavigate(AppRoute.SETTINGS)}
          className="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors group"
          title="Configurar Perfil"
        >
          {currentUser.avatar ? (
            <img 
              src={currentUser.avatar} 
              alt="User" 
              className="w-10 h-10 rounded-full border border-gray-200 object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold border border-purple-200">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-medium text-gray-900 truncate group-hover:text-purple-700 transition-colors">{currentUser.name}</p>
            <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} className="mr-3" />
          Sair
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;