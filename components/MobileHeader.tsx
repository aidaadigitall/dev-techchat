import React from 'react';
import { Menu } from 'lucide-react';
import { Branding } from '../types';

interface MobileHeaderProps {
  onToggleMenu: () => void;
  branding?: Branding;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ onToggleMenu, branding }) => {
  const appName = branding?.appName || 'OmniConnect';
  const primaryColor = branding?.primaryColor || '#9333ea';

  return (
    <div className="md:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-20 sticky top-0">
      <div className="flex items-center">
        <button onClick={onToggleMenu} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md">
          <Menu size={24} />
        </button>
        {branding?.logoUrl ? (
           <img src={branding.logoUrl} alt="Logo" className="h-8 ml-2 object-contain" />
        ) : (
           <span className="ml-3 text-lg font-bold text-gray-800">{appName}</span>
        )}
      </div>
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
        style={{ backgroundColor: primaryColor }}
      >
        {appName.charAt(0)}
      </div>
    </div>
  );
};

export default MobileHeader;