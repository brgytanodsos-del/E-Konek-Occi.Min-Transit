import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { Button } from '../../../components/ui/Button';
import { SurfaceCard } from '../../../components/ui';
import { Ship, Trip } from '../../../types/dataTypes';
import { toast } from 'sonner';
import { Ship as VesselIcon, Bus as BusIcon, DollarSign } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { DataErrorBoundary } from '../../../components/common/DataErrorBoundary';
import { SeaVoyageManager } from './SeaVoyageManager';
import { LandShuttleManager } from './LandShuttleManager';

export const TripManagement: React.FC = () => {
  const {
    persistShip,
    persistTrip,
    isOnline,
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
    pricingMode: 'manual' as 'manual' | 'automatic',
    autoRules: {
      peakHours: [] as string[],
      weekendMultiplier: 1.25,
      lowSeatMultiplier: 1.35
    }
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
    pricingMode: 'manual' as 'manual' | 'automatic',
    autoRules: {
      peakHours: [] as string[],
      weekendMultiplier: 1.25,
      lowSeatMultiplier: 1.35
    }
  });

  // Helper to pre-populate sea form
  const openShipModal = (ship?: Ship) => {
    if (ship) {
      setEditingShip(ship);
      setShipForm({
        name: ship.name,
        route: ship.route,
        depTime: ship.depTime ? new Date(ship.depTime).toISOString().slice(0, 16) : '',
        arrTime: ship.arrTime ? new Date(ship.arrTime).toISOString().slice(0, 16) : '',
        status: ship.status,
        capacity: ship.capacity,
        available: ship.available,
        type: ship.type,
        basePrice: ship.basePrice || 500,
        currentPrice: ship.currentPrice || 500,
        priceMultiplier: ship.priceMultiplier || 1,
        priceAdjustmentReason: ship.priceAdjustmentReason || '',
        pricingMode: ship.pricingMode || 'manual',
        autoRules: (ship.autoRules || { peakHours: [], weekendMultiplier: 1.25, lowSeatMultiplier: 1.35 }) as any
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
        pricingMode: 'manual',
        autoRules: { peakHours: [], weekendMultiplier: 1.25, lowSeatMultiplier: 1.35 } as any
      });
    }
    setShowShipModal(true);
  };

  // Helper to pre-populate land form
  const openTripModal = (trip?: Trip) => {
    if (trip) {
      setEditingTrip(trip);
      setTripForm({
        route: trip.route,
        depTime: trip.depTime ? new Date(trip.depTime).toISOString().slice(0, 16) : '',
        type: trip.type,
        driver: trip.driver || '',
        capacity: trip.capacity,
        available: trip.available,
        status: trip.status,
        basePrice: trip.basePrice || 200,
        currentPrice: trip.currentPrice || 200,
        priceMultiplier: trip.priceMultiplier || 1,
        priceAdjustmentReason: trip.priceAdjustmentReason || '',
        pricingMode: trip.pricingMode || 'manual',
        autoRules: (trip.autoRules || { peakHours: [], weekendMultiplier: 1.25, lowSeatMultiplier: 1.35 }) as any
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
        pricingMode: 'manual',
        autoRules: { peakHours: [], weekendMultiplier: 1.25, lowSeatMultiplier: 1.35 } as any
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

      <DataErrorBoundary>
        {activeTab === 'sea' ? (
          <SeaVoyageManager 
            canEditPrices={canEditPrices} 
            isSuperAdmin={isSuperAdmin} 
            openShipModal={openShipModal} 
          />
        ) : (
          <LandShuttleManager 
            canEditPrices={canEditPrices} 
            isSuperAdmin={isSuperAdmin} 
            openTripModal={openTripModal} 
          />
        )}
      </DataErrorBoundary>


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
