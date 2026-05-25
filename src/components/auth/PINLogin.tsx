import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react';

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
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(value);
    setError(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;

    setIsLoading(true);
    const mapping = ROLE_MAP[pin];

    setTimeout(() => {
      if (mapping) {
        setSuccess(true);
        setCurrentRole(mapping.role);
        setIsAuthenticated(true);
        toast.success(`Welcome, ${mapping.label}`, {
          description: `Logged in as ${mapping.role}`,
        });
      } else {
        setError(true);
        toast.error('Invalid PIN', {
          description: 'Please check your credentials and try again.',
        });
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 600);
      }
      setIsLoading(false);
    }, 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pin.length === 4) {
      handleSubmit(e as any);
    }
  };

  const pinArray = pin.split('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-blue-950 to-zinc-950 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl opacity-0 animate-pulse"
          style={{
            animation: mounted ? 'float 6s ease-in-out infinite' : 'none',
          }}
        />
        <div
          className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl opacity-0 animate-pulse"
          style={{
            animation: mounted ? 'float 8s ease-in-out infinite 1s' : 'none',
          }}
        />
      </div>

      {/* Main container */}
      <div
        className="w-full max-w-md relative z-10"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Logo and header section */}
        <div className="text-center mb-10">
          <div
            className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/50 relative group cursor-pointer"
            style={{
              animation: mounted ? 'slideDown 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
            }}
          >
            {/* Animated glow ring */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-3xl opacity-0 blur-xl group-hover:opacity-100 transition-opacity duration-300" />
            <Lock size={48} className="text-white relative z-10" />
          </div>

          <h1
            className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 tracking-tight"
            style={{
              animation: mounted ? 'fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both' : 'none',
            }}
          >
            E-Konek
          </h1>

          <p
            className="text-zinc-400 mt-3 font-medium"
            style={{
              animation: mounted ? 'fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both' : 'none',
            }}
          >
            Occidental Mindoro Transit
          </p>
        </div>

        {/* Form container */}
        <form
          onSubmit={handleSubmit}
          className={`bg-zinc-900/80 backdrop-blur-xl border rounded-3xl p-8 shadow-2xl transition-all duration-300 ${
            error
              ? 'border-red-500/50 shadow-red-500/20'
              : success
                ? 'border-green-500/50 shadow-green-500/20'
                : 'border-zinc-800 shadow-blue-500/10'
          }`}
          style={{
            animation: mounted ? 'fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both' : 'none',
          }}
        >
          <h2
            className="text-2xl font-semibold text-center mb-2 text-white"
            style={{
              animation: mounted ? 'slideInRight 0.6s ease-out 0.4s both' : 'none',
            }}
          >
            Secure Access
          </h2>
          <p className="text-center text-zinc-500 text-sm mb-8">
            Enter your PIN to continue
          </p>

          {/* PIN Input Display */}
          <div className="mb-8 space-y-3">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              PIN Code
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={handlePinChange}
              onKeyDown={handleKeyDown}
              placeholder="••••"
              disabled={isLoading}
              className={`w-full text-center text-6xl tracking-[20px] bg-zinc-950 border-2 focus:border-blue-500 rounded-2xl py-6 font-mono outline-none transition-all duration-300 ${
                error
                  ? 'border-red-500/50 shake'
                  : success
                    ? 'border-green-500/50'
                    : 'border-zinc-700'
              } ${isLoading ? 'opacity-50' : ''}`}
              autoFocus
              style={{
                animation: mounted ? 'slideUp 0.6s ease-out 0.5s both' : 'none',
              }}
            />

            {/* PIN dots visualization */}
            <div className="flex justify-center gap-3 mt-4">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index < pinArray.length
                      ? 'bg-gradient-to-r from-blue-400 to-cyan-400 scale-110 shadow-lg shadow-blue-500/50'
                      : 'bg-zinc-700'
                  }`}
                  style={{
                    animation:
                      index < pinArray.length
                        ? 'pulse 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Status indicators */}
          {error && (
            <div
              className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-2 animate-pulse"
              style={{
                animation: 'slideDown 0.4s ease-out',
              }}
            >
              <AlertCircle size={18} className="text-red-400" />
              <span className="text-sm text-red-400">Invalid PIN. Try again.</span>
            </div>
          )}

          {success && (
            <div
              className="mb-6 p-3 bg-green-500/10 border border-green-500/50 rounded-lg flex items-center gap-2"
              style={{
                animation: 'slideDown 0.4s ease-out',
              }}
            >
              <ShieldCheck size={18} className="text-green-400" />
              <span className="text-sm text-green-400">Authentication successful!</span>
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            size="lg"
            disabled={isLoading || !pin || pin.length < 4}
            className={`text-lg py-7 w-full font-semibold transition-all duration-300 ${
              isLoading ? 'opacity-50' : ''
            }`}
            style={{
              animation: mounted ? 'slideUp 0.6s ease-out 0.6s both' : 'none',
            }}
          >
            <span className="inline-flex items-center gap-2">
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Verifying...
                </>
              ) : (
                <>
                  <Lock size={20} />
                  Login
                </>
              )}
            </span>
          </Button>

          {/* Demo PINs info */}
          <div
            className="text-center mt-8 text-xs text-zinc-500 space-y-2"
            style={{
              animation: mounted ? 'fadeIn 0.8s ease-out 0.8s both' : 'none',
            }}
          >
            <p className="font-semibold text-zinc-400">Demo Credentials:</p>
            <div className="grid grid-cols-2 gap-2 text-zinc-600 text-left">
              <p>• 2001 (Port Admin)</p>
              <p>• 2002 (Terminal)</p>
              <p>• 0000 (Passenger)</p>
              <p>• 1234 (Super Admin)</p>
              <p>• 3001 (Driver)</p>
            </div>
          </div>
        </form>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes float {
          0%, 100% {
            opacity: 0;
            transform: translateY(0px);
          }
          50% {
            opacity: 0.5;
            transform: translateY(-30px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-10px);
          }
          75% {
            transform: translateX(10px);
          }
        }

        .shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
};
