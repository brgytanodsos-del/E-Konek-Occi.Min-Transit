import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from './ui/Button';
import { SurfaceCard } from './ui';
import { Plus, Edit2, Trash2, Ship as VesselIcon, Bus as BusIcon, Calendar, Compass, User, Users, MapPin, DollarSign, AlertCircle } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Ship, Trip } from '../types/dataTypes';
import { toast } from 'sonner';
import { calculateDynamicPrice } from '../lib/pricingEngine';

export const TripManagement: React.FC = () => {
  const {
    ships,
    setShips,
    trips,
    setTrips,
    persistShip,
    persistTrip,
    isOnline,
    formatPST
  } = useApp();

  const { currentUser, currentRole } = useApp();
  const isSuperAdmin = currentRole === 'superadmin';
  const canEditPrices = isSuperAdmin || ['port', 'terminal', 'driver'].includes(currentRole || '');
  const [activeTab, setActiveTab] = useState<'sea' | 'land'>(currentRole === 'terminal' || currentRole === 'driver' ? 'land' : 'sea');
  const [showShipModal, setShowShipModal] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);
  const [editingShip, setEditingShip] = useState<Ship | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  // Sea voyage form state
  const [shipForm, setShipForm] = useState({
    name: '',
    route: 'Abra Port → Batangas',
    depTime: '',
    arrTime: '',
    status: 'Scheduled' as Ship['status'],
    capacity: 250,
    available: 250,
    type: 'RORO' as Ship['type'],
    basePrice: 500,
    currentPrice: 500,
    priceMultiplier: 1,
    priceAdjustmentReason: '',
    pricingMode: 'manual' as 'manual' | 'automatic'
  });

  // Land trip form state
  const [tripForm, setTripForm] = useState({
    route: 'Mamburao → San Jose',
    depTime: '',
    type: 'Van' as Trip['type'],
    driver: '',
    capacity: 15,
    available: 15,
    status: 'Scheduled' as Trip['status'],
    basePrice: 200,
    currentPrice: 200,
    priceMultiplier: 1,
    priceAdjustmentReason: '',
    pricingMode: 'manual' as 'manual' | 'automatic'
  });

  // Helper to pre-populate sea form
  const openShipModal = (ship?: Ship) => {
    if (ship) {
      setEditingShip(ship);
      setShipForm({
        name: ship.name,
        route: ship.route,
        depTime: ship.depTime ? new Date(ship.depTime).toISOString().slice(0, 16) : '',
        arrTime: ship.arrTime ? new Date(arrTimeFormatted(ship.arrTime)).toISOString().slice(0, 16) : '',
        status: ship.status,
        capacity: ship.capacity,
        available: ship.available,
        type: ship.type,
        basePrice: ship.basePrice || 500,
        currentPrice: ship.currentPrice || 500,
        priceMultiplier: ship.priceMultiplier || 1,
        priceAdjustmentReason: ship.priceAdjustmentReason || '',
        pricingMode: ship.pricingMode || 'manual'
      });
    } else {
      setEditingShip(null);
      setShipForm({
        name: '',
        route: 'Abra Port → Batangas',
        depTime: '',
        arrTime: '',
        status: 'Scheduled',
        capacity: 250,
        available: 250,
        type: 'RORO',
        basePrice: 500,
        currentPrice: 500,
        priceMultiplier: 1,
        priceAdjustmentReason: '',
        pricingMode: 'manual'
      });
    }
    setShowShipModal(true);
  };

  const arrTimeFormatted = (timeStr?: string) => {
    if (!timeStr) return new Date().toISOString();
    return timeStr;
  };

  // Helper to pre-populate land form
  const openTripModal = (trip?: Trip) => {
    if (trip) {
      setEditingTrip(trip);
      setTripForm({
        route: trip.route,
        depTime: trip.depTime ? new Date(trip.depTime).toISOString().slice(0, 16) : '',
        type: trip.type,
        driver: trip.driver,
        capacity: trip.capacity,
        available: trip.available,
        status: trip.status,
        basePrice: trip.basePrice || 200,
        currentPrice: trip.currentPrice || 200,
        priceMultiplier: trip.priceMultiplier || 1,
        priceAdjustmentReason: trip.priceAdjustmentReason || '',
        pricingMode: trip.pricingMode || 'manual'
      });
    } else {
      setEditingTrip(null);
      setTripForm({
        route: 'Mamburao → San Jose',
        depTime: '',
        type: 'Van',
        driver: '',
        capacity: 15,
        available: 15,
        status: 'Scheduled',
        basePrice: 200,
        currentPrice: 200,
        priceMultiplier: 1,
        priceAdjustmentReason: '',
        pricingMode: 'manual'
      });
    }
    setShowTripModal(true);
  };

  // Sea Form Submit
  const handleShipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const shipId = editingShip ? editingShip.id : 'ship-' + Math.random().toString(36).substr(2, 9);
      
      const isPriceChanged = editingShip && 
        (editingShip.currentPrice !== shipForm.currentPrice || 
         editingShip.priceAdjustmentReason !== shipForm.priceAdjustmentReason);

      const payload: Ship = {
        id: shipId,
        name: shipForm.name,
        route: shipForm.route,
        depTime: new Date(shipForm.depTime).toISOString(),
        arrTime: new Date(shipForm.arrTime || new Date(shipForm.depTime).getTime() + 3 * 3600000).toISOString(),
        status: shipForm.status,
        capacity: Number(shipForm.capacity),
        available: editingShip ? Number(shipForm.available) : Number(shipForm.capacity),
        type: shipForm.type,
        basePrice: Number(shipForm.basePrice),
        currentPrice: Number(shipForm.currentPrice),
        priceMultiplier: Number(shipForm.priceMultiplier),
        priceAdjustmentReason: shipForm.priceAdjustmentReason,
        pricingMode: shipForm.pricingMode,
        autoRules: shipForm.pricingMode === 'automatic' ? shipForm.autoRules : undefined,
        lastPriceUpdatedBy: currentUser?.fullName || 'Admin',
        lastPriceUpdatedAt: new Date().toISOString()
      };

      await persistShip(payload);

      if (isPriceChanged && isOnline) {
        // Log price history in sub-collection
        try {
          const { collection, addDoc } = require('firebase/firestore');
          await addDoc(collection(db, `ships/${shipId}/priceHistory`), {
            previousPrice: editingShip.currentPrice || editingShip.basePrice || 500,
            newPrice: payload.currentPrice,
            multiplier: payload.priceMultiplier,
            reason: payload.priceAdjustmentReason,
            changedBy: currentUser?.fullName || 'Admin',
            changedAt: new Date().toISOString(),
          });
        } catch (e) {
          console.error("Failed to log ship price history:", e);
        }
      }

      toast.success(editingShip ? '🌊 Voyage details updated!' : '🚢 New voyage scheduled successfully!');
      setShowShipModal(false);
      setEditingShip(null);
    } catch {
      toast.error('Failed to save sea voyage details.');
    }
  };

  // Land Form Submit
  const handleTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tripId = editingTrip ? editingTrip.id : 'trip-' + Math.random().toString(36).substr(2, 9);
      
      const isPriceChanged = editingTrip && 
        (editingTrip.currentPrice !== tripForm.currentPrice || 
         editingTrip.priceAdjustmentReason !== tripForm.priceAdjustmentReason);

      const payload: Trip = {
        id: tripId,
        route: tripForm.route,
        depTime: new Date(tripForm.depTime).toISOString(),
        type: tripForm.type,
        driver: tripForm.driver,
        capacity: Number(tripForm.capacity),
        available: editingTrip ? Number(tripForm.available) : Number(tripForm.capacity),
        status: tripForm.status,
        basePrice: Number(tripForm.basePrice),
        currentPrice: Number(tripForm.currentPrice),
        priceMultiplier: Number(tripForm.priceMultiplier),
        priceAdjustmentReason: tripForm.priceAdjustmentReason,
        pricingMode: tripForm.pricingMode,
        autoRules: tripForm.pricingMode === 'automatic' ? tripForm.autoRules : undefined,
        lastPriceUpdatedBy: currentUser?.fullName || 'Admin',
        lastPriceUpdatedAt: new Date().toISOString()
      };

      await persistTrip(payload);

      if (isPriceChanged && isOnline) {
        // Log price history in sub-collection
        try {
          const { collection, addDoc } = require('firebase/firestore');
          await addDoc(collection(db, `trips/${tripId}/priceHistory`), {
            previousPrice: editingTrip.currentPrice || editingTrip.basePrice || 200,
            newPrice: payload.currentPrice,
            multiplier: payload.priceMultiplier,
            reason: payload.priceAdjustmentReason,
            changedBy: currentUser?.fullName || 'Admin',
            changedAt: new Date().toISOString(),
          });
        } catch (e) {
          console.error("Failed to log trip price history:", e);
        }
      }

      toast.success(editingTrip ? '🚐 Dispatch schedule updated!' : '🚐 New shuttle dispatched successfully!');
      setShowTripModal(false);
      setEditingTrip(null);
    } catch {
      toast.error('Failed to save land shuttle details.');
    }
  };

  // Delete Ship
  const handleShipDelete = async (id: string, name: string) => {
    if (!confirm(`Are you absolutely sure you want to cancel and delete voyage ${name}?`)) return;
    try {
      if (isOnline) {
        await deleteDoc(doc(db, 'ships', id));
      }
      setShips(prev => prev.filter(s => s.id !== id));
      toast.success(`Voyage ${name} permanently deleted.`);
    } catch {
      toast.error('Operation failed.');
    }
  };

  // Delete Trip
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
    <div className="space-y-6">
      {/* Tab Switcher */}
      {isSuperAdmin && (
        <div className="flex bg-slate-900/60 p-1 rounded-2xl border border-slate-800 self-start max-w-sm">
          <button
            onClick={() => setActiveTab('sea')}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'sea'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 bg-transparent'
            }`}
          >
            <VesselIcon size={14} /> Sea Voyages
          </button>
          <button
            onClick={() => setActiveTab('land')}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'land'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 bg-transparent'
            }`}
          >
            <BusIcon size={14} /> Land Shuttles
          </button>
        </div>
      )}

      {activeTab === 'sea' ? (
        <SurfaceCard className="bg-slate-900/45 p-6 rounded-3xl border border-slate-800/80">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-black text-white font-sans flex items-center gap-2">
                <VesselIcon className="text-blue-500" /> Montenegro Sea Voyages
              </h2>
              <p className="text-xs text-slate-400 mt-1">Schedule and manage Batangas-Mindoro shipping operations.</p>
            </div>
            {isSuperAdmin && (
              <Button
                onClick={() => openShipModal()}
                variant="primary"
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-500 text-xs font-bold gap-1.5 flex items-center bg-none font-sans uppercase tracking-widest px-4 py-2"
              >
                <Plus size={14} /> Add Voyage
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ships.length === 0 ? (
              <div className="col-span-2 text-center py-12 bg-slate-950/40 border border-dashed border-slate-800 rounded-3xl text-slate-500">
                <VesselIcon size={40} className="mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-bold">No maritime voyages scheduled</p>
                <p className="text-xs opacity-60">Tap 'Add Voyage' to create first schedule</p>
              </div>
            ) : (
              ships.map(ship => (
                <div key={ship.id} className="bg-slate-950/50 hover:bg-slate-950/80 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 group">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-sm text-white group-hover:text-blue-400 transition-colors">{ship.name}</h4>
                        <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 border border-blue-500/20 rounded px-1.5 py-0.5 uppercase tracking-wide inline-block mt-1 font-mono">
                          {ship.type}
                        </span>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        ship.status === 'Scheduled' ? 'bg-slate-900 border-slate-700 text-slate-400' :
                        ship.status === 'Boarding' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                        ship.status === 'Departed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        'bg-red-500/10 border-red-500/20 text-red-500'
                      }`}>
                        {ship.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-400 text-xs border-t border-b border-slate-900 py-3">
                      <div className="flex items-center gap-1.5">
                        <Compass size={13} className="text-blue-500" />
                        <span className="truncate">{ship.route}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-500" />
                        <span>{formatPST(ship.depTime).split(',')[1]?.trim() || 'Schedule'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold col-span-2">
                        <DollarSign size={13} className="text-amber-500" />
                        <span className="text-emerald-400 text-sm">
                          ₱{ship.pricingMode === 'automatic' ? calculateDynamicPrice(ship) : (ship.currentPrice || ship.basePrice || 500)}
                        </span>
                        {ship.pricingMode === 'automatic' && (
                          <span className="text-[9px] text-[#003087] flex items-center gap-1 font-bold bg-[#003087]/10 px-1 py-0.5 rounded border border-[#003087]/20 ml-1">
                            🔄 Auto
                          </span>
                        )}
                        {ship.pricingMode !== 'automatic' && ship.currentPrice !== ship.basePrice && (
                           <span className="line-through text-slate-500 text-[10px]">₱{ship.basePrice}</span>
                        )}
                        {ship.priceAdjustmentReason && (
                          <span className="ml-1 text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">{ship.priceAdjustmentReason}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users size={13} className="text-slate-500" />
                        <span>Capacity: {ship.capacity}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold">
                        <Users size={13} className="text-emerald-500" />
                        <span className="text-emerald-400">{ship.available} seats left</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-4 pt-1 border-t border-slate-900/60">
                    {canEditPrices && (
                      <button
                        onClick={() => openShipModal(ship)}
                        className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"
                        title="Edit Voyage Details"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleShipDelete(ship.id, ship.name)}
                        className="p-2 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg transition-all"
                        title="Delete Voyage"
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
      ) : (
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
      )}

      {/* 1. Sea Voyage Modal Form */}
      {showShipModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in text-slate-200">
          <SurfaceCard className="w-full max-w-lg p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl relative">
            <h3 className="text-lg font-black text-white font-sans border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <VesselIcon className="text-blue-500" /> {editingShip ? 'Edit Montenegro Shipping Voyage' : 'Create Montenegro Shipping Voyage'}
            </h3>

            <form onSubmit={handleShipSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Vessel / Ship Name</label>
                  <input
                    type="text"
                    required
                    value={shipForm.name}
                    onChange={e => setShipForm({ ...shipForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors"
                    placeholder="M/V Santa Clara"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Vessel Type</label>
                  <select
                    value={shipForm.type}
                    onChange={e => setShipForm({ ...shipForm, type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-600 rounded-xl px-2 py-2.5 text-xs text-white focus:outline-none transition-colors"
                  >
                    <option value="RORO">RORO</option>
                    <option value="Passenger Ferry">Fastcraft Passenger Ferry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Voyage Route</label>
                  <select
                    value={shipForm.route}
                    onChange={e => setShipForm({ ...shipForm, route: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-600 rounded-xl px-2 py-2.5 text-xs text-white focus:outline-none transition-colors"
                  >
                    <option value="Abra de Ilog → Batangas">Abra de Ilog → Batangas</option>
                    <option value="Batangas → Abra de Ilog">Batangas → Abra de Ilog</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Departure Date/Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={shipForm.depTime}
                    onChange={e => setShipForm({ ...shipForm, depTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Arrival (Est)</label>
                  <input
                    type="datetime-local"
                    required
                    value={shipForm.arrTime}
                    onChange={e => setShipForm({ ...shipForm, arrTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Max Slots Capacity</label>
                  <input
                    type="number"
                    required
                    min={10}
                    max={1000}
                    value={shipForm.capacity}
                    onChange={e => setShipForm({ ...shipForm, capacity: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status Filter</label>
                  <select
                    value={shipForm.status}
                    onChange={e => setShipForm({ ...shipForm, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-600 rounded-xl px-2 py-2.5 text-xs text-white focus:outline-none transition-colors"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Boarding">Boarding</option>
                    <option value="Departed">Departed</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div className="col-span-2 grid grid-cols-2 gap-4 border border-blue-900/40 bg-blue-900/10 p-4 rounded-2xl mt-4">
                  <div className="col-span-2 flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-white uppercase tracking-wider">Pricing Mode</label>
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setShipForm({ ...shipForm, pricingMode: 'manual' })}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${shipForm.pricingMode === 'manual' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        MANUAL
                      </button>
                      <button
                        type="button"
                        onClick={() => setShipForm({ ...shipForm, pricingMode: 'automatic' })}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${shipForm.pricingMode === 'automatic' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        AUTOMATIC
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1"><DollarSign size={12}/> Base Fare</label>
                    <input
                      type="number" required min={0}
                      value={shipForm.basePrice}
                      onChange={e => setShipForm({ ...shipForm, basePrice: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1"><DollarSign size={12}/> Current Fare</label>
                    <input
                      type="number" required min={0}
                      value={shipForm.currentPrice}
                      onChange={e => setShipForm({ ...shipForm, currentPrice: Number(e.target.value) })}
                      disabled={shipForm.pricingMode === 'automatic'}
                      className={`w-full bg-slate-950 border border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-amber-400 font-bold focus:outline-none ${shipForm.pricingMode === 'automatic' ? 'opacity-50' : ''}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Adjustment Reason</label>
                    <input
                      type="text" placeholder="e.g. Holiday Surge"
                      value={shipForm.priceAdjustmentReason}
                      onChange={e => setShipForm({ ...shipForm, priceAdjustmentReason: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  {shipForm.pricingMode === 'automatic' && (
                    <div className="col-span-2 space-y-4 border-t border-slate-800 pt-4 mt-2">
                      <h4 className="text-xs font-bold text-blue-400 flex items-center gap-2"><DollarSign size={14}/> Automatic Surge Rules</h4>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Peak Hours (comma separated)</label>
                        <input 
                          type="text" 
                          placeholder="07:00-10:00,16:00-19:00" 
                          value={shipForm.autoRules?.peakHours?.join(',') || ''}
                          onChange={(e) => setShipForm({
                            ...shipForm, 
                            autoRules: { 
                              ...shipForm.autoRules, 
                              peakHours: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                            }
                          })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Weekend Multiplier</label>
                          <input type="number" step="0.05" value={shipForm.autoRules?.weekendMultiplier || 1.25} onChange={e => setShipForm({...shipForm, autoRules: {...shipForm.autoRules, weekendMultiplier: Number(e.target.value)}})} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Low Seat Multiplier</label>
                          <input type="number" step="0.05" value={shipForm.autoRules?.lowSeatMultiplier || 1.35} onChange={e => setShipForm({...shipForm, autoRules: {...shipForm.autoRules, lowSeatMultiplier: Number(e.target.value)}})} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {editingShip && (
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Override Available Seats (Currently {shipForm.available})</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={shipForm.capacity}
                      value={shipForm.available}
                      onChange={e => setShipForm({ ...shipForm, available: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-600 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowShipModal(false); setEditingShip(null); }}
                  className="px-4 py-2 border border-slate-705 text-slate-300 hover:text-white hover:bg-slate-800 text-xs text-center"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="px-5 py-2 hover:opacity-90 text-xs text-center text-white bg-blue-600"
                >
                  {editingShip ? 'Save Changes' : 'Schedule Voyage'}
                </Button>
              </div>
            </form>
          </SurfaceCard>
        </div>
      )}

      {/* 2. Land Trip Modal Form */}
      {showTripModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in text-slate-200">
          <SurfaceCard className="w-full max-w-lg p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl relative">
            <h3 className="text-lg font-black text-white font-sans border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <BusIcon className="text-emerald-500" /> {editingTrip ? 'Edit Terminal Shuttle Trip' : 'Create Terminal Shuttle Run'}
            </h3>

            <form onSubmit={handleTripSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Assigned Driver Crew</label>
                  <input
                    type="text"
                    required
                    value={tripForm.driver}
                    onChange={e => setTripForm({ ...tripForm, driver: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-600 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors"
                    placeholder="E.g., Juan dela Cruz"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Vehicle Type</label>
                  <select
                    value={tripForm.type}
                    onChange={e => setTripForm({ ...tripForm, type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-600 rounded-xl px-2 py-2.5 text-xs text-white focus:outline-none transition-colors"
                  >
                    <option value="Van">Van Shuttles</option>
                    <option value="Bus">Bus Liners</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Inter-Town Route</label>
                  <select
                    value={tripForm.route}
                    onChange={e => setTripForm({ ...tripForm, route: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-600 rounded-xl px-2 py-2.5 text-xs text-white focus:outline-none transition-colors"
                  >
                    <option value="Mamburao → San Jose">Mamburao → San Jose</option>
                    <option value="San Jose → Mamburao">San Jose → Mamburao</option>
                    <option value="Mamburao → Sablayan">Mamburao → Sablayan</option>
                    <option value="Sablayan → Mamburao">Sablayan → Mamburao</option>
                    <option value="Mamburao → Abra de Ilog">Mamburao → Abra de Ilog</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Departure Schedule</label>
                  <input
                    type="datetime-local"
                    required
                    value={tripForm.depTime}
                    onChange={e => setTripForm({ ...tripForm, depTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-600 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Seating capacity</label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={100}
                    value={tripForm.capacity}
                    onChange={e => setTripForm({ ...tripForm, capacity: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-600 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Dispatched Status</label>
                  <select
                    value={tripForm.status}
                    onChange={e => setTripForm({ ...tripForm, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-600 rounded-xl px-2 py-2.5 text-xs text-white focus:outline-none transition-colors"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Boarding">Boarding</option>
                    <option value="Departed">Departed</option>
                    <option value="Completed">Completed Run</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div className="col-span-2 grid grid-cols-2 gap-4 border border-emerald-900/40 bg-emerald-900/10 p-4 rounded-2xl mt-4">
                  <div className="col-span-2 flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-white uppercase tracking-wider">Pricing Mode</label>
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setTripForm({ ...tripForm, pricingMode: 'manual' })}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${tripForm.pricingMode === 'manual' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        MANUAL
                      </button>
                      <button
                        type="button"
                        onClick={() => setTripForm({ ...tripForm, pricingMode: 'automatic' })}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${tripForm.pricingMode === 'automatic' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        AUTOMATIC
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1"><DollarSign size={12}/> Base Fare</label>
                    <input
                      type="number" required min={0}
                      value={tripForm.basePrice}
                      onChange={e => setTripForm({ ...tripForm, basePrice: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-600 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1"><DollarSign size={12}/> Current Fare</label>
                    <input
                      type="number" required min={0}
                      value={tripForm.currentPrice}
                      onChange={e => setTripForm({ ...tripForm, currentPrice: Number(e.target.value) })}
                      disabled={tripForm.pricingMode === 'automatic'}
                      className={`w-full bg-slate-950 border border-slate-800 focus:border-emerald-600 rounded-xl px-3 py-2 text-xs text-amber-400 font-bold focus:outline-none ${tripForm.pricingMode === 'automatic' ? 'opacity-50' : ''}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Adjustment Reason</label>
                    <input
                      type="text" placeholder="e.g. Rush Hour"
                      value={tripForm.priceAdjustmentReason}
                      onChange={e => setTripForm({ ...tripForm, priceAdjustmentReason: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-600 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  {tripForm.pricingMode === 'automatic' && (
                    <div className="col-span-2 space-y-4 border-t border-slate-800 pt-4 mt-2">
                      <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-2"><DollarSign size={14}/> Automatic Surge Rules</h4>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Peak Hours (comma separated)</label>
                        <input 
                          type="text" 
                          placeholder="07:00-10:00,16:00-19:00" 
                          value={tripForm.autoRules?.peakHours?.join(',') || ''}
                          onChange={(e) => setTripForm({
                            ...tripForm, 
                            autoRules: { 
                              ...tripForm.autoRules, 
                              peakHours: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                            }
                          })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-600 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Weekend Multiplier</label>
                          <input type="number" step="0.05" value={tripForm.autoRules?.weekendMultiplier || 1.25} onChange={e => setTripForm({...tripForm, autoRules: {...tripForm.autoRules, weekendMultiplier: Number(e.target.value)}})} className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-600 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Low Seat Multiplier</label>
                          <input type="number" step="0.05" value={tripForm.autoRules?.lowSeatMultiplier || 1.35} onChange={e => setTripForm({...tripForm, autoRules: {...tripForm.autoRules, lowSeatMultiplier: Number(e.target.value)}})} className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-600 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {editingTrip && (
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Override seats (Currently {tripForm.available} available)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={tripForm.capacity}
                      value={tripForm.available}
                      onChange={e => setTripForm({ ...tripForm, available: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-600 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowTripModal(false); setEditingTrip(null); }}
                  className="px-4 py-2 border border-slate-705 text-slate-300 hover:text-white hover:bg-slate-800 text-xs text-center"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="px-5 py-2 hover:opacity-90 text-xs text-center text-white bg-emerald-600"
                >
                  {editingTrip ? 'Save Changes' : 'Dispatch Shuttle'}
                </Button>
              </div>
            </form>
          </SurfaceCard>
        </div>
      )}
    </div>
  );
};
