import React from 'react';
import { useApp } from '../../../context/AppContext';
import { SurfaceCard } from '../../../components/ui';
import { Button } from '../../../components/ui/Button';
import { Plus, Edit2, Trash2, Bus as BusIcon, Calendar, User, Users, MapPin, DollarSign } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Trip } from '../../../types/dataTypes';
import { toast } from 'sonner';
import { calculateDynamicPrice } from '../../../lib/pricingEngine';

interface Props {
  canEditPrices: boolean;
  isSuperAdmin: boolean;
  openTripModal: (trip?: Trip) => void;
}

export const LandShuttleManager: React.FC<Props> = ({ canEditPrices, isSuperAdmin, openTripModal }) => {
  const { trips, setTrips, isOnline, formatPST } = useApp();

  const handleTripDelete = async (id: string, route: string) => {
    if (!confirm(`Are you absolutely sure you want to cancel and delete trip to ${route}?`)) return;
    try {
      if (isOnline) {
        await deleteDoc(doc(db, 'trips', id));
      }
      setTrips(prev => prev.filter(t => t.id !== id));
      toast.success(`Shuttle run to ${route} permanently deleted.`);
    } catch {
      toast.error('Operation failed.');
    }
  };

  return (
    <SurfaceCard className="bg-slate-900/45 p-6 rounded-3xl border border-slate-800/80">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black text-white font-sans flex items-center gap-2">
            <BusIcon className="text-emerald-500" /> Mamburao Grand Terminal Shuttles
          </h2>
          <p className="text-xs text-slate-400 mt-1">Audit and dispatch Bus & Van transfers across Occidental Mindoro.</p>
        </div>
        {isSuperAdmin && (
          <Button
            onClick={() => openTripModal()}
            variant="primary"
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold gap-1.5 flex items-center bg-none font-sans uppercase tracking-widest px-4 py-2"
          >
            <Plus size={14} /> Add Shuttle Run
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trips.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-slate-950/40 border border-dashed border-slate-800 rounded-3xl text-slate-500">
            <BusIcon size={40} className="mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-bold">No shuttle trips dispatched</p>
            <p className="text-xs opacity-60">Tap 'Add Shuttle Run' to schedule first dispatch</p>
          </div>
        ) : (
          trips.map(trip => (
            <div key={trip.id} className="bg-slate-950/50 hover:bg-slate-950/80 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 group">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-sm text-white group-hover:text-emerald-400 transition-colors">{trip.route}</h4>
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5 uppercase tracking-wide inline-block mt-1 font-mono">
                      {trip.type}
                    </span>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                    trip.status === 'Scheduled' ? 'bg-slate-900 border-slate-700 text-slate-400' :
                    trip.status === 'Boarding' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                    trip.status === 'Departed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    trip.status === 'Completed' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                    'bg-red-500/10 border-red-500/20 text-red-500'
                  }`}>
                    {trip.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-400 text-xs border-t border-b border-slate-900 py-3">
                  <div className="flex items-center gap-1.5 col-span-2">
                    <User size={13} className="text-slate-500" />
                    <span className="truncate">Driver: {trip.driver || 'No assigned crew'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-500" />
                    <span>{formatPST(trip.depTime).split(',')[1]?.trim() || 'Schedule'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold col-span-2">
                    <DollarSign size={13} className="text-amber-500" />
                    <span className="text-emerald-400 text-sm">
                      ₱{trip.pricingMode === 'automatic' ? calculateDynamicPrice(trip) : (trip.currentPrice || trip.basePrice || 200)}
                    </span>
                    {trip.pricingMode === 'automatic' && (
                      <span className="text-[9px] text-[#FF8800] flex items-center gap-1 font-bold bg-[#FF8800]/10 px-1 py-0.5 rounded border border-[#FF8800]/20 ml-1">
                        🔄 Auto
                      </span>
                    )}
                    {trip.pricingMode !== 'automatic' && trip.currentPrice !== trip.basePrice && (
                       <span className="line-through text-slate-500 text-[10px]">₱{trip.basePrice}</span>
                    )}
                    {trip.priceAdjustmentReason && (
                      <span className="ml-1 text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">{trip.priceAdjustmentReason}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={13} className="text-slate-500" />
                    <span>Seats: {trip.capacity}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold col-span-2">
                    <Users size={13} className="text-emerald-500" />
                    <span className="text-emerald-400">{trip.available} available / booked</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-4 pt-1 border-t border-slate-900/60">
                {canEditPrices && (
                  <button
                    onClick={() => openTripModal(trip)}
                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"
                    title="Edit Shuttle Details"
                  >
                    <Edit2 size={13} />
                  </button>
                )}
                {isSuperAdmin && (
                  <button
                    onClick={() => handleTripDelete(trip.id, trip.route)}
                    className="p-2 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg transition-all"
                    title="Delete Shuttle Dispatch"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </SurfaceCard>
  );
};
