import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { WeatherWidget } from './WeatherWidget';
import { MapView } from './MapView';
import { generateId } from '../context/AppContext';

export const Panel2 = () => {
    const context = useContext(AppContext);
    if (!context) return null;
    const { trips, setTrips, vanBookings, setVanBookings, ships, mamburaoWeather } = context;
    
    const [newTrip, setNewTrip] = useState({ route: '', depTime: '', type: 'Van', driver: '', capacity: '' });
    const [activeTab, setActiveTab] = useState('map'); 
    const [trackBooking, setTrackBooking] = useState<any>(null);

    const handleAddTrip = (e: React.FormEvent) => {
        e.preventDefault();
        const depTime = newTrip.depTime ? new Date(newTrip.depTime).toISOString() : '';
        setTrips([...trips, { ...newTrip, id: generateId(), depTime, available: parseInt(newTrip.capacity) || 0, status: 'Scheduled', capacity: parseInt(newTrip.capacity) || 0 }]);
        setNewTrip({ route: '', depTime: '', type: 'Van', driver: '', capacity: '' });
    };

    const updateTripStatus = (id: string, status: string) => {
        setTrips(trips.map(t => t.id === id ? { ...t, status } : t));
    };

    const handleBookingStatus = (id: string, status: string) => {
        setVanBookings(vanBookings.map(b => b.id === id ? { ...b, status } : b));
    };

    const stats = {
        activeTrips: trips.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled').length,
        totalBookings: vanBookings.length,
        pendingBookings: vanBookings.filter(b => b.status === 'Pending').length
    };

    // Calculate markers base route and status
    const activeMarkers = trips
        .filter(t => t.status === 'Boarding' || t.status === 'Departed')
        .map(t => ({
            id: t.id,
            baseRoute: t.route,
            pos: context.getTripLocation(t.route),
            popupText: `<b>${t.type} (${t.driver})</b><br/>Route: ${t.route}<br/>Status: ${t.status}`
        }));

    const formatPST = (dateStr: string) => new Date(dateStr).toLocaleString('en-US', { timeZone: 'Asia/Manila', hour12: true, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
        <div className="pb-20 max-w-7xl mx-auto">
            <div className="bg-navy text-white p-4 shadow-md sm:rounded-b-lg">
                <h1 className="text-xl font-bold">Mamburao Grand Terminal</h1>
                <p className="text-sm text-orange">Bus & Van Dispatch Dashboard</p>
            </div>

            <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="col-span-1 md:col-span-5 lg:col-span-4">
                        <WeatherWidget weatherData={mamburaoWeather} title="Mamburao Weather" />
                    </div>
                    <div className="col-span-1 md:col-span-7 lg:col-span-8 grid grid-cols-3 gap-4 lg:gap-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col justify-center">
                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-tighter">Active Trips</span>
                            <div className="flex items-baseline mt-1">
                                <span className="text-3xl font-black text-navy">{stats.activeTrips}</span>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col justify-center">
                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-tighter">Pending</span>
                            <div className="flex items-baseline mt-1">
                                <span className="text-3xl font-black text-orange">{stats.pendingBookings}</span>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col justify-center">
                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-tighter">Total Booked</span>
                            <div className="flex items-baseline mt-1">
                                <span className="text-3xl font-black text-navy">{stats.totalBookings}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {['map', 'fleet', 'bookings', 'sync'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 text-sm font-bold uppercase tracking-wider rounded-xl transition-all tap-target ${activeTab === tab ? 'bg-navy text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-navy'}`}>
                            {tab}
                        </button>
                    ))}
                </div>

                {activeTab === 'map' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h2 className="font-black text-navy uppercase tracking-tight">Live Fleet Tracking</h2>
                            <span className="flex items-center gap-1.5 text-[10px] tracking-widest text-green-600 font-black">
                                <span className="w-2 h-2 bg-green-500 animate-pulse rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span> {activeMarkers.length} ACTIVE
                            </span>
                        </div>
                        <p className="text-[10px] tracking-wider uppercase text-gray-400 font-bold">Simulated tracking for all active trips.</p>
                        <div className="rounded-xl overflow-hidden shadow-inner border border-gray-100">
                        <MapView 
                            center={[13.1, 120.65]} 
                            zoom={10}
                            markers={activeMarkers} 
                            liveUpdate={true}
                        />
                        </div>
                    </div>
                )}

                {activeTab === 'fleet' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <h2 className="font-black text-navy uppercase tracking-tight">Route & Schedule Manager</h2>
                            </div>
                            <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-white text-gray-400 font-bold border-b border-gray-100">
                                        <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Route</th>
                                        <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Time</th>
                                        <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Vehicle/Driver</th>
                                        <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Seats</th>
                                        <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {trips.map(trip => (
                                        <tr key={trip.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-800">{trip.route}</td>
                                            <td className="px-6 py-4 text-[11px] font-mono text-navy font-bold">{formatPST(trip.depTime)}</td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-700">{trip.type}</p>
                                                <p className="text-[10px] uppercase font-bold text-gray-400 mt-0.5">{trip.driver}</p>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 font-mono text-[11px]">{trip.available} / {trip.capacity}</td>
                                            <td className="px-6 py-4">
                                                <select 
                                                    value={trip.status} 
                                                    onChange={(e) => updateTripStatus(trip.id, e.target.value)}
                                                    className="bg-white border border-gray-200 text-gray-700 text-[10px] uppercase font-bold tracking-wider rounded-lg focus:ring-2 focus:ring-navy focus:border-navy block p-2 tap-target"
                                                >
                                                    <option value="Scheduled">Scheduled</option>
                                                    <option value="Boarding">Boarding</option>
                                                    <option value="Departed">Departed</option>
                                                    <option value="Completed">Completed</option>
                                                    <option value="Cancelled">Cancelled</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        </div>

                        <form onSubmit={handleAddTrip} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                            <h2 className="font-black text-navy uppercase tracking-tight border-b border-gray-100 pb-2">Add New Trip</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Route</label>
                                    <input required type="text" placeholder="e.g. Mamburao → San Jose" className="border border-gray-200 bg-gray-50 p-3 rounded-xl w-full tap-target text-sm focus:outline-none focus:ring-2 focus:ring-navy" value={newTrip.route} onChange={e => setNewTrip({...newTrip, route: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Departure Time</label>
                                    <input required type="datetime-local" className="border border-gray-200 bg-gray-50 p-3 rounded-xl w-full tap-target text-sm focus:outline-none focus:ring-2 focus:ring-navy" value={newTrip.depTime} onChange={e => setNewTrip({...newTrip, depTime: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Vehicle Type</label>
                                    <select className="border border-gray-200 bg-gray-50 p-3 rounded-xl w-full tap-target text-sm focus:outline-none focus:ring-2 focus:ring-navy" value={newTrip.type} onChange={e => setNewTrip({...newTrip, type: e.target.value})}>
                                        <option>Van</option>
                                        <option>Bus</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Driver Name</label>
                                    <input required type="text" placeholder="e.g. Juanito" className="border border-gray-200 bg-gray-50 p-3 rounded-xl w-full tap-target text-sm focus:outline-none focus:ring-2 focus:ring-navy" value={newTrip.driver} onChange={e => setNewTrip({...newTrip, driver: e.target.value})} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Total Capacity</label>
                                    <input required type="number" placeholder="Capacity count" className="border border-gray-200 bg-gray-50 p-3 rounded-xl w-full md:w-1/2 tap-target text-sm focus:outline-none focus:ring-2 focus:ring-navy" value={newTrip.capacity} onChange={e => setNewTrip({...newTrip, capacity: e.target.value})} />
                                </div>
                            </div>
                            <button type="submit" className="w-full md:w-auto bg-navy hover:bg-navy/90 text-white font-bold text-sm tracking-wider uppercase px-6 py-3 rounded-xl tap-target mt-4 transition-colors">Publish Trip</button>
                        </form>
                    </div>
                )}

                {activeTab === 'bookings' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col select-none">
                        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="font-black text-navy uppercase tracking-tight">Online Bookings</h2>
                        </div>
                        <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-white text-gray-400 font-bold border-b border-gray-100">
                                    <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Passenger</th>
                                    <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Trip Route</th>
                                    <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Pickup</th>
                                    <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Seats</th>
                                    <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Status</th>
                                    <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {vanBookings.map(booking => {
                                    const trip = trips.find(t => t.id === booking.tripId);
                                    return (
                                        <tr key={booking.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-800">{booking.name}</p>
                                                <p className="text-[10px] font-mono text-gray-400 mt-0.5">{booking.contact}</p>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-600">{trip ? trip.route : 'Unknown'}</td>
                                            <td className="px-6 py-4 text-gray-600">{booking.pickup}</td>
                                            <td className="px-6 py-4 font-mono font-bold text-navy">{booking.seats}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${booking.status === 'Confirmed' ? 'bg-green-100 text-green-700' : booking.status === 'Pending' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 flex items-center gap-2">
                                                {booking.status === 'Pending' && (
                                                    <>
                                                        <button onClick={() => handleBookingStatus(booking.id, 'Confirmed')} className="bg-navy hover:bg-navy/90 text-white px-4 py-1.5 rounded-lg tap-target text-[10px] uppercase font-bold tracking-wider transition-colors">Confirm</button>
                                                        <button onClick={() => handleBookingStatus(booking.id, 'Cancelled')} className="bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-gray-500 px-4 py-1.5 rounded-lg tap-target text-[10px] uppercase font-bold tracking-wider">Decline</button>
                                                    </>
                                                )}
                                                {booking.status === 'Confirmed' && (
                                                    <button onClick={() => setTrackBooking(booking)} className="bg-orange hover:bg-orange/90 text-white px-4 py-1.5 rounded-lg tap-target text-[10px] uppercase font-bold tracking-wider transition-colors">Track</button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        </div>
                    </div>
                )}

                {activeTab === 'sync' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-orange overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-orange/20 bg-orange/5">
                            <div className="flex justify-between items-center mb-1">
                                <h2 className="font-black text-navy uppercase tracking-tight">Montenegro Shipping Line Sync</h2>
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-orange uppercase tracking-wider">
                                    <span className="w-2 h-2 bg-orange animate-pulse rounded-full shadow-[0_0_8px_rgba(255,107,0,0.8)]"></span> LIVE
                                </span>
                            </div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Read-only feed to time van/bus routes with ferry arrivals.</p>
                        </div>
                        <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-white text-gray-400 font-bold border-b border-gray-100">
                                    <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Vessel</th>
                                    <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Route</th>
                                    <th className="px-6 py-4 uppercase text-[10px] tracking-wider">ETA/ETD</th>
                                    <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {ships.map(ship => (
                                    <tr key={ship.id} className="hover:bg-orange/5 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-800">{ship.name}</td>
                                        <td className="px-6 py-4 text-gray-600">{ship.route}</td>
                                        <td className="px-6 py-4 font-mono text-[11px]">
                                            <p className="text-gray-500 mt-0.5"><span className="text-gray-400">DEP:</span> {formatPST(ship.depTime)}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-gray-100 px-3 py-1 rounded-lg text-[10px] font-black tracking-wider text-navy uppercase">{ship.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    </div>
                )}
            </div>

            {trackBooking && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="bg-navy p-5 text-white flex justify-between items-center">
                            <h3 className="font-black uppercase tracking-tight">Passenger Location</h3>
                            <button onClick={() => setTrackBooking(null)} className="text-white/70 hover:text-white font-black text-xl tap-target">×</button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <p className="font-bold text-gray-800 text-lg">{trackBooking.name}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Pickup: {trackBooking.pickup}</p>
                            </div>
                            {(() => {
                                const trip = trips.find(t => t.id === trackBooking.tripId);
                                if (!trip) return <p className="text-sm text-gray-500 font-medium">Trip not found.</p>;
                                const pos = context.getTripLocation(trip.route);
                                return (
                                    <div className="rounded-xl overflow-hidden shadow-inner border border-gray-200 h-64">
                                        <MapView 
                                            center={pos} 
                                            zoom={13} 
                                            markers={[{ id: trackBooking.id, pos, baseRoute: trip.route, popupText: `<b>${trackBooking.name}</b><br/>Route: ${trip.route}` }]} 
                                            liveUpdate={true} 
                                        />
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
