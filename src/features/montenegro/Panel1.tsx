import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { WeatherWidget } from '../../components/WeatherWidget';

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
    setVesselName('');
    setDepDateTime('');
    setArrDateTime('');
  };

  const updateShipStatus = (shipId: string, status: string) => {
    setShips(prev => prev.map(s => s.id === shipId ? { ...s, status } : s));
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
    setNewNotice('');
  };

  // Booking actions
  const handleConfirmBooking = (booking: any) => {
    // Update booking state
    setFerryBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'Confirmed' } : b));
    
    // Auto generate Transaction Log
    addTransaction(booking, 'Port Admin');

    // Display Toast/Notification
    alert(`Booking for ${booking.name} is successfully CONFIRMED!`);
  };

  const handleCancelBooking = (bookingId: string) => {
    if (confirm("Are you sure you want to cancel this booking?")) {
      setFerryBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'Cancelled' } : b));
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
    <div className="p-6 space-y-8 animate-fade-in text-[#2D3748]">
      
      {/* Wind warning alert */}
      {isHighWind && (
        <div className="bg-red-600 text-white px-6 py-4 rounded-3xl shadow-lg border-2 border-red-500 animate-pulse flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <p className="font-bold tracking-tight">WIND ADVISORY: High winds at Abra Port.</p>
              <p className="text-sm opacity-90">Current wind speed is {abraWeather.windspeed_10m} km/h. Ferry voyages and schedules may be heavily delayed or cancelled.</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="bg-[#003580] text-white font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded-full">🚢 Port Staff Mode</span>
            {isSuperAdmin && <span className="bg-[#FF6B00] text-white font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded-full">Admin View</span>}
          </div>
          <h1 className="text-3xl font-bold font-sans tracking-tight text-[#003580] mt-1">Abra Port Ticketing Station</h1>
          <p className="text-gray-500 text-sm">Montenegro Shipping Line schedules, reservations, and terminal boarding operations.</p>
        </div>
        
        {/* Simple Weather Info */}
        <div className="w-full sm:w-auto">
          <WeatherWidget
            weatherData={abraWeather}
            title="Abra Port Weather"
            lastUpdated={abraWeather ? formatPST(abraWeather.lastUpdated) : ''}
            isOnline={isOnline}
          />
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <p className="text-sm text-gray-400 font-medium">Tickets Sold Today</p>
          <p className="text-3xl font-bold text-[#003580] mt-1">{ticketsSoldToday}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <p className="text-sm text-gray-400 font-medium font-sans">Passengers Boarded</p>
          <p className="text-3xl font-bold text-[#00A651] mt-1">{boardedCount || 42}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <p className="text-sm text-gray-400 font-medium">Upcoming departures</p>
          <p className="text-3xl font-bold text-[#FF6B00] mt-1">{upcomingDepartures}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <p className="text-sm text-gray-400 font-medium">Available slots</p>
          <p className="text-3xl font-bold text-teal-600 mt-1">{totalSlots}</p>
        </div>
      </div>

      {/* Bottom Grid for Scheduling & Creating */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Voyage Departure Board */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-[#003580] font-sans">🚢 RORO / Ship Departure Board</h2>
            <span className="text-xs text-gray-400 font-mono">Live Sync</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="py-3">Vessel</th>
                  <th className="py-3">Route</th>
                  <th className="py-3">Departure (PST)</th>
                  <th className="py-3 text-center">Seats Rem.</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {ships.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition">
                    <td className="py-3.5 font-bold text-gray-800">
                      <div>{s.name}</div>
                      <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-mono">{s.type}</span>
                    </td>
                    <td className="py-3.5 text-gray-600">{s.route}</td>
                    <td className="py-3.5 font-mono text-xs">{formatPST(s.depTime)}</td>
                    <td className="py-3.5 text-center font-bold text-teal-600">{s.available} / {s.capacity}</td>
                    <td className="py-3.5">
                      <select
                        value={s.status}
                        onChange={(e) => updateShipStatus(s.id, e.target.value)}
                        className="bg-gray-100 border border-transparent text-gray-700 rounded-lg text-xs font-semibold px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-[#003580]"
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

        {/* Add Voyage Schedule Form */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-[#003580] mb-4">🆕 Add New Voyage</h2>
          <form onSubmit={handleCreateVoyage} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Vessel Name</label>
              <input
                type="text"
                placeholder="e.g. MV Montenegro Pride"
                required
                value={vesselName}
                onChange={(e) => setVesselName(e.target.value)}
                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003580]"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Route</label>
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003580]"
              >
                <option value="Abra Port → Batangas">Abra Port → Batangas</option>
                <option value="Abra Port → Puerto Galera">Abra Port → Puerto Galera</option>
                <option value="Batangas → Abra Port">Batangas → Abra Port</option>
                <option value="Puerto Galera → Abra Port">Puerto Galera → Abra Port</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Departure</label>
                <input
                  type="datetime-local"
                  required
                  value={depDateTime}
                  onChange={(e) => setDepDateTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-2xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#003580]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Arrival Est</label>
                <input
                  type="datetime-local"
                  required
                  value={arrDateTime}
                  onChange={(e) => setArrDateTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-2xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#003580]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Vessel Type</label>
                <select
                  value={vesselType}
                  onChange={(e) => setVesselType(e.target.value)}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003580]"
                >
                  <option value="RORO">RORO</option>
                  <option value="Passenger Ferry">Passenger Ferry</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Capacity</label>
                <input
                  type="number"
                  min="50"
                  max="1000"
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003580]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#00A651] hover:bg-green-700 text-white font-bold py-3.5 rounded-2xl shadow transition-all duration-200 hover:shadow-lg active:scale-95"
            >
              Add Voyage Schedule
            </button>
          </form>
        </div>
      </div>

      {/* Online Reservation Management */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-xl font-bold text-[#003580]">📋 Online Reservation Management</h2>
        
        {/* Filters and Searches */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <div className="w-full md:flex-1">
            <input
              type="text"
              placeholder="Search by passenger name or reservation REF ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003580]"
            />
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <select
              value={filterRoute}
              onChange={(e) => setFilterRoute(e.target.value)}
              className="border border-gray-200 bg-white rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#003580]"
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
              className="border border-gray-200 bg-white rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#003580]"
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
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                <th className="py-3">Ref ID</th>
                <th className="py-3">Passenger & Contact</th>
                <th className="py-3">Voyage</th>
                <th className="py-3">Ticket Type</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400 text-sm">No reservations found matching search filters.</td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const s = ships.find(shp => shp.id === b.shipId);
                  return (
                    <tr key={b.id} className="hover:bg-gray-50/30">
                      <td className="py-4 font-mono font-bold text-xs text-gray-500">#{b.id.toUpperCase()}</td>
                      <td className="py-4">
                        <div className="font-bold text-gray-800">{b.name}</div>
                        <span className="text-xs text-gray-400 font-mono">{b.contact}</span>
                      </td>
                      <td className="py-4">
                        <div className="font-semibold">{s ? s.name : 'Unknown Vessel'}</div>
                        <span className="text-xs text-gray-400">{s ? s.route : ''}</span>
                      </td>
                      <td className="py-4">
                        <span className="bg-gray-100 text-gray-700 px-2 rounded font-medium text-xs py-0.5">{b.type} Ticket</span>
                      </td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold leading-none ${
                          b.status === 'Confirmed' ? 'bg-green-100 text-green-700' :
                          b.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700 animate-pulse'
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
                                className="bg-[#00A651] hover:bg-green-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg active:scale-95 transition"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => handleCancelBooking(b.id)}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg active:scale-95 transition"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {b.status === 'Confirmed' && (
                            <button
                              onClick={() => setSelectedTicket({ ...b, route: s?.route, depTime: s?.depTime })}
                              className="bg-[#003580] hover:bg-navy text-white font-bold text-xs px-3 py-1.5 rounded-lg active:scale-95 transition flex items-center gap-1.5"
                            >
                              🎫 Issue Ticket
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

      {/* Port Announcements Block */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-xl font-bold text-[#003580]">📢 Live Port Announcements</h2>
        <form onSubmit={handleAddNotice} className="flex gap-3">
          <input
            type="text"
            placeholder="Post a critical schedule change, storm suspension warning, or docking arrival update..."
            value={newNotice}
            onChange={(e) => setNewNotice(e.target.value)}
            className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003580]"
          />
          <button
            type="submit"
            className="bg-[#FF6B00] hover:bg-orange text-white px-6 rounded-2xl font-bold text-sm"
          >
            Broadcast Notice
          </button>
        </form>

        <div className="max-h-52 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
          {announcements.map((a) => (
            <div key={a.id} className="bg-gray-50 border-l-4 border-[#003580] p-4 rounded-r-2xl text-sm flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-gray-700 font-medium">{a.text}</p>
                <div className="flex gap-3 text-xs text-gray-400">
                  <span>Posted by: <strong>{a.author}</strong></span>
                  <span>•</span>
                  <span>{formatPST(a.date)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TICKET POPUP / BOARDING PASS MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-200 flex flex-col">
            
            {/* Boarding Pass header */}
            <div className="bg-[#003580] text-white p-5 text-center space-y-1 relative">
              <h3 className="font-bold text-lg uppercase tracking-wider font-sans">Boarding Pass Ticket</h3>
              <p className="text-xs opacity-85">MONTENEGRO SHIPPING LINES — ABRA PORT</p>
              <button
                onClick={() => setSelectedTicket(null)}
                className="absolute top-4 right-5 text-white/80 hover:text-white font-bold text-2xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Print Area */}
            <div id="print-ticket" className="p-6 space-y-6 flex-1 bg-white">
              <div className="flex justify-between items-start pb-4 border-b border-dashed border-gray-200">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Passenger Name</p>
                  <p className="text-base font-bold text-gray-800">{selectedTicket.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ticket Type</p>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded font-mono block mt-1">{selectedTicket.type}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-dashed border-gray-200">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Route</p>
                  <p className="text-xs font-bold text-gray-800">{selectedTicket.route}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Departure (PST)</p>
                  <p className="text-xs text-gray-800 font-mono font-semibold">{formatPST(selectedTicket.depTime)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-dashed border-gray-200">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Terminal</p>
                  <p className="text-xs text-gray-800 font-medium">Abra de Ilog Port</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Seat Number</p>
                  <p className="text-xs text-gray-800 font-bold">Open Deck (S-Boarding)</p>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedTicket.id}`}
                  alt="Booking Security QR Code"
                  referrerPolicy="no-referrer"
                  className="w-36 h-36 border border-gray-100 rounded-lg p-2 bg-white"
                />
                <p className="text-xs font-mono font-bold text-gray-500">{selectedTicket.id.toUpperCase()}</p>
              </div>

              {/* Footer text for print */}
              <div className="hidden print:block text-center text-[10px] text-gray-400 uppercase tracking-widest leading-normal">
                Thank you for traveling with us!<br />
                Have a safe voyage.
              </div>
            </div>

            {/* Buttons UI only, hidden on print */}
            <div className="p-4 bg-gray-50 border-t flex gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold py-3.5 rounded-2xl shadow transition"
              >
                🖨️ Print Ticket
              </button>
              <button
                onClick={() => setSelectedTicket(null)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-bold py-3.5 px-6 rounded-2xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
