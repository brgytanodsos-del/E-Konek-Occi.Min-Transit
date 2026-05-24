import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { WeatherWidget } from '../../components/WeatherWidget';
import { motion, AnimatePresence } from 'motion/react';
import { speakAnnouncement, stopSpeaking, VoiceProfile } from '../../utils/speech';

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
    isOnline,
    setToastMessage,
    userAccount,
    persistFerryBooking,
    persistVanBooking,
    persistShip,
    persistTrip
  } = useApp();

  // Active Screen tracking
  const [trackedTripId, setTrackedTripId] = useState<string | null>(null);
  const [etaSeconds, setEtaSeconds] = useState(15 * 60); // 15:00 in seconds
  const [bookingConfirmation, setBookingConfirmation] = useState<any | null>(null);

  // Form Fields
  const [voyageId, setVoyageId] = useState('');
  const [ferryName, setFerryName] = useState(userAccount?.fullName || '');
  const [ferryContact, setFerryContact] = useState(userAccount?.mobileNumber || '');
  const [ticketType, setTicketType] = useState('Regular');

  const [tripId, setTripId] = useState('');
  const [pickupPoint, setPickupPoint] = useState('');
  const [shuttleName, setShuttleName] = useState(userAccount?.fullName || '');
  const [shuttleContact, setShuttleContact] = useState(userAccount?.mobileNumber || '');
  const [seatsCount, setSeatsCount] = useState('1');

  // Sync form fields if userAccount (loaded from storage/async) changes
  useEffect(() => {
    if (userAccount) {
      if (!ferryName) setFerryName(userAccount.fullName);
      if (!ferryContact) setFerryContact(userAccount.mobileNumber);
      if (!shuttleName) setShuttleName(userAccount.fullName);
      if (!shuttleContact) setShuttleContact(userAccount.mobileNumber);
    }
  }, [userAccount]);

  // Interactive pulse and countdowns
  const [refreshTimer, setRefreshTimer] = useState(30);
  const [pulseActive, setPulseActive] = useState(false);

  // Local AI Voice Synthesis States
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile>('feminine');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSpeed, setSpeechSpeed] = useState(0.9);

  // Stop active broadcasting when leaving view
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

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

  // 1. Map Initialization Effect - Runs ONLY when trackedTripId changes or on component mount/unmount.
  useEffect(() => {
    if (!trackedTripId || !trackMapRef.current) {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn("Passenger map removal error:", e);
        }
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    const L = (window as any).L;
    if (!L) return;

    const activeTrip = trips.find(t => t.id === trackedTripId);
    if (!activeTrip) return;

    const initialPos = getTripLocation(activeTrip.id, activeTrip.route);

    if (!mapInstanceRef.current) {
      if (trackMapRef.current) {
        delete (trackMapRef.current as any)._leaflet_id;
      }
      const mapInstance = L.map(trackMapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false
      }).setView(initialPos, 12);
      mapInstanceRef.current = mapInstance;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance);

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

      markerRef.current = L.marker(initialPos, { icon: orangeDotIcon }).addTo(mapInstance);

      // Invalidation & Auto-resize Strategy
      let alive = true;
      const invalidateMapSize = () => {
        if (alive && mapInstance && (mapInstance as any)._mapPane) {
          try {
            mapInstance.invalidateSize({ animate: false });
          } catch (e) {
            console.warn("Passenger map invalidateSize error:", e);
          }
        }
      };

      const resizeObserver = new window.ResizeObserver(() => {
        invalidateMapSize();
      });
      if (trackMapRef.current) {
        resizeObserver.observe(trackMapRef.current);
      }

      // Schedule various timeouts to make sure layout has settled (especially when animation completes)
      const timeouts = [10, 50, 100, 200, 500, 1000, 2000].map(delay => 
        setTimeout(invalidateMapSize, delay)
      );

      mapInstance.whenReady(() => {
        setTimeout(invalidateMapSize, 10);
      });

      return () => {
        alive = false;
        resizeObserver.disconnect();
        timeouts.forEach(clearTimeout);

        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch (e) {
            console.warn("Passenger map cleanup error:", e);
          }
          mapInstanceRef.current = null;
          markerRef.current = null;
        }
      };
    }
  }, [trackedTripId]);

  // 2. Dynamic GPS Marker Coordinate Updates - Runs when trips update (every 3s) or when map is loaded.
  useEffect(() => {
    if (!trackedTripId || !mapInstanceRef.current || !markerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const activeTrip = trips.find(t => t.id === trackedTripId);
    if (!activeTrip) return;

    const currentPos = getTripLocation(activeTrip.id, activeTrip.route);
    if (markerRef.current) {
      markerRef.current.setLatLng(currentPos);
      mapInstanceRef.current.panTo(currentPos);
      markerRef.current.bindPopup(`
        <div class="text-xs font-semibold p-1">
          <b>${activeTrip.driver}</b><br/>
          Route: ${activeTrip.route}<br/>
          Status: <span class="text-orange-600 font-bold">${activeTrip.status}</span>
        </div>
      `).openPopup();
    }
  }, [trackedTripId, trips, mapInstanceRef.current]);

  // Submit Ferry Booking Form
  const handleFerryBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voyageId || !ferryName || !ferryContact) {
      setToastMessage("⚠️ Please fill out all booking details");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const selVoyage = ships.find(s => s.id === voyageId);
    if (!selVoyage) return;

    if (selVoyage.available < 1) {
      setToastMessage('⚠️ That voyage is already full. Please choose another schedule.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const isDuplicate = ferryBookings.some(
      b => b.shipId === voyageId && b.name.toLowerCase() === ferryName.toLowerCase()
    );

    if (isDuplicate) {
      setToastMessage('⚠️ This passenger is already booked on this voyage.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const bookingId = 'fb-' + Math.random().toString(36).substr(2, 9);
    const newBookingObj = {
      id: bookingId,
      shipId: voyageId,
      name: ferryName,
      contact: ferryContact,
      type: ticketType,
      status: isOnline ? 'Pending' : 'Queued',
      bookingType: 'ferry',
      accountId: userAccount?.id || null
    };

    if (isOnline) {
      const updatedVoyage = { ...selVoyage, available: Math.max(0, selVoyage.available - 1) };
      setFerryBookings(prev => [...prev, newBookingObj]);
      setShips(prev => prev.map(s => s.id === voyageId ? updatedVoyage : s));
      persistFerryBooking(newBookingObj).catch(console.error);
      persistShip(updatedVoyage).catch(console.error);
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
    if (!tripId || !pickupPoint || !shuttleName || !shuttleContact) {
      setToastMessage("⚠️ Please fill out all booking details");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const selTrip = trips.find(t => t.id === tripId);
    if (!selTrip) return;

    const count = Number(seatsCount);
    const countCheck = Math.max(1, count);
    
    if (selTrip.available < countCheck) {
      setToastMessage(`⚠️ Only ${selTrip.available} seat${selTrip.available === 1 ? '' : 's'} left on this trip.`);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const isDuplicate = vanBookings.some(
      b => b.tripId === tripId && b.name.toLowerCase() === shuttleName.toLowerCase()
    );

    if (isDuplicate) {
      setToastMessage('⚠️ This passenger is already booked on this trip.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const bookingId = 'vb-' + Math.random().toString(36).substr(2, 9);
    const newBookingObj = {
      id: bookingId,
      tripId,
      pickup: pickupPoint,
      name: shuttleName,
      contact: shuttleContact,
      seats: count,
      status: isOnline ? 'Pending' : 'Queued',
      bookingType: 'land',
      accountId: userAccount?.id || null
    };

    if (isOnline) {
      const updatedTrip = { ...selTrip, available: Math.max(0, selTrip.available - count) };
      setVanBookings(prev => [...prev, newBookingObj]);
      setTrips(prev => prev.map(t => t.id === tripId ? updatedTrip : t));
      persistVanBooking(newBookingObj).catch(console.error);
      persistTrip(updatedTrip).catch(console.error);
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
      <div className="min-h-[calc(100vh-80px)] bg-slate-50/70 backdrop-blur-[2px] flex flex-col animate-fade-in relative text-slate-850">
        {/* Navigation bar */}
        <div className="bg-[#003087] text-white p-4 flex items-center justify-between shadow-md border-b-2 border-[#FF8800]">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-white/10 rounded-xl text-yellow-300 animate-pulse text-sm">
              <i className="fa-solid fa-satellite-dish"></i>
            </span>
            <div>
              <p className="font-black text-xs sm:text-sm uppercase tracking-wider">Active GPS Vehicle Telemetry</p>
              <p className="text-[10px] text-white/70 font-semibold">Centennial Highway Real-time Coordinates Feed</p>
            </div>
          </div>
          <button
            onClick={() => {
              setTrackedTripId(null);
              setEtaSeconds(15 * 60);
            }}
            className="bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 focus:ring-2 focus ring-[#FF8800] active:scale-95 cursor-pointer"
          >
            <i className="fa-solid fa-circle-xmark mr-1"></i> Close Tracker
          </button>
        </div>

        {/* Map Stage container */}
        <div ref={trackMapRef} className="flex-1 w-full bg-slate-200" style={{ minHeight: '350px' }} />

        {/* Live Tracking Information Card */}
        {tripObj && (
          <div className="bg-white border-t-4 border-[#FF8800] p-6 rounded-t-3xl shadow-2xl space-y-4 max-w-lg mx-auto w-full absolute bottom-0 left-0 right-0 z-[1000] animate-slide-up">
            <div className="flex justify-between items-start">
              <div>
                <span className="bg-[#003087]/10 text-[#003087] border border-[#003087]/20 text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full">
                  {tripObj.type} Class Network
                </span>
                <h4 className="font-black text-slate-800 text-base mt-2 flex items-center gap-1.5">
                  <span className="text-[#FF8800]"><i className="fa-solid fa-route"></i></span>
                  {tripObj.route}
                </h4>
              </div>
              <div className="bg-orange-50/80 border border-orange-200/50 px-3 py-1.5 rounded-2xl text-right">
                <span className="text-[9px] font-black text-slate-500 block uppercase font-mono tracking-wider">Estimated Transit</span>
                <span className="text-xs sm:text-sm font-black text-[#FF8800] font-mono">{formatETA(etaSeconds)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs border-t border-dashed border-slate-100 pt-3">
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="font-black text-slate-400 uppercase tracking-wider text-[9px]">Assigned Driver</p>
                <p className="font-black text-slate-700 mt-1 flex items-center gap-1">
                  <span className="text-slate-400"><i className="fa-solid fa-user-circle"></i></span>
                  {tripObj.driver}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="font-black text-slate-400 uppercase tracking-wider text-[9px]">Seats Capacity</p>
                <p className="font-black text-[#009E49] mt-1 flex items-center gap-1 animate-pulse">
                  <span><i className="fa-solid fa-chair text-emerald-500"></i></span>
                  {tripObj.available} / {tripObj.capacity} Open
                </p>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-400 text-center leading-normal font-medium bg-slate-50 py-1.5 rounded-lg border border-slate-100 uppercase tracking-wider">
              🟢 Telematic map coordinate markers auto-refreshing every 3.0s
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 animate-fade-in text-slate-800">
      
      {/* Wind Warning Banner */}
      {isWindAdvisory && (
        <div className="bg-rose-600 text-white px-5 py-4 rounded-3xl shadow-md border-2 border-rose-500 animate-pulse flex items-center gap-4">
          <span className="text-3xl animate-bounce"><i className="fa-solid fa-triangle-exclamation"></i></span>
          <div>
            <p className="font-black tracking-tight text-sm uppercase">Maritime Warning Code: High Winds Detected</p>
            <p className="text-xs opacity-90 font-semibold">Abra Port wind gusts exceeded 30 km/h. Montenegro Shipping crossings are currently on precautionary advisory; schedules are subject to adjustments.</p>
          </div>
        </div>
      )}

      {/* Hero Header - Montenegro Green & Grand Terminal Orange/Navy Unified Brand concept */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#003087] via-[#001D4E] to-[#011433] text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-4">
        {/* Dynamic Watermark Background Patterns */}
        <div className="absolute right-[-20px] bottom-[-20px] text-[180px] select-none opacity-5 translate-x-4 translate-y-4 font-black">
          <i className="fa-solid fa-ship"></i>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-lg">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-[#009E49] text-white border border-emerald-500/30 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <i className="fa-solid fa-anchor text-yellow-300"></i> Montenegro Marine
              </span>
              <span className="bg-[#FF8800] text-white border border-orange-500/30 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <i className="fa-solid fa-bus"></i> Mamburao Terminal
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black font-sans tracking-tight leading-none uppercase">
              Mindoro<span className="text-[#FF8800]">Transit</span> HUB
            </h1>
            <p className="text-yellow-300 font-extrabold text-xs sm:text-sm tracking-widest uppercase font-sans">
              E-Konek Passenger Self-Service Portal
            </p>
            <p className="text-white/80 text-xs sm:text-sm leading-relaxed font-semibold">
              Seamlessly bridge Batangas Montenegro maritime sailings with Occidental Mindoro highway shuttle transport networks from a single digital screen.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 shrink-0 w-full md:w-auto">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Connected Terminals Status</p>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Abra Pier: <b className="text-[#009E49]">LINKED</b></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                <span>Mamburao Hub: <b className="text-[#FF8800]">ONLINE</b></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weather tiles and Notices side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <WeatherWidget
            weatherData={abraWeather}
            title="🎫 Abra Port Station"
            lastUpdated={abraWeather ? formatPST(abraWeather.lastUpdated) : ''}
            isOnline={isOnline}
          />
          <WeatherWidget
            weatherData={mamburaoWeather}
            title="🚐 Mamburao Dispatch Station"
            lastUpdated={mamburaoWeather ? formatPST(mamburaoWeather.lastUpdated) : ''}
            isOnline={isOnline}
          />
        </div>

        {/* Port Bulletins & Local AI voice read-out system */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-1 -right-1 w-16 h-16 pointer-events-none opacity-5 text-indigo-900 text-6xl">
            <i className="fa-solid fa-bullhorn"></i>
          </div>
          <div>
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-500 font-sans flex items-center gap-1">
                <span><i className="fa-solid fa-bullhorn text-indigo-400"></i></span> 
                Live Bulletin Broadcast
              </h4>
              
              {/* Voice indicator or active audio waves */}
              {isSpeaking && (
                <div className="flex items-end gap-0.5 h-3 px-1.5 py-0.5 bg-[#FF8800]/10 rounded-md">
                  <div className="w-0.5 bg-[#FF8800] rounded-full animate-pulse h-1" />
                  <div className="w-0.5 bg-[#FF8800] rounded-full animate-pulse h-2" />
                  <div className="w-0.5 bg-[#FF8800] rounded-full animate-pulse h-1" />
                </div>
              )}
            </div>
            
            {recentAnnouncement ? (
              <div className="mt-3 space-y-3">
                <p className="text-xs sm:text-sm font-semibold text-slate-750 leading-relaxed italic border-l-2 border-indigo-200 pl-2">
                  "{recentAnnouncement.text}"
                </p>
                
                {/* Embedded Local Narrator PA Controls */}
                <div className="bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100 space-y-2 text-[10px]">
                  <div className="flex justify-between items-center font-bold text-slate-500 uppercase tracking-wide">
                    <span>🎙️ Local AI Narration</span>
                    {isSpeaking ? (
                      <span className="text-[#FF8800] animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF8800] inline-block animate-ping" /> Broadcasting...
                      </span>
                    ) : (
                      <span className="text-slate-400">Offline-capable System</span>
                    )}
                  </div>
                  
                  {/* Selectors for Profile */}
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => setVoiceProfile('feminine')}
                      className={`py-1 rounded-lg border text-center transition-all ${
                        voiceProfile === 'feminine'
                          ? 'bg-[#003087] text-white border-[#003087] font-black'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ♀ Female
                    </button>
                    <button
                      onClick={() => setVoiceProfile('masculine')}
                      className={`py-1 rounded-lg border text-center transition-all ${
                        voiceProfile === 'masculine'
                          ? 'bg-[#003087] text-white border-[#003087] font-black'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ♂ Male
                    </button>
                    <button
                      onClick={() => setVoiceProfile('robotic')}
                      className={`py-1 rounded-lg border text-center transition-all ${
                        voiceProfile === 'robotic'
                          ? 'bg-[#003087] text-white border-[#003087] font-black'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      🤖 Retro Bot
                    </button>
                  </div>
                  
                  {/* Speed & Speak actions */}
                  <div className="flex gap-2 items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-bold">Speed:</span>
                      <select
                        value={speechSpeed}
                        onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                        className="bg-white border border-slate-200 rounded-md py-0.5 px-1 font-bold text-slate-600"
                      >
                        <option value="0.75">Slower (0.75x)</option>
                        <option value="0.9">Normal (0.9x)</option>
                        <option value="1.1">Faster (1.1x)</option>
                      </select>
                    </div>

                    {isSpeaking ? (
                      <button
                        onClick={() => {
                          stopSpeaking();
                          setIsSpeaking(false);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-3 py-1 rounded-lg flex items-center gap-1 transition-all uppercase tracking-wider text-[9px] cursor-pointer"
                      >
                        <i className="fa-solid fa-volume-xmark"></i> Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setIsSpeaking(true);
                          speakAnnouncement(recentAnnouncement.text, {
                            profile: voiceProfile,
                            rate: speechSpeed,
                            onEnd: () => setIsSpeaking(false),
                            onError: () => setIsSpeaking(false)
                          });
                        }}
                        className="bg-[#009E49] hover:bg-[#00803B] text-white font-extrabold px-3 py-1 rounded-lg flex items-center gap-1 transition-all uppercase tracking-wider text-[9px] cursor-pointer"
                      >
                        <i className="fa-solid fa-volume-high animate-bounce"></i> Play Voice
                      </button>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-50 pt-2 flex justify-between items-center text-[9px] text-slate-400 font-bold">
                  <span>COUNTER: {recentAnnouncement.author}</span>
                  <span>{formatPST(recentAnnouncement.date)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic mt-3 font-semibold">No active terminal fleet notices currently broadcasted.</p>
            )}
          </div>
        </div>
      </div>

      {/* DYNAMIC COUNTDOWN & SCHEDULE BOARDS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-100 p-5 rounded-3xl shadow-sm gap-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-800 tracking-tight flex items-center gap-1.5">
              <span><i className="fa-solid fa-clock-rotate-left text-slate-400"></i></span>
              Integrated Sea-to-Land Departures Terminal Board
            </h3>
            <p className="text-xs text-slate-400 font-semibold">Departure estimates synchronized under Philippine Standard Time (PST)</p>
          </div>
          <div className="bg-slate-50 border border-slate-150 py-1.5 px-4 rounded-2xl flex items-center gap-3 shrink-0 self-stretch sm:self-auto text-center">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF8800]"></span>
            </div>
            <span className="text-xs font-black text-slate-755 font-mono">
              Schedules refresh in <b className="text-[#FF8800]">{refreshTimer}s</b>
            </span>
          </div>
        </div>

        {/* Side-by-Side Departures Board with premium detailing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Montenegro Ferry Crossings Board */}
          <div className={`bg-white rounded-3xl p-6 border border-slate-100 shadow-sm transition-all duration-300 ${pulseActive ? 'ring-2 ring-[#009E49]' : ''}`}>
            <div className="flex justify-between items-center border-b border-slate-50 pb-3 mb-4">
              <h4 className="font-black text-xs sm:text-sm text-[#003087] uppercase tracking-wider flex items-center gap-1.5">
                <span className="text-[#009E49]"><i className="fa-solid fa-ship"></i></span> 
                Montenegro Marine Voyages
              </h4>
              <span className="text-[10px] font-black uppercase text-[#009E49] px-2 py-0.5 bg-[#009E49]/15 rounded-full">Abra Pier Dock</span>
            </div>
            <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
              {ships.map((s) => (
                <div key={s.id} className="flex justify-between items-center bg-slate-50/30 p-3 rounded-2xl border border-slate-100/30 hover:bg-slate-50/80 transition-all duration-150">
                  <div className="space-y-1">
                    <span className="font-black text-slate-800 text-sm block">{s.name}</span>
                    <span className="text-xs text-[#003087] font-semibold flex items-center gap-1">
                      <i className="fa-solid fa-map-pin text-[10px] text-slate-400"></i> {s.route}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-slate-400 block">{formatPST(s.depTime)}</span>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    {s.available <= 0 ? (
                      <span className="bg-[#FF8800] text-white font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-widest">SOLD OUT</span>
                    ) : (
                      <span className="text-xs text-[#009E49] font-black">{s.available} / {s.capacity} Slots</span>
                    )}

                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                      s.status === 'Boarding' ? 'bg-[#003087]/15 text-[#003087] border-[#003087]/20 animate-pulse' :
                      s.status === 'Delayed' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                      'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shuttle departure board */}
          <div className={`bg-white rounded-3xl p-6 border border-slate-100 shadow-sm transition-all duration-300 ${pulseActive ? 'ring-2 ring-[#FF8800]' : ''}`}>
            <div className="flex justify-between items-center border-b border-slate-50 pb-3 mb-4">
              <h4 className="font-black text-xs sm:text-sm text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="text-[#FF8800]"><i className="fa-solid fa-truck-moving"></i></span> 
                Grand Terminal Dispatches
              </h4>
              <span className="text-[10px] font-black uppercase text-amber-600 px-2 py-0.5 bg-amber-100/80 rounded-full">Shuttle / Bus</span>
            </div>
            <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
              {trips.map((t) => (
                <div key={t.id} className="flex justify-between items-center bg-slate-50/30 p-3 rounded-2xl border border-slate-100/30 hover:bg-slate-50/80 transition-all duration-150">
                  <div className="space-y-1">
                    <span className="font-black text-slate-800 text-sm block">{t.driver}</span>
                    <span className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                      <i className="fa-solid fa-location-arrow text-[10px] text-slate-400"></i> {t.route}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-slate-400 block">{formatPST(t.depTime)}</span>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    {t.available <= 0 ? (
                      <span className="bg-[#FF8800] text-white font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-widest">FULL VEHICLE</span>
                    ) : (
                      <span className="text-xs text-slate-600 font-extrabold">{t.available} Available</span>
                    )}

                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                      t.status === 'Boarding' ? 'bg-[#003087]/15 text-[#003087] border-[#003087]/20 animate-pulse' :
                      t.status === 'Departed' ? 'bg-amber-100 text-[#FF8800] border-amber-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-100'
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

      {/* CONFIRMATION DIALOG / SWEET CARD (Styled elegantly as Boarding Pass Ticket format) */}
      <AnimatePresence>
        {bookingConfirmation && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-emerald-50/75 border-2 border-[#009E49] p-6 rounded-3xl shadow-xl space-y-4 relative overflow-hidden"
          >
            {/* Top decorative visual logo watermark */}
            <div className="absolute top-4 right-12 text-6xl opacity-[0.03] select-none text-emerald-950">
              <i className="fa-solid fa-anchor"></i>
            </div>

            <button
              onClick={() => setBookingConfirmation(null)}
              className="absolute top-4 right-5 text-emerald-800 text-2xl font-black cursor-pointer hover:bg-emerald-100 rounded-lg w-8 h-8 flex items-center justify-center transition-all"
            >
              &times;
            </button>
            
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-[#009E49]/15 rounded-2xl text-[#009E49] text-xl">
                <i className="fa-solid fa-ticket-alt text-xl"></i>
              </span>
              <div>
                <h4 className="font-black text-emerald-800 text-base uppercase">Passage Voucher Ready!</h4>
                <p className="text-xs text-emerald-600 font-semibold">Self-service ticket reservation has been recorded successfully.</p>
              </div>
            </div>

            {/* High Fidelity Boarding Voucher Frame */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-inner overflow-hidden max-w-xl mx-auto divide-y-2 divide-dashed divide-slate-150">
              {/* Receipt Header */}
              <div className="p-4 bg-slate-50 flex justify-between items-center text-xs">
                <div>
                  <p className="font-black text-slate-800 uppercase tracking-wider text-[9px]">{bookingConfirmation.isFerry ? 'Montenegro Shipping Vessel' : 'Mamburao Hub Shuttle'}</p>
                  <p className="font-extrabold text-[#003087] mt-0.5">{bookingConfirmation.targetName}</p>
                </div>
                <div className="text-right">
                  <span className="bg-[#009E49] text-white text-[9px] font-black px-2.5 py-1 rounded-full">{bookingConfirmation.isFerry ? 'FERRY PASS' : 'LAND PASS'}</span>
                </div>
              </div>

              {/* Receipt Details */}
              <div className="p-4 grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Passenger Profile</p>
                  <p className="text-slate-800 font-black text-sm mt-1">{bookingConfirmation.passenger}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Route Network</p>
                  <p className="text-[#003087] font-black mt-1">{bookingConfirmation.route}</p>
                </div>
              </div>

              {/* Receipt Footer with Reference codes */}
              <div className="p-4 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black">Check-in Reference Code</p>
                  <p className="font-mono font-black text-sm sm:text-base text-slate-800 uppercase tracking-wider mt-0.5">
                    {bookingConfirmation.id.toUpperCase()}
                  </p>
                </div>

                {/* Simulated QR block */}
                <div className="flex items-center gap-3">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${bookingConfirmation.id}`} 
                    alt="Booking QR"
                    className="w-12 h-12 bg-white p-1 border border-slate-200 rounded shadow-sm"
                  />
                  <div className="text-[9px] text-slate-400 font-semibold max-w-[120px] leading-tight">
                    Show QR counter reader at Mamburao checkpoint terminal.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2 max-w-xl mx-auto">
              {!bookingConfirmation.isFerry && (
                <button
                  onClick={() => {
                    setTrackedTripId(bookingConfirmation.tripId);
                    setBookingConfirmation(null);
                  }}
                  className="flex-1 bg-[#FF8800] hover:bg-[#E07700] text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-md transition-all border-b-4 border-orange-850 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-circle-play animate-pulse text-yellow-300"></i> Track My Shuttle GPS Location
                </button>
              )}
              <button
                onClick={() => setBookingConfirmation(null)}
                className="px-6 py-3.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-black rounded-xl text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer"
              >
                Okay
              </button>
            </div>
            
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOX FOR BOOKING TICKETS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Book Ferry Form - Montenegro concept styling */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
          {/* Montenegro visual branding bar */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#009E49]" />

          <div className="space-y-4">
            <h3 className="font-extrabold text-base text-[#003087] tracking-tight flex items-center gap-2">
              <span className="text-[#009E49]"><i className="fa-solid fa-ship"></i></span>
              Montenegro Marine Voyage Reservation
            </h3>
            <p className="text-xs text-slate-400 font-semibold">Reserve priority crossing slots. Pay cash at the Abra de Ilog Ticketing Port Counter.</p>
            
            <form onSubmit={handleFerryBookingSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Select Voyage Schedule</label>
                <select
                  value={voyageId}
                  onChange={(e) => setVoyageId(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#003087] cursor-pointer"
                >
                  <option value="">-- Choose Active Crossing Voyage --</option>
                  {ships
                    .filter(s => (s.status === 'Scheduled' || s.status === 'Boarding') && s.available > 0)
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.route}) - {s.available} spaces left</option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Passenger Full Name</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-400 text-xs"><i className="fa-solid fa-user"></i></span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maria dela Cruz"
                      value={ferryName}
                      onChange={(e) => setFerryName(e.target.value)}
                      className="w-full border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Contact Number</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-400 text-xs"><i className="fa-solid fa-phone"></i></span>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 09171234567"
                      value={ferryContact}
                      onChange={(e) => setFerryContact(e.target.value)}
                      className="w-full border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Passage Category Ticket</label>
                <select
                  value={ticketType}
                  onChange={(e) => setTicketType(e.target.value)}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#003087] cursor-pointer"
                >
                  <option value="Regular">Regular Class (₱500)</option>
                  <option value="Student">Student (₱350)</option>
                  <option value="Senior">Senior Citizen (₱300)</option>
                  <option value="PWD">PWD Discounted (₱300)</option>
                </select>
              </div>
            </form>
          </div>

          <button
            onClick={handleFerryBookingSubmit}
            className="w-full mt-6 bg-[#009E49] hover:bg-emerald-700 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-wider shadow-md transition hover:shadow-lg focus:ring-2 focus:ring-emerald-500 active:scale-95 flex items-center justify-center gap-2 cursor-pointer border-b-4 border-emerald-850"
          >
            {isOnline ? (
              <>
                <i className="fa-solid fa-file-invoice text-yellow-300"></i> Reserve Crossing Ticket
              </>
            ) : (
              <>
                <i className="fa-solid fa-cloud-arrow-down"></i> Queue Vessel Booking Offline
              </>
            )}
          </button>
        </div>

        {/* Book Shuttle Form - Mamburao concept styling */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
          {/* Mamburao visual branding bar */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#FF8800]" />

          <div className="space-y-4">
            <h3 className="font-extrabold text-base text-slate-800 tracking-tight flex items-center gap-2">
              <span className="text-[#FF8800]"><i className="fa-solid fa-bus"></i></span>
              Mamburao Hub Shuttle Seat Reservation
            </h3>
            <p className="text-xs text-slate-400 font-semibold">Pre-book land dispatch shuttle seats on Occidental highways. Real-time fleet tracking available.</p>
            
            <form onSubmit={handleLandBookingSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Select Airport/Dispatch Bus</label>
                <select
                  value={tripId}
                  onChange={(e) => setTripId(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF8800] cursor-pointer"
                >
                  <option value="">-- Choose Shuttle Dispatch Trip --</option>
                  {trips
                    .filter(t => (t.status === 'Scheduled' || t.status === 'Boarding') && t.available > 0)
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.route} ({t.type} class) - {t.available} seats left</option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Passenger Full Name</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-400 text-xs"><i className="fa-solid fa-user"></i></span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cardo Dalisay"
                      value={shuttleName}
                      onChange={(e) => setShuttleName(e.target.value)}
                      className="w-full border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Contact Number</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-400 text-xs"><i className="fa-solid fa-phone"></i></span>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 09201112222"
                      value={shuttleContact}
                      onChange={(e) => setShuttleContact(e.target.value)}
                      className="w-full border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Boarding/Pickup Point</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-400 text-[10px]"><i className="fa-solid fa-location-arrow"></i></span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Terminal Plaza"
                      value={pickupPoint}
                      onChange={(e) => setPickupPoint(e.target.value)}
                      className="w-full border border-slate-200 rounded-2xl pl-9 pr-3 py-2.5 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Seats Count</label>
                  <select
                    value={seatsCount}
                    onChange={(e) => setSeatsCount(e.target.value)}
                    className="w-full border border-slate-200 rounded-2xl px-2 py-2.5 text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    {[...Array(10)].map((_, i) => (
                      <option key={i+1} value={i+1}>{i+1}</option>
                    ))}
                  </select>
                </div>
              </div>
            </form>
          </div>

          <button
            onClick={handleLandBookingSubmit}
            className="w-full mt-6 bg-[#FF8800] hover:bg-[#E07700] text-white font-black py-4 rounded-2xl text-xs uppercase tracking-wider shadow-md transition hover:shadow-lg focus:ring-2 focus:ring-orange-500 active:scale-95 flex items-center justify-center gap-2 cursor-pointer border-b-4 border-orange-850"
          >
            {isOnline ? (
              <>
                <i className="fa-solid fa-receipt text-yellow-300"></i> Reserve Shuttle Seats
              </>
            ) : (
              <>
                <i className="fa-solid fa-cloud-arrow-down"></i> Queue Shuttle Booking Offline
              </>
            )}
          </button>
        </div>

      </div>

      {/* Floating Offline pending bookings sync badge */}
      {offlineQueue.length > 0 && (
        <div className="fixed bottom-4 left-4 z-40 bg-[#FF8800] border-2 border-white text-white font-black px-4 py-3 rounded-full shadow-2xl flex items-center gap-2.5 animate-bounce">
          <span className="text-sm"><i className="fa-solid fa-cloud-arrow-down"></i></span>
          <span className="text-[10px] uppercase tracking-wider font-mono font-black">{offlineQueue.length} Bookings awaiting synchronization</span>
        </div>
      )}

    </div>
  );
};

