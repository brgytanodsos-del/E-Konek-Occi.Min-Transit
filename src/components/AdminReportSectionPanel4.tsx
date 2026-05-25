import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { SummaryCard } from './common/SummaryCard';

export const AdminReportSectionPanel4 = () => {
  const {
    transactions,
    setTransactions,
    payoutHistory,
    setPayoutHistory,
    auditLog,
    formatPST,
    updateTransaction,
    persistPayout,
    adminAccounts,
    ferryBookings,
    setFerryBookings,
    vanBookings,
    setVanBookings,
    ships,
    setShips,
    trips,
    setTrips,
    updateBookingStatus,
    persistShip,
    persistTrip
  } = useApp();

  // Admin Account Generation Drawer
  const [isAdminDrawerOpen, setIsAdminDrawerOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'port' | 'terminal'>('port');
  const [newAdminPin, setNewAdminPin] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
 
  const handleApproveAdmin = async (id: string, fullName: string) => {
    try {
      const { fsUpdate } = await import('../lib/firebase');
      await fsUpdate('adminAccounts', id, { status: 'active' });
      alert(`Account for ${fullName} approved successfully!`);
    } catch (err) {
      console.error(err);
      alert("Failed to approve account");
    }
  };

  const handleRejectAdmin = async (id: string, fullName: string) => {
    if (!confirm(`Are you sure you want to REJECT and DELETE the application for ${fullName}?`)) return;
    try {
      const { fsDelete } = await import('../lib/firebase');
      await fsDelete('adminAccounts', id);
      alert(`Application for ${fullName} rejected.`);
    } catch (err) {
      console.error(err);
      alert("Failed to reject application");
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName || !newAdminPin) return alert("Please fill all fields");
    if (newAdminPin.length !== 4) return alert("PIN must be exactly 4 digits");

    setIsCreatingAdmin(true);
    try {
      const { fsSet } = await import('../lib/firebase');
      const newAdmin = {
        id: 'adm-' + Math.random().toString(36).substr(2, 9),
        fullName: newAdminName,
        role: newAdminRole,
        pin: newAdminPin,
        createdAt: new Date().toISOString(),
        status: 'active'
      };
      await fsSet('adminAccounts', newAdmin.id, newAdmin);
      setNewAdminName('');
      setNewAdminPin('');
      setIsAdminDrawerOpen(false);
      alert("Staff Admin account generated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to create admin account");
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  // Search/Filter states
  const [filterType, setFilterType] = useState('All');
  const [filterPeriod, setFilterPeriod] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Audit list folding state
  const [auditOpen, setAuditOpen] = useState(false);

  // Filters calculation
  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      const typeMatches = filterType === 'All' || t.type === filterType;
      
      const statusMatches = filterStatus === 'All' || t.status === filterStatus;
      
      const searchMatches = t.passengerName.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      let periodMatches = true;
      if (filterPeriod === 'Today') {
        const startOfToday = new Date().setHours(0,0,0,0);
        periodMatches = new Date(t.timestamp).getTime() >= startOfToday;
      } else if (filterPeriod === 'Week') {
        const startOfWeek = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
        periodMatches = new Date(t.timestamp).getTime() >= startOfWeek;
      } else if (filterPeriod === 'Custom') {
        const txTime = new Date(t.timestamp).getTime();
        let matchesStart = true;
        let matchesEnd = true;
        if (customStartDate) {
          const start = new Date(customStartDate).setHours(0,0,0,0);
          matchesStart = txTime >= start;
        }
        if (customEndDate) {
          const end = new Date(customEndDate).setHours(23,59,59,999);
          matchesEnd = txTime <= end;
        }
        periodMatches = matchesStart && matchesEnd;
      }

      return typeMatches && statusMatches && searchMatches && periodMatches;
    });
  };

  const filteredList = getFilteredTransactions();

  // Financial statistics calculations
  const completedTx = filteredList.filter(t => t.status === 'Completed');

  const totalCommissions = completedTx.reduce((acc, t) => acc + t.commissionAmount, 0);
  const totalTransactionsCount = completedTx.length;
  const ferryCommissions = completedTx.filter(t => t.type === 'Ferry').reduce((acc, t) => acc + t.commissionAmount, 0);
  const landCommissions = completedTx.filter(t => t.type === 'Van' || t.type === 'Bus').reduce((acc, t) => acc + t.commissionAmount, 0);
  const totalGrossRevenue = completedTx.reduce((acc, t) => acc + t.grossAmount, 0);
  const pendingPayout = completedTx.filter(t => !t.paid).reduce((acc, t) => acc + t.commissionAmount, 0);

  // Refund handler
  const handleRefund = async (txId: string) => {
    if (confirm("Are you sure you want to REFUND this ticket transaction? This action will reverse commissions and cancel the associated booking to free up passenger slots.")) {
      
      const tx = transactions.find(t => t.id === txId);
      if (!tx) return;

      setTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: 'Refunded' } : t));
      await updateTransaction(txId, { status: 'Refunded' });

      if (tx.type === 'Ferry') {
        const booking = ferryBookings.find(b => b.id === tx.bookingId);
        if (booking && booking.status === 'Confirmed') {
          setFerryBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'Cancelled' } : b));
          await updateBookingStatus('ferryBookings', booking.id, 'Cancelled');
          
          const ship = ships.find(s => s.id === booking.shipId);
          if (ship) {
            const updatedShip = { ...ship, available: Math.min(ship.capacity, ship.available + 1) };
            setShips(prev => prev.map(s => s.id === ship.id ? updatedShip : s));
            await persistShip(updatedShip);
          }
        }
      } else {
        const booking = vanBookings.find(b => b.id === tx.bookingId);
        if (booking && booking.status === 'Confirmed') {
          setVanBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'Cancelled' } : b));
          await updateBookingStatus('vanBookings', booking.id, 'Cancelled');

          const trip = trips.find(t => t.id === booking.tripId);
          if (trip) {
            const seatsToRestore = Number(booking.seats || 1);
            const updatedTrip = { ...trip, available: Math.min(trip.capacity, trip.available + seatsToRestore) };
            setTrips(prev => prev.map(t => t.id === trip.id ? updatedTrip : t));
            await persistTrip(updatedTrip);
          }
        }
      }
    }
  };

  // Payout processing
  const handleMarkAllAsPaid = async () => {
    const unpaidList = completedTx.filter(t => !t.paid);
    if (unpaidList.length === 0) return alert("No outstanding pending payouts to settle.");

    const totalPaid = unpaidList.reduce((acc, t) => acc + t.commissionAmount, 0);
    const count = unpaidList.length;

    // Set paid true on database/state
    setTransactions(prev => prev.map(t => t.status === 'Completed' ? { ...t, paid: true } : t));
    for (const tx of unpaidList) {
      await updateTransaction(tx.id, { paid: true });
    }

    // Log payout event
    const newPayout = {
      id: 'ph-' + Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      totalAmount: totalPaid,
      transactionCount: count
    };

    setPayoutHistory(prev => [newPayout, ...prev]);
    await persistPayout(newPayout);
    alert(`Successfully processed payout for ₱${totalPaid} across ${count} completion logs!`);
  };

  // CSV Generator blob builder
  const handleExportCSV = () => {
    const columns = ["Timestamp", "Ref ID", "Passenger", "Route", "Type", "Gross Amount (PHP)", "Commission (PHP)", "Confirmed By", "Status"];
    
    const rows = getFilteredTransactions().map(t => [
      formatPST(t.timestamp),
      t.id,
      t.passengerName,
      t.route,
      t.type,
      t.grossAmount,
      t.commissionAmount,
      t.confirmedBy,
      t.status
    ]);

    const csvContent = [
      columns.join(","),
      ...rows.map(e => e.map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `EKonek_OcciMindoTransit_Admin_Export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSS Chart widths percentage
  const totalCommGraph = Math.max(1, ferryCommissions + landCommissions);
  const busCommissions = completedTx.filter(t => t.type === 'Bus').reduce((acc, t) => acc + t.commissionAmount, 0);
  const vanCommsVal = completedTx.filter(t => t.type === 'Van').reduce((acc, t) => acc + t.commissionAmount, 0);

  const ferryPct = Math.round((ferryCommissions / totalCommGraph) * 100);
  const vanPct = Math.round((vanCommsVal / totalCommGraph) * 100);
  const busPct = Math.round((busCommissions / totalCommGraph) * 100);

  return (
    <div className="admin-report-page p-6 space-y-8 animate-fade-in text-[#2D3748]">
      
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <h1 className="text-2xl font-black text-[#003580] tracking-tight font-sans">🛡️ Super Admin Control and Financial Console</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setIsAdminDrawerOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4.5 py-2.5 rounded-xl shadow cursor-pointer transition flex items-center gap-2"
          >
            <i className="fa-solid fa-user-shield"></i> Staff Admin Registry
          </button>
          <p className="text-gray-500 text-xs mt-0.5 hidden sm:block">Review transit commission margins, payroll payouts, log audits, and system registries.</p>
        </div>
      </div>

      <AnimatePresence>
        {isAdminDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdminDrawerOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white z-[1001] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b flex justify-between items-center bg-indigo-50">
                <h3 className="font-black text-indigo-900 uppercase tracking-widest text-sm flex items-center gap-2">
                  <i className="fa-solid fa-id-card-clip"></i> Staff Access Registry
                </h3>
                <button onClick={() => setIsAdminDrawerOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Pending Approvals Section */}
                {adminAccounts.some(a => a.status === 'pending') && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-amber-600 tracking-widest flex items-center gap-2">
                       <i className="fa-solid fa-clock-rotate-left"></i> Pending Approvals
                    </h4>
                    <div className="space-y-2">
                      {adminAccounts.filter(a => a.status === 'pending').map(adm => (
                        <div key={adm.id} className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-3 shadow-sm">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs uppercase shadow-inner border border-amber-200">
                                {adm.fullName.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-slate-800 truncate">{adm.fullName}</p>
                                <p className="text-[9px] font-bold text-amber-700 uppercase flex items-center gap-1 mt-0.5">
                                   <span className="opacity-60">{adm.role === 'port' ? '🚢 Port' : '🚐 Terminal'}</span>
                                   <span className="mx-1">•</span>
                                   <span>{formatPST(adm.createdAt).split(',')[0]}</span>
                                </p>
                              </div>
                           </div>
                           <div className="flex gap-2">
                              <button 
                                onClick={() => handleApproveAdmin(adm.id, adm.fullName)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest py-2 rounded-xl transition shadow-md"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleRejectAdmin(adm.id, adm.fullName)}
                                className="flex-1 bg-white hover:bg-rose-50 text-rose-500 border border-rose-200 text-[9px] font-black uppercase tracking-widest py-2 rounded-xl transition"
                              >
                                Reject
                              </button>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleCreateAdmin} className="space-y-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-2">Issue New Access</h4>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Staff Full Name</label>
                    <input
                      required
                      type="text"
                      value={newAdminName}
                      onChange={e => setNewAdminName(e.target.value)}
                      placeholder="e.g. Juan De La Cruz"
                      className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Assigned Station</label>
                    <select
                      value={newAdminRole}
                      onChange={e => setNewAdminRole(e.target.value as 'port' | 'terminal')}
                      className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="port">🚢 Abra Port Staff</option>
                      <option value="terminal">🚐 Mamburao Terminal Staff</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Set 4-Digit PIN</label>
                    <input
                      required
                      type="password"
                      maxLength={4}
                      pattern="\d{4}"
                      value={newAdminPin}
                      onChange={e => setNewAdminPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    disabled={isCreatingAdmin}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl shadow-lg transition disabled:opacity-50"
                  >
                    {isCreatingAdmin ? 'Processing...' : 'Authorize Staff Account'}
                  </button>
                </form>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-users-gear text-xs"></i> Authorized Personnel ({adminAccounts.filter(a => a.status === 'active').length})
                  </h4>
                  <div className="divide-y border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    {adminAccounts.filter(a => a.status === 'active').length === 0 ? (
                      <p className="p-4 text-center text-xs text-gray-400 font-medium">No active staff admins assigned.</p>
                    ) : (
                      adminAccounts.filter(a => a.status === 'active').map((adm) => (
                        <div key={adm.id} className="p-4 bg-white flex justify-between items-center group hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-[10px] uppercase shadow-inner">
                              {adm.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-800 leading-tight">{adm.fullName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-tighter">
                                  {adm.role === 'port' ? '🚢 Port' : '🚐 Terminal'}
                                </p>
                                <span className="text-[8px] text-gray-300">•</span>
                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">ID: {adm.id}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                             <div className="flex flex-col items-end">
                               <span className="text-[9px] font-mono font-bold text-gray-300 block mb-1">PIN: ****</span>
                               <button 
                                 onClick={() => handleRejectAdmin(adm.id, adm.fullName)}
                                 className="opacity-0 group-hover:opacity-100 text-[8px] text-rose-500 font-black uppercase hover:underline transition-opacity"
                               >
                                 Suspend
                               </button>
                             </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 1. HORIZONTALLY SCROLLABLE SUMMARY CARDS */}
      <div className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory">
        <SummaryCard label="Gross Commissions" value={`₱${totalCommissions}`} subValue={`${totalTransactionsCount} total sales log`} />
        
        <SummaryCard label="Ferry Commissions" value={`₱${ferryCommissions}`} subValue="Abra Port Share" valueClassName="text-indigo-600" />
        
        <SummaryCard label="Van & Bus Commissions" value={`₱${landCommissions}`} subValue="Mamburao dispatch Share" valueClassName="text-[#FF6B00]" />
        
        <SummaryCard label="Total Gross Ticket sales" value={`₱${totalGrossRevenue}`} subValue="Gross Philippine PST Sale" valueClassName="text-emerald-600" />
        
        <SummaryCard 
          label="Pending Payout" 
          value={`₱${pendingPayout}`} 
          subValue="Unsettled Commissions" 
          containerClassName="bg-[#002150]"
          labelClassName="text-white/50"
          valueClassName="text-[#FF6B00] font-mono"
          subValueClassName="text-white/40"
        />
      </div>

      {/* 2. CUSTOM CSS BAR CHART (Zero chart JS libraries!) */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-bold text-sm text-[#003580] uppercase tracking-wider">📊 Commissions Allocation Ratio breakdown</h3>
        
        <div className="space-y-4 pt-1">
          {/* Ferry Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-gray-700">
              <span className="flex items-center gap-1.5">🚢 Ferry (Montenegro Lines)</span>
              <span>₱{ferryCommissions} ({ferryPct}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
              <div
                className="bg-[#003580] h-full rounded-full transition-all duration-300 min-w-[4px]"
                style={{ width: `${Math.max(4, ferryPct)}%` }}
              />
            </div>
          </div>

          {/* Van Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-gray-700">
              <span className="flex items-center gap-1.5">🚐 Van Shuttles</span>
              <span>₱{vanCommsVal} ({vanPct}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
              <div
                className="bg-[#FF6B00] h-full rounded-full transition-all duration-300 min-w-[4px]"
                style={{ width: `${Math.max(4, vanPct)}%` }}
              />
            </div>
          </div>

          {/* Bus Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-gray-700">
              <span className="flex items-center gap-1.5">🚌 Bus Shuttles</span>
              <span>₱{busCommissions} ({busPct}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
              <div
                className="bg-teal-500 h-full rounded-full transition-all duration-300 min-w-[4px]"
                style={{ width: `${Math.max(4, busPct)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. TRANSACTION LOG REPORT SECTION WITH REFUND */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <h2 className="text-lg font-black text-[#003580] font-sans">📋 Transaction Auditing Database</h2>
          <button
            onClick={handleExportCSV}
            className="self-start sm:self-auto bg-teal-600 hover:bg-teal-700 text-white text-xs font-black px-4.5 py-2.5 rounded-xl shadow cursor-pointer transition flex items-center gap-2"
          >
            📥 Export report (CSV)
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Search Name / Ref</label>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-lg px-2.5 py-2 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Transport Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-lg px-2 py-2 focus:outline-none"
            >
              <option value="All">All Types</option>
              <option value="Ferry">Ferry Only</option>
              <option value="Van">Van Only</option>
              <option value="Bus">Bus Only</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Reporting Window</label>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-lg px-2 py-2 focus:outline-none"
            >
              <option value="All">All History</option>
              <option value="Today">Today Only</option>
              <option value="Week">This Week</option>
              <option value="Custom">Custom Range</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Sales Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-lg px-2 py-2 focus:outline-none"
            >
              <option value="All">All Status</option>
              <option value="Completed">Completed</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>
        </div>

        {filterPeriod === 'Custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-indigo-50 p-4 rounded-2xl border border-indigo-100 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-indigo-700 mb-1.5">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-indigo-700 mb-1.5">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>
        )}

        {/* Table representation */}
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-150 text-[10px] text-gray-400 uppercase tracking-widest font-extrabold pb-3">
                <th className="py-2.5">Date (PST)</th>
                <th className="py-2.5">Ticket REF</th>
                <th className="py-2.5">Passenger</th>
                <th className="py-2.5">Transit Route Details</th>
                <th className="py-2.5">Rate allocation</th>
                <th className="py-2.5">Gross (₱)</th>
                <th className="py-2.5 text-orange-600">Commission (₱)</th>
                <th className="py-2.5">Confirmed By</th>
                <th className="py-2.5 text-center">Status</th>
                <th className="py-2.5 text-right no-print">Refund</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16">
                    <div className="flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                      <i className="fa-solid fa-file-invoice text-4xl text-slate-300"></i>
                      <div>
                        <p className="text-slate-500 font-bold">No transactions found</p>
                        <p className="text-xs text-slate-400">Try adjusting your filters or date range.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredList.map((t) => (
                <tr
                  key={t.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    t.status === 'Completed' ? 'bg-green-50/10' : 'bg-rose-50/20'
                  }`}
                >
                  <td className="py-4 px-2 font-mono text-[9px] font-semibold text-slate-500">{formatPST(t.timestamp)}</td>
                  <td className="py-4 font-mono text-[10px] font-black text-indigo-600">#{t.id.toUpperCase()}</td>
                  <td className="py-4 font-bold text-slate-800 text-xs">{t.passengerName}</td>
                  <td className="py-4 text-slate-500 text-[10px] font-semibold leading-tight">
                    <p className="mb-1 text-slate-700">{t.route}</p>
                    <span className="font-extrabold text-blue-500 font-mono uppercase bg-blue-50 px-1.5 py-0.5 rounded tracking-wider">{t.type}</span>
                  </td>
                  <td className="py-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t.ticketType}</td>
                  <td className="py-4 font-black text-slate-700 text-sm">₱{t.grossAmount}</td>
                  <td className="py-4 font-black text-orange-600 text-sm">₱{t.commissionAmount}</td>
                  <td className="py-4 text-slate-400 text-[10px] font-bold uppercase">{t.confirmedBy}</td>
                  <td className="py-4 text-center">
                    <span className={`px-2 py-1 rounded-md text-[9px] uppercase tracking-widest font-black ${
                      t.status === 'Completed' ? 'bg-emerald-100/50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="py-4 text-right pr-2 no-print">
                    {t.status === 'Completed' ? (
                      <button
                        onClick={() => handleRefund(t.id)}
                        className="bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 font-black text-[10px] px-3 py-1.5 rounded-lg transition"
                      >
                        Refund
                      </button>
                    ) : (
                      <span className="text-rose-500/50 text-[10px] font-black uppercase tracking-widest block pr-2">Refunded</span>
                    )}
                  </td>
                </tr>
              ))}
              
              {/* RUNNING TOTAL ROW */}
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 border-b">
                <td colSpan={5} className="py-3 pl-3 text-right uppercase text-xs font-extrabold tracking-widest text-[#003580]">
                  Running sum total:
                </td>
                <td className="py-3 text-xs">
                  ₱{filteredList.filter(t => t.status === 'Completed').reduce((acc, b) => acc + b.grossAmount, 0)}
                </td>
                <td className="py-3 text-xs text-orange-600">
                  ₱{filteredList.filter(t => t.status === 'Completed').reduce((acc, b) => acc + b.commissionAmount, 0)}
                </td>
                <td colSpan={3} className="py-3"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. PAYOUT MANAGER */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-black text-[#003580] font-sans">💳 Settlement & Commission Payouts</h2>
            <p className="text-xs text-gray-400 mt-0.5">Disburse earned funds and outstanding balances to transit station operators.</p>
          </div>
          <button
            onClick={handleMarkAllAsPaid}
            className="w-full sm:w-auto bg-[#00A651] hover:bg-green-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow transition cursor-pointer"
          >
            Mark All as Paid (Settle ₱{pendingPayout})
          </button>
        </div>

        {/* Payout list histories */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-extrabold text-[#003580] uppercase tracking-wider">Settlement Disbursal Log Journal</h4>
          
          <div className="divide-y divide-gray-50 border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            {payoutHistory.length === 0 ? (
              <p className="p-4 text-center text-xs text-gray-400">No disbursements recorded yet.</p>
            ) : (
              payoutHistory.map((ph, idx) => (
                <div key={ph.id || idx} className="bg-white p-4 flex justify-between items-center text-xs">
                  <div className="space-y-1">
                    <p className="font-extrabold text-[#003580]">{formatPST(ph.date)}</p>
                    <p className="text-gray-400 font-sans tracking-wide">Processed payout settlement journal entry: {ph.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-green-600">₱{ph.totalAmount}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{ph.transactionCount} bookings settled</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5. ROLE AUDIT LOG SECTION */}
      <div className="bg-slate-800 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl">
        <button
          onClick={() => setAuditOpen(!auditOpen)}
          className="w-full p-5 bg-slate-900 hover:bg-slate-950 font-sans font-black text-xs text-white uppercase tracking-widest text-left flex justify-between items-center cursor-pointer focus:outline-none"
        >
          <span className="flex items-center gap-2">🔐 System Audit Event logging</span>
          <span>{auditOpen ? '▲ Hide Log' : '▼ Expand Audit Log'}</span>
        </button>

        {auditOpen && (
          <div className="p-5 max-h-72 overflow-y-auto space-y-2 pr-2 scrollbar-thin text-slate-300">
            {auditLog.map((audit, idx) => (
              <div key={idx} className="bg-slate-900 border-l-2 border-orange-500/80 p-3 rounded-r-xl flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-white capitalize mr-2">
                    {audit.role === 'superadmin' ? '🔐 Super Admin' : 
                     audit.role === 'port' ? '🚢 Port Staff' :
                     audit.role === 'terminal' ? '🚐 Terminal Staff' : '👤 Passenger'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    audit.action === 'login' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-900'
                  }`}>
                    {audit.action.toUpperCase()}
                  </span>
                </div>
                <div className="font-mono text-[10px] text-slate-400">
                  {formatPST(audit.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
