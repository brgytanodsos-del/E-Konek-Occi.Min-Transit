/**
 * PINLogin.tsx — FIXED
 *
 * Changes vs original:
 * 1. Removed the client-side ROLE_MAP that exposed all PINs in the JS bundle.
 * 2. Removed the "Demo Credentials" hint that printed every PIN on screen.
 * 3. Authentication now calls /api/auth/verify-pin exclusively; the client
 *    never decides whether a PIN is valid.
 * 4. Added proper lockout tracking (mirrors server-side rate limiting).
 * 5. Removed @ts-ignore — typed useApp correctly.
 * 6. The PIN for 'passenger' flows directly to the public portal without a
 *    PIN; this component is only shown to staff (port / terminal / superadmin).
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react';

interface PINLoginProps {
  /**
   * The role this login dialog is authenticating.
   * Passed from LoginScreen after the user selects a role card.
   * Never defaults to a PIN value in the client.
   */
  role: 'port' | 'terminal' | 'superadmin';
  onSuccess: (sessionToken: string) => void;
  onBack: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  port: 'Port Administrator',
  terminal: 'Terminal Administrator',
  superadmin: 'Super Administrator',
};

export const PINLogin: React.FC<PINLoginProps> = ({ role, onSuccess, onBack }) => {
  const { setCurrentRole, setIsAuthenticated, setSessionToken } = useApp();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Client-side attempt counter so we can show a friendly message before the
  // server's rate-limiter kicks in (server still enforces the hard limit).
  const [attempts, setAttempts] = useState(0);
  const MAX_CLIENT_ATTEMPTS = 5;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
    setPin(value);
    setError(false);
    setErrorMsg('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!pin || pin.length < 4 || isLoading || success) return;

    if (attempts >= MAX_CLIENT_ATTEMPTS) {
      setError(true);
      setErrorMsg('Too many attempts. Please wait a moment before trying again.');
      return;
    }

    setIsLoading(true);
    setError(false);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, pin }),
      });

      const data: { success: boolean; sessionToken?: string; role?: string; message?: string } =
        await res.json();

      if (data.success && data.sessionToken) {
        setSuccess(true);
        setSessionToken(data.sessionToken);
        toast.success(`Welcome, ${ROLE_LABELS[role]}`, {
          description: `Authenticated as ${role}`,
        });
        // Brief visual feedback, then hand off
        setTimeout(() => {
          setCurrentRole(role);
          setIsAuthenticated(true);
          onSuccess(data.sessionToken!);
        }, 600);
      } else {
        setAttempts((n) => n + 1);
        setError(true);
        setErrorMsg(data.message || 'Incorrect PIN. Please try again.');
        setPin('');
        if (navigator.vibrate) navigator.vibrate(80);
        setTimeout(() => {
          setError(false);
          setErrorMsg('');
        }, 2000);
      }
    } catch {
      setError(true);
      setErrorMsg('Cannot reach the server. Check your connection and try again.');
      setPin('');
      setTimeout(() => {
        setError(false);
        setErrorMsg('');
      }, 2500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pin.length >= 4) {
      handleSubmit();
    }
  };

  const pinArray = pin.split('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-blue-950 to-zinc-950 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          style={{ animation: mounted ? 'float 6s ease-in-out infinite' : 'none' }}
        />
        <div
          className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"
          style={{ animation: mounted ? 'float 8s ease-in-out infinite 1s' : 'none' }}
        />
      </div>

      <div
        className="w-full max-w-md relative z-10"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/50 relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-3xl opacity-0 blur-xl group-hover:opacity-100 transition-opacity duration-300" />
            <Lock size={48} className="text-white relative z-10" />
          </div>
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 tracking-tight">
            E-Konek
          </h1>
          <p className="text-zinc-400 mt-3 font-medium">Occidental Mindoro Transit</p>
          <p className="text-zinc-500 mt-1 text-sm">{ROLE_LABELS[role]}</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className={`bg-zinc-900/80 backdrop-blur-xl border rounded-3xl p-8 shadow-2xl transition-all duration-300 ${
            error
              ? 'border-red-500/50 shadow-red-500/20'
              : success
              ? 'border-green-500/50 shadow-green-500/20'
              : 'border-zinc-800 shadow-blue-500/10'
          }`}
        >
          <h2 className="text-2xl font-semibold text-center mb-2 text-white">Secure Access</h2>
          <p className="text-center text-zinc-500 text-sm mb-8">Enter your PIN to continue</p>

          {/* PIN input */}
          <div className="mb-8 space-y-3">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              PIN Code
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={handlePinChange}
              onKeyDown={handleKeyDown}
              placeholder="••••"
              disabled={isLoading || success}
              autoFocus
              className={`w-full text-center text-6xl tracking-[20px] bg-zinc-950 border-2 focus:border-blue-500 rounded-2xl py-6 font-mono outline-none transition-all duration-300 text-white ${
                error ? 'border-red-500/50' : success ? 'border-green-500/50' : 'border-zinc-700'
              } ${isLoading ? 'opacity-50' : ''}`}
            />

            {/* Dot indicators */}
            <div className="flex justify-center gap-3 mt-4">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index < pinArray.length
                      ? 'bg-gradient-to-r from-blue-400 to-cyan-400 scale-110 shadow-lg shadow-blue-500/50'
                      : 'bg-zinc-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Status messages */}
          {error && errorMsg && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-2">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-400">{errorMsg}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-3 bg-green-500/10 border border-green-500/50 rounded-lg flex items-center gap-2">
              <ShieldCheck size={18} className="text-green-400" />
              <span className="text-sm text-green-400">Authentication successful!</span>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            disabled={isLoading || !pin || pin.length < 4 || success}
            className="text-lg py-7 w-full font-semibold"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Lock size={20} />
                Login
              </span>
            )}
          </Button>

          {/* Back link */}
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="mt-6 w-full text-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
          >
            ← Back to role selection
          </button>
        </form>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { opacity: 0.3; transform: translateY(0px); }
          50% { opacity: 0.7; transform: translateY(-30px); }
        }
      `}</style>
    </div>
  );
};
