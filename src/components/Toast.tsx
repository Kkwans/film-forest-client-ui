// @ts-nocheck
'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

interface ToastItem {
  id: number;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastItem['type'], duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const TOAST_CONFIG: Record<string, { bg: string; icon: string }> = {
  success: {
    bg: 'linear-gradient(135deg, rgba(34,197,94,0.95), rgba(22,163,74,0.95))',
    icon: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  },
  error: {
    bg: 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(220,38,38,0.95))',
    icon: 'M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  },
  warning: {
    bg: 'linear-gradient(135deg, rgba(245,158,11,0.95), rgba(217,119,6,0.95))',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  },
  info: {
    bg: 'linear-gradient(135deg, rgba(59,130,246,0.95), rgba(37,99,235,0.95))',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  let nextId = 0;

  const showToast = useCallback((message: string, type: ToastItem['type'] = 'info', duration = 2500) => {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container - top center, use flexbox centering instead of translate */}
      <div className="fixed top-8 left-0 right-0 z-[200] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map(toast => {
          const config = TOAST_CONFIG[toast.type || 'info'];
          return (
            <div
              key={toast.id}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium shadow-lg backdrop-blur-sm animate-toast-in pointer-events-auto"
              style={{
                background: config.bg,
                color: '#fff',
                minWidth: '200px',
                maxWidth: '400px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              }}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={config.icon} />
              </svg>
              <span className="flex-1 text-center">{toast.message}</span>
            </div>
          );
        })}
      </div>
      <style jsx global>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-toast-in {
          animation: toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </ToastContext.Provider>
  );
}
