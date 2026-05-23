import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { Search, Filter, Calendar, Key, Bell, Menu, ExternalLink, X, Flame } from 'lucide-react';

export const Panel4 = () => {
    const context = useContext(AppContext);
    const [showWhatsNew, setShowWhatsNew] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Transform context bookings into API-style logs to match the aesthetic
    const ferryLogs = context?.ferryBookings.map(b => ({ id: b.id, type: 'Ferry Request', path: `/v1/ferry/${b.id}`, method: 'POST', status: b.status === "Confirmed" ? 200 : 202, time: '2m' })) || [];
    const vanLogs = context?.vanBookings.map(b => ({ id: b.id, type: 'Van Request', path: `/v1/van/${b.id}`, method: 'POST', status: b.status === "Confirmed" ? 200 : 202, time: '5m' })) || [];
    
    // Combine with literal network logs from the backend crawler
    const apiLogs = context?.networkLogs || [];

    let allLogs = [...apiLogs, ...ferryLogs, ...vanLogs].filter(l => l.path.includes(searchTerm) || l.type.includes(searchTerm));

    return (
        <div className="absolute inset-0 bg-[#0a0a0c] text-white z-40 overflow-y-auto font-sans pb-24">
            {/* Header Navbar */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-900 bg-[#0a0a0c]">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Flame className="w-6 h-6 text-orange-600 fill-orange-600" />
                    </div>
                    <div className="flex items-center bg-neutral-900/50 border border-neutral-800 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-neutral-800 transition-colors">
                        <div className="w-5 h-5 bg-orange-600 text-white flex items-center justify-center rounded text-[10px] font-bold mr-2">P</div>
                        <span className="text-sm font-medium text-neutral-200">Personal Team</span>
                        <svg className="w-4 h-4 ml-2 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="w-9 h-9 flex items-center justify-center bg-neutral-900/50 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-colors"><Bell className="w-4 h-4 text-neutral-400" /></button>
                    <button className="w-9 h-9 flex items-center justify-center bg-neutral-900/50 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-colors"><Menu className="w-4 h-4 text-neutral-400" /></button>
                </div>
            </div>

            <div className="max-w-[1000px] mx-auto p-4 sm:p-8 pt-6 sm:pt-12">
                <h1 className="text-3xl sm:text-[40px] font-bold tracking-tight mb-2 text-white">Activity Logs</h1>
                <p className="text-neutral-400 text-sm sm:text-base mb-8">Take a look at your requests activity</p>

                <div className="border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl bg-neutral-950">
                    {/* Control Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-[#111113] border-b border-neutral-800">
                        <div className="flex-1 flex items-center bg-[#1a1a1e] border border-neutral-800 rounded-lg px-3 py-2 sm:py-2 focus-within:border-neutral-600 transition-colors">
                            <Search className="w-4 h-4 text-neutral-500" />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                className="bg-transparent border-none text-sm text-white ml-2 flex-1 focus:outline-none placeholder-neutral-500"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button className="flex-1 sm:flex-none p-2.5 border border-neutral-800 bg-[#1a1a1e] rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center"><Filter className="w-4 h-4 text-neutral-400" /></button>
                            <button className="flex-1 sm:flex-none p-2.5 border border-neutral-800 bg-[#1a1a1e] rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center"><Calendar className="w-4 h-4 text-neutral-400" /></button>
                            <button className="flex-1 sm:flex-none p-2.5 border border-neutral-800 bg-[#1a1a1e] rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center"><Key className="w-4 h-4 text-neutral-400" /></button>
                        </div>
                    </div>

                    {/* List Area */}
                    <div className="bg-[#0a0a0c] min-h-[400px] flex flex-col items-center justify-center relative">
                        {allLogs.length > 0 ? (
                            <div className="w-full absolute inset-0 overflow-y-auto">
                                <table className="w-full text-left text-sm text-neutral-400">
                                    <thead className="bg-[#0a0a0c] sticky top-0 border-b border-neutral-800 z-10">
                                        <tr>
                                            <th className="font-medium p-4 py-3 text-xs w-24">Status</th>
                                            <th className="font-medium p-4 py-3 text-xs w-24">Method</th>
                                            <th className="font-medium p-4 py-3 text-xs">Path</th>
                                            <th className="font-medium p-4 py-3 text-xs text-right">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-800/50">
                                        {allLogs.map((log, i) => (
                                            <tr key={i} className="hover:bg-neutral-900/40 transition-colors group">
                                                <td className="p-4 py-3">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${log.status === 200 ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 py-3 font-mono text-[11px] text-blue-400 uppercase">{log.method}</td>
                                                <td className="p-4 py-3 font-mono text-[11px] text-neutral-300">{log.path}</td>
                                                <td className="p-4 py-3 text-right text-xs text-neutral-500">{log.time}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <span className="text-neutral-500 text-sm">No activity logs found</span>
                        )}
                    </div>
                </div>

                {/* Simulated Toast/Popup from Image */}
                {showWhatsNew && (
                    <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-[320px] bg-[#0f0f12] border border-neutral-800 rounded-2xl shadow-2xl p-5 z-50">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-600"></div>
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none mt-0.5">WHAT'S NEW</span>
                            </div>
                            <div className="flex gap-4">
                                <button className="text-neutral-500 hover:text-neutral-300 transition-colors"><ExternalLink className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setShowWhatsNew(false)} className="text-neutral-500 hover:text-neutral-300 transition-colors"><X className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>
                        <h3 className="text-white font-medium mb-2 text-[15px]">v2.10 is live</h3>
                        <p className="text-neutral-400 text-sm leading-relaxed mb-4">
                            Firecrawl v2.10 ships the /parse endpoint, Lockdown Mode, Question and Highlights formats, and four new...
                        </p>
                        <div className="bg-white rounded-xl p-6 h-[120px] relative border border-neutral-200 flex flex-col justify-center overflow-hidden">
                            <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiMwMDAiLz48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjZmZmIi8+PC9zdmc+')]"></div>
                            <h4 className="text-[22px] font-bold text-black leading-none relative z-10">v2.10</h4>
                            <h4 className="text-[28px] tracking-tight font-bold text-[#FF6B00] relative z-10 leading-extratight">Release</h4>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
