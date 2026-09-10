import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

type Toast = {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error';
};

type ToastContextValue = {
  addToast: (message: string, type?: Toast['type']) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
    // Auto‑remove after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2 rounded shadow-md text-sm max-w-xs
              ${t.type === 'error' ? 'bg-red-800 text-red-100' : ''}
              ${t.type === 'success' ? 'bg-green-800 text-green-100' : ''}
              ${t.type === 'info' ? 'bg-gray-800 text-gray-100' : ''}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ((message: string, type?: Toast['type']) => void) => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx.addToast;
};
