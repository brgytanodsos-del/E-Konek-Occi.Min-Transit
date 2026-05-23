import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { WeatherWidget } from './WeatherWidget';
import { generateId } from '../context/AppContext';
import { FerryBooking } from '../types';

export const Panel1 = () => {
    const context = useContext(AppContext);
    if (!context) return null;
    const { ships, setShips, ferryBookings, setFerryBookings, announcements, setAnnouncements, abraWeather } = context;
    
    const [newShip, setNewShip] = useState({ name: '', route: '', depTime: '', arrTime: '', type: 'RORO', capacity: '' });
    const [newAnnouncement, setNewAnnouncement] = useState('');
    const [activeTab, setActiveTab] = useState('reservations'); 
    const [ticketModal, setTicketModal] = useState<FerryBooking | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleAddShip = (e: React.FormEvent) => {
        e.preventDefault();
        setShips([...ships, { ...newShip, id: generateId(), available: parseInt(newShip.capacity) || 0, status: 'Scheduled', capacity: parseInt(newShip.capacity) || 0 }]);
        setNewShip({ name: '', route: '', depTime: '', arrTime: '', type: 'RORO', capacity: '' });
    };

    const updateShipStatus = (id: string, status: string) => {
        setShips(ships.map(s => s.id === id ? { ...s, status } : s));
    };

    const handleBookingStatus = (id: string, status: string) => {
        setFerryBookings(ferryBookings.map(b => b.id === id ? { ...b, status } : b));
    };

    const handleAddAnnouncement = (e: React.FormEvent) => {
        e.preventDefault();
        if(!newAnnouncement) return;
        setAnnouncements([{ id: generateId(), text: newAnnouncement, date: new Date().toISOString(), author: 'Abra Port Admin' }, ...announcements]);
        setNewAnnouncement('');
    };

    const filteredBookings = ferryBookings.filter(b => {
        const ship = ships.find(s => s.id === b.shipId);
        const term = searchTerm.toLowerCase();
        return b.name.toLowerCase().includes(term) || 
               b.status.toLowerCase().includes(term) || 
               (ship && ship.route.toLowerCase().includes(term));
    });

    const stats = {
        totalSold: ferryBookings.filter(b => b.status === 'Confirmed').length,
        pending: ferryBookings.filter(b => b.status === 'Pending').length,
        departures: ships.filter(s => s.status === 'Scheduled' || s.status === 'Boarding').length
    };

    const formatPST = (dateStr: string) => new Date(dateStr).toLocaleString('en-US', { timeZone: 'Asia/Manila', hour12: true, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
        <div className="pb-20 max-w-7xl mx-auto">
            <div className="bg-navy text-white p-4 shadow-md no-print sm:rounded-b-lg">
                <h1 className="text-xl font-bold">Montenegro Shipping Line</h1>
                <p className="text-sm text-orange">Abra Port Ticketing Station</p>
            </div>

            <div className="p-4 space-y-4 no-print">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <WeatherWidget weatherData={abraWeather} title="Abra Port Weather" />
                    <div className="bg-white p-4 rounded-lg shadow-md grid grid-cols-3 gap-2 text-center">
                        <div>
                            <p className="text-2xl font-bold text-navy">{stats.totalSold}</p>
                            <p className="text-xs text-gray-500">Tickets Sold</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-orange">{stats.pending}</p>
                            <p className="text-xs text-gray-500">Pending</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-navy">{stats.departures}</p>
                            <p className="text-xs text-gray-500">Departures</p>
                        </div>
                    </div>
                </div>

                <div className="flex bg-white rounded-lg shadow overflow-hidden">
                    {['reservations', 'schedule', 'announcements'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-sm font-bold capitalize tap-target ${activeTab === tab ? 'bg-orange text-white' : 'text-navy hover:bg-gray-50'}`}>
                            {tab}
                        </button>
                    ))}
                </div>

                {activeTab === 'reservations' && (
                    <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto select-none">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 gap-2">
                            <h2 className="font-bold text-navy">Online Reservations</h2>
                            <input 
                                type="text" 
                                placeholder="Search name, route, status..." 
                                className="border border-gray-300 rounded p-2 text-sm w-full md:w-64 tap-target"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                                <tr className="border-b text-gray-500">
                                    <th className="pb-2 pr-4">Passenger</th>
                                    <th className="pb-2 pr-4">Voyage</th>
                                    <th className="pb-2 pr-4">Type</th>
                                    <th className="pb-2 pr-4">Status</th>
                                    <th className="pb-2">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBookings.length === 0 ? (
                                    <tr><td colSpan={5} className="py-4 text-center text-gray-500">No reservations found.</td></tr>
                                ) : filteredBookings.map(booking => {
                                    const ship = ships.find(s => s.id === booking.shipId);
                                    return (
                                        <tr key={booking.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                                            <td className="py-3 pr-4">
                                                <p className="font-bold">{booking.name}</p>
                                                <p className="text-xs text-gray-500">{booking.contact}</p>
                                            </td>
                                            <td className="py-3 pr-4">{ship ? ship.name : 'Unknown'}</td>
                                            <td className="py-3 pr-4">{booking.type}</td>
                                            <td className="py-3 pr-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${booking.status === 'Confirmed' ? 'bg-green-100 text-green-800' : booking.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                            <td className="py-3 flex gap-2">
                                                {booking.status === 'Pending' && (
                                                    <>
                                                        <button onClick={() => handleBookingStatus(booking.id, 'Confirmed')} className="bg-green-500 hover:bg-green-600 transition-colors text-white px-3 py-1 rounded tap-target text-xs font-bold">Confirm</button>
                                                        <button onClick={() => handleBookingStatus(booking.id, 'Cancelled')} className="bg-red-500 hover:bg-red-600 transition-colors text-white px-3 py-1 rounded tap-target text-xs font-bold">Cancel</button>
                                                    </>
                                                )}
                                                {booking.status === 'Confirmed' && (
                                                    <button onClick={() => setTicketModal(booking)} className="bg-navy hover:bg-navy/90 text-white px-3 py-1 rounded tap-target text-xs font-bold transition-colors">Issue Ticket</button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'schedule' && (
                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                            <h2 className="font-bold text-navy mb-3">Voyage Schedule</h2>
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="border-b text-gray-500">
                                        <th className="pb-2 pr-4">Vessel</th>
                                        <th className="pb-2 pr-4">Route</th>
                                        <th className="pb-2 pr-4">Departure</th>
                                        <th className="pb-2 pr-4">Seats</th>
                                        <th className="pb-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ships.map(ship => (
                                        <tr key={ship.id} className="border-b last:border-0 hover:bg-gray-50">
                                            <td className="py-3 pr-4 font-bold">{ship.name}</td>
                                            <td className="py-3 pr-4">{ship.route}</td>
                                            <td className="py-3 pr-4">{formatPST(ship.depTime)}</td>
                                            <td className="py-3 pr-4">{ship.available}/{ship.capacity}</td>
                                            <td className="py-3">
                                                <select 
                                                    value={ship.status} 
                                                    onChange={(e) => updateShipStatus(ship.id, e.target.value)}
                                                    className="bg-gray-100 border border-gray-300 text-gray-900 text-xs rounded focus:ring-navy focus:border-navy block w-full p-1 tap-target"
                                                >
                                                    <option value="Scheduled">Scheduled</option>
                                                    <option value="Boarding">Boarding</option>
                                                    <option value="Departed">Departed</option>
                                                    <option value="Delayed">Delayed</option>
                                                    <option value="Cancelled">Cancelled</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <form onSubmit={handleAddShip} className="bg-white p-4 rounded-lg shadow-md space-y-3">
                            <h2 className="font-bold text-navy">Add New Voyage</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input required type="text" placeholder="Ship Name" className="border p-2 rounded tap-target" value={newShip.name} onChange={e => setNewShip({...newShip, name: e.target.value})} />
                                <input required type="text" placeholder="Route (e.g. Abra → Batangas)" className="border p-2 rounded tap-target" value={newShip.route} onChange={e => setNewShip({...newShip, route: e.target.value})} />
                                <div>
                                    <label className="text-xs text-gray-500">Departure Time</label>
                                    <input required type="datetime-local" className="border p-2 rounded w-full tap-target" value={newShip.depTime} onChange={e => setNewShip({...newShip, depTime: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Arrival Time</label>
                                    <input required type="datetime-local" className="border p-2 rounded w-full tap-target" value={newShip.arrTime} onChange={e => setNewShip({...newShip, arrTime: e.target.value})} />
                                </div>
                                <select className="border p-2 rounded tap-target" value={newShip.type} onChange={e => setNewShip({...newShip, type: e.target.value})}>
                                    <option>RORO</option>
                                    <option>Passenger Ferry</option>
                                </select>
                                <input required type="number" placeholder="Total Capacity" className="border p-2 rounded tap-target" value={newShip.capacity} onChange={e => setNewShip({...newShip, capacity: e.target.value})} />
                            </div>
                            <button type="submit" className="w-full bg-navy hover:bg-navy/90 text-white font-bold rounded tap-target mt-2 transition-colors">Add Voyage</button>
                        </form>
                    </div>
                )}

                {activeTab === 'announcements' && (
                    <div className="space-y-4">
                        <form onSubmit={handleAddAnnouncement} className="bg-white p-4 rounded-lg shadow-md space-y-3">
                            <h2 className="font-bold text-navy">Post Announcement</h2>
                            <textarea required rows={3} className="w-full border p-2 rounded" placeholder="Write notice here..." value={newAnnouncement} onChange={e => setNewAnnouncement(e.target.value)}></textarea>
                            <button type="submit" className="w-full bg-orange hover:bg-orange/90 text-white font-bold rounded tap-target transition-colors">Post Notice</button>
                        </form>
                        <div className="bg-white p-4 rounded-lg shadow-md space-y-3">
                            <h2 className="font-bold text-navy">Recent Announcements</h2>
                            {announcements.map(a => (
                                <div key={a.id} className="border-l-4 border-orange pl-3 py-1">
                                    <p className="text-sm">{a.text}</p>
                                    <p className="text-xs text-gray-500 mt-1">{formatPST(a.date)} • {a.author}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {ticketModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 no-print">
                    <div id="print-ticket" className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="bg-navy p-4 text-white text-center">
                            <h3 className="font-bold text-lg">Boarding Pass</h3>
                            <p className="text-xs text-orange">Montenegro Shipping Line</p>
                        </div>
                        <div className="p-6 space-y-4 text-center">
                            <div className="w-32 h-32 bg-gray-200 mx-auto flex items-center justify-center border-4 border-white shadow-sm">
                                <span className="text-4xl">QR</span>
                            </div>
                            <div>
                                <p className="font-bold text-xl">{ticketModal.name}</p>
                                <p className="text-sm text-gray-500">{ticketModal.type} Ticket</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded text-left text-sm space-y-1 border border-gray-200">
                                <p><span className="text-gray-500">Ref:</span> <span className="font-mono font-bold">{ticketModal.id.toUpperCase()}</span></p>
                                <p><span className="text-gray-500">Vessel:</span> {ships.find(s => s.id === ticketModal.shipId)?.name}</p>
                                <p><span className="text-gray-500">Route:</span> {ships.find(s => s.id === ticketModal.shipId)?.route}</p>
                                <p><span className="text-gray-500">Date:</span> {formatPST(ships.find(s => s.id === ticketModal.shipId)?.depTime || '')}</p>
                            </div>
                            <div className="flex gap-2 no-print">
                                <button onClick={() => window.print()} className="flex-1 bg-navy hover:bg-navy/90 transition-colors text-white font-bold rounded tap-target">Print Ticket</button>
                                <button onClick={() => setTicketModal(null)} className="flex-1 bg-gray-200 hover:bg-gray-300 transition-colors text-gray-800 font-bold rounded tap-target">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
