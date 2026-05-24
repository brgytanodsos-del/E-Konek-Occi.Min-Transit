import React, { useState } from 'react';
import { ShieldAlert, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { fsSet } from '../lib/firebase';
import { toast } from 'sonner';

interface StaffAccountRegistrationProps {
  onBack: () => void;
  onComplete: () => void;
}

export const StaffAccountRegistration: React.FC<StaffAccountRegistrationProps> = ({
  onBack,
  onComplete,
}) => {
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'port' | 'terminal'>('port');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !pin) {
      toast.error('Please fill up all required fields');
      return;
    }

    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      toast.error('PIN must be exactly 4 digits (numeric only)');
      return;
    }

    setLoading(true);
    const generatedId = 'adm-' + Math.random().toString(36).substring(2, 11);
    const pinString = pin;

    const data = {
      id: generatedId,
      fullName,
      role,
      pin: pinString,
      createdAt: new Date().toISOString(),
      status: 'pending' as const,
      lastLogin: ''
    };

    try {
      await fsSet('adminAccounts', generatedId, data);
      toast.success('Staff Registration Submitted! Super Admin review required for activation.', {
        duration: 5000,
      });
      onComplete();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to submit staff application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8 animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <button 
          onClick={onBack} 
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition select-none"
          type="button"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <span className="font-extrabold text-[#003580] dark:text-[#38bdf8] tracking-tight text-lg">
          Staff Registration
        </span>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl flex items-start gap-3 mb-6">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
          Staff accounts must be approved and enabled by the Super Admin before you can access the Port/Terminal ticketing stations.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1.5 pl-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Officer Juan Dela Cruz"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-hidden focus:border-[#003580]"
          />
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1.5 pl-1">
            Station Assignment <span className="text-red-500">*</span>
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-hidden focus:border-[#003580]"
          >
            <option value="port">🚢 Port Staff (Abra Port Station)</option>
            <option value="terminal">🚐 Terminal Staff (Mamburao Grand Terminal)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1.5 pl-1">
            4-Digit Security PIN <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              maxLength={4}
              required
              placeholder="e.g. 2026"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').substring(0, 4))}
              className="w-full px-4 py-3 pr-11 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold tracking-widest outline-hidden focus:border-[#003580]"
            />
            <button
              onClick={() => setShowPin(!showPin)}
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 outline-hidden select-none"
            >
              {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm rounded-2xl shadow-md transition-all cursor-pointer active:scale-98 disabled:opacity-50"
        >
          {loading ? 'Submitting Application...' : 'Apply for Access'}
        </button>
      </form>
    </div>
  );
};
export default StaffAccountRegistration;
