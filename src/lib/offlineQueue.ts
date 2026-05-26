import { offlineDb } from './offlineDb';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase'; // your Firebase config
import { toast } from 'sonner';

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

class OfflineQueueService {
  async add(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount' | 'status' | 'maxRetries'> & { maxRetries?: number }) {
    const op: QueuedOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: operation.maxRetries ?? 5,
      status: 'pending',
    };

    await offlineDb.queue.add(op);

    if (navigator.onLine) {
      this.processQueue();
    } else {
      toast.info('Action queued for sync when online');
    }
  }

  async processQueue() {
    const pendingOps = await offlineDb.queue
      .where('status')
      .equals('pending')
      .and((item: QueuedOperation) => item.retryCount < item.maxRetries)
      .toArray();

    for (const op of pendingOps) {
      await this.executeOperation(op);
    }
  }

  private async executeOperation(op: QueuedOperation) {
    try {
      await offlineDb.queue.update(op.id!, { status: 'processing' });

      const colRef = collection(db, op.collection);

      switch (op.type) {
        case 'booking':
        case 'create':
          if (op.docId) {
            await updateDoc(doc(db, op.collection, op.docId), {
              ...op.payload,
              syncedAt: serverTimestamp(),
              syncedBy: op.userId,
            });
          } else {
            await addDoc(colRef, {
              ...op.payload,
              syncedAt: serverTimestamp(),
              syncedBy: op.userId,
            });
          }
          break;

        case 'update':
          if (op.docId) {
            await updateDoc(doc(colRef, op.docId), {
              ...op.payload,
              syncedAt: serverTimestamp(),
            });
          }
          break;

        case 'delete':
          if (op.docId) {
            await deleteDoc(doc(colRef, op.docId));
          }
          break;

        default:
          throw new Error(`Unsupported operation: ${op.type}`);
      }

      await offlineDb.queue.delete(op.id!);
      toast.success(`${op.type} synced successfully`);
    } catch (error) {
      console.error('Sync failed:', error);
      const newRetry = op.retryCount + 1;

      if (newRetry >= op.maxRetries) {
        await offlineDb.queue.update(op.id!, { status: 'failed' });
        toast.error(`Failed to sync ${op.type} after ${op.maxRetries} attempts`);
      } else {
        await offlineDb.queue.update(op.id!, { retryCount: newRetry, status: 'pending' });
      }
    }
  }

  async getPendingCount() {
    return (await offlineDb.queue.where('status').equals('pending').toArray()).length;
  }

  async clear() {
    return offlineDb.queue.clear();
  }
}

export const offlineQueue = new OfflineQueueService();
