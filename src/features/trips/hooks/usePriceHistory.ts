import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useState, useEffect } from 'react';

export interface PriceChange {
  id: string;
  price: number;
  oldPrice?: number;
  changedAt: Date;
  reason?: string;
  changedBy: string;
}

export function usePriceHistory(tripId: string | null) {
  const [data, setData] = useState<PriceChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tripId) {
      setData([]);
      return;
    }

    setLoading(true);
    const priceQuery = query(
      collection(db, `trips/${tripId}/priceHistory`),
      orderBy('changedAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(priceQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        changedAt: doc.data().changedAt?.toDate() || new Date(),
      })) as PriceChange[];
      setData(docs);
      setLoading(false);
    }, (err) => {
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tripId]);

  return { data, loading, error };
}
