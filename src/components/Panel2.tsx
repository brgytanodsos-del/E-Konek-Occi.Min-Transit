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

    const handleAddTrip = (e: React.FormEvent) => {
        e.preventDefault();
        setTrips([...trips, { ...newTrip, id: generateId(), available: parseInt(newTrip.capacity) || 0, status: 'Scheduled', capacity: parseInt(newTrip.capacity) || 0 }]);
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <WeatherWidget weatherData={mamburaoWeather} title="Mamburao Weather" />
                    <div className="bg-white p-4 rounded-lg shadow-md grid grid-cols-3 gap-2 text-center">
                        <div>
                            <p className="text-2xl font-bold text-navy">{stats.activeTrips}</p>
                            <p className="text-xs text-gray-500">Active Trips</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-orange">{stats.pendingBookings}</p>
                            <p className="text-xs text-gray-500">Pending</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-navy">{stats.totalBookings}</p>
                            <p className="text-xs text-gray-500">Total Booked</p>
                        </div>
                    </div>
                </div>

                <div className="flex bg-white rounded-lg shadow overflow-hidden">
                    {['map', 'fleet', 'bookings', 'sync'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-sm font-bold capitalize tap-target ${activeTab === tab ? 'bg-orange text-white' : 'text-navy hover:bg-gray-50'}`}>
                            {tab}
                        </button>
                    ))}
                </div>

                {activeTab === 'map' && (
                    <div className="bg-white p-4 rounded-lg shadow-md space-y-3">
                        <div className="flex justify-between items-center">
                            <h2 className="font-bold text-navy">Live Fleet Tracking</h2>
                            <span className="flex items-center gap-1 text-xs text-green-600 font-bold">
                                <span className="w-2 h-2 bg-green-600 animate-pulse rounded-full"></span> {activeMarkers.length} ACTIVE
                            </span>
                        </div>
                        <p className="text-xs text-gray-500">Simulated tracking for all active trips.</p>
                        <MapView 
                            center={[13.1, 120.65]} 
                            zoom={10}
                            markers={activeMarkers} 
                            liveUpdate={true}
                        />
                    </div>
                )}

                {activeTab === 'fleet' && (
                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                            <h2 className="font-bold text-navy mb-3">Route & Schedule Manager</h2>
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="border-b text-gray-500">
                                        <th className="pb-2 pr-4">Route</th>
                                        <th className="pb-2 pr-4">Time</th>
                                        <th className="pb-2 pr-4">Vehicle/Driver</th>
                                        <th className="pb-2 pr-4">Seats</th>
                                        <th className="pb-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trips.map(trip => (
                                        <tr key={trip.id} className="border-b last:border-0 hover:bg-gray-50">
                                            <td className="py-3 pr-4 font-bold">{trip.route}</td>
                                            <td className="py-3 pr-4">{formatPST(trip.depTime)}</td>
                                            <td className="py-3 pr-4">
                                                <p>{trip.type}</p>
                                                <p className="text-xs text-gray-500">{trip.driver}</p>
                                            </td>
                                            <td className="py-3 pr-4">{trip.available}/{trip.capacity}</td>
                                            <td className="py-3">
                                                <select 
                                                    value={trip.status} 
                                                    onChange={(e) => updateTripStatus(trip.id, e.target.value)}
                                                    className="bg-gray-100 border border-gray-300 text-gray-900 text-xs rounded focus:ring-navy focus:border-navy block w-full p-1 tap-target"
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

                        <form onSubmit={handleAddTrip} className="bg-white p-4 rounded-lg shadow-md space-y-3">
                            <h2 className="font-bold text-navy">Add New Trip</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input required type="text" placeholder="Route (e.g. Mamburao → San Jose)" className="border p-2 rounded tap-target" value={newTrip.route} onChange={e => setNewTrip({...newTrip, route: e.target.value})} />
                                <div>
                                    <label className="text-xs text-gray-500">Departure Time</label>
                                    <input required type="datetime-local" className="border p-2 rounded w-full tap-target" value={newTrip.depTime} onChange={e => setNewTrip({...newTrip, depTime: e.target.value})} />
                                </div>
                                <select className="border p-2 rounded tap-target" value={newTrip.type} onChange={e => setNewTrip({...newTrip, type: e.target.value})}>
                                    <option>Van</option>
                                    <option>Bus</option>
                                </select>
                                <input required type="text" placeholder="Driver Name" className="border p-2 rounded tap-target" value={newTrip.driver} onChange={e => setNewTrip({...newTrip, driver: e.target.value})} />
                                <input required type="number" placeholder="Total Capacity" className="border p-2 rounded tap-target md:col-span-2" value={newTrip.capacity} onChange={e => setNewTrip({...newTrip, capacity: e.target.value})} />
                            </div>
                            <button type="submit" className="w-full bg-navy hover:bg-navy/90 text-white font-bold rounded tap-target mt-2 transition-colors">Add Trip</button>
                        </form>
                    </div>
                )}

                {activeTab === 'bookings' && (
                    <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto select-none">
                        <h2 className="font-bold text-navy mb-3">Online Bookings</h2>
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                                <tr className="border-b text-gray-500">
                                    <th className="pb-2 pr-4">Passenger</th>
                                    <th className="pb-2 pr-4">Trip Route</th>
                                    <th className="pb-2 pr-4">Pickup</th>
                                    <th className="pb-2 pr-4">Seats</th>
                                    <th className="pb-2 pr-4">Status</th>
                                    <th className="pb-2">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vanBookings.map(booking => {
                                    const trip = trips.find(t => t.id === booking.tripId);
                                    return (
                                        <tr key={booking.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                                            <td className="py-3 pr-4">
                                                <p className="font-bold">{booking.name}</p>
                                                <p className="text-xs text-gray-500">{booking.contact}</p>
                                            </td>
                                            <td className="py-3 pr-4">{trip ? trip.route : 'Unknown'}</td>
                                            <td className="py-3 pr-4">{booking.pickup}</td>
                                            <td className="py-3 pr-4">{booking.seats}</td>
                                            <td className="py-3 pr-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${booking.status === 'Confirmed' ? 'bg-green-100 text-green-800' : booking.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                            <td className="py-3 flex gap-2">
                                                {booking.status === 'Pending' && (
                                                    <>
                                                        <button onClick={() => handleBookingStatus(booking.id, 'Confirmed')} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded tap-target text-xs font-bold transition-colors">Confirm</button>
                                                        <button onClick={() => handleBookingStatus(booking.id, 'Cancelled')} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded tap-target text-xs font-bold transition-colors">Cancel</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'sync' && (
                    <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto border-2 border-orange">
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="font-bold text-navy">Montenegro Shipping Line Sync</h2>
                            <span className="flex items-center gap-1 text-xs text-green-600 font-bold">
                                <span className="w-2 h-2 bg-green-600 animate-pulse rounded-full"></span> LIVE
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">Read-only feed to time van/bus routes with ferry arrivals.</p>
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                                <tr className="border-b text-gray-500">
                                    <th className="pb-2 pr-4">Vessel</th>
                                    <th className="pb-2 pr-4">Route</th>
                                    <th className="pb-2 pr-4">ETA/ETD</th>
                                    <th className="pb-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ships.map(ship => (
                                    <tr key={ship.id} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="py-3 pr-4 font-bold">{ship.name}</td>
                                        <td className="py-3 pr-4">{ship.route}</td>
                                        <td className="py-3 pr-4">
                                            <p className="text-xs text-gray-500">Dep: {formatPST(ship.depTime)}</p>
                                            <p className="text-xs text-gray-500">Arr: {formatPST(ship.arrTime)}</p>
                                        </td>
                                        <td className="py-3">
                                            <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-navy">{ship.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
