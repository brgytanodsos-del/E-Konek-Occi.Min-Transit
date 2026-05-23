import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { WeatherWidget } from '../../components/WeatherWidget';
import { motion, AnimatePresence } from 'motion/react';

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

  // User localization state for Live GPS map
  const [showUserLoc, setShowUserLoc] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const userMarkerRef = useRef<any>(null);
  const userCircleRef = useRef<any>(null);

  // Track and update user location on map when showUserLoc is active
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
      if (!('geolocation' in navigator)) {
        alert("Geolocation is not supported by your browser");
        setShowUserLoc(false);
        return;
      }

      setIsLocating(true);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const uCoords: [number, number] = [latitude, longitude];
          setUserPos({ lat: latitude, lng: longitude, accuracy });
          setIsLocating(false);

          if (!mapRef.current) return;

          // 1. Draw or Update Accuracy Circle
          if (!userCircleRef.current) {
            userCircleRef.current = L.circle(uCoords, {
              radius: accuracy || 15,
              color: '#3B82F6',
              fillColor: '#3B82F6',
              fillOpacity: 0.1,
              weight: 1,
              opacity: 0.45
            }).addTo(mapRef.current);
          } else {
            userCircleRef.current.setLatLng(uCoords);
            userCircleRef.current.setRadius(accuracy || 15);
          }

          // 2. Draw or Update User Marker
          if (!userMarkerRef.current) {
            const youHereIcon = L.divIcon({
              className: 'custom-user-marker-pulse',
              html: `
                <div class="relative flex items-center justify-center">
                  <div class="absolute h-8 w-8 rounded-full bg-blue-500/30 animate-ping"></div>
                  <div class="h-4 w-4 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
                </div>
              `,
              iconSize: [20, 20]
            });

            userMarkerRef.current = L.marker(uCoords, { icon: youHereIcon })
              .bindPopup(`
                <div class="p-1.5 text-xs font-sans">
                  <strong class="text-[#003087] block mb-1">📍 You are here</strong>
                  <b>GPS Accuracy:</b> ±${Math.round(accuracy)} meters
                </div>
              `)
              .addTo(mapRef.current);
          } else {
            userMarkerRef.current.setLatLng(uCoords);
          }

          // Pin/Pan dynamically to user position
          mapRef.current.setView(uCoords, 13);
        },
        (error) => {
          console.error("GPS tracking error:", error);
          setIsLocating(false);
          setShowUserLoc(false);
          alert("Could not pin location. Please check browser GPS permissions.");
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    } else {
      // Toggle off -> remove layers and clear watch
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (userMarkerRef.current && mapRef.current) {
        mapRef.current.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      if (userCircleRef.current && mapRef.current) {
        mapRef.current.removeLayer(userCircleRef.current);
        userCircleRef.current = null;
      }
      setUserPos(null);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [showUserLoc, activeTab]);

  useEffect(() => {
    if (activeTab !== 'map' || !mapContainerRef.current) return;

    // Load Leaflet
    const L = (window as any).L;
    if (!L) return;

    if (!mapRef.current) {
      // Clear residual Leaflet attachment ID from DOM container to prevent already-initialized errors
      if (mapContainerRef.current) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }
      
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
          // Custom div icon style matching guidelines - orange pulse
          const orangeDotIcon = L.divIcon({
            className: 'custom-gps-marker',
            html: `
              <div class="relative flex items-center justify-center">
                <div class="absolute h-6 w-6 rounded-full bg-orange-500/30 animate-ping"></div>
                <div class="h-4 w-4 bg-[#FF8800] rounded-full border-2 border-white shadow-md"></div>
              </div>
            `,
            iconSize: [20, 20]
          });

          const markerPopupText = `
            <div class="p-1.5 text-xs font-sans">
              <strong class="text-[#003087] block mb-1 text-sm">${t.route}</strong>
              <b>Driver:</b> ${t.driver}<br/>
              <b>Vehicle:</b> ${t.type}<br/>
              <b>Status:</b> <span class="bg-amber-100/80 px-1.5 py-0.5 rounded font-black text-[#FF8800] capitalize text-[10px]">${t.status}</span>
            </div>
          `;

          L.marker(pos, { icon: orangeDotIcon })
            .bindPopup(markerPopupText)
            .addTo(markerGroupRef.current);
        }
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerGroupRef.current = null;
        userMarkerRef.current = null;
        userCircleRef.current = null;
      }
    };
  }, [activeTab, trips, gpsIndicesTrigger()]);

  // Trick to trigger dependency array update when background GPS updates
  function gpsIndicesTrigger() {
    return trips.map(t => getTripLocation(t.id, t.route).join(',')).join('|');
  }

  return (
    <div className="p-6 space-y-8 animate-fade-in text-slate-800">
      
      {/* Official Terminal Header with Occidental Mindoro motif */}
      <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-150 shadow-sm">
        {/* Upper branding layout */}
        <div className="p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {/* Occidental Mindoro Provincial Seal Concept */}
              <div className="bg-[#FF8800] text-white p-1.5 rounded-lg flex items-center justify-center font-bold text-[10px] shadow-sm uppercase tracking-wider">
                <i className="fa-solid fa-map-location-dot mr-1 text-yellow-300"></i> OCCI-MIN
              </div>
              <span className="bg-[#003087] text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full">
                Mamburao Grand Terminal
              </span>
              {isSuperAdmin && (
                <span className="bg-[#FF8800] text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full">
                  System Admin
                </span>
              )}
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#003087] tracking-tighter uppercase font-sans">
                MAMBURAO
              </span>
              <span className="text-2xl font-serif italic text-[#FF8800] font-extrabold tracking-tight">
                Hub
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm font-semibold mt-1">
              Unified Occidental Mindoro Land-Transit Dispatch Center & Shuttle GPS Terminal
            </p>
          </div>

          <div className="w-full md:w-auto shrink-0">
            <WeatherWidget
              weatherData={mamburaoWeather}
              title="Mamburao Station Weather"
              lastUpdated={mamburaoWeather ? formatPST(mamburaoWeather.lastUpdated) : ''}
              isOnline={isOnline}
            />
          </div>
        </div>

        {/* Dynamic decorative line - Corporate styling */}
        <div className="h-2 bg-[#003087] relative w-full overflow-hidden">
          <div className="h-0.5 bg-[#FF8800] w-full absolute top-0" />
        </div>

        {/* Lower banner row */}
        <div className="bg-[#FF8800] px-6 py-2.5 flex justify-between items-center text-white/90 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-200 animate-ping inline-block" />
            <span>Public Utility Vehicle & Shuttle Tracking Active</span>
          </div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-[#003087]">
            "Ligtas at Mabilis na Sakay"
          </p>
        </div>
      </div>

      {/* Fleet Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div 
          whileHover={{ y: -3, scale: 1.01 }}
          className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between"
        >
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Land Trips</p>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-3xl font-black text-[#003087]">{activeTripsCount}</p>
            <span className="text-[#003087]/20 p-2 rounded-xl bg-slate-50">
              <i className="fa-solid fa-route text-xl"></i>
            </span>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -3, scale: 1.01 }}
          className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between"
        >
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Booked Passengers</p>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-3xl font-black text-[#009E49]">{totalBookingsCount}</p>
            <span className="text-[#009E49]/20 p-2 rounded-xl bg-slate-50">
              <i className="fa-solid fa-users text-xl"></i>
            </span>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -3, scale: 1.01 }}
          className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between"
        >
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider font-sans">Awaiting Confirmation</p>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-3xl font-black text-[#FF8800]">{pendingBookingsCount}</p>
            <span className="text-[#FF8800]/20 p-2 rounded-xl bg-slate-50">
              <i className="fa-solid fa-clock text-xl"></i>
            </span>
          </div>
        </motion.div>
      </div>

      {/* Beautiful Animated Tab Buttons */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('manager')}
          className={`px-6 py-3 font-black text-xs uppercase tracking-wider -mb-[1px] border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'manager'
              ? 'border-[#FF8800] text-[#FF8800]'
              : 'border-transparent text-slate-400 hover:text-slate-750'
          }`}
        >
          <i className="fa-solid fa-calendar-alt"></i> Dispatch Desk
        </button>
        <button
          onClick={() => setActiveTab('sync')}
          className={`relative px-6 py-3 font-black text-xs uppercase tracking-wider -mb-[1px] border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'sync'
              ? 'border-[#FF8800] text-[#FF8800]'
              : 'border-transparent text-slate-400 hover:text-slate-755'
          }`}
        >
          <i className="fa-solid fa-anchor"></i> RoRo Sync Mirror
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#009E49] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#009E49]"></span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`px-6 py-3 font-black text-xs uppercase tracking-wider -mb-[1px] border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'map'
              ? 'border-[#FF8800] text-[#FF8800]'
              : 'border-transparent text-slate-400 hover:text-slate-750'
          }`}
        >
          <i className="fa-solid fa-map-marked-alt"></i> Satellite GPS Tracker
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* TAB CONTENT: Manager */}
        {activeTab === 'manager' && (
          <motion.div
            key="manager"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Shuttles Board */}
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <span className="text-[#003087]"><i className="fa-solid fa-bus"></i></span>
                    Terminal Shuttle Board
                  </h2>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#FF8800] bg-[#FF8800]/10 py-1 px-2.5 rounded-full">ACTIVE SERVICE</span>
                </div>
                
                <div className="overflow-x-auto text-sm">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-3">Driver & Vehicle</th>
                        <th className="py-3">Route Network</th>
                        <th className="py-3 font-sans">Departure Time (PST)</th>
                        <th className="py-3 text-center">Seat Capacity</th>
                        <th className="py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {trips.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5">
                            <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                              <span className="text-[#FF8800]"><i className="fa-solid fa-id-card-clip"></i></span>
                              {t.driver}
                            </div>
                            <span className="inline-block text-[9px] font-black text-slate-600 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded mt-1 font-sans uppercase">
                              {t.type} Class
                            </span>
                          </td>
                          <td className="py-3.5 text-slate-600 font-semibold">{t.route}</td>
                          <td className="py-3.5 font-mono text-xs text-slate-500 font-bold">{formatPST(t.depTime)}</td>
                          <td className="py-3.5 text-center">
                            <div className="font-black text-slate-800">{t.available} / {t.capacity}</div>
                            <div className="w-16 mx-auto bg-slate-100 rounded-full h-1 overflow-hidden mt-1.5 border border-slate-200">
                              <div 
                                className="bg-[#FF8800] h-full" 
                                style={{ width: `${Math.min(100, (t.available / t.capacity) * 100)}%` }} 
                              />
                            </div>
                          </td>
                          <td className="py-3.5">
                            <select
                              value={t.status}
                              onChange={(e) => updateTripStatus(t.id, e.target.value)}
                              className="bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 font-black rounded-xl text-xs px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#FF8800] transition-all cursor-pointer shadow-sm"
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

              {/* Form Add Land Dispatch */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#003087] tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="text-[#FF8800]"><i className="fa-solid fa-plus-circle"></i></span>
                    Dispatch Utility Vehicle
                  </h2>
                  <form onSubmit={handleAddTrip} className="space-y-4 mt-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Passage Route Network</label>
                      <select
                        value={tripRoute}
                        onChange={(e) => setTripRoute(e.target.value)}
                        className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8800] cursor-pointer"
                      >
                        {ROUTES_12.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Dispatch Time (PST)</label>
                      <input
                        type="datetime-local"
                        required
                        value={depDateTime}
                        onChange={(e) => setDepDateTime(e.target.value)}
                        className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8800]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Assigned Driver Profile</label>
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-slate-400"><i className="fa-solid fa-user-tie"></i></span>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Kuya Jun de Vera"
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          className="w-full border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8800]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Vessel Type</label>
                        <select
                          value={vehicleType}
                          onChange={(e) => setVehicleType(e.target.value)}
                          className="w-full border border-slate-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8800]"
                        >
                          <option value="Van">Van (Hi-Ace)</option>
                          <option value="Bus">Public Bus</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Max Seating</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={capacity}
                          onChange={(e) => setCapacity(e.target.value)}
                          className="w-full border border-slate-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8800]"
                        />
                      </div>
                    </div>
                  </form>
                </div>

                <button
                  onClick={handleAddTrip}
                  className="w-full mt-6 bg-[#FF8800] hover:bg-[#E07700] text-white font-black py-4 rounded-2xl shadow-md transition-all duration-200 hover:shadow-lg active:scale-95 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border-b-4 border-orange-800"
                >
                  <i className="fa-solid fa-truck-moving text-yellow-300 animate-bounce"></i> Dispatch Land Vehicle
                </button>
              </div>
            </div>

            {/* Bookings Dispatch Board */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
              <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span className="text-[#003087]"><i className="fa-solid fa-receipt"></i></span>
                Online Booking Dispatches & Boarding list
              </h2>
              
              <div className="flex bg-slate-50 p-4 rounded-2xl border border-slate-150">
                <input
                  type="text"
                  placeholder="Filter booking records by passenger name or destination..."
                  value={searchPassenger}
                  onChange={(e) => setSearchPassenger(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF8800]"
                />
              </div>

              <div className="overflow-x-auto text-sm">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="py-3">Ferry ID</th>
                      <th className="py-3">Passenger Profile</th>
                      <th className="py-3">Contact Number</th>
                      <th className="py-3 font-sans">Transit Route</th>
                      <th className="py-3">Pickup Location</th>
                      <th className="py-3 text-center">Allocated seats</th>
                      <th className="py-3 text-center">Status</th>
                      <th className="py-3 text-right">Counter Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">No active online transport bookings matched.</td>
                      </tr>
                    ) : (
                      filteredBookings.map((b) => {
                        const t = trips.find(tp => tp.id === b.tripId);
                        return (
                          <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 font-mono text-xs text-slate-550 font-black">#{b.id.toUpperCase()}</td>
                            <td className="py-3.5 font-bold text-slate-800">{b.name}</td>
                            <td className="py-3.5 font-mono text-xs text-slate-450 font-bold">{b.contact}</td>
                            <td className="py-3.5 text-slate-600 font-semibold">{t ? t.route : 'Other Route'}</td>
                            <td className="py-3.5 text-slate-500 font-extrabold text-xs">{b.pickup}</td>
                            <td className="py-3.5 text-center font-black text-slate-800">{b.seats} Seats</td>
                            <td className="py-3.5 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                b.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                b.status === 'Cancelled' ? 'bg-rose-105 text-rose-700 border border-rose-200' :
                                'bg-amber-100 text-amber-700 animate-pulse border border-amber-200'
                              }`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="py-3.5 text-right">
                              {b.status === 'Pending' && (
                                <div className="flex gap-1.5 justify-end">
                                  <button
                                    onClick={() => handleConfirmBooking(b)}
                                    className="bg-[#009E49] hover:bg-emerald-700 text-white font-black text-[10px] px-3.5 py-1.5 rounded-xl active:scale-95 transition uppercase tracking-wider cursor-pointer shadow-sm border-b-2 border-emerald-800"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => handleCancelBooking(b.id)}
                                    className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-black text-[10px] px-3.5 py-1.5 rounded-xl active:scale-95 transition uppercase tracking-wider cursor-pointer"
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
          </motion.div>
        )}

        {/* TAB CONTENT: Sync Monitor */}
        {activeTab === 'sync' && (
          <motion.div
            key="sync"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-black text-[#003087] tracking-tight flex items-center gap-2">
                  <span className="text-[#009E49]"><i className="fa-solid fa-ship"></i></span>
                  Montenegro Shipping Lines Link Status
                </h2>
                <p className="text-xs text-slate-400 font-semibold mt-1">Read-only live de-centralized database mirroring Batangas crossings in Abra de Ilog Port.</p>
              </div>
            </div>

            <div className="overflow-x-auto text-sm">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-3">Vessel Registry Name</th>
                    <th className="py-3">Passage</th>
                    <th className="py-3 font-sans">Scheduled Departure (PST)</th>
                    <th className="py-3">Est Docking Time (PST)</th>
                    <th className="py-3">Crossing Availability</th>
                    <th className="py-3 text-right">Service Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {ships.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 font-bold text-slate-800 flex items-center gap-2">
                        <span className="text-[#009E49]"><i className="fa-solid fa-ship text-sm"></i></span>
                        <div>
                          <div className="font-extrabold text-slate-800">{s.name}</div>
                          <span className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-mono uppercase font-black">{s.type} Class</span>
                        </div>
                      </td>
                      <td className="py-4 text-slate-600 font-semibold">{s.route}</td>
                      <td className="py-4 font-mono text-xs text-slate-500 font-bold">{formatPST(s.depTime)}</td>
                      <td className="py-4 font-mono text-xs text-slate-500 font-bold">{formatPST(s.arrTime)}</td>
                      <td className="py-4 text-[#009E49] font-black">{s.available} Remaining</td>
                      <td className="py-4 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          s.status === 'Boarding' ? 'bg-[#003087]/10 text-[#003087] animate-pulse' :
                          s.status === 'Delayed' ? 'bg-orange-100 text-orange-700' :
                          s.status === 'Departed' ? 'bg-slate-105 text-slate-500' :
                          'bg-[#009E49]/10 text-[#009E49]'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* TAB CONTENT: Live GPS Map */}
        {activeTab === 'map' && (
          <motion.div
            key="map"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4"
          >
            <div className="border-b border-indigo-50 pb-3 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-[#003087] tracking-tight flex items-center gap-2">
                  <span className="text-[#FF8800] animate-pulse"><i className="fa-solid fa-satellite-dish"></i></span>
                  Satellite Highway Vehicle Locators
                </h2>
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  Plotting active shuttle progress markers along Occidental Mindoro transit networks. Refreshes telemetry coordinates every 3 seconds.
                </p>
              </div>
              <div className="flex gap-2 items-center bg-[#FF8800]/10 px-3 py-1 rounded-full text-[#FF8800]">
                <span className="w-2 h-2 rounded-full bg-[#FF8800] animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">GPS ACTIVE</span>
              </div>
            </div>

            {/* Map Settings & Pinpoint Toggle Controls Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-4 rounded-2xl gap-4 border border-slate-150">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showUserLoc}
                    onChange={(e) => setShowUserLoc(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#003087]"></div>
                  <span className="ml-3 text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-location-crosshairs text-[#FF8800] text-sm"></i>
                    Pin to Current Location
                  </span>
                </label>
                
                {isLocating && (
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-450 animate-pulse">
                    <i className="fa-solid fa-spinner fa-spin text-slate-400"></i> Acquiring high-accuracy GPS...
                  </span>
                )}
              </div>

              {userPos && (
                <button
                  onClick={() => {
                    if (mapRef.current && userPos) {
                      mapRef.current.flyTo([userPos.lat, userPos.lng], 14);
                    }
                  }}
                  title="Click to re-align view to my location"
                  className="text-[11px] bg-[#003087]/10 text-[#003087] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl border border-[#003087]/20 flex items-center gap-2 hover:bg-[#003087]/20 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
                  <span>Centered at GPS: {userPos.lat.toFixed(5)}, {userPos.lng.toFixed(5)} (±{Math.round(userPos.accuracy)}m)</span>
                </button>
              )}
            </div>

            <div
              ref={mapContainerRef}
              className="w-full h-[450px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner"
              style={{ minHeight: '400px' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

