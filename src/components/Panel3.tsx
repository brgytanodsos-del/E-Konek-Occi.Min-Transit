import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { WeatherWidget } from './WeatherWidget';
import { MapView } from './MapView';
import { generateId } from '../context/AppContext';

export const Panel3 = () => {
    const context = useContext(AppContext);
    if (!context) return null;
    const { ships, trips, ferryBookings, setFerryBookings, vanBookings, setVanBookings, announcements, abraWeather, mamburaoWeather } = context;
    
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
        const newBooking = { ...ferryForm, id: generateId(), status: 'Pending' };
        setFerryBookings([...ferryBookings, newBooking]);
        setBookingSuccess({ type: 'Ferry', ref: newBooking.id, details: ferryForm });
        setFerryForm({ shipId: '', name: '', contact: '', type: 'Regular' });
    };

    const handleVanSubmit = (e: React.FormEvent) => {
        e.preventDefault();
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

    return (
        <div className="pb-20 max-w-7xl mx-auto">
            <div className="bg-navy text-white p-6 text-center shadow-md relative overflow-hidden sm:rounded-b-lg">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')]"></div>
                <h1 className="text-2xl font-bold relative z-10">MindoroTransit</h1>
                <p className="text-sm text-orange mt-1 relative z-10">Montenegro Shipping & Mamburao Terminal</p>
            </div>

            {isHighWind && (
                <div className="bg-red-600 text-white p-3 text-sm font-bold text-center shadow-md flex items-center justify-center gap-2">
                    <span>⚠️</span> 
                    <span>WIND ADVISORY: High winds detected at Abra Port. Ferry schedules may be delayed or cancelled.</span>
                </div>
            )}

            <div className="p-4 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <WeatherWidget weatherData={abraWeather} title="Abra Port" />
                    <WeatherWidget weatherData={mamburaoWeather} title="Mamburao" />
                </div>

                {announcements.length > 0 && (
                    <div className="bg-orange/10 border-l-4 border-orange p-3 rounded">
                        <h3 className="text-sm font-bold text-orange flex items-center gap-1">
                            <span>📢</span> Latest Notice
                        </h3>
                        <p className="text-sm text-gray-800 mt-1">{announcements[0].text}</p>
                    </div>
                )}

                {bookingSuccess && (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg shadow-sm text-center space-y-3">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl">✓</div>
                        <h3 className="font-bold text-green-800">Booking Submitted!</h3>
                        <p className="text-sm text-gray-600">Your {bookingSuccess.type} booking is pending confirmation.</p>
                        <div className="bg-white p-2 rounded border border-gray-200">
                            <p className="text-xs text-gray-500">Reference Number</p>
                            <p className="font-mono font-bold text-lg tracking-widest">{bookingSuccess.ref.toUpperCase()}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setBookingSuccess(null)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 rounded tap-target transition-colors">Close</button>
                            {bookingSuccess.type === 'Van' && (
                                <button onClick={() => { 
                                    setTrackingMode(bookingSuccess.details.tripId); 
                                    setBookingSuccess(null); 
                                }} className="flex-1 bg-navy hover:bg-navy/90 text-white font-bold py-2 rounded tap-target transition-colors">Track Ride</button>
                            )}
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="flex justify-between items-end border-b-2 border-orange pb-1">
                        <h2 className="font-bold text-navy text-lg">Live Schedules</h2>
                        <span className="text-xs text-gray-500 font-mono">Refreshing in {refreshTimer}s...</span>
                    </div>
                    
                    <div className={`bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 ${pulse ? 'animate-pulse-fast ring-2 ring-orange' : ''}`}>
                        <div className="bg-navy text-white p-2 text-sm font-bold">Ferry Departures</div>
                        <div className="p-0">
                            {ships.map(ship => (
                                <div key={ship.id} className="p-3 border-b last:border-0 flex justify-between items-center hover:bg-gray-50">
                                    <div>
                                        <p className="font-bold text-navy">{ship.route}</p>
                                        <p className="text-xs text-gray-500">{ship.name} • {formatPST(ship.depTime)}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${ship.status === 'Boarding' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{ship.status}</span>
                                        <p className="text-xs text-orange mt-1">{ship.available} seats left</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={`bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 ${pulse ? 'animate-pulse-fast ring-2 ring-orange' : ''}`}>
                        <div className="bg-navy text-white p-2 text-sm font-bold">Terminal Departures</div>
                        <div className="p-0">
                            {trips.map(trip => (
                                <div key={trip.id} className="p-3 border-b last:border-0 flex justify-between items-center hover:bg-gray-50">
                                    <div>
                                        <p className="font-bold text-navy">{trip.route}</p>
                                        <p className="text-xs text-gray-500">{trip.type} • {formatPST(trip.depTime)}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${trip.status === 'Boarding' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{trip.status}</span>
                                        <p className="text-xs text-orange mt-1">{trip.available} seats left</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <form onSubmit={handleFerrySubmit} className="bg-white p-4 rounded-lg shadow-md space-y-3">
                        <h2 className="font-bold text-navy text-lg border-b-2 border-orange pb-1 mb-2">Book a Ferry Ticket (Montenegro)</h2>
                        <select required className="w-full border p-2 rounded tap-target text-sm" value={ferryForm.shipId} onChange={e => setFerryForm({...ferryForm, shipId: e.target.value})}>
                            <option value="">Select Voyage...</option>
                            {ships.filter(s => s.status === 'Scheduled' || s.status === 'Boarding').map(s => (
                                <option key={s.id} value={s.id}>{s.route} - {formatPST(s.depTime)}</option>
                            ))}
                        </select>
                        <input required type="text" placeholder="Passenger Name (e.g. Juan dela Cruz)" className="w-full border p-2 rounded tap-target text-sm" value={ferryForm.name} onChange={e => setFerryForm({...ferryForm, name: e.target.value})} />
                        <input required type="tel" placeholder="Contact Number" className="w-full border p-2 rounded tap-target text-sm" value={ferryForm.contact} onChange={e => setFerryForm({...ferryForm, contact: e.target.value})} />
                        <select className="w-full border p-2 rounded tap-target text-sm" value={ferryForm.type} onChange={e => setFerryForm({...ferryForm, type: e.target.value})}>
                            <option>Regular</option>
                            <option>Student</option>
                            <option>Senior</option>
                            <option>PWD</option>
                        </select>
                        <button type="submit" className="w-full bg-orange hover:bg-orange/90 text-white font-bold rounded tap-target transition-colors">Book Ferry</button>
                    </form>

                    <form onSubmit={handleVanSubmit} className="bg-white p-4 rounded-lg shadow-md space-y-3">
                        <h2 className="font-bold text-navy text-lg border-b-2 border-orange pb-1 mb-2">Book a Van/Bus Seat (Terminal)</h2>
                        <select required className="w-full border p-2 rounded tap-target text-sm" value={vanForm.tripId} onChange={e => setVanForm({...vanForm, tripId: e.target.value})}>
                            <option value="">Select Route...</option>
                            {trips.filter(t => t.status === 'Scheduled' || t.status === 'Boarding').map(t => (
                                <option key={t.id} value={t.id}>{t.route} - {formatPST(t.depTime)}</option>
                            ))}
                        </select>
                        <input required type="text" placeholder="Pickup Point (e.g. Mamburao Plaza)" className="w-full border p-2 rounded tap-target text-sm" value={vanForm.pickup} onChange={e => setVanForm({...vanForm, pickup: e.target.value})} />
                        <input required type="text" placeholder="Passenger Name" className="w-full border p-2 rounded tap-target text-sm" value={vanForm.name} onChange={e => setVanForm({...vanForm, name: e.target.value})} />
                        <div className="flex gap-2">
                            <input required type="tel" placeholder="Contact Number" className="flex-1 border p-2 rounded tap-target text-sm" value={vanForm.contact} onChange={e => setVanForm({...vanForm, contact: e.target.value})} />
                            <input required type="number" min={1} max={10} placeholder="Seats" className="w-24 border p-2 rounded tap-target text-sm" value={vanForm.seats} onChange={e => setVanForm({...vanForm, seats: parseInt(e.target.value) || 1})} />
                        </div>
                        <button type="submit" className="w-full bg-navy hover:bg-navy/90 text-white font-bold rounded tap-target transition-colors">Book Seat</button>
                    </form>
                </div>
            </div>
        </div>
    );
};
