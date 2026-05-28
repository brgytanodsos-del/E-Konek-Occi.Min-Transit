import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, updateDoc, doc, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { SurfaceCard } from './ui';
import { Button } from './ui/Button';
import { ArrowUpCircle, CheckCircle, Clock } from 'lucide-react';
import { Trip, Ship } from '../types/dataTypes';

interface PriceAdjustmentReq {
  id: string;
  targetId: string;
  targetName: string; // name or route
  targetType: 'ship' | 'trip';
  requestedPrice: number;
  reason: string;
  requestedBy: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export const PriceAdjustmentRequest: React.FC = () => {
  const { currentUser, currentRole, ships, trips } = useApp();
  const [requests, setRequests] = useState<PriceAdjustmentReq[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    targetId: '',
    targetType: 'ship' as 'ship' | 'trip',
    requestedPrice: 0,
    reason: '',
  });

  // Load requests
  useEffect(() => {
    const q = query(collection(db, 'priceAdjustmentRequests'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PriceAdjustmentReq)));
    }, (error) => {
      console.warn("Firestore listener error for priceAdjustmentRequests:", error);
      handleFirestoreError(error, OperationType.LIST, 'priceAdjustmentRequests');
    });
    return unsubscribe;
  }, []);

  const submitRequest = async () => {
    if (!formData.targetId || !formData.requestedPrice) return;

    const targetName = formData.targetType === 'ship' 
      ? ships.find(s => s.id === formData.targetId)?.name 
      : trips.find(t => t.id === formData.targetId)?.route;

    await addDoc(collection(db, 'priceAdjustmentRequests'), {
      targetId: formData.targetId,
      targetType: formData.targetType,
      targetName: targetName || 'Unknown Route',
      requestedPrice: formData.requestedPrice,
      reason: formData.reason,
      requestedBy: currentUser?.fullName || 'Staff User',
      role: currentRole,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    setShowForm(false);
    alert("Price adjustment request submitted for approval!");
  };

  const updateRequestStatus = async (req: PriceAdjustmentReq, newStatus: 'approved' | 'rejected') => {
    await updateDoc(doc(db, 'priceAdjustmentRequests', req.id), { status: newStatus });
    
    // Auto update the price if approved
    if (newStatus === 'approved') {
      const collectionName = req.targetType === 'ship' ? 'ships' : 'trips';
      await updateDoc(doc(db, collectionName, req.targetId), {
        currentPrice: req.requestedPrice,
        priceAdjustmentReason: req.reason,
        lastPriceUpdatedBy: req.requestedBy,
        lastPriceUpdatedAt: new Date().toISOString()
      });
      alert('Price updated successfully.');
    }
  };

  const isSuperAdmin = currentRole === 'superadmin';

  return (
    <SurfaceCard className="p-8 mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-100">
          <ArrowUpCircle className="text-blue-500" /> Price Adjustment Requests
        </h2>
        {!isSuperAdmin && (
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-500 text-white border-none py-2 px-4 shadow-lg">
            Request Price Adjustment
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <p className="text-slate-400 text-center py-6">No price adjustment requests found.</p>
        ) : (
          requests.map(req => (
            <div key={req.id} className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 flex justify-between items-center">
              <div>
                <p className="text-white font-bold opacity-90">{req.targetName} ({req.targetType.toUpperCase()})</p>
                <p className="text-sm text-slate-400 mt-1">
                  <span className="text-slate-200">{req.requestedBy}</span> requested to change price to <strong className="text-amber-400">₱{req.requestedPrice}</strong>
                </p>
                <p className="text-xs text-slate-500 italic mt-1">Reason: {req.reason}</p>
              </div>
              
              <div className="flex items-center gap-3 flex-col sm:flex-row">
                {req.status === 'pending' ? (
                  isSuperAdmin ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateRequestStatus(req, 'approved')} className="bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/40 border border-emerald-600/30">
                        Approve
                      </Button>
                      <Button size="sm" onClick={() => updateRequestStatus(req, 'rejected')} className="bg-rose-600/20 text-rose-500 hover:bg-rose-600/40 border border-rose-600/30">
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                      <Clock size={12} /> Pending Approval
                    </span>
                  )
                ) : (
                  <span className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 ${
                    req.status === 'approved' ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'
                  }`}>
                    {req.status === 'approved' ? <CheckCircle size={12} /> : null} 
                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <SurfaceCard className="p-8 w-full max-w-md bg-slate-900 border border-slate-800">
            <h3 className="text-xl font-bold mb-6 text-white border-b border-slate-800 pb-3">Request Price Change</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Route Type</label>
                <select 
                  value={formData.targetType} 
                  onChange={e => setFormData({ ...formData, targetType: e.target.value as any, targetId: '' })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="ship">Sea Voyage</option>
                  <option value="trip">Land Shuttle</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Route</label>
                <select 
                  value={formData.targetId} 
                  onChange={e => setFormData({ ...formData, targetId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">-- Select --</option>
                  {formData.targetType === 'ship' 
                    ? ships.map(s => <option key={s.id} value={s.id}>{s.name} ({s.route})</option>)
                    : trips.map(t => <option key={t.id} value={t.id}>{t.route}</option>)
                  }
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Proposed Price (₱)</label>
                <input 
                  type="number" 
                  value={formData.requestedPrice} 
                  onChange={e => setFormData({ ...formData, requestedPrice: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Reason for Adjustment</label>
                <input 
                  type="text" 
                  value={formData.reason} 
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="e.g. Fuel price increase"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 text-slate-300 border-slate-700">Cancel</Button>
                <Button onClick={submitRequest} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white">Submit Request</Button>
              </div>
            </div>
          </SurfaceCard>
        </div>
      )}
    </SurfaceCard>
  );
};
