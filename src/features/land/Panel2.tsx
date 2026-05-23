import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { WeatherWidget } from '../../components/WeatherWidget';

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
    isOnline
  } = useApp();

  // Selected tab in Panel 2
  const [activeTab, setActiveTab] = useState<'manager' | 'sync' | 'map'>('manager');

  // New Trip state
  const [tripRoute, setTripRoute] = useState('Mamburao → Abra Port');
  const [depDateTime, setDepDateTime] = useState('');
  const [vehicleType, setVehicleType] = useState('Van');
  const [driverName, setDriverName] = useState('');
  const [capacity, setCapacity] = useState('14');

  // Search Online Bookings
  const [searchPassenger, setSearchPassenger] = useState('');

  // Stats
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
    if (!depDateTime || !driverName) return alert("Please fill up all fields");

    const newTrip = {
      id: 't-' + Math.random().toString(36).substr(2, 9),
      route: tripRoute,
      depTime: new Date(depDateTime).toISOString(),
      type: vehicleType,
      driver: driverName,
      capacity: Number(capacity),
      available: Number(capacity),
      status: 'Scheduled'
    };

    setTrips(prev => [...prev, newTrip]);
    setDriverName('');
    setDepDateTime('');
  };

  const updateTripStatus = (tripId: string, status: string) => {
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, status } : t));
  };

  const handleConfirmBooking = (booking: any) => {
    setVanBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'Confirmed' } : b));
    addTransaction(booking, 'Terminal Admin');
    alert(`Booking for ${booking.name} is CONFIRMED!`);
  };

  const handleCancelBooking = (bookingId: string) => {
    if (confirm("Are you sure you want to cancel this booking?")) {
      setVanBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'Cancelled' } : b));
    }
  };

  const filteredBookings = vanBookings.filter(b => {
    const trip = trips.find(t => t.id === b.tripId);
    const tripRouteStr = trip ? trip.route : '';
    return b.name.toLowerCase().includes(searchPassenger.toLowerCase()) || tripRouteStr.toLowerCase().includes(searchPassenger.toLowerCase());
  });

  // MAP COMPONENT logic
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerGroupRef = useRef<any>(null);

  useEffect(() => {
    if (activeTab !== 'map' || !mapContainerRef.current) return;

    // Load Leaflet
    const L = (window as any).L;
    if (!L) return;

    if (!mapRef.current) {
      // Map configuration around Occidental Mindoro
      mapRef.current = L.map(mapContainerRef.current, {
        scrollWheelZoom: false,
        zoomControl: true
      }).setView([13.2167, 120.5833], 10);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);
      markerGroupRef.current = L.layerGroup().addTo(mapRef.current);
    }

    // Refresh markers
    if (markerGroupRef.current) {
      markerGroupRef.current.clearLayers();

      // Filter Boarding / Departed
      const activeTrips = trips.filter(t => t.status === 'Boarding' || t.status === 'Departed');

      activeTrips.forEach(t => {
        const pos = getTripLocation(t.id, t.route);
        if (pos) {
          // Custom div icon style matching guidelines
          const orangeDotIcon = L.divIcon({
            className: 'custom-gps-marker',
            html: `
              <div class="relative flex items-center justify-center">
                <div class="absolute h-6 w-6 rounded-full bg-orange-500/30 animate-ping"></div>
                <div class="h-4 w-4 bg-[#FF6B00] rounded-full border-2 border-white shadow-md"></div>
              </div>
            `,
            iconSize: [20, 20]
          });

          const markerPopupText = `
            <div class="p-1 text-xs">
              <strong class="text-[#003580]">${t.route}</strong><br/>
              <b>Driver:</b> ${t.driver}<br/>
              <b>Vehicle:</b> ${t.type}<br/>
              <b>Status:</b> <span class="text-orange-600 font-bold">${t.status}</span>
            </div>
          `;

          L.marker(pos, { icon: orangeDotIcon })
            .bindPopup(markerPopupText)
            .addTo(markerGroupRef.current);
        }
      });
    }

    return () => {
      // Cleanup: We don't remove map, but can clear marker groups
    };
  }, [activeTab, trips, gpsIndicesTrigger()]);

  // Trick to trigger dependency array update when background GPS updates
  function gpsIndicesTrigger() {
    return trips.map(t => getTripLocation(t.id, t.route).join(',')).join('|');
  }

  return (
    <div className="p-6 space-y-8 animate-fade-in text-[#2D3748]">
      
      {/* Header section with branding & weather */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="bg-[#FF6B00] text-white font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded-full">🚐 Terminal Staff Mode</span>
            {isSuperAdmin && <span className="bg-[#FF6B00] text-white font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded-full">Admin View</span>}
          </div>
          <h1 className="text-3xl font-bold font-sans tracking-tight text-[#003580] mt-1">Mamburao Grand Terminal</h1>
          <p className="text-gray-500 text-sm">Mindoro land-transit dispatching, ticketing, and Montenegro ferry tracking operations.</p>
        </div>
        
        {/* Weather Widget */}
        <div className="w-full sm:w-auto">
          <WeatherWidget
            weatherData={mamburaoWeather}
            title="Mamburao Weather"
            lastUpdated={mamburaoWeather ? formatPST(mamburaoWeather.lastUpdated) : ''}
            isOnline={isOnline}
          />
        </div>
      </div>

      {/* Fleet Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Active Shuttle Trips</p>
          <p className="text-3xl font-extrabold text-[#003580] mt-2">{activeTripsCount}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider font-sans">Total Bookings</p>
          <p className="text-3xl font-extrabold text-[#00A651] mt-2">{totalBookingsCount}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider font-sans">Pending bookings</p>
          <p className="text-3xl font-extrabold text-[#FF6B00] mt-2">{pendingBookingsCount}</p>
        </div>
      </div>

      {/* Sub menu tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('manager')}
          className={`px-6 py-3 font-semibold text-sm -mb-[1px] border-b-2 transition ${
            activeTab === 'manager'
              ? 'border-[#FF6B00] text-[#FF6B00]'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          🚐 Schedule Manager
        </button>
        <button
          onClick={() => setActiveTab('sync')}
          className={`relative px-6 py-3 font-semibold text-sm -mb-[1px] border-b-2 transition flex items-center gap-2 ${
            activeTab === 'sync'
              ? 'border-[#FF6B00] text-[#FF6B00]'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          🚢 Montenegro Sync Monitor
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`px-6 py-3 font-semibold text-sm -mb-[1px] border-b-2 transition ${
            activeTab === 'map'
              ? 'border-[#FF6B00] text-[#FF6B00]'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          📍 LIVE GPS Shuttles Map
        </button>
      </div>

      {/* TAB CONTENT: Manager */}
      {activeTab === 'manager' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Shuttles Table */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-lg font-bold text-[#003580]">🚐 Shuttles Dispatching Board</h2>
              
              <div className="overflow-x-auto text-sm">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                      <th className="py-3">Driver & Vehicle</th>
                      <th className="py-3">Route</th>
                      <th className="py-3 font-sans">Departure (PST)</th>
                      <th className="py-3 text-center">Seats</th>
                      <th className="py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {trips.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/50">
                        <td className="py-3.5 font-bold text-gray-800">
                          <div>{t.driver}</div>
                          <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-sans font-semibold uppercase">{t.type}</span>
                        </td>
                        <td className="py-3.5 text-gray-600">{t.route}</td>
                        <td className="py-3.5 font-mono text-xs">{formatPST(t.depTime)}</td>
                        <td className="py-3.5 text-center font-bold text-teal-600">{t.available} / {t.capacity}</td>
                        <td className="py-3.5">
                          <select
                            value={t.status}
                            onChange={(e) => updateTripStatus(t.id, e.target.value)}
                            className="bg-gray-100 border border-transparent text-gray-700 rounded-lg text-xs font-semibold px-2 py-1 focus:outline-none"
                          >
                            {TRIP_STATUSES.map(stat => (
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

            {/* Form Add Trip */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-[#003580] mb-4">🆕 Dispatch New Land Trip</h2>
              <form onSubmit={handleAddTrip} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Select Route</label>
                  <select
                    value={tripRoute}
                    onChange={(e) => setTripRoute(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  >
                    {ROUTES_12.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Departure Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={depDateTime}
                    onChange={(e) => setDepDateTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Driver Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kuya Cardo Dalisay"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Vehicle Type</label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                    >
                      <option value="Van">Van</option>
                      <option value="Bus">Bus</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Capacity</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#FF6B00] hover:bg-orange text-white font-bold py-3 rounded-xl shadow active:scale-95 transition"
                >
                  Add Active Land Trip
                </button>
              </form>
            </div>
          </div>

          {/* Bookings Table */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-lg font-bold text-[#003580]">📋 Online Land Booking dispatcher</h2>
            
            <div className="bg-gray-50 p-3 rounded-2xl flex items-center mb-4">
              <input
                type="text"
                placeholder="Filter bookings by Passenger name..."
                value={searchPassenger}
                onChange={(e) => setSearchPassenger(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <div className="overflow-x-auto text-sm">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                    <th className="py-3">ID</th>
                    <th className="py-3">Passenger</th>
                    <th className="py-3">Contact</th>
                    <th className="py-3 font-sans">Trip Route</th>
                    <th className="py-3">Pickup</th>
                    <th className="py-3 text-center">Seats Booked</th>
                    <th className="py-3 text-center">Status</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-gray-400">No active bookings listed.</td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => {
                      const t = trips.find(tp => tp.id === b.tripId);
                      return (
                        <tr key={b.id}>
                          <td className="py-3 font-mono text-xs text-gray-400 uppercase">#{b.id}</td>
                          <td className="py-3 font-bold">{b.name}</td>
                          <td className="py-3 font-mono text-xs text-gray-500">{b.contact}</td>
                          <td className="py-3 text-gray-600">{t ? t.route : 'Other Route'}</td>
                          <td className="py-3 text-gray-500 font-medium text-xs">{b.pickup}</td>
                          <td className="py-3 text-center font-bold text-teal-600">{b.seats}</td>
                          <td className="py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.status === 'Confirmed' ? 'bg-green-100 text-green-700' :
                              b.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700 animate-pulse'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {b.status === 'Pending' && (
                              <div className="flex gap-1.5 justify-end">
                                <button
                                  onClick={() => handleConfirmBooking(b)}
                                  className="bg-[#00A651] hover:bg-green-600 text-white font-bold text-xs px-2.5 py-1 rounded"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => handleCancelBooking(b.id)}
                                  className="bg-red-500 text-white font-bold text-xs px-2.5 py-1 rounded"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Sync Monitor */}
      {activeTab === 'sync' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-[#003580] flex items-center gap-2">
                🚢 Montenegro Ferry Sync Monitor
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </h2>
              <p className="text-xs text-gray-400">Read-only live feed mirroring real-time ship voyages from Abra Port ticketing client.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase font-bold">
                  <th className="py-3">Vessel</th>
                  <th className="py-3">Route</th>
                  <th className="py-3 font-sans">Est Voyage Out (PST)</th>
                  <th className="py-3">Est Voyage In (PST)</th>
                  <th className="py-3">Capacity</th>
                  <th className="py-3 text-right">Status Badge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium">
                {ships.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="py-4 font-bold text-gray-800 flex items-center gap-2">
                      <span className="text-xl">🚢</span>
                      <div>
                        <div>{s.name}</div>
                        <span className="text-[10px] bg-sky-50 text-sky-600 border border-sky-200 px-1.5 py-0.5 rounded font-mono uppercase font-bold">{s.type}</span>
                      </div>
                    </td>
                    <td className="py-4 text-gray-600 font-sans">{s.route}</td>
                    <td className="py-4 font-mono text-xs">{formatPST(s.depTime)}</td>
                    <td className="py-4 font-mono text-xs text-gray-500">{formatPST(s.arrTime)}</td>
                    <td className="py-4 text-teal-600 font-bold">{s.available} Available</td>
                    <td className="py-4 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        s.status === 'Boarding' ? 'bg-indigo-100 text-indigo-700 font-extrabold animate-pulse' :
                        s.status === 'Delayed' ? 'bg-orange-100 text-orange-700' :
                        s.status === 'Departed' ? 'bg-gray-100 text-gray-700' :
                        'bg-green-100 text-green-700 font-bold'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Live GPS Map */}
      {activeTab === 'map' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-[#003580] font-sans">📍 Real-time GPS Shuttle Locators</h2>
            <p className="text-xs text-gray-400 mt-1">
              Displays moving shuttle marker locators (Vans & Buses) across Centennial highways in Mindoro. Updating location progress every 3 seconds.
            </p>
          </div>

          <div
            ref={mapContainerRef}
            className="w-full h-[450px] rounded-2xl overflow-hidden border border-gray-100 shadow-inner"
            style={{ minHeight: '400px' }}
          />
        </div>
      )}

    </div>
  );
};
