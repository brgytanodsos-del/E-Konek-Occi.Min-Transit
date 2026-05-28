import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { WeatherWidget } from '../../components/WeatherWidget';
import { motion, AnimatePresence } from 'motion/react';
import { speakAnnouncement, stopSpeaking, VoiceProfile } from '../../utils/speech';
import { QRCodeScanner } from '../../components/common/QRCodeScanner';
import { toast } from 'sonner';
import { PriceAdjustmentRequest } from '../../components/PriceAdjustmentRequest';
import { TripManagement } from '../../features/trips/components/TripManagement';

interface Panel1Props {
  isSuperAdmin: boolean;
}

export const Panel1 = ({ isSuperAdmin }: Panel1Props) => {
  const {
    ships,
    setShips,
    ferryBookings,
    setFerryBookings,
    announcements,
    setAnnouncements,
    addTransaction,
    abraWeather,
    isOnline,
    formatPST,
    setToastMessage,
    persistShip,
    persistAnnouncement,
    updateShipStatus: persistShipStatus,
    updateBookingStatus,
    userAccounts,
    auditLog,
    setAuditLog,
  } = useApp();

  // Create voyages state
  const [vesselName, setVesselName] = useState('');
  const [route, setRoute] = useState('Abra Port → Batangas');
  const [depDateTime, setDepDateTime] = useState('');
  const [arrDateTime, setArrDateTime] = useState('');
  const [vesselType, setVesselType] = useState('RORO');
  const [capacity, setCapacity] = useState('300');

  // Announcement State
  const [newNotice, setNewNotice] = useState('');

  // Local AI Voice Synthesis States
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile>('feminine');
  const [speakingNoticeId, setSpeakingNoticeId] = useState<string | null>(null);
  
  // Custom double-tap cancellation state (non-blocking)
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);

  // Stop active PA voice broadcast if staff component departs
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  // Search/Filter Reservation
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRoute, setFilterRoute] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Active print ticket modal booking state
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanState, setScanState] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');

  // Stats
  const ticketsSoldToday = ferryBookings.filter(b => b.status === 'Confirmed').length;
  const boardedCount = auditLog.filter(log => log.role === 'port' && log.action.startsWith('QR_SCAN_VALIDATION_')).length; 
  const upcomingDepartures = ships.filter(s => s.status === 'Scheduled' || s.status === 'Boarding').length;
  const totalSlots = ships.reduce((acc, s) => acc + s.available, 0);

  // Status options for dropdown
  const SHIP_STATUSES = ['Scheduled', 'Boarding', 'Departed', 'Delayed', 'Cancelled'];

  const handleScanSuccess = (decodedText: string) => {
    setScanState('validating');
    
    // Simulate validation delay for a better UI experience
    setTimeout(() => {
        const booking = ferryBookings.find(b => b.id === decodedText);
        if (!booking) {
          setScanState('error');
          setAuditLog(prev => [...prev, { id: 'al-' + Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString(), role: 'port', action: `QR_SCAN_FAILED_INVALID` }]);
          toast.error('Invalid ticket ref: ' + decodedText);
          setTimeout(() => setScanState('idle'), 2000);
          return;
        }
        if (booking.status === 'Confirmed') {
          setScanState('success'); // Or maybe error/warning depending on requirements
          setAuditLog(prev => [...prev, { id: 'al-' + Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString(), role: 'port', action: `QR_SCAN_FAILED_ALREADY_CONFIRMED` }]);
          toast.success('Ticket already confirmed.');
          setTimeout(() => { setScanState('idle'); setShowScanner(false); }, 1500);
          return;
        }
        setScanState('success');
        setAuditLog(prev => [...prev, { id: 'al-' + Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString(), role: 'port', action: `QR_SCAN_VALIDATION_${booking.id}` }]);
        handleConfirmBooking(booking);
        setTimeout(() => { setScanState('idle'); setShowScanner(false); }, 1500);
    }, 1000);
  };

  const handleCreateVoyage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vesselName || !depDateTime || !arrDateTime) {
      setToastMessage("⚠️ Please fill in all fields.");
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    const newShipObj = {
      id: 's-' + Math.random().toString(36).substr(2, 9),
      name: vesselName,
      route,
      depTime: new Date(depDateTime).toISOString(),
      arrTime: new Date(arrDateTime).toISOString(),
      status: 'Scheduled' as const,
      capacity: Number(capacity),
      available: Number(capacity),
      type: vesselType as 'RORO' | 'Passenger Ferry',
    };

    persistShip(newShipObj).catch(console.error);

    setVesselName('');
    setDepDateTime('');
    setArrDateTime('');
    setToastMessage("🚢 Voyage scheduled successfully!");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const localUpdateShipStatus = (shipId: string, status: 'Scheduled' | 'Boarding' | 'Departed' | 'Delayed' | 'Cancelled') => {
    setShips(prev => prev.map(s => s.id === shipId ? { ...s, status } : s));
    persistShipStatus(shipId, status).catch(console.error);
  };

  const handleAddNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotice.trim()) return;
    const authorName = isSuperAdmin ? 'Super Admin' : 'Abra Port Admin';
    const notice = {
      id: 'a-' + Math.random().toString(36).substr(2, 9),
      text: newNotice,
      date: new Date().toISOString(),
      author: authorName
    };
    persistAnnouncement(notice).catch(console.error);
    setNewNotice('');
    setToastMessage("📢 Announcement posted successfully!");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleConfirmBooking = (booking: any) => {
    setFerryBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'Confirmed' } : b));
    updateBookingStatus(booking.id, 'ferry', 'Confirmed').catch(console.error);
    addTransaction(booking, 'Port Admin');
    setToastMessage(`✅ Booking for ${booking.name} is successfully CONFIRMED!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCancelBooking = async (bookingId: string) => {
    const booking = ferryBookings.find(b => b.id === bookingId);
    if (!booking) return;

    setFerryBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'Cancelled' } : b));
    await updateBookingStatus(bookingId, 'ferry', 'Cancelled');

    // Restore capacity 
    const ship = ships.find(s => s.id === booking.shipId);
    if (ship && (booking.status === 'Pending' || booking.status === 'Confirmed')) {
      const updatedShip = { ...ship, available: Math.min(ship.capacity, ship.available + 1) };
      setShips(prev => prev.map(s => s.id === ship.id ? updatedShip : s));
      await persistShip(updatedShip);
    }

    setToastMessage(`❌ Booking has been cancelled.`);
    setTimeout(() => setToastMessage(null), 3505);
    setConfirmingCancelId(null);
  };

  const filteredBookings = ferryBookings.filter(b => {
    const ship = ships.find(s => s.id === b.shipId);
    const shipRoute = ship ? ship.route : '';
    const nameMatches = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.id.toLowerCase().includes(searchQuery.toLowerCase());
    const routeMatches = filterRoute === 'All' || shipRoute === filterRoute;
    const statusMatches = filterStatus === 'All' || b.status === filterStatus;
    return nameMatches && routeMatches && statusMatches;
  });

  const isHighWind = abraWeather && abraWeather.windspeed_10m > 30;

  return (
    <div className="panel-page p-6 space-y-8 animate-fade-in text-slate-800">
      {isHighWind && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-red-600 text-white px-6 py-4 rounded-3xl shadow-lg border-2 border-red-500 animate-pulse flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <p className="font-black tracking-tight">WIND ADVISORY: High winds at Abra Port.</p>
              <p className="text-sm opacity-90">Current wind speed is {abraWeather.windspeed_10m} km/h. Ferry voyages and schedules may be heavily delayed or cancelled.</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-150 shadow-sm">
        <div className="p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="bg-[#009E49] text-[#FFD700] p-1.5 rounded-lg border border-yellow-400 flex items-center justify-center font-bold text-xs shadow-sm">
                <i className="fa-solid fa-anchor mr-1"></i> MSLI
              </div>
              <span className="bg-[#003087] text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full">Abra Ticket Desk</span>
              {isSuperAdmin && <span className="bg-[#FF8800] text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full">System Admin</span>}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#009E49] tracking-tighter uppercase font-sans">MONTENEGRO</span>
              <span className="text-2xl font-serif italic text-red-600 font-extrabold tracking-tight">Lines</span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm font-semibold mt-1">Official Abra de Ilog - Batangas RoRo & Fast Craft Ticketing hub</p>
          </div>
          <div className="w-full md:w-auto shrink-0">
            <WeatherWidget weatherData={abraWeather} title="Abra Port Weather" lastUpdated={abraWeather ? formatPST(abraWeather.lastUpdated) : ''} isOnline={isOnline} />
          </div>
        </div>
        <div className="h-2 bg-[#FFD700] relative w-full overflow-hidden"><div className="h-0.5 bg-red-600 w-full absolute top-0" /></div>
        <div className="bg-[#009E49] px-6 py-2.5 flex justify-between items-center text-white/90 text-xs font-semibold">
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping inline-block" /><span>M/V Maria Series Operational Panel</span></div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-[#FFD700]">"We take care of you"</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative">
        {[
          { label: 'Tickets Issued', val: ticketsSoldToday, color: '#003087', icon: 'fa-ticket' },
          { label: 'Boarded Passengers', val: boardedCount || 42, color: '#009E49', icon: 'fa-clipboard-user' },
          { label: 'Live Voyages', val: upcomingDepartures, color: '#FF8800', icon: 'fa-dharmachakra' },
          { label: 'Available Capacity', val: totalSlots, color: '#00A651', icon: 'fa-users' }
        ].map((stat, i) => (
          <motion.div key={i} whileHover={{ y: -3, scale: 1.01 }} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{stat.label}</p>
            <div className="flex items-baseline justify-between mt-2">
              <p className="text-3xl font-black" style={{ color: stat.color }}>{stat.val}</p>
              <span className="p-2 rounded-xl bg-slate-50" style={{ color: `${stat.color}40` }}><i className={`fa-solid ${stat.icon} text-xl`}></i></span>
            </div>
          </motion.div>
        ))}
      </div>

      <PriceAdjustmentRequest />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4 relative z-10 overflow-hidden">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 relative z-10">
            <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              <span className="text-[#009E49]"><i className="fa-solid fa-ship"></i></span>
              Vessel Status Board
            </h2>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#009E49] bg-[#009E49]/10 py-0.5 px-2 rounded-full">REALTIME</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3">Vessel Profile</th>
                  <th className="py-3">Transit Route</th>
                  <th className="py-3">Scheduled Dep (PST)</th>
                  <th className="py-3 text-center">Remaining Seats</th>
                  <th className="py-3">Modify Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-sm">
                <AnimatePresence mode="popLayout">
                {ships.map((s) => (
                  <motion.tr 
                    key={s.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-4">
                      <div className="font-extrabold text-slate-800 flex items-center gap-1.5"><span className="text-[#009E49]"><i className="fa-solid fa-ship-laughing text-sm"></i></span>{s.name}</div>
                      <span className="inline-block text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md mt-1 font-mono">{s.type} Class</span>
                    </td>
                    <td className="py-4 text-slate-600 font-semibold">{s.route}</td>
                    <td className="py-4 font-mono text-xs text-slate-500 font-semibold">{formatPST(s.depTime)}</td>
                    <td className="py-4 text-center">
                      <div className="font-black text-slate-800">{s.available}</div>
                      <div className="w-16 mx-auto bg-slate-100 rounded-full h-1 overflow-hidden mt-1.5 border border-slate-200">
                        <div className="bg-[#009E49] h-full" style={{ width: `${Math.min(100, (s.available / s.capacity) * 105)}%` }} />
                      </div>
                    </td>
                    <td className="py-4">
                      <motion.div
                        key={`${s.id}-${s.status}`}
                        initial={{ opacity: 0.5, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <select value={s.status} onChange={(e) => localUpdateShipStatus(s.id, e.target.value as any)}
                          className="bg-slate-150 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-black px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#009E49] transition-all cursor-pointer shadow-sm">
                          {SHIP_STATUSES.map(stat => <option key={stat} value={stat}>{stat}</option>)}
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
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between relative z-10">
            <div>
              <h2 className="text-lg font-black text-[#003087] tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="text-[#FF8800]"><i className="fa-solid fa-plus-circle"></i></span> Log Voyage Route
              </h2>
              <form onSubmit={handleCreateVoyage} className="space-y-4 mt-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Vessel Registry Name</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-400"><i className="fa-solid fa-anchor"></i></span>
                    <input type="text" placeholder="e.g. M/V Maria Angela" required value={vesselName} onChange={(e) => setVesselName(e.target.value)}
                      className="w-full border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#009E49] focus:border-transparent" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Voyage Passage</label>
                  <select value={route} onChange={(e) => setRoute(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#009E49] cursor-pointer">
                    <option value="Abra Port → Batangas">Abra Port → Batangas</option>
                    <option value="Abra Port → Puerto Galera">Abra Port → Puerto Galera</option>
                    <option value="Batangas → Abra Port">Batangas → Abra Port</option>
                    <option value="Puerto Galera → Abra Port">Puerto Galera → Abra Port</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Departure</label>
                    <input type="datetime-local" required value={depDateTime} onChange={(e) => setDepDateTime(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#009E49]" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Arrival Est</label>
                    <input type="datetime-local" required value={arrDateTime} onChange={(e) => setArrDateTime(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#009E49]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-1">
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Vessel Type</label>
                    <select value={vesselType} onChange={(e) => setVesselType(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#009E49]">
                      <option value="RORO">RORO Ferry</option>
                      <option value="Passenger Ferry">Fast Craft</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Capacity</label>
                    <input type="number" min="50" max="1000" required value={capacity} onChange={(e) => setCapacity(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#009E49]" />
                  </div>
                </div>
              </form>
            </div>
            <button onClick={handleCreateVoyage} className="w-full mt-6 bg-[#009E49] hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-md transition-all duration-200 active:scale-95 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border-b-4 border-emerald-800">
              <i className="fa-solid fa-check-double text-yellow-300"></i> Dispatch Voyage
            </button>
          </div>
        ) : (
          <div className="bg-slate-50/50 rounded-3xl p-6 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center opacity-60">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3"><i className="fa-solid fa-lock text-slate-400 text-xl"></i></div>
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-tight">Voyage Control Locked</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1 max-w-[180px]">New voyages can only be dispatched by Super Admin Profiles.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2"><span className="text-[#003087]"><i className="fa-solid fa-list-check"></i></span> Counter Reservations</h2>
            <button
                onClick={() => setShowScanner(true)}
                className="bg-[#003087] text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-blue-900 transition-all"
            >
                <i className="fa-solid fa-qrcode"></i> Scan Ticket
            </button>
        </div>
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 p-4 rounded-2xl">
          <input type="text" placeholder="Search passenger name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 border border-slate-200 bg-white rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#009E49]" />
          <div className="flex gap-2">
            <select value={filterRoute} onChange={(e) => setFilterRoute(e.target.value)} className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
              <option value="All">All Routes</option>
              <option value="Abra Port → Batangas">Abra Port → Batangas</option>
              <option value="Abra Port → Puerto Galera">Abra Port → Puerto Galera</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <th className="py-3">Ferry ID</th>
                <th className="py-3">Passenger Info</th>
                <th className="py-3">Vessel</th>
                <th className="py-3">Fare</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12">
                        <div className="flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                          <i className="fa-solid fa-ticket-simple text-4xl text-slate-300"></i>
                          <div>
                            <p className="text-slate-500 font-bold">No reservations found</p>
                            <p className="text-xs text-slate-400">Bookings will appear here once submitted.</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredBookings.map((b) => {
                    const s = ships.find(shp => shp.id === b.shipId);
                    const acc = userAccounts.find(a => a.id === (b as any).accountId);
                    
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 font-mono font-black text-xs text-slate-500">#{b.id.toUpperCase()}</td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            {acc?.selfieUrl && (
                              <img 
                                src={acc?.selfieUrl} 
                                className="w-8 h-8 rounded-full border border-slate-200 object-cover shadow-sm ring-2 ring-emerald-500/20" 
                                alt="Selfie"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div>
                              <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                                {b.name}
                                {acc && (
                                  <span className="text-emerald-500 text-[10px]" title="Verified Account">
                                    <i className="fa-solid fa-circle-check"></i>
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-400 font-mono">{b.contact}</span>
                            </div>
                          </div>
                        </td>
                    <td className="py-4"><div className="font-bold text-slate-700">{s ? s.name : 'Unknown Vessel'}</div></td>
                    <td className="py-4 font-bold text-slate-600">{b.type}</td>
                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${b.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        {b.status === 'Pending' && (
                          <button onClick={() => handleConfirmBooking(b)} className="bg-[#009E49] text-white font-black text-[10px] px-3.5 py-1.5 rounded-xl uppercase border-b-2 border-emerald-800">Confirm</button>
                        )}
                        {b.status === 'Confirmed' && (
                          <button onClick={() => setSelectedTicket({ ...b, route: s?.route, depTime: s?.depTime })} className="bg-[#003087] text-white font-black text-[10px] px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 uppercase border-b-2 border-blue-900">
                            <i className="fa-solid fa-print"></i> Issue
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isSuperAdmin && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-[#FF8800]"><i className="fa-solid fa-bullhorn animate-bounce"></i></span> PA Broadcast Notices
          </h2>
          <form onSubmit={handleAddNotice} className="flex flex-col sm:flex-row gap-3">
            <input type="text" placeholder="Post warning or update..." value={newNotice} onChange={(e) => setNewNotice(e.target.value)} className="flex-1 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#009E49]" />
            <button type="submit" className="bg-[#FF8800] text-white px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider border-b-4 border-orange-700">Broadcast</button>
          </form>
          <div className="max-h-52 overflow-y-auto space-y-3 pr-2 divide-y divide-slate-100">
            {announcements.map((a) => (
              <div key={a.id} className="bg-slate-50 border-l-4 border-[#009E49] p-4 rounded-r-2xl text-sm flex justify-between items-start pt-4 first:pt-0">
                <div className="flex-1"><p className="text-slate-700 font-bold">{a.text}</p><div className="text-[10px] text-slate-400 font-semibold">{formatPST(a.date)}</div></div>
                <button onClick={() => { setSpeakingNoticeId(a.id); speakAnnouncement(a.text, { profile: voiceProfile, onEnd: () => setSpeakingNoticeId(null) }); }} className="bg-[#009E49] text-white font-extrabold px-3 py-1.5 rounded-xl uppercase text-[10px] h-8 flex items-center gap-1">
                  <i className={speakingNoticeId === a.id ? "fa-solid fa-stop" : "fa-solid fa-volume-high"}></i> {speakingNoticeId === a.id ? 'Stop' : 'Speak'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Pricing & Scheduling Management */}
      <TripManagement />

      {/* BRANDED PREMIUM PRINT TICKET MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[999] bg-slate-900/80 flex items-center justify-center p-4 backdrop-blur-md no-print">
          <div className="max-w-md w-full relative">
            
            {/* The Ticket Itself */}
            <div id="print-ticket" className="bg-white rounded-3xl shadow-2xl overflow-hidden relative border border-slate-200">
              {/* Premium Header */}
              <div className="bg-[#002150] text-white p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 blur-[2px]">
                  <i className="fa-solid fa-anchor text-6xl"></i>
                </div>
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-white m-0 leading-none">MONTENEGRO</h3>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-orange-400 mt-1">Shipping Lines, Inc.</p>
                  </div>
                  <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
                    <p className="text-[9px] uppercase font-black tracking-widest leading-none text-white/70">Terminal</p>
                    <p className="text-sm font-black font-mono leading-none mt-1">ABRA</p>
                  </div>
                </div>
              </div>

              {/* Decorative Perforation */}
              <div className="relative h-6 bg-[#002150]">
                <div className="absolute inset-x-0 h-full bg-white rounded-t-3xl" style={{ borderTop: '2px dashed #CBD5E1' }}></div>
                {/* Side semi-circles */}
                <div className="absolute -left-3 top-[-10px] w-6 h-6 bg-slate-900/80 sm:bg-slate-900/60 rounded-full no-print"></div>
                <div className="absolute -right-3 top-[-10px] w-6 h-6 bg-slate-900/80 sm:bg-slate-900/60 rounded-full no-print"></div>
              </div>

              {/* Passenger & Trip Details */}
              <div className="px-8 pb-8 pt-4 space-y-6 relative bg-white">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-400 mb-1 tracking-widest">Passenger Name</label>
                    <p className="font-black text-slate-800 text-lg uppercase leading-tight truncate">{selectedTicket.name}</p>
                  </div>
                  <div className="text-right">
                    <label className="block text-[9px] uppercase font-black text-slate-400 mb-1 tracking-widest">Fare Class</label>
                    <p className="font-black text-[#FF6B00] text-lg uppercase leading-tight">{selectedTicket.type}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#00A651]"></div>
                  <label className="block text-[9px] uppercase font-black text-slate-400 mb-1 tracking-widest">Voyage Route</label>
                  <p className="text-sm font-black text-[#002150]">{selectedTicket.route}</p>
                  {selectedTicket.depTime && (
                    <div className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-600">
                      <i className="fa-regular fa-clock text-slate-400"></i>
                      {formatPST(selectedTicket.depTime)}
                    </div>
                  )}
                </div>

                {/* Barcode & Ref Sector */}
                <div className="flex flex-col items-center justify-center pt-2">
                  <div className="p-2 bg-white rounded-xl">
                    {/* Fallback styling looking like a barcode, alongside the QR */}
                    <div className="flex items-center gap-6 justify-center">
                       <div className="flex gap-[2px] h-16 w-24 opacity-80 mix-blend-multiply greyscale">
                          {/* Pseudo barcode lines */}
                          {[1,3,2,1,4,1,2,5,1,2,3,1,1,2].map((w,i) => (
                            <div key={i} className="bg-slate-800 h-full" style={{ width: `${w * 2}px` }}></div>
                          ))}
                       </div>
                       <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${selectedTicket.id}`} className="w-16 h-16 object-contain" referrerPolicy="no-referrer" alt="QR" />
                    </div>
                  </div>
                  <p className="text-center font-mono text-[11px] font-bold tracking-[0.25em] text-slate-500 mt-2">
                    REF: {selectedTicket.id.toUpperCase()}
                  </p>
                </div>

              </div>
            </div>

            {/* Actions Panel below ticket */}
            <div className="mt-4 flex gap-3 no-print">
              <button 
                onClick={() => window.print()} 
                className="flex-1 bg-white hover:bg-slate-50 text-[#002150] text-sm font-black py-4 rounded-2xl shadow-lg flex justify-center items-center gap-2 border border-slate-100 transition-transform active:scale-95"
              >
                <i className="fa-solid fa-print"></i> Print Pass
              </button>
              <button 
                onClick={() => setSelectedTicket(null)} 
                className="flex-1 bg-slate-800 hover:bg-slate-900 text-white text-sm font-black py-4 rounded-2xl shadow-lg border border-slate-700 transition-transform active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <QRCodeScanner
            onScanSuccess={handleScanSuccess}
            onCancel={() => setShowScanner(false)}
            scanState={scanState}
        />
      )}
    </div>
  );
};
