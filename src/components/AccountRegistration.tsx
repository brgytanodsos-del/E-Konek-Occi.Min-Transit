import React, { useState } from 'react';
import { UserRound, Smartphone, MapPin, Camera, ArrowLeft } from 'lucide-react';
import { fsSet } from '../lib/firebase';
import { toast } from 'sonner';

interface AccountRegistrationProps {
  prefillType?: 'passenger' | 'driver';
  onBack: () => void;
  onComplete: (acc: any) => void;
}

export const AccountRegistration: React.FC<AccountRegistrationProps> = ({
  prefillType = 'passenger',
  onBack,
  onComplete,
}) => {
  const [accountType, setAccountType] = useState<'passenger' | 'driver'>(prefillType);
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !mobileNumber) {
      toast.error('Please fill up required fields (Full Name and Mobile Number)');
      return;
    }

    setLoading(true);
    const generatedId = 'usr-' + Math.random().toString(36).substring(2, 11);
    const account = {
      id: generatedId,
      accountType,
      fullName,
      mobileNumber,
      address,
      selfieUrl: selfieUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
      createdAt: new Date().toISOString(),
      bookingIds: []
    };

    try {
      await fsSet('userAccounts', generatedId, account);
      toast.success('Registration successful!');
      onComplete(account);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8 animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <button 
          onClick={onBack} 
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition"
          type="button"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <span className="font-extrabold text-[#003580] dark:text-[#38bdf8] tracking-tight text-lg">
          Create Account
        </span>
      </div>

      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={() => setAccountType('passenger')}
          type="button"
          className={`flex-1 py-3 font-extrabold text-sm rounded-xl cursor-pointer transition ${
            accountType === 'passenger'
              ? 'bg-[#003580] text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
          }`}
        >
          👤 Passenger
        </button>
        <button
          onClick={() => setAccountType('driver')}
          type="button"
          className={`flex-1 py-3 font-extrabold text-sm rounded-xl cursor-pointer transition ${
            accountType === 'driver'
              ? 'bg-[#FF6B00] text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
          }`}
        >
          🚐 Shuttle Driver
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1.5 pl-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              required
              placeholder="Juan Dela Cruz"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-hidden focus:border-[#003580]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1.5 pl-1">
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              required
              placeholder="0917XXXXXXX"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-hidden focus:border-[#003580]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1.5 pl-1">
            Home Address
          </label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Mamburao, Occidental Mindoro"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-hidden focus:border-[#003580]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1.5 pl-1">
            Photo / Avatar URL (Web link)
          </label>
          <div className="relative">
            <Camera className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="url"
              placeholder="https://example.com/avatar.jpg"
              value={selfieUrl}
              onChange={(e) => setSelfieUrl(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-hidden focus:border-[#003580]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-sm rounded-2xl shadow-md transition-all cursor-pointer active:scale-98 disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>
    </div>
  );
};
export default AccountRegistration;
