import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { WeatherWidget } from './WeatherWidget';
import { MapView } from './MapView';
import { generateId } from '../context/AppContext';

export const Panel3 = () => {
    const context = useContext(AppContext);
    if (!context) return null;
    const { ships, setShips, trips, setTrips, ferryBookings, setFerryBookings, vanBookings, setVanBookings, announcements, abraWeather, mamburaoWeather } = context;
    
    const [ferryForm, setFerryForm] = useState({ shipId: '', name: '', contact: '', type: 'Regular' });
    const [vanForm, setVanForm] = useState({ tripId: '', pickup: '', name: '', contact: '', seats: 1 });
    const [bookingSuccess, setBookingSuccess] = useState<{type: string, ref: string, details: any} | null>(null);
    const [trackingMode, setTrackingMode] = useState<string | null>(null); 
    
    const [refreshTimer, setRefreshTimer] = useState(30);
    const [pulse, setPulse] = useState(false);

    useEffect(() => {
        const int = setInterval(() => {
            setRefreshTimer(prev => {
                if (prev === 1) {
                    setPulse(true);
                    setTimeout(() => setPulse(false), 1000);
                    return 30;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(int);
    }, []);

    const handleFerrySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const ship = ships.find(s => s.id === ferryForm.shipId);
        if (ship && ship.available > 0) {
            setShips(ships.map(s => s.id === ship.id ? { ...s, available: s.available - 1 } : s));
        }
        const newBooking = { ...ferryForm, id: generateId(), status: 'Pending' };
        setFerryBookings([...ferryBookings, newBooking]);
        setBookingSuccess({ type: 'Ferry', ref: newBooking.id, details: ferryForm });
        setFerryForm({ shipId: '', name: '', contact: '', type: 'Regular' });
    };

    const handleVanSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trip = trips.find(t => t.id === vanForm.tripId);
        if (trip && trip.available >= vanForm.seats) {
            setTrips(trips.map(t => t.id === trip.id ? { ...t, available: t.available - vanForm.seats } : t));
        }
        const newBooking = { ...vanForm, id: generateId(), status: 'Pending' };
        setVanBookings([...vanBookings, newBooking]);
        setBookingSuccess({ type: 'Van', ref: newBooking.id, details: vanForm });
        setVanForm({ tripId: '', pickup: '', name: '', contact: '', seats: 1 });
    };

    if (trackingMode) {
        const trackedTrip = trips.find(t => t.id === trackingMode);
        const markerPos = trackedTrip ? context.getTripLocation(trackedTrip.route) : ([13.2, 120.6] as [number, number]);
        
        return (
            <div className="pb-20 h-screen flex flex-col max-w-7xl mx-auto bg-bglight">
                <div className="bg-navy text-white p-4 shadow-md flex justify-between items-center sm:rounded-b-lg">
                    <h1 className="text-xl font-bold">Live Tracking</h1>
                    <button onClick={() => setTrackingMode(null)} className="bg-orange hover:bg-orange/90 transition-colors px-3 py-1 rounded text-sm font-bold tap-target">Close</button>
                </div>
                <div className="flex-1 relative">
                    <MapView 
                        center={markerPos} 
                        zoom={13}
                        markers={[{ id: 'user-ride', baseRoute: trackedTrip?.route, pos: markerPos, popupText: "<b>Your Ride</b><br/>Heading to destination" }]} 
                        liveUpdate={true}
                    />
                    <div className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded-lg shadow-lg z-[1000] max-w-lg mx-auto">
                        <h3 className="font-bold text-navy">Trip Status</h3>
                        <p className="text-sm text-gray-600">Your vehicle ({trackedTrip?.route}) is on the move. Please be ready at your pickup point.</p>
                    </div>
                </div>
            </div>
        );
    }

    const isHighWind = abraWeather && abraWeather.windspeed_10m > 30;
    const formatPST = (dateStr: string) => new Date(dateStr).toLocaleString('en-US', { timeZone: 'Asia/Manila', hour12: true, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const actualVanBooking = bookingSuccess && bookingSuccess.type === 'Van' ? vanBookings.find(b => b.id === bookingSuccess.ref) : null;
    const isVanConfirmed = actualVanBooking?.status === 'Confirmed';

    return (
        <div className="pb-20 max-w-7xl mx-auto">
            <div className="bg-navy text-white p-8 text-center shadow-md relative overflow-hidden sm:rounded-b-2xl">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')]"></div>
                <h1 className="text-3xl font-black relative z-10 tracking-tight">MindoroTransit</h1>
                <p className="text-sm font-bold text-orange mt-1 relative z-10 uppercase tracking-widest">Montenegro Shipping & Mamburao Terminal</p>
            </div>

            {isHighWind && (
                <div className="bg-red-600 text-white p-4 text-sm font-bold text-center shadow-md flex items-center justify-center gap-2 mt-4 mx-4 rounded-xl">
                    <span className="text-xl">⚠️</span> 
                    <span className="tracking-wide">WIND ADVISORY: High winds detected at Abra Port. Ferry schedules may be delayed or cancelled.</span>
                </div>
            )}

            <div className="p-4 space-y-6 mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="max-h-[160px]"><WeatherWidget weatherData={abraWeather} title="Abra Port" /></div>
                    <div className="max-h-[160px]"><WeatherWidget weatherData={mamburaoWeather} title="Mamburao" /></div>
                </div>

                {announcements.length > 0 && (
                    <div className="bg-orange/10 border-l-4 border-orange p-5 rounded-2xl shadow-sm">
                        <h3 className="text-sm font-black uppercase tracking-widest text-orange flex items-center gap-2">
                            <span>📢</span> LATEST NOTICE
                        </h3>
                        <p className="text-sm font-medium text-gray-800 mt-2">{announcements[0].text}</p>
                    </div>
                )}

                {bookingSuccess && (
                    <div className="bg-green-50 border border-green-200 p-6 rounded-2xl shadow-sm text-center space-y-4">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner">✓</div>
                        <h3 className="font-black text-green-800 text-lg uppercase tracking-tight">Booking Submitted!</h3>
                        <p className="text-sm font-medium text-gray-600">Your {bookingSuccess.type} booking is pending confirmation.</p>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 inline-block px-8">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reference Number</p>
                            <p className="font-mono font-black text-2xl text-navy tracking-widest mt-1">{bookingSuccess.ref.toUpperCase()}</p>
                        </div>
                        <div className="flex gap-4 pt-2">
                            <button onClick={() => setBookingSuccess(null)} className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold uppercase tracking-wider text-xs py-3 rounded-xl tap-target transition-colors shadow-sm">Close</button>
                            {bookingSuccess.type === 'Van' && isVanConfirmed && (
                                <button onClick={() => { 
                                    setTrackingMode(bookingSuccess.details.tripId); 
                                    setBookingSuccess(null); 
                                }} className="flex-1 bg-navy hover:bg-navy/90 text-white font-bold uppercase tracking-wider text-xs py-3 rounded-xl tap-target transition-colors shadow-sm">Track Ride</button>
                            )}
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    <div className="flex justify-between items-end border-b border-gray-200 pb-2">
                        <h2 className="font-black text-navy text-xl uppercase tracking-tight">Live Schedules</h2>
                        <span className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Refreshing in {refreshTimer}s
                        </span>
                    </div>
                    
                    <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 ${pulse ? 'ring-2 ring-orange/50' : ''}`}>
                        <div className="bg-gray-50 border-b border-gray-100 p-4">
                            <h3 className="font-black text-navy uppercase tracking-wider text-sm">Ferry Departures</h3>
                        </div>
                        <div className="p-0 divide-y divide-gray-50">
                            {ships.map(ship => (
                                <div key={ship.id} className="p-4 flex justify-between items-center hover:bg-blue-50/30 transition-colors">
                                    <div>
                                        <p className="font-bold text-gray-800">{ship.route}</p>
                                        <p className="text-[10px] font-mono text-gray-500 mt-1"><span className="font-bold text-gray-400">{ship.name}</span> • {formatPST(ship.depTime)}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full ${ship.status === 'Boarding' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{ship.status}</span>
                                        <p className="text-[10px] font-bold tracking-wider text-orange mt-2">{ship.available} SEATS LEFT</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 ${pulse ? 'ring-2 ring-orange/50' : ''}`}>
                        <div className="bg-gray-50 border-b border-gray-100 p-4">
                            <h3 className="font-black text-navy uppercase tracking-wider text-sm">Terminal Departures</h3>
                        </div>
                        <div className="p-0 divide-y divide-gray-50">
                            {trips.map(trip => (
                                <div key={trip.id} className="p-4 flex justify-between items-center hover:bg-blue-50/30 transition-colors">
                                    <div>
                                        <p className="font-bold text-gray-800">{trip.route}</p>
                                        <p className="text-[10px] font-mono text-gray-500 mt-1"><span className="font-bold text-gray-400">{trip.type}</span> • {formatPST(trip.depTime)}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full ${trip.status === 'Boarding' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{trip.status}</span>
                                        <p className="text-[10px] font-bold tracking-wider text-orange mt-2">{trip.available} SEATS LEFT</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                    <form onSubmit={handleFerrySubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                        <h2 className="font-black text-navy text-lg uppercase tracking-tight border-b border-gray-100 pb-3 mb-4">Book a Ferry Ticket <span className="text-orange whitespace-nowrap">(Montenegro)</span></h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Select Voyage</label>
                                <select required className="w-full border border-gray-200 bg-gray-50 focus:bg-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy tap-target text-sm" value={ferryForm.shipId} onChange={e => setFerryForm({...ferryForm, shipId: e.target.value})}>
                                    <option value="">Select Voyage...</option>
                                    {ships.filter(s => s.status === 'Scheduled' || s.status === 'Boarding').map(s => (
                                        <option key={s.id} value={s.id} disabled={s.available <= 0}>{s.route} - {formatPST(s.depTime)} {s.available <= 0 ? '(FULL)' : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Passenger Name</label>
                                <input required type="text" placeholder="e.g. Juan dela Cruz" className="w-full border border-gray-200 bg-gray-50 focus:bg-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy tap-target text-sm" value={ferryForm.name} onChange={e => setFerryForm({...ferryForm, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Contact Number</label>
                                <input required type="tel" placeholder="09XX XXX XXXX" className="w-full border border-gray-200 bg-gray-50 focus:bg-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy tap-target text-sm" value={ferryForm.contact} onChange={e => setFerryForm({...ferryForm, contact: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Ticket Type</label>
                                <select className="w-full border border-gray-200 bg-gray-50 focus:bg-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy tap-target text-sm" value={ferryForm.type} onChange={e => setFerryForm({...ferryForm, type: e.target.value})}>
                                    <option>Regular</option>
                                    <option>Student</option>
                                    <option>Senior</option>
                                    <option>PWD</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-orange hover:bg-orange/90 text-white font-bold text-sm tracking-wider uppercase px-6 py-4 rounded-xl tap-target mt-6 transition-colors shadow-sm">Book Ferry</button>
                    </form>

                    <form onSubmit={handleVanSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                        <h2 className="font-black text-navy text-lg uppercase tracking-tight border-b border-gray-100 pb-3 mb-4">Book a Van/Bus Seat <span className="text-orange whitespace-nowrap">(Terminal)</span></h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Select Route</label>
                                <select required className="w-full border border-gray-200 bg-gray-50 focus:bg-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy tap-target text-sm" value={vanForm.tripId} onChange={e => setVanForm({...vanForm, tripId: e.target.value})}>
                                    <option value="">Select Route...</option>
                                    {trips.filter(t => t.status === 'Scheduled' || t.status === 'Boarding').map(t => (
                                        <option key={t.id} value={t.id} disabled={t.available <= 0}>{t.route} - {formatPST(t.depTime)} {t.available <= 0 ? '(FULL)' : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Pickup Point</label>
                                <input required type="text" placeholder="e.g. Mamburao Plaza" className="w-full border border-gray-200 bg-gray-50 focus:bg-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy tap-target text-sm" value={vanForm.pickup} onChange={e => setVanForm({...vanForm, pickup: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Passenger Name</label>
                                <input required type="text" placeholder="e.g. Maria Clara" className="w-full border border-gray-200 bg-gray-50 focus:bg-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy tap-target text-sm" value={vanForm.name} onChange={e => setVanForm({...vanForm, name: e.target.value})} />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Contact</label>
                                    <input required type="tel" placeholder="09XX" className="w-full border border-gray-200 bg-gray-50 focus:bg-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy tap-target text-sm" value={vanForm.contact} onChange={e => setVanForm({...vanForm, contact: e.target.value})} />
                                </div>
                                <div className="w-24">
                                    <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Seats</label>
                                    <input required type="number" min={1} max={10} placeholder="1" className="w-full border border-gray-200 bg-gray-50 focus:bg-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy tap-target text-sm" value={vanForm.seats} onChange={e => setVanForm({...vanForm, seats: parseInt(e.target.value) || 1})} />
                                </div>
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-navy hover:bg-navy/90 text-white font-bold text-sm tracking-wider uppercase px-6 py-4 rounded-xl tap-target mt-6 transition-colors shadow-sm">Book Seat</button>
                    </form>
                </div>
            </div>
        </div>
    );
};
