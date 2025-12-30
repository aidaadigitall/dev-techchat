import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);
  const DURATION = 4000;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300); // Wait for exit animation
    }, DURATION);

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const handleManualRemove = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const styles = {
    success: { border: 'border-green-500', bg: 'bg-white', iconBg: 'bg-green-100', iconColor: 'text-green-600', icon: <CheckCircle2 size={20} /> },
    error: { border: 'border-red-500', bg: 'bg-white', iconBg: 'bg-red-100', iconColor: 'text-red-600', icon: <AlertCircle size={20} /> },
    warning: { border: 'border-yellow-500', bg: 'bg-white', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600', icon: <AlertTriangle size={20} /> },
    info: { border: 'border-blue-500', bg: 'bg-white', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', icon: <Info size={20} /> },
  };

  const style = styles[toast.type];

  return (
    <div
      className={`
        relative w-full max-w-sm rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-3 transition-all duration-300 transform
        ${isExiting ? 'opacity-0 translate-x-10' : 'opacity-100 translate-x-0 animate-slideInRight'}
        bg-white
      `}
    >
      <div className="flex items-start p-4">
        <div className={`flex-shrink-0 mr-3 p-2 rounded-full ${style.iconBg} ${style.iconColor}`}>
          {style.icon}
        </div>
        <div className="flex-1 pt-1">
          <p className="text-sm font-semibold text-gray-800 leading-tight">
            {toast.type === 'success' ? 'Sucesso' : toast.type === 'error' ? 'Erro' : toast.type === 'warning' ? 'Atenção' : 'Info'}
          </p>
          <p className="text-sm text-gray-600 mt-1 leading-snug">{toast.message}</p>
        </div>
        <button
          onClick={handleManualRemove}
          className="ml-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
        >
          <X size={16} />
        </button>
      </div>
      
      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1 w-full bg-gray-100">
        <div 
          className={`h-full ${style.iconColor.replace('text', 'bg')} transition-all ease-linear`} 
          style={{ width: '0%', transitionDuration: `${DURATION}ms`, animation: `progress ${DURATION}ms linear forwards` }}
        />
      </div>
      <style>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        <div className="pointer-events-auto">
            {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};
