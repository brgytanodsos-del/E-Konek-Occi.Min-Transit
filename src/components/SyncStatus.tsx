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
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-zinc-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-xl border border-zinc-700 text-sm">
      {isOnline ? (
        <Wifi className="w-5 h-5 text-emerald-400" />
      ) : (
        <WifiOff className="w-5 h-5 text-amber-400" />
      )}

      <div className="flex flex-col">
        <span className="font-medium">{isOnline ? 'Connected' : 'Offline Mode'}</span>
        <span className="text-xs text-zinc-400">
          {isOnline ? 'All changes synced' : 'Actions will queue'}
        </span>
      </div>

      {pendingCount > 0 && (
        <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-3 py-1 rounded-xl">
          <Clock className="w-4 h-4" />
          <span className="font-mono text-xs">{pendingCount}</span>
        </div>
      )}

      {syncStatus === 'error' && (
        <AlertCircle className="w-5 h-5 text-red-400" />
      )}
    </div>
  );
}
