import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { WeatherWidget } from '../../components/WeatherWidget';

interface Panel3Props {
  isSuperAdmin: boolean;
}

export const Panel3 = ({ isSuperAdmin }: Panel3Props) => {
  const {
    ships,
    setShips,
    trips,
    setTrips,
    ferryBookings,
    setFerryBookings,
    vanBookings,
    setVanBookings,
    announcements,
    offlineQueue,
    setOfflineQueue,
    getTripLocation,
    formatPST,
    abraWeather,
    mamburaoWeather,
    isOnline
  } = useApp();

  // Active Screen tracking
  const [trackedTripId, setTrackedTripId] = useState<string | null>(null);
  const [etaSeconds, setEtaSeconds] = useState(15 * 60); // 15:00 in seconds
  const [bookingConfirmation, setBookingConfirmation] = useState<any | null>(null);

  // Form Fields
  const [voyageId, setVoyageId] = useState('');
  const [ferryName, setFerryName] = useState('');
  const [ferryContact, setFerryContact] = useState('');
  const [ticketType, setTicketType] = useState('Regular');

  const [tripId, setTripId] = useState('');
  const [pickupPoint, setPickupPoint] = useState('');
  const [shuttleName, setShuttleName] = useState('');
  const [shuttleContact, setShuttleContact] = useState('');
  const [seatsCount, setSeatsCount] = useState('1');

  // Interactive pulse and countdowns
  const [refreshTimer, setRefreshTimer] = useState(30);
  const [pulseActive, setPulseActive] = useState(false);

  // 30 seconds count refresh loop
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshTimer(prev => {
        if (prev <= 1) {
          // Trigger flash animation
          setPulseActive(true);
          setTimeout(() => setPulseActive(false), 1500);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Simulating ETA countdown for tracking view
  useEffect(() => {
    if (!trackedTripId) return;

    const etaInterval = setInterval(() => {
      setEtaSeconds(prev => {
        const next = prev - 5;
        return next > 0 ? next : 0;
      });
    }, 3000); // matching GPS interval ticks

    return () => clearInterval(etaInterval);
  }, [trackedTripId]);

  // Leaflet Single tracking map
  const trackMapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!trackedTripId || !trackMapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const activeTrip = trips.find(t => t.id === trackedTripId);
    if (!activeTrip) return;

    const initialPos = getTripLocation(activeTrip.id, activeTrip.route);

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(trackMapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false
      }).setView(initialPos, 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstanceRef.current);

      const orangeDotIcon = L.divIcon({
        className: 'custom-gps-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute h-8 w-8 rounded-full bg-orange-500/30 animate-ping"></div>
            <div class="h-5 w-5 bg-[#FF6B00] rounded-full border-2 border-white shadow-lg"></div>
          </div>
        `,
        iconSize: [24, 24]
      });

      markerRef.current = L.marker(initialPos, { icon: orangeDotIcon }).addTo(mapInstanceRef.current);
    }

    const currentPos = getTripLocation(activeTrip.id, activeTrip.route);
    if (markerRef.current) {
      markerRef.current.setLatLng(currentPos);
      mapInstanceRef.current.panTo(currentPos);
      markerRef.current.bindPopup(`
        <div class="text-xs font-semibold">
          <b>${activeTrip.driver}</b><br/>
          Route: ${activeTrip.route}<br/>
          Status: <span class="text-orange-600">${activeTrip.status}</span>
        </div>
      `).openPopup();
    }

    return () => {};
  }, [trackedTripId, trips]);

  // Submit Ferry Booking Form
  const handleFerryBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voyageId || !ferryName || !ferryContact) return alert("Please fill all booking details");

    const selVoyage = ships.find(s => s.id === voyageId);
    if (!selVoyage) return;

    const bookingId = 'fb-' + Math.random().toString(36).substr(2, 9);
    const newBookingObj = {
      id: bookingId,
      shipId: voyageId,
      name: ferryName,
      contact: ferryContact,
      type: ticketType,
      status: isOnline ? 'Pending' : 'Queued',
      bookingType: 'ferry'
    };

    if (isOnline) {
      setFerryBookings(prev => [...prev, newBookingObj]);
      // Update seats remaining
      setShips(prev => prev.map(s => s.id === voyageId ? { ...s, available: Math.max(0, s.available - 1) } : s));
    } else {
      setOfflineQueue(prev => [...prev, newBookingObj]);
    }

    setBookingConfirmation({
      id: bookingId,
      type: 'Ferry Voyage ticket',
      targetName: selVoyage.name,
      route: selVoyage.route,
      passenger: ferryName,
      isFerry: true
    });

    // Reset Form
    setVoyageId('');
    setFerryName('');
    setFerryContact('');
  };

  // Submit Land Booking Form
  const handleLandBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripId || !pickupPoint || !shuttleName || !shuttleContact) return alert("Please fill all booking details");

    const selTrip = trips.find(t => t.id === tripId);
    if (!selTrip) return;

    const count = Number(seatsCount);
    const bookingId = 'vb-' + Math.random().toString(36).substr(2, 9);
    const newBookingObj = {
      id: bookingId,
      tripId,
      pickup: pickupPoint,
      name: shuttleName,
      contact: shuttleContact,
      seats: count,
      status: isOnline ? 'Pending' : 'Queued',
      bookingType: 'land'
    };

    if (isOnline) {
      setVanBookings(prev => [...prev, newBookingObj]);
      setTrips(prev => prev.map(t => t.id === tripId ? { ...t, available: Math.max(0, t.available - count) } : t));
    } else {
      setOfflineQueue(prev => [...prev, newBookingObj]);
    }

    setBookingConfirmation({
      id: bookingId,
      type: `${selTrip.type} Seat Reservation`,
      targetName: `${selTrip.type} (Driver: ${selTrip.driver})`,
      route: selTrip.route,
      passenger: shuttleName,
      isFerry: false,
      tripId: tripId // stored for potential tracking
    });

    // Reset Form
    setTripId('');
    setPickupPoint('');
    setShuttleName('');
    setShuttleContact('');
  };

  const isWindAdvisory = abraWeather && abraWeather.windspeed_10m > 30;
  const recentAnnouncement = announcements.length > 0 ? announcements[0] : null;

  // Format tracking ETA
  const formatETA = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s remaining`;
  };

  // TRACK MY RIDE VIEW (Full Screen Mapping)
  if (trackedTripId) {
    const tripObj = trips.find(t => t.id === trackedTripId);

    return (
      <div className="min-h-[calc(100vh-80px)] bg-slate-50 flex flex-col animate-fade-in relative text-[#2D3748]">
        {/* Navigation bar */}
        <div className="bg-[#003580] text-white p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-xl">📍</span>
            <div>
              <p className="font-bold text-sm tracking-tight">Active GPS Shuttle Tracker</p>
              <p className="text-xs opacity-85">Centennial Highway Real-time Locator</p>
            </div>
          </div>
          <button
            onClick={() => {
              setTrackedTripId(null);
              setEtaSeconds(15 * 60);
            }}
            className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold transition focus:ring-2 focus:ring-[#FF6B00]"
          >
            ❌ Close Tracking
          </button>
        </div>

        {/* Map Stage container */}
        <div ref={trackMapRef} className="flex-1 w-full bg-slate-200" style={{ minHeight: '350px' }} />

        {/* Live Tracking Information Card */}
        {tripObj && (
          <div className="bg-white border-t border-gray-100 p-5 rounded-t-3xl shadow-2xl space-y-4 max-w-lg mx-auto w-full">
            <div className="flex justify-between items-center">
              <div>
                <span className="bg-orange-50 text-orange-600 border border-orange-200 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded">
                  {tripObj.type} Route Active
                </span>
                <h4 className="font-bold text-gray-800 mt-1">{tripObj.route}</h4>
              </div>
              <div className="bg-orange-50 px-3 py-1 rounded-xl text-right">
                <span className="text-[9px] font-bold text-orange-400 block uppercase font-mono">Simulated Progress</span>
                <span className="text-sm font-extrabold text-[#FF6B00] font-mono">{formatETA(etaSeconds)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs border-t border-dashed border-gray-100 pt-3">
              <div>
                <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Driver</p>
                <p className="font-bold text-gray-700 mt-0.5">{tripObj.driver}</p>
              </div>
              <div>
                <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Seats Available</p>
                <p className="font-bold text-teal-600 mt-0.5">{tripObj.available} remaining</p>
              </div>
            </div>
            
            <p className="text-[10px] text-gray-400 text-center leading-normal">
              Self-updating map positions and countdown triggers refresh every 3 seconds.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 animate-fade-in text-[#2D3748]">
      
      {/* Wind Warning Banner */}
      {isWindAdvisory && (
        <div className="bg-red-600 text-white px-5 py-3.5 rounded-3xl shadow-md border-2 border-red-500 animate-pulse flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold tracking-tight text-sm">WIND ADVISORY: High winds at Abra Port.</p>
            <p className="text-xs opacity-90">Ferry voyages and vessel crossing schedules may suffer sudden delays or cancellations.</p>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#003580] to-[#002150] text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-3 relative overflow-hidden">
        {/* Decorative Watermark */}
        <div className="absolute right-0 bottom-0 text-[130px] select-none opacity-5 translate-x-12 translate-y-12 shrink-0">🚢</div>
        
        <div className="relative">
          <h1 className="text-3xl sm:text-4xl font-black font-sans tracking-tight">E-Konek Occi.Mindo Transit</h1>
          <p className="text-[#FF6B00] font-extrabold text-sm sm:text-base tracking-widest uppercase mt-1">Montenegro Shipping & Mamburao Terminal</p>
          <p className="text-white/80 text-xs sm:text-sm mt-3 max-w-md">
            The unified transit passenger service center. Real-time boarding status, public seat allocations, and satellite shuttle gps locators.
          </p>
        </div>
      </div>

      {/* Weather tiles and Notices side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <WeatherWidget
            weatherData={abraWeather}
            title="🎫 Abra Port Weather"
            lastUpdated={abraWeather ? formatPST(abraWeather.lastUpdated) : ''}
            isOnline={isOnline}
          />
          <WeatherWidget
            weatherData={mamburaoWeather}
            title="🚐 Mamburao Terminal Weather"
            lastUpdated={mamburaoWeather ? formatPST(mamburaoWeather.lastUpdated) : ''}
            isOnline={isOnline}
          />
        </div>

        {/* Port Bulletins */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-500 font-sans">📌 Current Port Announcement</h4>
            {recentAnnouncement ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-semibold text-gray-700 leading-relaxed italic">"{recentAnnouncement.text}"</p>
                <p className="text-[10px] text-gray-400 font-medium">Published by: {recentAnnouncement.author} ({formatPST(recentAnnouncement.date)})</p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic mt-3">No active service bulletins broadcasted.</p>
            )}
          </div>
        </div>
      </div>

      {/* DYNAMIC COUNTDOWN & SCHEDULE BOARDS */}
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
          <div>
            <h3 className="font-bold text-base text-gray-800">📊 Live Terminal Departure Boards</h3>
            <p className="text-xs text-gray-400">Times displayed in Philippine Standard Time (PST)</p>
          </div>
          <div className="bg-orange-50 px-3 py-1 rounded-xl text-center">
            <span className="text-[9px] font-bold text-orange-400 block uppercase font-mono">Auto Refresh</span>
            <span className="text-xs font-extrabold text-[#FF6B00] font-mono">Refreshing in {refreshTimer}s...</span>
          </div>
        </div>

        {/* Side-by-Side Departures Board */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Ferry departure board */}
          <div className={`bg-white rounded-3xl p-6 border border-gray-100 shadow-sm transition-all duration-300 ${pulseActive ? 'ring-2 ring-[#FF6B00]' : ''}`}>
            <h4 className="font-extrabold text-sm text-[#003580] uppercase tracking-wider mb-4">🚢 Montenegro Ferry Crossings</h4>
            <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
              {ships.map((s) => (
                <div key={s.id} className="flex justify-between items-center border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div>
                    <span className="font-bold text-gray-800 text-sm block">{s.name}</span>
                    <span className="text-xs text-gray-500 font-medium">{s.route}</span>
                    <span className="text-[9px] font-mono text-gray-400 block mt-0.5">{formatPST(s.depTime)}</span>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    {s.available <= 0 ? (
                      <span className="bg-orange-500 text-white font-black text-[9px] px-2 py-0.5 rounded tracking-wider uppercase">FULL</span>
                    ) : (
                      <span className="text-xs text-teal-600 font-bold">{s.available} seats left</span>
                    )}

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold font-semibold uppercase ${
                      s.status === 'Boarding' ? 'bg-indigo-50 text-indigo-700' :
                      s.status === 'Delayed' ? 'bg-red-50 text-red-600' :
                      'bg-green-50 text-green-700'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shuttle departure board */}
          <div className={`bg-white rounded-3xl p-6 border border-gray-100 shadow-sm transition-all duration-300 ${pulseActive ? 'ring-2 ring-[#FF6B00]' : ''}`}>
            <h4 className="font-extrabold text-sm text-[#FF6B00] uppercase tracking-wider mb-4">🚐 Terminal Shuttle dispatches</h4>
            <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
              {trips.map((t) => (
                <div key={t.id} className="flex justify-between items-center border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div>
                    <span className="font-bold text-gray-800 text-sm block">{t.driver}</span>
                    <span className="text-xs text-gray-500 font-medium">{t.route}</span>
                    <span className="text-[9px] font-mono text-gray-400 block mt-0.5">{formatPST(t.depTime)}</span>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    {t.available <= 0 ? (
                      <span className="bg-orange-500 text-white font-black text-[9px] px-2 py-0.5 rounded tracking-wider uppercase">FULL</span>
                    ) : (
                      <span className="text-xs text-teal-600 font-bold">{t.available} seats left</span>
                    )}

                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      t.status === 'Boarding' ? 'bg-indigo-100 text-[#003580] animate-pulse' :
                      t.status === 'Departed' ? 'bg-orange-50 text-[#FF6B00]' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* CONFIRMATION DIALOG / SWEET CARD */}
      {bookingConfirmation && (
        <div className="bg-emerald-50 border-2 border-emerald-500 p-6 rounded-3xl shadow-xl space-y-4 animate-fade-in relative">
          <button
            onClick={() => setBookingConfirmation(null)}
            className="absolute top-4 right-5 text-emerald-800 text-xl font-bold cursor-pointer"
          >
            &times;
          </button>
          
          <div className="flex items-center gap-3">
            <span className="text-3xl">✅</span>
            <div>
              <h4 className="font-extrabold text-emerald-800 text-lg">Booking Submitted!</h4>
              <p className="text-xs text-emerald-600 font-medium">Successfully processed ticket reservation request.</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400 uppercase tracking-wider font-bold text-[9px]">Booking Type</span>
              <span className="font-bold text-gray-700">{bookingConfirmation.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 uppercase tracking-wider font-bold text-[9px]">Transit Vessel/Vehicle</span>
              <span className="font-bold text-gray-700">{bookingConfirmation.targetName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 uppercase tracking-wider font-bold text-[9px]">Route Details</span>
              <span className="font-bold text-gray-700">{bookingConfirmation.route}</span>
            </div>
            <div className="flex justify-between border-t border-dashed border-gray-100 pt-2 mt-1">
              <span className="text-[#FF6B00] uppercase tracking-wider font-black text-[10px]">Reference Number</span>
              <span className="font-mono font-black text-sm text-gray-800">{bookingConfirmation.id.toUpperCase()}</span>
            </div>
          </div>

          <div className="flex gap-2">
            {!bookingConfirmation.isFerry && (
              <button
                onClick={() => {
                  setTrackedTripId(bookingConfirmation.tripId);
                  setBookingConfirmation(null);
                }}
                className="flex-1 bg-[#FF6B00] hover:bg-orange text-white font-bold py-3 rounded-2xl text-xs shadow transition active:scale-95"
              >
                📍 Track My Shuttle Ride
              </button>
            )}
            <button
              onClick={() => setBookingConfirmation(null)}
              className="px-6 py-3 bg-white hover:bg-gray-100 border border-emerald-200 text-emerald-800 font-semibold rounded-2xl text-xs transition active:scale-95"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* BOX FOR BOOKING TICKETS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Book Ferry Form */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-[#003580] font-sans">🚢 Book Ferry Ticket</h3>
          <form onSubmit={handleFerryBookingSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Select Voyage</label>
              <select
                value={voyageId}
                onChange={(e) => setVoyageId(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003580]"
              >
                <option value="">-- Choose Active Voyage --</option>
                {ships
                  .filter(s => (s.status === 'Scheduled' || s.status === 'Boarding') && s.available > 0)
                  .map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.route}) - {s.available} left</option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Passenger Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Clara"
                  value={ferryName}
                  onChange={(e) => setFerryName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Contact Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 0917-123-4567"
                  value={ferryContact}
                  onChange={(e) => setFerryContact(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Ticket Type Allocation</label>
              <select
                value={ticketType}
                onChange={(e) => setTicketType(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
              >
                <option value="Regular">Regular (₱500)</option>
                <option value="Student">Student (₱350)</option>
                <option value="Senior">Senior Citizen (₱300)</option>
                <option value="PWD">PWD (₱300)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-[#003580] hover:bg-navy text-white font-bold py-3.5 rounded-2xl shadow active:scale-95 transition"
            >
              {isOnline ? 'Process Ticket Booking' : '📴 Queue Ticket Offline'}
            </button>
          </form>
        </div>

        {/* Book Shuttle Form */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-[#FF6B00] font-sans">🚐 Book Terminal Shuttle</h3>
          <form onSubmit={handleLandBookingSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Select Shuttle Trip</label>
              <select
                value={tripId}
                onChange={(e) => setTripId(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="">-- Choose Shuttle dispatch --</option>
                {trips
                  .filter(t => (t.status === 'Scheduled' || t.status === 'Boarding') && t.available > 0)
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.route} ({t.type} - {t.driver}) - {t.available} seats</option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 font-sans">Passenger Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cardo Dalisay"
                  value={shuttleName}
                  onChange={(e) => setShuttleName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Contact Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 0920-111-2222"
                  value={shuttleContact}
                  onChange={(e) => setShuttleContact(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Pickup Point</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mamburao Terminal / Plaza"
                  value={pickupPoint}
                  onChange={(e) => setPickupPoint(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Seats Count</label>
                <select
                  value={seatsCount}
                  onChange={(e) => setSeatsCount(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i+1} value={i+1}>{i+1} seat{i > 0 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#FF6B00] hover:bg-orange text-white font-bold py-3.5 rounded-2xl shadow active:scale-95 transition"
            >
              {isOnline ? 'Confirm Shuttle Reservation' : '📴 Queue Shuttle Offline'}
            </button>
          </form>
        </div>

      </div>

      {/* Floating Offline pending bookings sync badge */}
      {offlineQueue.length > 0 && (
        <div className="fixed bottom-4 left-4 z-40 bg-orange-600 text-white font-black px-4 py-3 rounded-full shadow-2xl flex items-center gap-2.5 animate-bounce">
          <span className="text-xl">📥</span>
          <span className="text-xs uppercase tracking-wider font-mono font-extrabold">{offlineQueue.length} bookings pending sync</span>
        </div>
      )}

    </div>
  );
};
