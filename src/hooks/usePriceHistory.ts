import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface PriceChange {
  id: string;
  previousPrice: number;
  newPrice: number;
  multiplier?: number;
  reason: string;
  changedBy: string;
  changedAt: string;
}

export function usePriceHistory(routeId: string, type: 'ship' | 'trip') {
  const [data, setData] = useState<PriceChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!routeId) {
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);
    const collectionName = type === 'ship' ? 'ships' : 'trips';
    const q = query(
      collection(db, `${collectionName}/${routeId}/priceHistory`),
      orderBy('changedAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as PriceChange)));
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching price history:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [routeId, type]);

  return { data, loading, error };
}
