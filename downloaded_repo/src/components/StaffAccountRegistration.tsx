import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fsSet } from '../lib/firebase';
import { AdminAccount } from '../types';

interface Props {
  onBack: () => void;
  onComplete: () => void;
}

export const StaffAccountRegistration: React.FC<Props> = ({ onBack, onComplete }) => {
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'port' | 'terminal'>('port');
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) return setError('PIN must be 4 digits');
    
    setSaving(true);
    setError('');
    try {
      const id = 'adm-' + Math.random().toString(36).substr(2, 9);
      const newAdmin: AdminAccount = {
        id,
        fullName: fullName.trim(),
        role,
        pin,
        createdAt: new Date().toISOString(),
        status: 'pending' // Account must be approved by Super Admin
      };

      await fsSet('adminAccounts', id, newAdmin);
      setDone(true);
      setTimeout(() => onComplete(), 2000);
    } catch (err: any) {
      setError('Registration failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl text-center space-y-6 max-w-sm mx-auto"
      >
        <div className="text-6xl">📝</div>
        <h2 className="text-2xl font-black text-[#003087]">Application Received</h2>
        <p className="text-gray-500 text-xs leading-relaxed font-medium">
          Your staff account request has been submitted. It is now <span className="text-amber-600 font-bold uppercase tracking-widest">Pending Approval</span> from the Super Admin.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-[10px] text-amber-700 font-bold uppercase tracking-wider leading-tight">
          Please contact your supervisor or terminal manager to expedite your activation.
        </div>
        <div className="pt-2 flex justify-center">
           <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl space-y-6 w-full max-w-sm mx-auto relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#003087] via-indigo-500 to-[#FF8800]" />
      
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Staff Registration</h2>
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Authorized Personnel Only</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Full Identification Name</label>
          <input
            required
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="e.g. Maria Clara Santos"
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
          />
        </div>

        <div>
           <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Assigned Station</label>
           <div className="grid grid-cols-2 gap-2">
             <button
               type="button"
               onClick={() => setRole('port')}
               className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                 role === 'port' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
               }`}
             >
               🚢 Port
             </button>
             <button
               type="button"
               onClick={() => setRole('terminal')}
               className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                 role === 'terminal' ? 'bg-[#FF8800] border-[#FF8800] text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
               }`}
             >
               🚐 Terminal
             </button>
           </div>
        </div>

        <div>
          <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Desired 4-Digit Security PIN</label>
          <input
            required
            type="password"
            maxLength={4}
            pattern="\d{4}"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-center text-xl font-mono tracking-[1em] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
          />
        </div>

        {error && (
          <p className="text-rose-500 text-[10px] font-black uppercase text-center tracking-widest animate-pulse">
            <i className="fa-solid fa-circle-exclamation mr-1" /> {error}
          </p>
        )}

        <button
          disabled={saving || !fullName || pin.length < 4}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
        >
          {saving ? 'Requesting Access...' : 'Submit Application'}
        </button>
      </form>

      <button
        onClick={onBack}
        className="w-full text-gray-400 hover:text-slate-600 text-[9px] font-black uppercase tracking-widest py-2 transition-colors flex items-center justify-center gap-1.5"
      >
        <i className="fa-solid fa-arrow-left text-[8px]" /> Back to Login
      </button>
    </motion.div>
  );
};
