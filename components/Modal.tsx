
import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isDark?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'md', isDark = false }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  const themeClasses = isDark ? {
    bg: 'bg-[#1e1e1e] border border-[#333]',
    headerBorder: 'border-[#333]',
    title: 'text-gray-100',
    text: 'text-gray-300',
    close: 'text-gray-400 hover:text-gray-200',
    footerBg: 'bg-[#252526] border-t border-[#333]'
  } : {
    bg: 'bg-white',
    headerBorder: 'border-gray-100',
    title: 'text-gray-900',
    text: 'text-gray-900',
    close: 'text-gray-400 hover:text-gray-500',
    footerBg: 'bg-gray-50'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-900 opacity-75" onClick={onClose}></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full ${sizeClasses[size]} ${themeClasses.bg}`}>
          <div className={`px-4 pt-5 pb-4 sm:p-6 sm:pb-4`}>
            <div className={`flex justify-between items-center mb-4 border-b pb-2 ${themeClasses.headerBorder}`}>
              <h3 className={`text-lg leading-6 font-medium ${themeClasses.title}`} id="modal-title">
                {title}
              </h3>
              <button onClick={onClose} className={`${themeClasses.close} focus:outline-none`}>
                <X size={20} />
              </button>
            </div>
            <div className={`mt-2 ${themeClasses.text}`}>
              {children}
            </div>
          </div>
          {footer && (
            <div className={`px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse ${themeClasses.footerBg}`}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
