import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { AdminAccount } from '../types/dataTypes';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, UserCheck, ShieldAlert, Smartphone, IdCard, RefreshCw, FileText } from 'lucide-react';

export const PendingApprovalsPanel: React.FC = () => {
  const [pendingAccounts, setPendingAccounts] = useState<AdminAccount[]>([]);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'adminAccounts'),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const accounts: AdminAccount[] = [];
      snapshot.forEach((docSnap) => {
        accounts.push({ id: docSnap.id, ...docSnap.data() } as AdminAccount);
      });
      // Sort: newest first
      accounts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPendingAccounts(accounts);
      setFetching(false);
    }, (err) => {
      console.error("Error fetching pending accounts:", err);
      toast.error("You don't have sufficient permission to view registrations.");
      setFetching(false);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (account: AdminAccount) => {
    setLoadingMap(prev => ({ ...prev, [account.id]: true }));
    try {
      const res = await fetch('/api/auth/approve-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: account.id, role: account.role })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Approved ${account.fullName} as ${account.role === 'port' ? 'Abra Port Staff' : account.role === 'driver' ? 'Driver' : 'Terminal Staff'}!`);
      } else {
        throw new Error(data.message || 'Failed to approve account.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Server error approving account.');
    } finally {
      setLoadingMap(prev => ({ ...prev, [account.id]: false }));
    }
  };

  const handleReject = async (account: AdminAccount) => {
    setLoadingMap(prev => ({ ...prev, [account.id]: true }));
    try {
      // Direct write to status suspended as allowed by rules
      await updateDoc(doc(db, 'adminAccounts', account.id), {
        status: 'suspended'
      });
      toast.warning(`Rejected and suspended application for ${account.fullName}.`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to reject account.');
    } finally {
      setLoadingMap(prev => ({ ...prev, [account.id]: false }));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/75 dark:bg-slate-900/55 p-6 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-xs backdrop-blur-md">
        <div>
          <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-extrabold text-[9px] uppercase tracking-widest px-3 py-1 rounded-full border border-amber-200/30">
            Operations Control
          </span>
          <h1 className="text-2xl font-extrabold text-slate-950 dark:text-white tracking-tight mt-2">
            Pending Staff Accounts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review registration applications for Port staff, Terminal staff, and Shuttle drivers in Occidental Mindoro.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Pending Approval:
          </span>
          <span className="h-7 px-3 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 font-black text-xs flex items-center justify-center border border-orange-200/20">
            {pendingAccounts.length} applications
          </span>
        </div>
      </div>

      {fetching ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white/50 rounded-[24px] border border-slate-100 min-h-[300px]">
          <RefreshCw className="w-10 h-10 text-orange-500 animate-spin" />
          <p className="mt-4 text-xs tracking-wider font-extrabold text-slate-500 uppercase">Synchronizing with registry...</p>
        </div>
      ) : pendingAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900/50 rounded-[28px] border border-slate-100 dark:border-slate-800/50 min-h-[350px] shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 border border-emerald-100 dark:border-emerald-900/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-wrap dark:text-white">All caught up!</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            There are no pending manager or driver registrations to approve at the moment. All staff access is fully managed.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {pendingAccounts.map((account) => {
            const isLoading = loadingMap[account.id] || false;
            const isPort = account.role === 'port';
            const isDriver = account.role === 'driver';

            return (
              <div
                key={account.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl p-5 shadow-md flex flex-col md:flex-row gap-5 hover:shadow-lg transition-all duration-300 relative group overflow-hidden"
              >
                {/* Background decorative aura based on role */}
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[64px] pointer-events-none opacity-[0.08] ${
                  isPort ? 'bg-[#0c2d57]' : isDriver ? 'bg-emerald-500' : 'bg-amber-500'
                }`} />

                {/* Left side: Selfie view */}
                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                  <div className="relative">
                    <img
                      src={account.selfieUrl}
                      alt={account.fullName}
                      referrerPolicy="no-referrer"
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-slate-100 dark:border-slate-800 shadow-md group-hover:border-orange-100 dark:group-hover:border-orange-950 transition-all duration-300"
                    />
                    <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md">
                      👤
                    </span>
                  </div>
                  
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                    isPort 
                      ? 'bg-blue-50/70 border-blue-100 text-[#0c2d57]' 
                      : isDriver 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                        : 'bg-amber-50 border-amber-100 text-amber-800'
                  }`}>
                    {isPort ? '🚢 Port' : isDriver ? '🚐 Shuttle Driver' : '🏢 Terminal'}
                  </span>
                </div>

                {/* Right side: details and actions */}
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div>
                      <h4 className="font-extrabold text-slate-950 dark:text-white text-base">
                        {account.fullName}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        ID: {account.id.substring(0, 8)}...
                      </p>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold">{account.mobileNumber}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold truncate max-w-[200px]" title={account.email}>{account.email}</span>
                      </div>

                      {isPort ? (
                        <div className="flex items-center gap-2 bg-blue-50/50 dark:bg-slate-800/40 p-1.5 rounded-xl border border-blue-100/10">
                          <IdCard className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider leading-none">Abra Port Work ID</p>
                            <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{account.workId || 'N/A'}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-amber-50/50 dark:bg-slate-800/40 p-1.5 rounded-xl border border-amber-100/10">
                          <IdCard className="w-4 h-4 text-amber-600" />
                          <div>
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider leading-none">Grand Terminal Member ID</p>
                            <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{account.terminalMemberId || 'N/A'}</p>
                          </div>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-400 pt-1">
                        Submitted: {new Date(account.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Operational Buttons */}
                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      onClick={() => handleApprove(account)}
                      disabled={isLoading}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-500/50 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl cursor-pointer active:scale-97 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      {isLoading ? 'Processing...' : 'Approve'}
                    </button>

                    <button
                      onClick={() => handleReject(account)}
                      disabled={isLoading}
                      className="py-2 px-3 border border-rose-200 dark:border-rose-950 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-extrabold text-[11px] uppercase tracking-wider rounded-xl cursor-pointer active:scale-97 transition-all flex items-center justify-center gap-1"
                      title="Reject Access Application"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
