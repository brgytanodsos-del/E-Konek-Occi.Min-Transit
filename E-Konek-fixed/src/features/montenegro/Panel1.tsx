import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { WeatherWidget } from '../../components/WeatherWidget';
import { motion, AnimatePresence } from 'motion/react';
import { speakAnnouncement, stopSpeaking, VoiceProfile } from '../../utils/speech';

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
    persistShip,
    persistAnnouncement,
    updateBookingStatus,
    updateShipStatus: updateShipStatusFS,
    abraWeather,
    isOnline,
    formatPST
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

  // Stats
  const ticketsSoldToday = ferryBookings.filter(b => b.status === 'Confirmed').length;
  const boardedCount = ferryBookings.filter(b => b.status === 'Boarded').length; // simple simulation count
  const upcomingDepartures = ships.filter(s => s.status === 'Scheduled' || s.status === 'Boarding').length;
  const totalSlots = ships.reduce((acc, s) => acc + s.available, 0);

  // Status options for dropdown
  const SHIP_STATUSES = ['Scheduled', 'Boarding', 'Departed', 'Delayed', 'Cancelled'];

  const handleCreateVoyage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vesselName || !depDateTime || !arrDateTime) return alert("Please fill all fields");

    const newShipObj = {
      id: 's-' + Math.random().toString(36).substr(2, 9),
      name: vesselName,
      route,
      depTime: new Date(depDateTime).toISOString(),
      arrTime: new Date(arrDateTime).toISOString(),
      status: 'Scheduled',
      capacity: Number(capacity),
      available: Number(capacity),
      type: vesselType,
    };

    setShips(prev => [...prev, newShipObj]);
    persistShip(newShipObj).catch(console.error);
    setVesselName('');
    setDepDateTime('');
    setArrDateTime('');
  };

  const updateShipStatus = (shipId: string, status: string) => {
    setShips(prev => prev.map(s => s.id === shipId ? { ...s, status } : s));
    updateShipStatusFS(shipId, status).catch(console.error);
  };

  // Add Notice
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
    setAnnouncements(prev => [notice, ...prev]);
    persistAnnouncement(notice).catch(console.error);
    setNewNotice('');
  };

  // Booking actions
  const handleConfirmBooking = (booking: any) => {
    // Update booking state
    setFerryBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'Confirmed' } : b));
    updateBookingStatus('ferryBookings', booking.id, 'Confirmed').catch(console.error);
    
    // Auto generate Transaction Log
    addTransaction(booking, 'Port Admin');

    // Display Toast/Notification
    alert(`Booking for ${booking.name} is successfully CONFIRMED!`);
  };

  const handleCancelBooking = (bookingId: string) => {
    if (confirm("Are you sure you want to cancel this booking?")) {
      setFerryBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'Cancelled' } : b));
      updateBookingStatus('ferryBookings', bookingId, 'Cancelled').catch(console.error);
    }
  };

  // Filter Bookings
  const filteredBookings = ferryBookings.filter(b => {
    const ship = ships.find(s => s.id === b.shipId);
    const shipRoute = ship ? ship.route : '';
    const nameMatches = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.id.toLowerCase().includes(searchQuery.toLowerCase());
    const routeMatches = filterRoute === 'All' || shipRoute === filterRoute;
    const statusMatches = filterStatus === 'All' || b.status === filterStatus;
    return nameMatches && routeMatches && statusMatches;
  });

  // Wind warning
  const isHighWind = abraWeather && abraWeather.windspeed_10m > 30;

  return (
    <div className="p-6 space-y-8 animate-fade-in text-slate-800">
      
      {/* Wind warning alert */}
      {isHighWind && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-600 text-white px-6 py-4 rounded-3xl shadow-lg border-2 border-red-500 animate-pulse flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <p className="font-black tracking-tight">WIND ADVISORY: High winds at Abra Port.</p>
              <p className="text-sm opacity-90">Current wind speed is {abraWeather.windspeed_10m} km/h. Ferry voyages and schedules may be heavily delayed or cancelled.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Corporate Header & Ship Hull Decoration Banner Component */}
      <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-150 shadow-sm">
        {/* UPPER WHITE CABIN & LOGO AREA */}
        <div className="p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {/* MSLI Style Anchor Logo design element */}
              <div className="bg-[#009E49] text-[#FFD700] p-1.5 rounded-lg border border-yellow-400 flex items-center justify-center font-bold text-xs shadow-sm">
                <i className="fa-solid fa-anchor mr-1"></i> MSLI
              </div>
              <span className="bg-[#003087] text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full">
                Abra Ticket Desk
              </span>
              {isSuperAdmin && (
                <span className="bg-[#FF8800] text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full">
                  System Admin
                </span>
              )}
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#009E49] tracking-tighter uppercase font-sans">
                MONTENEGRO
              </span>
              <span className="text-2xl font-serif italic text-red-600 font-extrabold tracking-tight">
                Lines
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm font-semibold mt-1">
              Official Abra de Ilog - Batangas RoRo & Fast Craft Ticketing hub
            </p>
          </div>

          <div className="w-full md:w-auto shrink-0">
            <WeatherWidget
              weatherData={abraWeather}
              title="Abra Port Weather"
              lastUpdated={abraWeather ? formatPST(abraWeather.lastUpdated) : ''}
              isOnline={isOnline}
            />
          </div>
        </div>

        {/* WATERLINE ACCENT STRIPES (Yellow gold + Red fine lines) */}
        <div className="h-2 bg-[#FFD700] relative w-full overflow-hidden">
          <div className="h-0.5 bg-red-600 w-full absolute top-0" />
        </div>

        {/* LOWER DEEP EMERALD HULL COLOR ROW */}
        <div className="bg-[#009E49] px-6 py-2.5 flex justify-between items-center text-white/90 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping inline-block" />
            <span>M/V Maria Series Operational Panel</span>
          </div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-[#FFD700]">
            "We take care of you"
          </p>
        </div>
      </div>

      {/* Quick Stats Grid - Enhanced Montenegro Colors */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          whileHover={{ y: -3, scale: 1.01 }}
          className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between"
        >
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tickets Issued</p>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-3xl font-black text-[#003087]">{ticketsSoldToday}</p>
            <span className="text-[#003087]/20 p-2 rounded-xl bg-slate-50"><i className="fa-solid fa-ticket text-xl"></i></span>
          </div>
        </motion.div>
        
        <motion.div 
          whileHover={{ y: -3, scale: 1.01 }}
          className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between"
        >
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Boarded Passengers</p>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-3xl font-black text-[#009E49]">{boardedCount || 42}</p>
            <span className="text-[#009E49]/20 p-2 rounded-xl bg-slate-50"><i className="fa-solid fa-clipboard-user text-xl"></i></span>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -3, scale: 1.01 }}
          className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between"
        >
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Live Voyages</p>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-3xl font-black text-[#FF8800]">{upcomingDepartures}</p>
            <span className="text-[#FF8800]/20 p-2 rounded-xl bg-slate-50"><i className="fa-solid fa-dharmachakra text-xl"></i></span>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -3, scale: 1.01 }}
          className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between"
        >
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Available Capacity</p>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-3xl font-black text-[#00A651]">{totalSlots}</p>
            <span className="text-[#00A651]/20 p-2 rounded-xl bg-slate-50"><i className="fa-solid fa-users text-xl"></i></span>
          </div>
        </motion.div>
      </div>

      {/* Scheduling & Adding Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Voyage Departure Board */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              <span className="text-[#009E49]"><i className="fa-solid fa-ship"></i></span>
              Montenegro Lines Vessel Status Board
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
                {ships.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4">
                      <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                        <span className="text-[#009E49]"><i className="fa-solid fa-ship-laughing text-sm"></i></span>
                        {s.name}
                      </div>
                      <span className="inline-block text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md mt-1 font-mono">
                        {s.type} Class
                      </span>
                    </td>
                    <td className="py-4 text-slate-600 font-semibold">{s.route}</td>
                    <td className="py-4 font-mono text-xs text-slate-500 font-semibold">{formatPST(s.depTime)}</td>
                    <td className="py-4 text-center">
                      <div className="font-black text-slate-800">{s.available}</div>
                      <div className="w-16 mx-auto bg-slate-100 rounded-full h-1 overflow-hidden mt-1.5 border border-slate-200">
                        <div 
                          className="bg-[#009E49] h-full" 
                          style={{ width: `${Math.min(100, (s.available / s.capacity) * 105)}%` }} 
                        />
                      </div>
                    </td>
                    <td className="py-4">
                      <select
                        value={s.status}
                        onChange={(e) => updateShipStatus(s.id, e.target.value)}
                        className="bg-slate-150 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-black px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#009E49] transition-all cursor-pointer shadow-sm"
                      >
                        {SHIP_STATUSES.map(stat => (
                          <option key={stat} value={stat}>{stat}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Voyage Schedule Form with Montenegro styling */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-black text-[#003087] tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="text-[#FF8800]"><i className="fa-solid fa-plus-circle"></i></span>
              Log Voyage Route
            </h2>
            <form onSubmit={handleCreateVoyage} className="space-y-4 mt-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Vessel Registry Name</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400"><i className="fa-solid fa-anchor"></i></span>
                  <input
                    type="text"
                    placeholder="e.g. M/V Maria Angela"
                    required
                    value={vesselName}
                    onChange={(e) => setVesselName(e.target.value)}
                    className="w-full border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#009E49] focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Voyage Passage</label>
                <select
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#009E49] cursor-pointer"
                >
                  <option value="Abra Port → Batangas">Abra Port → Batangas</option>
                  <option value="Abra Port → Puerto Galera">Abra Port → Puerto Galera</option>
                  <option value="Batangas → Abra Port">Batangas → Abra Port</option>
                  <option value="Puerto Galera → Abra Port">Puerto Galera → Abra Port</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Departure</label>
                  <input
                    type="datetime-local"
                    required
                    value={depDateTime}
                    onChange={(e) => setDepDateTime(e.target.value)}
                    className="w-full border border-slate-200 rounded-2xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#009E49]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Arrival Est</label>
                  <input
                    type="datetime-local"
                    required
                    value={arrDateTime}
                    onChange={(e) => setArrDateTime(e.target.value)}
                    className="w-full border border-slate-200 rounded-2xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#009E49]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Vessel hull type</label>
                  <select
                    value={vesselType}
                    onChange={(e) => setVesselType(e.target.value)}
                    className="w-full border border-slate-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#009E49]"
                  >
                    <option value="RORO">RORO Ferry</option>
                    <option value="Passenger Ferry">Fast Craft</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Hull Capacity</label>
                  <input
                    type="number"
                    min="50"
                    max="1000"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full border border-slate-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#009E49]"
                  />
                </div>
              </div>
            </form>
          </div>

          <button
            onClick={handleCreateVoyage}
            className="w-full mt-6 bg-[#009E49] hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-md transition-all duration-200 hover:shadow-lg active:scale-95 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border-b-4 border-emerald-800"
          >
            <i className="fa-solid fa-check-double text-yellow-300"></i> Dispatch New Voyage
          </button>
        </div>
      </div>

      {/* Online Reservation Management */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
        <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
          <span className="text-[#003087]"><i className="fa-solid fa-list-check"></i></span>
          Counter Reservation & Boarding Management
        </h2>
        
        {/* Filters and Searches */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="w-full md:flex-1 relative">
            <span className="absolute left-4 top-3 text-slate-400"><i className="fa-solid fa-magnifying-glass"></i></span>
            <input
              type="text"
              placeholder="Search by passenger name or reservation REF ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-slate-200 bg-white rounded-2xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#009E49]"
            />
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <select
              value={filterRoute}
              onChange={(e) => setFilterRoute(e.target.value)}
              className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#009E49] cursor-pointer"
            >
              <option value="All">All Routes</option>
              <option value="Abra Port → Batangas">Abra Port → Batangas</option>
              <option value="Abra Port → Puerto Galera">Abra Port → Puerto Galera</option>
              <option value="Batangas → Abra Port">Batangas → Abra Port</option>
              <option value="Puerto Galera → Abra Port">Puerto Galera → Abra Port</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#009E49] cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Reservations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <th className="py-3">Ferry ID</th>
                <th className="py-3">Passenger & Contact Info</th>
                <th className="py-3">Registered Voyage Vessel</th>
                <th className="py-3">Fare Class</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-right">Counter Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold text-sm">No reservations matching query.</td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const s = ships.find(shp => shp.id === b.shipId);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 font-mono font-black text-xs text-slate-500">#{b.id.toUpperCase()}</td>
                      <td className="py-4">
                        <div className="font-extrabold text-slate-800">{b.name}</div>
                        <span className="text-xs text-slate-400 font-mono font-bold">{b.contact}</span>
                      </td>
                      <td className="py-4">
                        <div className="font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="text-slate-400"><i className="fa-solid fa-anchor text-xs"></i></span>
                          {s ? s.name : 'Unknown Vessel'}
                        </div>
                        <span className="text-xs text-slate-500 font-semibold">{s ? s.route : ''}</span>
                      </td>
                      <td className="py-4">
                        <span className="bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {b.type} class
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          b.status === 'Confirmed' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' :
                          b.status === 'Cancelled' ? 'bg-rose-50 border border-rose-200 text-rose-700' :
                          'bg-amber-50 border border-amber-200 text-amber-700 animate-pulse'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {b.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => handleConfirmBooking(b)}
                                className="bg-[#009E49] hover:bg-emerald-700 text-white font-black text-[10px] px-3.5 py-1.5 rounded-xl active:scale-95 transition uppercase tracking-wider cursor-pointer shadow-sm border-b-2 border-emerald-800"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => handleCancelBooking(b.id)}
                                className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 font-black text-[10px] px-3.5 py-1.5 rounded-xl active:scale-95 transition uppercase tracking-wider cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {b.status === 'Confirmed' && (
                            <button
                              onClick={() => setSelectedTicket({ ...b, route: s?.route, depTime: s?.depTime })}
                              className="bg-[#003087] hover:bg-blue-900 text-white font-black text-[10px] px-3.5 py-1.5 rounded-xl active:scale-95 transition flex items-center gap-1.5 uppercase tracking-wider shadow-sm cursor-pointer border-b-2 border-blue-999"
                            >
                              <i className="fa-solid fa-print"></i> Issue Pass
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Announcements Board */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="text-[#FF8800]"><i className="fa-solid fa-bullhorn animate-bounce"></i></span>
            Abra Port PA Board Broadcast Notices
          </h2>
          
          {/* Active profile selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-1.5 rounded-2xl text-[10px] font-bold">
            <span className="text-slate-500 pl-1.5"><i className="fa-solid fa-microphone text-indigo-500"></i> Local AI Voice:</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setVoiceProfile('feminine')}
                className={`px-2 py-1 rounded-lg transition ${
                  voiceProfile === 'feminine'
                    ? 'bg-[#003087] text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                ♀ Female
              </button>
              <button
                type="button"
                onClick={() => setVoiceProfile('masculine')}
                className={`px-2 py-1 rounded-lg transition ${
                  voiceProfile === 'masculine'
                    ? 'bg-[#003087] text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                ♂ Male
              </button>
              <button
                type="button"
                onClick={() => setVoiceProfile('robotic')}
                className={`px-2 py-1 rounded-lg transition ${
                  voiceProfile === 'robotic'
                    ? 'bg-[#003087] text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                🤖 Bot
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleAddNotice} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Post crucial itinerary warnings, vessel dock change alerts, or meteorological updates..."
            value={newNotice}
            onChange={(e) => setNewNotice(e.target.value)}
            className="flex-1 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#009E49]"
          />
          <button
            type="submit"
            className="bg-[#FF8800] hover:bg-[#E07700] text-white px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm border-b-4 border-orange-700"
          >
            Broadcast Notice
          </button>
        </form>
 
        <div className="max-h-52 overflow-y-auto space-y-3 pr-2 scrollbar-thin divide-y divide-slate-100">
          {announcements.map((a, idx) => (
            <motion.div 
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={a.id} 
              className="bg-slate-50 border-l-4 border-[#009E49] p-4 rounded-r-2xl text-sm flex justify-between items-start pt-4 first:pt-0"
            >
              <div className="space-y-1 flex-1">
                <p className="text-slate-700 font-bold leading-relaxed">{a.text}</p>
                <div className="flex gap-3 text-xs text-slate-400 font-semibold pt-1">
                  <span>Author: <strong className="text-slate-600">{a.author}</strong></span>
                  <span>•</span>
                  <span>{formatPST(a.date)}</span>
                </div>
              </div>

              {/* Speaker action */}
              <div className="ml-4 shrink-0 flex items-center gap-1 py-1">
                {speakingNoticeId === a.id ? (
                  <button
                    onClick={() => {
                      stopSpeaking();
                      setSpeakingNoticeId(null);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-3 py-1.5 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-sm animate-pulse text-[10px] uppercase tracking-wider h-10"
                    title="Stop Announcement Speaker"
                  >
                    <i className="fa-solid fa-circle-stop mr-1"></i> Stop
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSpeakingNoticeId(a.id);
                      speakAnnouncement(a.text, {
                        profile: voiceProfile,
                        onEnd: () => setSpeakingNoticeId(null),
                        onError: () => setSpeakingNoticeId(null)
                      });
                    }}
                    className="bg-[#009E49] hover:bg-[#00803B] text-white font-extrabold px-3 py-1.5 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-sm text-[10px] uppercase tracking-wider h-10"
                    title="Broadcast via PA Speaker"
                  >
                    <i className="fa-solid fa-volume-high mr-1"></i> Speak
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* TICKET POPUP / BOARDING PASS MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            
            {/* Boarding Pass header */}
            <div className="bg-[#009E49] text-white p-5 text-center space-y-1 relative">
              <div className="flex items-center justify-center gap-1.5">
                <div className="bg-white/10 text-[#FFD700] p-1 rounded font-bold text-[10px]">
                  <i className="fa-solid fa-anchor"></i> MSLI
                </div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider font-sans">Boarding Pass Ticket</h3>
              </div>
              <p className="text-[10px] font-sans tracking-widest text-[#FFD700] font-black uppercase">MONTENEGRO SHIPPING LINES</p>
              <button
                onClick={() => setSelectedTicket(null)}
                className="absolute top-3 right-4 text-white/85 hover:text-white font-black text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Print Area */}
            <div id="print-ticket" className="p-6 space-y-5 flex-1 bg-white">
              <div className="flex justify-between items-start pb-4 border-b border-dashed border-slate-200">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Passenger Name</p>
                  <p className="text-base font-black text-slate-800 leading-tight">{selectedTicket.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Fare Category</p>
                  <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-50 text-[#009E49] border border-emerald-200 rounded font-mono block mt-1 uppercase tracking-wide">
                    {selectedTicket.type}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-dashed border-slate-200">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Passage Route</p>
                  <p className="text-xs font-extrabold text-[#003087]">{selectedTicket.route}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">PST Dep Time</p>
                  <p className="text-xs text-slate-800 font-mono font-bold">{formatPST(selectedTicket.depTime)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-dashed border-slate-200 font-semibold text-slate-600">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Port Station</p>
                  <p className="text-xs text-slate-800 font-extrabold">Abra de Ilog</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Boarding Gate</p>
                  <p className="text-xs text-[#00a651] font-black">Open Cabin Class</p>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedTicket.id}`}
                  alt="Booking Security QR Code"
                  referrerPolicy="no-referrer"
                  className="w-32 h-32 border border-slate-100 rounded-xl p-2 bg-white shadow-inner"
                />
                <p className="text-[10px] font-mono font-black text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200">#{selectedTicket.id.toUpperCase()}</p>
              </div>

              {/* Footer text for print */}
              <div className="hidden print:block text-center text-[8px] text-slate-400 uppercase tracking-widest leading-loose">
                Thank you for traveling with us!<br />
                Have a safe voyage.
              </div>
            </div>

            {/* Buttons UI only, hidden on print */}
            <div className="p-4 bg-slate-50 border-t flex gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-[#009E49] hover:bg-emerald-700 text-white text-xs font-black py-3.5 rounded-2xl shadow transition-all duration-200 border-b-2 border-emerald-800 cursor-pointer"
              >
                🖨️ Print Boarding Pass
              </button>
              <button
                onClick={() => setSelectedTicket(null)}
                className="bg-slate-250 hover:bg-slate-300 text-slate-700 text-xs font-black py-3.5 px-6 rounded-2xl transition border border-slate-350 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

