import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../../context/AppContext';
import { Button } from '../../../components/ui/Button';
import { SurfaceCard } from '../../../components/ui';
import { Ship, Trip } from '../../../types/dataTypes';
import { toast } from 'sonner';
import { Ship as VesselIcon, Bus as BusIcon, DollarSign, Printer, FileText, Check, X, ClipboardList } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { DataErrorBoundary } from '../../../components/common/DataErrorBoundary';
import { SeaVoyageManager } from './SeaVoyageManager';
import { LandShuttleManager } from './LandShuttleManager';

export const TripManagement: React.FC = () => {
  const {
    persistShip,
    persistTrip,
    isOnline,
    ships,
    trips,
    formatPST,
    currentUser,
    currentRole,
  } = useApp();

  const isSuperAdmin = currentRole === 'superadmin';
  const canEditPrices = isSuperAdmin || ['port', 'terminal', 'driver'].includes(currentRole || '');
  const [activeTab, setActiveTab] = useState<'sea' | 'land'>(currentRole === 'terminal' || currentRole === 'driver' ? 'land' : 'sea');
  const [showShipModal, setShowShipModal] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);
  const [editingShip, setEditingShip] = useState<Ship | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  // Print Summary component state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printNotes, setPrintNotes] = useState('');
  const [dispatcherName, setDispatcherName] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');

  // Load user name into dispatcher field immediately when available
  useEffect(() => {
    if (currentUser && !dispatcherName) {
      setDispatcherName(currentUser.fullName || currentUser.email || 'Duty Dispatcher');
    }
  }, [currentUser, dispatcherName]);

  // Filter and sort items to print based on the active tab
  const getPrintableItems = () => {
    if (activeTab === 'sea') {
      const activeShips = ships || [];
      return activeShips
        .filter(s => selectedStatusFilter === 'All' ? true : s.status === selectedStatusFilter)
        .sort((a, b) => new Date(a.depTime || 0).getTime() - new Date(b.depTime || 0).getTime());
    } else {
      const activeTrips = trips || [];
      return activeTrips
        .filter(t => selectedStatusFilter === 'All' ? true : t.status === selectedStatusFilter)
        .sort((a, b) => new Date(a.depTime || 0).getTime() - new Date(b.depTime || 0).getTime());
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tab Switcher */}
        {isSuperAdmin ? (
          <div className="flex bg-slate-900/60 p-1 rounded-2xl border border-slate-800 self-start w-full sm:w-auto max-w-sm">
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
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#FF8800] bg-[#FF8800]/10 border border-[#FF8800]/25 rounded-lg px-2.5 py-1 uppercase tracking-widest font-sans">
              {currentRole === 'port' ? '🚢 Port station' : '🚐 terminal station'}
            </span>
          </div>
        )}

        {/* Print Summary Trigger Button */}
        <button
          onClick={() => setShowPrintModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider bg-slate-900 hover:bg-slate-800 border border-slate-800/95 hover:border-slate-700 text-slate-200 hover:text-white rounded-xl transition-all shadow-md active:scale-95 cursor-pointer w-full sm:w-auto self-start sm:self-auto select-none font-sans"
        >
          <Printer size={13} className="text-[#FF8800] animate-pulse" />
          <span>Print Trip Summary</span>
        </button>
      </div>

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

                <div className="relative">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Status</span>
                    <motion.span 
                      key={shipForm.status}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        shipForm.status === 'Scheduled' ? 'bg-slate-800 text-slate-400' :
                        shipForm.status === 'Boarding' ? 'bg-amber-500/20 text-amber-400' :
                        shipForm.status === 'Departed' ? 'bg-emerald-500/20 text-emerald-400' :
                        shipForm.status === 'Delayed' ? 'bg-rose-500/20 text-rose-400' :
                        'bg-red-500/20 text-red-500'
                      }`}
                    >
                      ● {shipForm.status}
                    </motion.span>
                  </label>
                  <motion.div
                    key={shipForm.status}
                    initial={{ borderLeftColor: "rgba(30, 41, 59, 1)" }}
                    animate={{ 
                      borderLeftColor: 
                        shipForm.status === 'Scheduled' ? '#64748b' :
                        shipForm.status === 'Boarding' ? '#fbbf24' :
                        shipForm.status === 'Departed' ? '#10b981' :
                        shipForm.status === 'Delayed' ? '#f43f5e' :
                        '#ef4444'
                    }}
                    transition={{ duration: 0.3 }}
                    className="rounded-xl border-l-4 overflow-hidden"
                  >
                    <select
                      value={shipForm.status}
                      onChange={e => setShipForm({ ...shipForm, status: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-600 rounded-xl rounded-l-none px-2 py-2.5 text-xs text-white focus:outline-none transition-colors cursor-pointer"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Boarding">Boarding</option>
                      <option value="Departed">Departed</option>
                      <option value="Delayed">Delayed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </motion.div>
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

                <div className="col-span-2 relative">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Dispatched Status</span>
                    <motion.span 
                      key={tripForm.status}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        tripForm.status === 'Scheduled' ? 'bg-slate-800 text-slate-400' :
                        tripForm.status === 'Boarding' ? 'bg-amber-500/20 text-amber-400' :
                        tripForm.status === 'Departed' ? 'bg-emerald-500/20 text-emerald-400' :
                        tripForm.status === 'Completed' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-red-500/20 text-red-550'
                      }`}
                    >
                      ● {tripForm.status}
                    </motion.span>
                  </label>
                  <motion.div
                    key={tripForm.status}
                    initial={{ borderLeftColor: "rgba(30, 41, 59, 1)" }}
                    animate={{ 
                      borderLeftColor: 
                        tripForm.status === 'Scheduled' ? '#64748b' :
                        tripForm.status === 'Boarding' ? '#fbbf24' :
                        tripForm.status === 'Departed' ? '#10b981' :
                        tripForm.status === 'Completed' ? '#3b82f6' :
                        '#ef4444'
                    }}
                    transition={{ duration: 0.3 }}
                    className="rounded-xl border-l-4 overflow-hidden"
                  >
                    <select
                      value={tripForm.status}
                      onChange={e => setTripForm({ ...tripForm, status: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-600 rounded-xl rounded-l-none px-2 py-2.5 text-xs text-white focus:outline-none transition-colors cursor-pointer"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Boarding">Boarding</option>
                      <option value="Departed">Departed</option>
                      <option value="Completed">Completed Run</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </motion.div>
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

      {/* 3. Printable Dispatch Summary Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 md:p-8 backdrop-blur-md animate-fade-in text-slate-200 overflow-y-auto">
          {/* Inject dynamic print stylesheet to safely override standard layouts during print */}
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body, html {
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
                color: #000 !important;
                font-family: Arial, Helvetica, sans-serif !important;
              }
              body * {
                visibility: hidden !important;
              }
              #printable-manifest-area, #printable-manifest-area * {
                visibility: visible !important;
              }
              #printable-manifest-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: #fff !important;
                color: #000 !important;
                padding: 30px !important;
                border: none !important;
                box-shadow: none !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}} />

          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto max-h-[90vh]">
            
            {/* LEFT COLUMN: Controls & Config */}
            <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-800 w-full md:w-5/12 flex flex-col justify-between overflow-y-auto bg-slate-950/40">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-[#FF8800]/10 border border-[#FF8800]/25 p-2 rounded-xl text-[#FF8800]">
                      <Printer size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white font-sans">Print Manifest Options</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Customize physical dispatch log settings.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Dispatcher Name Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Dispatcher Name</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700/80 focus:border-[#FF8800] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-colors"
                      value={dispatcherName}
                      onChange={(e) => setDispatcherName(e.target.value)}
                      placeholder="Enter Dispatcher Name"
                    />
                  </div>

                  {/* Filter Status */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Filter Trip Status</label>
                    <select
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700/80 focus:border-[#FF8800] rounded-xl px-2.5 py-2.5 text-xs text-white focus:outline-none transition-colors cursor-pointer"
                      value={selectedStatusFilter}
                      onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    >
                      <option value="All">All statuses</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Boarding">Boarding</option>
                      <option value="Departed">Departed</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Custom Print Notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Custom Manifest Notes</label>
                    <textarea
                      rows={4}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700/80 focus:border-[#FF8800] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-colors resize-none"
                      value={printNotes}
                      onChange={(e) => setPrintNotes(e.target.value)}
                      placeholder="e.g. Sea conditions: moderate, land weather: clear with light wind. Handing over shift to night dispatcher."
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-6 border-t border-slate-800/80 mt-6 mt-auto">
                <Button
                  onClick={() => setShowPrintModal(false)}
                  variant="outline"
                  className="px-4 py-2 hover:bg-slate-800 border border-slate-705 text-slate-300 hover:text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 rounded-xl h-10 w-full md:w-auto"
                >
                  <X size={14} /> Close
                </Button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 hover:opacity-90 text-white bg-[#FF8800] hover:bg-[#ff951a] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 rounded-xl h-10 shadow-lg shadow-[#FF8800]/15 w-full md:w-auto select-none cursor-pointer"
                >
                  <Printer size={14} /> Print Now
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: Printable Live Preview Area */}
            <div className="flex-1 bg-slate-100 p-6 md:p-8 overflow-y-auto flex flex-col items-center">
              <div className="w-full max-w-[210mm] min-h-[297mm] bg-white border border-slate-300 shadow-xl p-8 md:p-10 text-black flex flex-col justify-between font-sans relative" id="printable-manifest-area">
                
                {/* Printable Header */}
                <div>
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-6">
                    <div>
                      <h4 className="text-[10px] font-black tracking-widest text-[#003580] uppercase">REPUBLIC OF THE PHILIPPINES</h4>
                      <h3 className="text-lg font-black tracking-tight text-slate-900 leading-none mt-0.5">MINDORO TRANSIT SYSTEM</h3>
                      <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">
                        {activeTab === 'sea' ? 'Abra de Ilog Ticketing Port Station' : 'Mamburao Grand Terminal Hub'}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="bg-[#FF8800] text-white font-extrabold text-[8px] uppercase tracking-widest px-2 py-0.5 rounded">
                        DISPATCH MANIFEST
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1.5 font-mono">
                        Generated: {new Date().toLocaleDateString()} at {new Date().toTimeString().split(' ')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Dispatch Parameters Box */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 text-xs text-left">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Authorized Operator</span>
                      <span className="font-extrabold text-slate-800">{dispatcherName || 'Shift On-Duty'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Service Category</span>
                      <span className="font-extrabold text-[#003580] uppercase">
                        {activeTab === 'sea' ? '🚢 MARITIME / RORO TRANSPORT' : '🚐 LAND BUS & VAN TRANSIT'}
                      </span>
                    </div>
                  </div>

                  {/* Table area */}
                  <table className="w-full text-left border-collapse border border-slate-300 text-xs text-slate-800">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        <th className="p-2.5 border border-slate-300">
                          {activeTab === 'sea' ? 'Vessel Name' : 'Driver / Crew'}
                        </th>
                        <th className="p-2.5 border border-slate-300">Route</th>
                        <th className="p-2.5 border border-slate-300">Scheduled</th>
                        <th className="p-2.5 border border-slate-300 text-center">Capacity</th>
                        <th className="p-2.5 border border-slate-300 text-center">Base Fare</th>
                        <th className="p-2.5 border border-slate-300 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {getPrintableItems().length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                            No dispatch items match the selected filter criteria.
                          </td>
                        </tr>
                      ) : (
                        getPrintableItems().map((item: any) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-2.5 border border-slate-200">
                              <div className="font-bold">{activeTab === 'sea' ? item.name : item.driver || 'Unassigned'}</div>
                              <span className="text-[8px] uppercase tracking-wide font-mono px-1 py-[1px] bg-slate-100 rounded text-slate-500">
                                {item.type}
                              </span>
                            </td>
                            <td className="p-2.5 border border-slate-200 font-semibold">{item.route}</td>
                            <td className="p-2.5 border border-slate-200 font-mono text-[10px]">
                              {formatPST(item.depTime)}
                            </td>
                            <td className="p-2.5 border border-slate-200 text-center font-semibold text-[11px]">
                              {activeTab === 'sea' 
                                ? `${item.available || item.capacity}/${item.capacity}` 
                                : `${item.available} / ${item.capacity}`
                              }
                            </td>
                            <td className="p-2.5 border border-slate-200 font-mono text-[11px] font-bold text-center text-slate-900">
                              ₱{item.currentPrice || item.basePrice}
                            </td>
                            <td className="p-2.5 border border-slate-200 text-center">
                              <span className={`text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 border rounded-full ${
                                item.status === 'Scheduled' ? 'bg-slate-50 text-slate-500 border-slate-300' :
                                item.status === 'Boarding' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                                item.status === 'Departed' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                                item.status === 'Completed' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                                'bg-red-100 text-red-700 border-red-300'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Print Notes */}
                  {printNotes.trim() && (
                    <div className="mt-8 border border-slate-200 rounded-xl p-4 bg-slate-50/50 text-left">
                      <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 block mb-1">
                        MANIFEST CLASSIFIED NOTES / MEMORANDUMS
                      </span>
                      <p className="text-slate-700 text-xs leading-relaxed italic">{printNotes}</p>
                    </div>
                  )}
                </div>

                {/* Printable Footer / Clipboard Sign-off Block */}
                <div className="border-t border-dashed border-slate-300 pt-8 mt-12 grid grid-cols-2 gap-12 text-center text-[10px]">
                  <div>
                    <div className="h-10 border-b border-slate-900 mx-auto w-3/4"></div>
                    <span className="font-black text-slate-700 block mt-1.5 uppercase">PREPARED & VERIFIED BY</span>
                    <span className="text-slate-400 block text-[9px] mt-0.5">{dispatcherName || 'Duty Dispatcher'}</span>
                  </div>
                  <div>
                    <div className="h-10 border-b border-slate-900 mx-auto w-3/4"></div>
                    <span className="font-black text-slate-700 block mt-1.5 uppercase">APPROVED AUTHORITY FLAGGER</span>
                    <span className="text-slate-400 block text-[9px] mt-0.5">Occidental Mindoro Transit Chief</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
