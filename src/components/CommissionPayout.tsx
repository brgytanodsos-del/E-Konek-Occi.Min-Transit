import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { SurfaceCard } from './ui';
import { Button } from './ui/Button';
import { DollarSign, CheckCircle } from 'lucide-react';

interface Payout {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  amount: number;
  bookingsHandled: number;
  status: 'pending' | 'paid';
  period: string;
}

export const CommissionPayout: React.FC = () => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'payouts'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPayouts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Payout)));
    }, (error) => {
      console.warn("Firestore listener error for payouts:", error);
      handleFirestoreError(error, OperationType.LIST, 'payouts');
    });
    return unsubscribe;
  }, []);

  const markAsPaid = async (payoutId: string) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'payouts', payoutId), { status: 'paid' });
    } catch (err) {
      alert("Failed to process payout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SurfaceCard className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
            <DollarSign className="w-8 h-8 text-amber-500" /> Commission & Payouts
          </h2>
          <p className="text-slate-400">Staff Earnings Management</p>
        </div>
      </div>

      <div className="space-y-4">
        {payouts.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-6">No payouts currently recorded in database.</p>
        ) : (
          payouts.map(p => (
            <div key={p.id} className="bg-slate-100 dark:bg-slate-950 p-6 rounded-2xl flex justify-between items-center border border-slate-200/50 dark:border-slate-900">
              <div>
                <p className="font-semibold text-lg text-slate-800 dark:text-slate-100">{p.staffName}</p>
                <p className="text-slate-400 text-xs capitalize">{p.role} • {p.period}</p>
                <p className="text-emerald-500 dark:text-emerald-400 font-mono text-xl mt-1 font-bold">₱{p.amount}</p>
              </div>

              <div className="text-right">
                <p className="text-xs text-slate-400 mb-2">{p.bookingsHandled} bookings</p>
                {p.status === 'pending' ? (
                  <Button onClick={() => markAsPaid(p.id)} disabled={loading}>
                    <CheckCircle className="mr-2 h-4 w-4" /> Mark as Paid
                  </Button>
                ) : (
                  <span className="text-emerald-500 dark:text-emerald-400 font-semibold text-xs flex items-center justify-end gap-1.5">
                    <CheckCircle className="h-4 w-4" /> Paid
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </SurfaceCard>
  );
};
