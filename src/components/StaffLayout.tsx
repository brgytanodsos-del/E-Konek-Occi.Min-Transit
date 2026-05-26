// src/components/StaffLayout.tsx
import React from 'react';
import { useApp } from '../context/AppContext';
import { VoiceAssistant } from './VoiceAssistant';
import { LogOut, User } from 'lucide-react';

interface StaffLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const StaffLayout: React.FC<StaffLayoutProps> = ({ children, title, subtitle }) => {
  const { currentUser, currentRole, logout } = useApp();

  const roleColor = {
    port: 'text-blue-400',
    terminal: 'text-emerald-400',
    driver: 'text-amber-400',
    superadmin: 'text-indigo-400',
    passenger: 'text-teal-400',
  }[currentRole || 'port'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Staff Top Bar */}
      <nav className="bg-slate-900 border-b border-slate-850 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="font-extrabold text-2xl tracking-tighter text-white font-sans bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500">
              E-KONEK
            </div>
            <div className={`capitalize font-extrabold text-sm tracking-wider px-3 py-1 rounded-full bg-slate-800/60 uppercase border border-slate-700/50 ${roleColor}`}>
              {currentRole === 'port' ? '🚢 Port' : currentRole === 'terminal' ? '🚐 Terminal' : '🚐 Driver'} Operations
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-slate-800/85 p-2 rounded-xl border border-slate-700/40">
                <User size={18} className="text-emerald-400" />
              </div>
              <div className="hidden sm:block">
                <p className="font-bold text-white text-xs">{currentUser?.fullName || 'Transit Staff'}</p>
                <p className="text-[10px] text-gray-500 font-mono">{currentUser?.mobileNumber || 'Verified Session'}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest active:scale-95 cursor-pointer"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        <div className="mb-8 border-b border-slate-800/60 pb-6">
          <h1 className="text-3xl font-black tracking-tight text-white font-sans">{title}</h1>
          {subtitle && <p className="text-slate-400 mt-1 text-sm font-medium">{subtitle}</p>}
        </div>
        {children}
      </main>

      {/* Voice Assistant */}
      <VoiceAssistant />
    </div>
  );
};
