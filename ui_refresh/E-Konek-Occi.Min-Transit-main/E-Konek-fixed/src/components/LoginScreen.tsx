import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { fsAdd, COLLECTIONS } from '../lib/firebase';

// No PINs stored in the client bundle.
// PIN verification happens server-side at /api/auth/verify-pin.

const roleOptions = [
  { value: 'port',       label: 'Port Staff',     icon: '🚢', desc: 'Abra Port Ticketing Station', btnColor: 'hover:border-[#003087]/50 hover:shadow-[#003087]/10' },
  { value: 'terminal',   label: 'Terminal Staff',  icon: '🚐', desc: 'Mamburao Grand Terminal',     btnColor: 'hover:border-[#FF8800]/50 hover:shadow-[#FF8800]/10' },
  { value: 'passenger',  label: 'Passenger',       icon: '👤', desc: 'Book Tickets & Track Rides',  btnColor: 'hover:border-emerald-500/50 hover:shadow-emerald-500/10' },
  { value: 'superadmin', label: 'Super Admin',      icon: '🔐', desc: 'System Administration',       btnColor: 'hover:border-purple-500/50 hover:shadow-purple-500/10' },
];

export const LoginScreen = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [pin,          setPin]          = useState('');
  const [loading,      setLoading]      = useState(false);
  const [errorShake,   setErrorShake]   = useState(false);
  const [errorMsg,     setErrorMsg]     = useState('');
  const [successFlash, setSuccessFlash] = useState(false);

  const { setCurrentRole, setIsAuthenticated, setSessionToken, setAuditLog, isOnline } = useApp();
  const navigate = useNavigate();

  // ── Audit log append (best-effort) ──────────────────────────────────────
  const appendAudit = (role: string, action: 'login' | 'logout') => {
    const entry = { timestamp: new Date().toISOString(), role, action };
    setAuditLog(prev => [entry, ...prev]);
    fsAdd(COLLECTIONS.auditLog, entry).catch(() => {/* offline — ignore */});
  };

  // ── Passenger: auto-login, no PIN ───────────────────────────────────────
  const handlePassengerLogin = () => {
    appendAudit('passenger', 'login');
    setCurrentRole('passenger');
    setIsAuthenticated(true);
    navigate('/dashboard');
  };

  const handleRoleSelect = (role: string) => {
    if (role === 'passenger') {
      handlePassengerLogin();
    } else {
      setSelectedRole(role);
      setPin('');
      setErrorShake(false);
      setErrorMsg('');
      setSuccessFlash(false);
    }
  };

  // ── PIN numpad ───────────────────────────────────────────────────────────
  const handlePinDigitTap = (digit: number) => {
    if (pin.length < 4 && !successFlash && !loading) {
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0 && !successFlash && !loading) {
      setPin(prev => prev.slice(0, -1));
    }
  };

  // ── Submit PIN to server ─────────────────────────────────────────────────
  const handlePinSubmit = async () => {
    if (pin.length < 4 || loading || successFlash) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/verify-pin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ role: selectedRole, pin }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessFlash(true);
        appendAudit(selectedRole!, 'login');
        setSessionToken(data.sessionToken ?? null);

        setTimeout(() => {
          setCurrentRole(selectedRole as any);
          setIsAuthenticated(true);
          navigate('/dashboard');
        }, 700);
      } else {
        // Wrong PIN
        setErrorShake(true);
        setErrorMsg(data.message || 'Incorrect PIN. Try again.');
        if (navigator.vibrate) navigator.vibrate(100);
        setPin('');
        setTimeout(() => { setErrorShake(false); setErrorMsg(''); }, 1200);
      }
    } catch {
      // Network error — fallback message
      setErrorShake(true);
      setErrorMsg('Cannot reach server. Check connection.');
      setPin('');
      setTimeout(() => { setErrorShake(false); setErrorMsg(''); }, 1500);
    } finally {
      setLoading(false);
    }
  };

  const activeRoleObj = roleOptions.find(r => r.value === selectedRole);

  const containerVariants = {
    hidden: { opacity: 0 },
    show:   { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show:   { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.25 } },
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-5 relative overflow-hidden font-sans">

      {/* Background watermark */}
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.06] select-none">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/e/e6/Flag_of_Mamburao%2C_Occidental_Mindoro.png"
          alt="Mamburao Flag"
          className="w-full max-w-4xl max-h-[80vh] object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#003087]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#FF8800]/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Network badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`absolute top-4 right-4 text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full border shadow-sm backdrop-blur-md transition-all duration-300 ${
          isOnline
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-950/40 border-rose-500/30 text-rose-400 animate-pulse'
        }`}
      >
        <span className="inline-block w-2 h-2 rounded-full mr-1.5 bg-current animate-ping" />
        {isOnline ? 'ONLINE' : 'C-STANDALONE'}
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ── Role selection screen ── */}
        {!selectedRole ? (
          <motion.div
            key="role-selection"
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -20 }}
            variants={containerVariants}
            className="w-full flex flex-col items-center justify-center"
          >
            <motion.div variants={itemVariants} className="text-center space-y-4 mb-10 max-w-sm">
              <div className="flex justify-center">
                <motion.span
                  whileHover={{ rotate: [0, -10, 10, -10, 0], transition: { duration: 0.5 } }}
                  className="text-5xl drop-shadow p-3.5 bg-white/5 rounded-3xl block text-[#FF8800] border border-white/10"
                >
                  🚢
                </motion.span>
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-black text-white tracking-tight leading-none bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent">
                  E-Konek Occi.Mindo
                </h1>
                <p className="text-[#FF8800] text-xs font-black tracking-widest uppercase mt-0.5">
                  E-Konek Dispatching Console
                </p>
              </div>
              <p className="text-white/60 text-xs">
                Select your service station below to securely verify your authentication access codes.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
              {roleOptions.map(role => (
                <motion.button
                  key={role.value}
                  onClick={() => handleRoleSelect(role.value)}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`bg-white text-left p-5 rounded-2xl flex gap-4 shadow-xl border border-transparent transition-all duration-300 cursor-pointer ${role.btnColor}`}
                >
                  <div className="text-3xl self-center bg-slate-100 p-2.5 rounded-2xl shadow-inner">{role.icon}</div>
                  <div className="flex-1 min-w-0 self-center">
                    <span className="block font-black text-slate-900 text-sm tracking-tight">{role.label}</span>
                    <span className="block text-[11px] text-gray-400 mt-0.5 font-semibold truncate">{role.desc}</span>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        ) : (
          /* ── PIN entry screen ── */
          <motion.div
            key="pin-entry"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', bounce: 0.2 }}
            className={`w-full max-w-sm flex flex-col items-center justify-center p-8 rounded-3xl transition-all duration-300 backdrop-blur-md border ${
              successFlash
                ? 'bg-emerald-950/90 border-emerald-500/40 text-white shadow-emerald-500/20 shadow-2xl'
                : errorShake
                ? 'bg-rose-950/90 border-rose-500/40 text-white animate-shake shadow-rose-500/20 shadow-2xl'
                : 'bg-white/95 border-white/20 shadow-2xl text-[#003087]'
            }`}
          >
            <div className="text-center space-y-2 mb-6">
              <motion.span
                animate={successFlash ? { scale: [1, 1.3, 1.1] } : { y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="text-6xl block"
              >
                {activeRoleObj!.icon}
              </motion.span>
              <h2 className="text-2xl font-black tracking-tight">{activeRoleObj!.label} Portal</h2>
              <p className={`text-xs ${successFlash || errorShake ? 'text-white/70' : 'text-gray-400 font-medium'}`}>
                Occidental Mindoro Transit Security Gate
              </p>
            </div>

            {/* 4-dot indicator */}
            <div className="flex gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={pin.length > i ? { scale: [1, 1.2, 1.1] } : {}}
                  className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                    successFlash ? 'bg-white border-white shadow-lg'
                    : errorShake  ? 'bg-red-500 border-red-500 shadow-md animate-pulse'
                    : pin.length > i
                    ? 'bg-[#003087] border-[#003087] scale-110 shadow-md shadow-[#003087]/20'
                    : 'border-slate-300'
                  }`}
                />
              ))}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 w-64 max-w-full">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                <motion.button
                  key={d}
                  onClick={() => handlePinDigitTap(d)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  disabled={loading}
                  className="w-16 h-16 rounded-2xl bg-white/95 border border-slate-100 shadow-sm font-extrabold text-xl text-slate-800 flex items-center justify-center cursor-pointer transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  {d}
                </motion.button>
              ))}
              <motion.button onClick={handleBackspace} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={loading}
                className="w-16 h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 font-bold text-slate-700 flex items-center justify-center cursor-pointer disabled:opacity-50">
                <i className="fa-solid fa-arrow-left" />
              </motion.button>
              <motion.button onClick={() => handlePinDigitTap(0)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} disabled={loading}
                className="w-16 h-16 rounded-2xl bg-white/95 border border-slate-100 shadow-sm font-extrabold text-xl text-slate-800 flex items-center justify-center cursor-pointer transition-colors hover:bg-slate-50 disabled:opacity-50">
                0
              </motion.button>
              <motion.button onClick={handlePinSubmit} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={loading || pin.length < 4}
                className="w-16 h-16 rounded-2xl bg-[#00A651] hover:bg-green-700 font-extrabold text-xs text-white flex items-center justify-center cursor-pointer uppercase shadow-md shadow-emerald-700/25 tracking-wider disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? '...' : 'Enter'}
              </motion.button>
            </div>

            <AnimatePresence>
              {errorMsg && !successFlash && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-red-400 font-black text-xs mt-6 text-center tracking-wider uppercase animate-pulse">
                  <i className="fa-solid fa-circle-exclamation mr-1.5" /> {errorMsg}
                </motion.p>
              )}
              {successFlash && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-emerald-300 font-black text-xs mt-6 text-center uppercase tracking-widest animate-pulse">
                  <i className="fa-solid fa-circle-check mr-1.5" /> PIN Verified! Loading...
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button onClick={() => setSelectedRole(null)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} disabled={loading}
              className="mt-8 text-xs font-bold text-gray-400 hover:text-[#003087] transition-all py-2 px-4 rounded-full border border-gray-300 hover:border-[#003087]/30 hover:bg-[#003087]/5 cursor-pointer flex items-center gap-1.5 disabled:opacity-50">
              <i className="fa-solid fa-times-circle" /> Back to Roles
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
