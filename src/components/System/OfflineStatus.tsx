import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineStatus: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 backdrop-blur-sm pointer-events-none animate-in fade-in slide-in-from-bottom-4">
      <WifiOff className="w-4 h-4" />
      <span className="text-sm font-medium">Modo Offline - Sincronização pendente</span>
    </div>
  );
};
