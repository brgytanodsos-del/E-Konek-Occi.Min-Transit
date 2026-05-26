import { create } from 'zustand';
import { offlineQueue } from '../lib/offlineQueue';

interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  syncStatus: 'idle' | 'syncing' | 'error';
  setOnline: (online: boolean) => void;
  refreshPending: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: navigator.onLine,
  pendingCount: 0,
  syncStatus: 'idle',

  setOnline: (online) => {
    set({ isOnline: online });
    if (online) {
      set({ syncStatus: 'syncing' });
      offlineQueue.processQueue().finally(() => {
         set({ syncStatus: 'idle' });
         offlineQueue.getPendingCount().then((count) => set({ pendingCount: count }));
      });
    }
  },

  refreshPending: () => {
    offlineQueue.getPendingCount().then((count) => set({ pendingCount: count }));
  },
}));
