import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Clock, AlertCircle } from 'lucide-react';
import { useSyncStore } from '../context/syncStore';
import { offlineQueue } from '../lib/offlineQueue';

export function SyncStatus() {
  const { isOnline, syncStatus, setOnline } = useSyncStore();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      const count = await offlineQueue.getPendingCount();
      setPendingCount(count);
    };

    updateCount();

    const interval = setInterval(updateCount, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, [isOnline]);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      offlineQueue.processQueue();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  return (
    <div className="fixed bottom-[88px] sm:bottom-6 left-4 sm:left-auto sm:right-6 z-40 flex items-center gap-2 sm:gap-3 bg-zinc-900/95 backdrop-blur-md text-white px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl shadow-xl border border-zinc-700/80 text-xs sm:text-sm transition-all duration-300 animate-slide-up">
      {isOnline ? (
        <Wifi className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
      ) : (
        <WifiOff className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
      )}

      <div className="flex flex-col min-w-0">
        <span className="font-semibold truncate">{isOnline ? 'Connected' : 'Offline Mode'}</span>
        <span className="text-[10px] sm:text-xs text-zinc-400 truncate">
          {isOnline ? 'All changes synced' : 'Actions will queue'}
        </span>
      </div>

      {pendingCount > 0 && (
        <div className="flex items-center gap-1 bg-amber-500/10 text-amber-400 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl shrink-0">
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="font-mono text-[10px] sm:text-xs font-bold">{pendingCount}</span>
        </div>
      )}

      {syncStatus === 'error' && (
        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-200 shrink-0" />
      )}
    </div>
  );
}
