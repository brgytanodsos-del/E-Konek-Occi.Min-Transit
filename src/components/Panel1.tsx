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
        const depTime = newShip.depTime ? new Date(newShip.depTime).toISOString() : '';
        const arrTime = newShip.arrTime ? new Date(newShip.arrTime).toISOString() : '';
        setShips([...ships, { ...newShip, id: generateId(), depTime, arrTime, available: parseInt(newShip.capacity) || 0, status: 'Scheduled', capacity: parseInt(newShip.capacity) || 0 }]);
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
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="col-span-1 md:col-span-5 lg:col-span-4">
                        <WeatherWidget weatherData={abraWeather} title="Abra Port Weather" />
                    </div>
                    <div className="col-span-1 md:col-span-7 lg:col-span-8 grid grid-cols-3 gap-4 lg:gap-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col justify-center">
                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-tighter">Tickets Sold</span>
                            <div className="flex items-baseline mt-1">
                                <span className="text-3xl font-black text-navy">{stats.totalSold}</span>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col justify-center">
                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-tighter">Pending</span>
                            <div className="flex items-baseline mt-1">
                                <span className="text-3xl font-black text-orange">{stats.pending}</span>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col justify-center">
                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-tighter">Departures</span>
                            <div className="flex items-baseline mt-1">
                                <span className="text-3xl font-black text-navy">{stats.departures}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {['reservations', 'schedule', 'announcements'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 text-sm font-bold uppercase tracking-wider rounded-xl transition-all tap-target ${activeTab === tab ? 'bg-navy text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-navy'}`}>
                            {tab}
                        </button>
                    ))}
                </div>

                {activeTab === 'reservations' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col select-none">
                        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/50 gap-2">
                            <h2 className="font-black text-navy uppercase tracking-tight">Online Reservations</h2>
                            <input 
                                type="text" 
                                placeholder="Search name, route, status..." 
                                className="border border-gray-200 rounded-lg p-2 text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-navy tap-target bg-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-white text-gray-400 font-bold border-b border-gray-100">
                                    <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Passenger</th>
                                    <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Voyage</th>
                                    <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Type</th>
                                    <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Status</th>
                                    <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredBookings.length === 0 ? (
                                    <tr><td colSpan={5} className="py-4 text-center text-gray-500">No reservations found.</td></tr>
                                ) : filteredBookings.map(booking => {
                                    const ship = ships.find(s => s.id === booking.shipId);
                                    return (
                                        <tr key={booking.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-800">{booking.name}</p>
                                                <p className="text-[10px] font-mono text-gray-400 mt-0.5">{booking.contact}</p>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{ship ? ship.name : 'Unknown'}</td>
                                            <td className="px-6 py-4 font-mono text-[10px] text-navy font-bold">{booking.type.toUpperCase()}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${booking.status === 'Confirmed' ? 'bg-green-100 text-green-700' : booking.status === 'Pending' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 flex items-center gap-2">
                                                {booking.status === 'Pending' && (
                                                    <>
                                                        <button onClick={() => handleBookingStatus(booking.id, 'Confirmed')} className="bg-navy hover:bg-navy/90 transition-colors text-white px-4 py-1.5 rounded-lg tap-target text-[10px] uppercase font-bold tracking-wider">Confirm</button>
                                                        <button onClick={() => handleBookingStatus(booking.id, 'Cancelled')} className="bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-gray-500 px-4 py-1.5 rounded-lg tap-target text-[10px] uppercase font-bold tracking-wider">Decline</button>
                                                    </>
                                                )}
                                                {booking.status === 'Confirmed' && (
                                                    <button onClick={() => setTicketModal(booking)} className="bg-orange hover:bg-orange/90 text-white px-4 py-1.5 rounded-lg tap-target text-[10px] uppercase font-bold tracking-wider transition-colors">Issue Ticket</button>
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

                {activeTab === 'schedule' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <h2 className="font-black text-navy uppercase tracking-tight">Voyage Schedule</h2>
                            </div>
                            <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-white text-gray-400 font-bold border-b border-gray-100">
                                        <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Vessel</th>
                                        <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Route</th>
                                        <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Departure</th>
                                        <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Seats</th>
                                        <th className="px-6 py-4 uppercase text-[10px] tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {ships.map(ship => (
                                        <tr key={ship.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-800">{ship.name}</td>
                                            <td className="px-6 py-4 text-gray-600">{ship.route}</td>
                                            <td className="px-6 py-4 font-mono text-navy font-bold text-[11px]">{formatPST(ship.depTime)}</td>
                                            <td className="px-6 py-4 text-gray-500 text-[11px] font-mono">{ship.available} / {ship.capacity}</td>
                                            <td className="px-6 py-4">
                                                <select 
                                                    value={ship.status} 
                                                    onChange={(e) => updateShipStatus(ship.id, e.target.value)}
                                                    className="bg-white border border-gray-200 text-gray-700 text-[10px] uppercase font-bold tracking-wider rounded-lg focus:ring-2 focus:ring-navy focus:border-navy block p-2 tap-target"
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
                        </div>

                        <form onSubmit={handleAddShip} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                            <h2 className="font-black text-navy uppercase tracking-tight border-b border-gray-100 pb-2">Add New Voyage</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input required type="text" placeholder="Ship Name" className="border border-gray-200 bg-gray-50 p-3 rounded-xl tap-target text-sm focus:outline-none focus:ring-2 focus:ring-navy" value={newShip.name} onChange={e => setNewShip({...newShip, name: e.target.value})} />
                                <input required type="text" placeholder="Route (e.g. Abra → Batangas)" className="border border-gray-200 bg-gray-50 p-3 rounded-xl tap-target text-sm focus:outline-none focus:ring-2 focus:ring-navy" value={newShip.route} onChange={e => setNewShip({...newShip, route: e.target.value})} />
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Departure Time</label>
                                    <input required type="datetime-local" className="border border-gray-200 bg-gray-50 p-3 rounded-xl w-full tap-target text-sm focus:outline-none focus:ring-2 focus:ring-navy" value={newShip.depTime} onChange={e => setNewShip({...newShip, depTime: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Arrival Time</label>
                                    <input required type="datetime-local" className="border border-gray-200 bg-gray-50 p-3 rounded-xl w-full tap-target text-sm focus:outline-none focus:ring-2 focus:ring-navy" value={newShip.arrTime} onChange={e => setNewShip({...newShip, arrTime: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Vessel Type</label>
                                    <select className="border border-gray-200 bg-gray-50 p-3 rounded-xl w-full tap-target text-sm focus:outline-none focus:ring-2 focus:ring-navy" value={newShip.type} onChange={e => setNewShip({...newShip, type: e.target.value})}>
                                        <option>RORO</option>
                                        <option>Passenger Ferry</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Total Capacity</label>
                                    <input required type="number" placeholder="Capacity count" className="border border-gray-200 bg-gray-50 p-3 rounded-xl w-full tap-target text-sm focus:outline-none focus:ring-2 focus:ring-navy" value={newShip.capacity} onChange={e => setNewShip({...newShip, capacity: e.target.value})} />
                                </div>
                            </div>
                            <button type="submit" className="w-full md:w-auto bg-navy hover:bg-navy/90 text-white font-bold text-sm tracking-wider uppercase px-6 py-3 rounded-xl tap-target mt-4 transition-colors">Publish Voyage</button>
                        </form>
                    </div>
                )}

                {activeTab === 'announcements' && (
                    <div className="space-y-6">
                        <form onSubmit={handleAddAnnouncement} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                            <h2 className="font-black text-navy uppercase tracking-tight border-b border-gray-100 pb-2">Post Announcement</h2>
                            <textarea required rows={3} className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange text-sm" placeholder="Write notice here..." value={newAnnouncement} onChange={e => setNewAnnouncement(e.target.value)}></textarea>
                            <button type="submit" className="w-full bg-orange hover:bg-orange/90 text-white font-bold text-sm tracking-wider uppercase px-6 py-3 rounded-xl tap-target transition-colors">Publish Notice</button>
                        </form>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <h2 className="font-black text-navy uppercase tracking-tight">Recent Notices</h2>
                            </div>
                            <div className="p-5 space-y-4">
                            {announcements.map(a => (
                                <div key={a.id} className="border-l-4 border-orange pl-4 py-2 bg-orange-50/30 rounded-r-xl">
                                    <p className="text-sm font-medium text-gray-800">{a.text}</p>
                                    <p className="text-[10px] font-mono text-gray-400 mt-2 uppercase tracking-wider">{formatPST(a.date)} • {a.author}</p>
                                </div>
                            ))}
                            </div>
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
                            <div className="w-32 h-32 mx-auto flex items-center justify-center border-4 border-white shadow-sm bg-white">
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticketModal.id}`} alt="QR Code" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
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
