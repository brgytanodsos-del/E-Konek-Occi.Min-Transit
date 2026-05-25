import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';

const ROLE_MAP: Record<string, { role: string; label: string }> = {
  '2001': { role: 'port', label: 'Port Administrator' },
  '2002': { role: 'terminal', label: 'Terminal Administrator' },
  '0000': { role: 'passenger', label: 'Passenger' },
  '1234': { role: 'superadmin', label: 'Super Administrator' },
  '3001': { role: 'driver', label: 'Driver' },
};

export const PINLogin: React.FC = () => {
    // @ts-ignore
  const { setCurrentRole, setIsAuthenticated } = useApp();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const mapping = ROLE_MAP[pin];

    setTimeout(() => {  // Simulate network delay
      if (mapping) {
        setCurrentRole(mapping.role);
        setIsAuthenticated(true);
        toast.success(`Welcome, ${mapping.label}`, {
          description: `Logged in as ${mapping.role}`,
        });
      } else {
        toast.error("Invalid PIN", {
          description: "Please check your credentials and try again.",
        });
        setPin('');
      }
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="mx-auto w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
            <Lock size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white">E-Konek</h1>
          <p className="text-zinc-400 mt-2">Occidental Mindoro Transit</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-center mb-6">Enter PIN to Continue</h2>

          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="••••"
            className="w-full text-center text-5xl tracking-[12px] bg-zinc-950 border border-zinc-700 focus:border-blue-500 rounded-2xl py-8 font-mono outline-none transition mb-8"
            autoFocus
          />

          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
            className="text-lg py-7 w-full"
          >
            {isLoading ? 'Verifying...' : 'Login'}
          </Button>

          <div className="text-center mt-6 text-xs text-zinc-500">
            Use demo PINs: 2001 (Port), 2002 (Terminal), 0000 (Passenger),<br />
            1234 (Super Admin), 3001 (Driver)
          </div>
        </form>
      </div>
    </div>
  );
};
