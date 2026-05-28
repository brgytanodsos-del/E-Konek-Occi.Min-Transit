import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { WeatherWidget } from '../../components/WeatherWidget';
import { motion, AnimatePresence } from 'motion/react';
import { PriceAdjustmentRequest } from '../../components/PriceAdjustmentRequest';
import { TripManagement } from '../../features/trips/components/TripManagement';

interface Panel2Props {
  isSuperAdmin: boolean;
}

export const Panel2 = ({ isSuperAdmin }: Panel2Props) => {
  const {
    trips,
    setTrips,
    vanBookings,
    setVanBookings,
    ships,
    getTripLocation,
    formatPST,
    addTransaction,
    mamburaoWeather,
    isOnline,
    setToastMessage,
    persistTrip,
    updateTripStatus: persistTripStatus,
    updateBookingStatus,
    gpsIndices,
    userAccount,
    userAccounts,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'manager' | 'sync' | 'map'>('manager');
  const [tripRoute, setTripRoute] = useState('Mamburao → Abra Port');
  const [depDateTime, setDepDateTime] = useState('');
  const [vehicleType, setVehicleType] = useState('Van');
  const [driverName, setDriverName] = useState('');
  const [capacity, setCapacity] = useState('14');
  const [searchPassenger, setSearchPassenger] = useState('');
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);

  const activeTripsCount = trips.filter(t => t.status === 'Boarding' || t.status === 'Departed').length;
  const totalBookingsCount = vanBookings.length;
  const pendingBookingsCount = vanBookings.filter(b => b.status === 'Pending').length;

  const TRIP_STATUSES = ['Scheduled', 'Boarding', 'Departed', 'Completed', 'Cancelled'];
  const ROUTES_12 = [
    'Mamburao → Abra Port', 'Abra Port → Mamburao',
    'Mamburao → San Jose', 'San Jose → Mamburao',
    'Mamburao → Calintaan', 'Calintaan → Mamburao',
    'Mamburao → Paluan', 'Paluan → Mamburao',
    'Mamburao → Sablayan', 'Sablayan → Mamburao',
    'Mamburao → Mamburao Plaza', 'Mamburao Plaza → Mamburao'
  ];

  const handleAddTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depDateTime || !driverName) {
      setToastMessage("⚠️ Please fill up all fields");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const newTrip = {
      id: 't-' + Math.random().toString(36).substr(2, 9),
      route: tripRoute,
      depTime: new Date(depDateTime).toISOString(),
      type: vehicleType as 'Van' | 'Bus',
      driver: driverName,
      capacity: Number(capacity),
      available: Number(capacity),
      status: 'Scheduled' as const
    };

    persistTrip(newTrip).catch(console.error);
    setDriverName('');
    setDepDateTime('');
    setToastMessage("🚐 New trip has been added to schedule!");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const localUpdateTripStatus = (tripId: string, status: 'Scheduled' | 'Boarding' | 'Departed' | 'Completed' | 'Cancelled') => {
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, status } : t));
    persistTripStatus(tripId, status).catch(console.error);
    setToastMessage(`🧭 Trip status updated to ${status}`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleConfirmBooking = (booking: any) => {
    setVanBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'Confirmed' } : b));
    updateBookingStatus(booking.id, 'van', 'Confirmed').catch(console.error);
    addTransaction(booking, 'Terminal Admin');
    setToastMessage(`✅ Booking for ${booking.name} is successfully CONFIRMED!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCancelBooking = async (bookingId: string) => {
    const booking = vanBookings.find(b => b.id === bookingId);
    if (!booking) return;

    setVanBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'Cancelled' } : b));
    await updateBookingStatus(bookingId, 'van', 'Cancelled');

    // Restore capacity
    const trip = trips.find(t => t.id === booking.tripId);
    if (trip && (booking.status === 'Pending' || booking.status === 'Confirmed')) {
      const seatsToRestore = Number(booking.seats || 1);
      const updatedTrip = { ...trip, available: Math.min(trip.capacity, trip.available + seatsToRestore) };
      setTrips(prev => prev.map(t => t.id === trip.id ? updatedTrip : t));
      await persistTrip(updatedTrip);
    }

    setToastMessage("❌ Booking has been cancelled.");
    setTimeout(() => setToastMessage(null), 3000);
    setConfirmingCancelId(null);
  };

  const filteredBookings = vanBookings.filter(b => {
    const trip = trips.find(t => t.id === b.tripId);
    const tripRouteStr = trip ? trip.route : '';
    return (b.name || '').toLowerCase().includes(searchPassenger.toLowerCase()) || 
           (tripRouteStr || '').toLowerCase().includes(searchPassenger.toLowerCase());
  });

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerGroupRef = useRef<any>(null);
  const [showUserLoc, setShowUserLoc] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const userMarkerRef = useRef<any>(null);
  const userCircleRef = useRef<any>(null);

  useEffect(() => {
    if (activeTab !== 'map' || !mapRef.current) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    const L = (window as any).L;
    if (!L) return;

    if (showUserLoc) {
      setIsLocating(true);
      watchIdRef.current = navigator.geolocation.watchPosition((p) => {
        const { latitude: lat, longitude: lng, accuracy } = p.coords;
        setUserPos({ lat, lng, accuracy });
        setIsLocating(false);
        if (!mapRef.current) return;
        if (!userCircleRef.current) {
          userCircleRef.current = L.circle([lat, lng], { radius: accuracy, color: '#3B82F6', weight: 1, fillOpacity: 0.1 }).addTo(mapRef.current);
        } else {
          userCircleRef.current.setLatLng([lat, lng]).setRadius(accuracy);
        }
        if (!userMarkerRef.current) {
          userMarkerRef.current = L.marker([lat, lng], { icon: L.divIcon({ className: 'u-loc', html: '<div class="w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-lg animate-pulse"></div>' }) }).addTo(mapRef.current);
        } else {
          userMarkerRef.current.setLatLng([lat, lng]);
        }
      }, () => setIsLocating(false), { enableHighAccuracy: true });
    } else {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (userMarkerRef.current) mapRef.current.removeLayer(userMarkerRef.current);
      if (userCircleRef.current) mapRef.current.removeLayer(userCircleRef.current);
      userMarkerRef.current = null; userCircleRef.current = null;
    }
  }, [showUserLoc, activeTab]);

  useEffect(() => {
    if (activeTab !== 'map' || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([13.2167, 120.5833], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);
      markerGroupRef.current = L.layerGroup().addTo(mapRef.current);
    }
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'map' || !markerGroupRef.current) return;
    const L = (window as any).L;
    markerGroupRef.current.clearLayers();
    trips.filter(t => t.status === 'Boarding' || t.status === 'Departed').forEach(t => {
      const pos = getTripLocation(t.id, t.route);
      L.marker(pos, { icon: L.divIcon({ html: '<div class="w-4 h-4 bg-orange-600 rounded-full border-2 border-white shadow-xl"></div>' }) })
        .bindPopup(`<b>${t.driver}</b><br>${t.route}`)
        .addTo(markerGroupRef.current);
    });
  }, [activeTab, trips, gpsIndices]);

  return (
    <div className="panel-page p-6 space-y-8 animate-fade-in text-slate-800">
      <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-150 shadow-sm">
        <div className="p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="bg-[#FF8800] text-white p-1.5 rounded-lg flex items-center justify-center font-bold text-[10px] uppercase tracking-wider">OCCI-MIN</div>
              <span className="bg-[#003087] text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full">Mamburao Grand Terminal</span>
              {isSuperAdmin && <span className="bg-[#FF8800] text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full">System Admin</span>}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#003087] tracking-tighter uppercase">MAMBURAO</span>
              <span className="text-2xl font-serif italic text-[#FF8800] font-extrabold tracking-tight">Hub</span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm font-semibold mt-1">Unified Occidental Mindoro Land-Transit Center</p>
          </div>
          <div className="w-full md:w-auto shrink-0">
            <WeatherWidget weatherData={mamburaoWeather} title="Mamburao Station Weather" lastUpdated={mamburaoWeather ? formatPST(mamburaoWeather.lastUpdated) : ''} isOnline={isOnline} />
          </div>
        </div>
        <div className="bg-[#FF8800] px-6 py-2.5 flex justify-between items-center text-white/90 text-xs font-semibold"><span>Public Utility Vehicle Tracking Active</span><p className="text-[10px] uppercase font-bold tracking-widest text-[#003087]">"Ligtas at Mabilis na Sakay"</p></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Active Trips', val: activeTripsCount, color: '#003087' },
          { label: 'Booked Passengers', val: totalBookingsCount, color: '#009E49' },
          { label: 'Awaiting Confirm', val: pendingBookingsCount, color: '#FF8800' }
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{s.label}</p>
            <p className="text-3xl font-black mt-2" style={{ color: s.color }}>{s.val}</p>
          </div>
        ))}
      </div>

      <PriceAdjustmentRequest />

      <div className="flex border-b border-slate-200">
        {['manager', 'sync', 'map'].map((t: any) => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-6 py-3 font-black text-xs uppercase tracking-wider -mb-[1px] border-b-2 transition-all capitalize ${activeTab === t ? 'border-[#FF8800] text-[#FF8800]' : 'border-transparent text-slate-400'}`}>{t}</button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'manager' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
              <h2 className="text-lg font-black text-slate-800 tracking-tight">Terminal Shuttle Board</h2>
              <div className="overflow-x-auto text-sm">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b text-[10px] font-black uppercase text-slate-400 font-sans"><th className="py-3">Driver</th><th className="py-3">Route</th><th className="py-3 text-center">Status</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    <AnimatePresence mode="popLayout">
                    {trips.map(t => (
                      <motion.tr 
                        key={t.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <td className="py-3.5"><div className="font-extrabold">{t.driver}</div><span className="text-[9px] uppercase font-black text-slate-400">{t.type}</span></td>
                        <td className="py-3.5 font-bold text-slate-600">{t.route}</td>
                        <td className="py-3.5 text-center">
                          <motion.div
                            key={`${t.id}-${t.status}`}
                            initial={{ opacity: 0.5, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <select value={t.status} onChange={e => localUpdateTripStatus(t.id, e.target.value as any)} className="bg-slate-100 border rounded-xl text-[10px] font-black px-3 py-1 cursor-pointer">
                              {TRIP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </motion.div>
                        </td>
                      </motion.tr>
                    ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
            {isSuperAdmin ? (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h2 className="text-lg font-black text-[#003087] border-b pb-3">Dispatch Vehicle</h2>
                <form onSubmit={handleAddTrip} className="space-y-4 mt-4">
                  <div><label className="text-[10px] font-black uppercase text-slate-400">Route</label><select value={tripRoute} onChange={e => setTripRoute(e.target.value)} className="w-full border rounded-2xl p-2 text-sm">{ROUTES_12.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                  <div><label className="text-[10px] font-black uppercase text-slate-400">Driver</label><input type="text" required value={driverName} onChange={e => setDriverName(e.target.value)} className="w-full border rounded-2xl p-2 text-sm" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[10px] font-black uppercase text-slate-400">Type</label><select value={vehicleType} onChange={e => setVehicleType(e.target.value)} className="w-full border rounded-2xl p-2 text-sm"><option value="Van">Van</option><option value="Bus">Bus</option></select></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-400">Time</label><input type="datetime-local" required value={depDateTime} onChange={e => setDepDateTime(e.target.value)} className="w-full border rounded-2xl p-2 text-xs" /></div>
                  </div>
                  <button type="submit" className="w-full bg-[#FF8800] text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg border-b-4 border-orange-800">Dispatch Trip</button>
                </form>
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center opacity-60">
                <i className="fa-solid fa-lock text-slate-400 text-3xl mb-4"></i>
                <h3 className="font-black text-slate-500 uppercase">Control Locked</h3>
              </div>
            )}
          </motion.div>
        )}
        {activeTab === 'sync' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-black text-[#003087] mb-4">Montenegro Vessels Mirror</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ships.map(s => (
                <div key={s.id} className="p-4 border rounded-2xl bg-slate-50 flex justify-between items-center">
                  <div><p className="font-black text-slate-800">{s.name}</p><p className="text-[10px] font-bold text-slate-400">{s.route}</p></div>
                  <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full uppercase">{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'map' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border">
               <label className="flex items-center gap-2 cursor-pointer font-black text-xs uppercase tracking-tight"><input type="checkbox" checked={showUserLoc} onChange={e => setShowUserLoc(e.target.checked)} className="w-4 h-4" /> Live Tracking (GPS)</label>
               {isLocating && <span className="text-[10px] font-bold animate-pulse">Acquiring position...</span>}
            </div>
            <div ref={mapContainerRef} className="w-full h-[450px] rounded-2xl border" />
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'manager' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-lg font-black text-slate-800">Booking Boarding List</h2>
          <div className="overflow-x-auto text-sm font-sans">
            <table className="w-full text-left">
              <thead><tr className="border-b text-[9px] uppercase font-black text-slate-400"><th>Passenger</th><th>Status</th><th>Seats</th><th className="text-right">Action</th></tr></thead>
              <tbody className="divide-y">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12">
                      <div className="flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                        <i className="fa-solid fa-clipboard-list text-4xl text-slate-300"></i>
                        <div>
                          <p className="text-slate-500 font-bold">No bookings found</p>
                          <p className="text-xs text-slate-400">Terminal bookings will appear here.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : filteredBookings.map(b => {
                  const acc = userAccounts.find(a => a.id === (b as any).accountId);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          {acc?.selfieUrl && (
                            <img src={acc?.selfieUrl} className="w-8 h-8 rounded-full border object-cover" alt="S" referrerPolicy="no-referrer" />
                          )}
                          <div>
                            <div className="font-bold flex items-center gap-1.5">
                              {b.name}
                              {acc && <i className="fa-solid fa-circle-check text-emerald-500 text-[10px]"></i>}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{b.contact}</span>
                          </div>
                        </div>
                      </td>
                    <td className="py-3"><span className={`text-[9px] font-black px-2 py-1 rounded-full ${b.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{b.status}</span></td>
                    <td className="py-3 font-black">{b.seats}</td>
                    <td className="py-3 text-right">
                      {b.status === 'Pending' && <button onClick={() => handleConfirmBooking(b)} className="bg-emerald-600 text-white text-[9px] font-black px-3 py-1 rounded-lg uppercase">Confirm</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Advanced Pricing & Scheduling Management */}
      <TripManagement />

    </div>
  );
};
