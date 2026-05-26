import Dexie, { Table } from 'dexie';

export type QueuedOperation = {
  id?: string;
  type: 'create' | 'update' | 'delete' | 'booking' | 'refund' | 'commission';
  collection: string;
  docId?: string;
  payload: any;
  timestamp: number;
  userId: string;
  role: string;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'failed';
};

class EkonkOfflineDB extends Dexie {
  queue!: Table<QueuedOperation>;

  constructor() {
    super('EkonkOfflineDB');
    this.version(1).stores({
      queue: '++id, type, collection, timestamp, userId, retryCount, status'
    });
  }
}

export const offlineDb = new EkonkOfflineDB();
