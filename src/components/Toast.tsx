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
      {/* Toast container */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg backdrop-blur-sm animate-slide-down pointer-events-auto"
            style={{
              backgroundColor: toast.type === 'success' ? 'rgba(34,197,94,0.9)' :
                               toast.type === 'error' ? 'rgba(239,68,68,0.9)' :
                               toast.type === 'warning' ? 'rgba(245,158,11,0.9)' :
                               'rgba(59,130,246,0.9)',
              color: '#fff',
              minWidth: '200px',
              textAlign: 'center',
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
      <style jsx global>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down {
          animation: slide-down 0.25s ease-out;
        }
      `}</style>
    </ToastContext.Provider>
  );
}
