import { useCollection } from '../../../lib/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export interface PriceChange {
  id: string;
  price: number;
  oldPrice?: number;
  changedAt: Date;
  reason?: string;
  changedBy: string;
}

export function usePriceHistory(tripId: string | null) {
  const priceQuery = tripId 
    ? query(
        collection(db, `trips/${tripId}/priceHistory`),
        orderBy('changedAt', 'desc'),
        limit(20)
      )
    : null;

  return useCollection<PriceChange>(priceQuery, {
    enabled: !!tripId,
    transform: (docs) => docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      changedAt: doc.data().changedAt?.toDate() || new Date(),
    })),
  });
}
