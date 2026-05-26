import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Bus,
  ChevronRight,
  LogIn,
  ShieldCheck,
  Ship,
  Sparkles,
  UserRound,
  Waves,
  Mail,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AccountRegistration } from './AccountRegistration';
import { StaffAccountRegistration } from './StaffAccountRegistration';
import { StatusChip, cn } from './ui';
import { 
  auth, 
  db, 
  signInWithEmailAndPassword 
} from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorShake, setErrorShake] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successFlash, setSuccessFlash] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isStaffReg, setIsStaffReg] = useState(false);

  const { 
    setCurrentRole, 
    setIsAuthenticated, 
    setAuditLog, 
    isOnline, 
    setUserAccount, 
    isDarkMode, 
    setIsDarkMode,
    currentUser,
    isAuthenticated,
    isLoading
  } = useApp();
  
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated && currentUser) {
      navigate('/dashboard');
    }
  }, [isLoading, isAuthenticated, currentUser, navigate]);

  const performLogin = async (targetEmail: string, targetPass: string) => {
    setLoading(true);
    setErrorMsg('');
    setErrorShake(false);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, targetEmail, targetPass);
      const user = userCredential.user;

      // Automatically determine user's role from their account type in Firestore
      const isSuperAdmin = user.email === 'brgytanodsos@gmail.com' || user.email?.startsWith('admin');
      
      let resolvedRole = '';
      if (isSuperAdmin) {
        resolvedRole = 'superadmin';
      } else {
        // Try adminAccounts
        const adminDoc = await getDoc(doc(db, 'adminAccounts', user.uid));
        if (adminDoc.exists()) {
          const adminData = adminDoc.data();
          if (adminData.status === 'pending') {
            throw new Error('Your staff account application is still pending Super Admin approval.');
          } else if (adminData.status === 'suspended') {
            throw new Error('Your staff account has been suspended or deactivated.');
          }
          resolvedRole = adminData.role;
        } else {
          // Try userAccounts
          const passengerDoc = await getDoc(doc(db, 'userAccounts', user.uid));
          if (passengerDoc.exists()) {
            const passengerData = passengerDoc.data();
            setUserAccount(passengerData as any);
            resolvedRole = 'passenger';
          } else {
            throw new Error('No registered account was found in database matching these credentials.');
          }
        }
      }

      setSuccessFlash(true);
      setAuditLog((prev) => [
        {
          id: 'al-' + Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          role: resolvedRole as any,
          action: 'login',
        },
        ...prev,
      ]);

      setTimeout(() => {
        setCurrentRole(resolvedRole as any);
        setIsAuthenticated(true);
        navigate('/dashboard');
      }, 800);
    } catch (err: any) {
      console.error('Firebase Auth error:', err);
      setErrorShake(true);
      let friendlyError = 'Incorrect credentials. Please verify your details.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials' || err.message?.includes('auth/invalid-credential')) {
        friendlyError = 'Invalid email address or password.';
      } else if (err.message && !err.message.includes('auth/')) {
        friendlyError = err.message;
      }
      setErrorMsg(friendlyError);
      if (navigator.vibrate) navigator.vibrate(100);
      setTimeout(() => setErrorShake(false), 1200);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || loading || successFlash) return;
    await performLogin(email, password);
  };

  const handleDemoLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    await performLogin(demoEmail, demoPass);
  };

  const demoAccounts = [
    {
      role: 'Super Admin',
      email: 'brgytanodsos@gmail.com',
      pass: 'SUPER_ADMIN_PASSWORD_1234',
      badge: '🔐 OVERRIDE',
      icon: ShieldCheck,
      desc: 'Complete control & terminal bypass stats console',
      color: 'bg-[rgba(12,45,87,1)] text-[#FFC107]'
    },
    {
      role: 'Port Staff',
      email: 'port@mindorotransit.com',
      pass: 'PORT_STAFF_PASSWORD_2001',
      badge: '🚢 ABRA PORT',
      icon: Ship,
      desc: 'Abra Ferry Port scheduling & ticketing logs',
      color: 'bg-blue-600 text-white'
    },
    {
      role: 'Terminal Staff',
      email: 'terminal@mindorotransit.com',
      pass: 'TERMINAL_STAFF_PASSWORD_2002',
      badge: '🚐 MAMBURAO',
      icon: Bus,
      desc: 'Mamburao dispatch terminal shuttle monitoring',
      color: 'bg-amber-600 text-white'
    },
    {
      role: 'Passenger Account',
      email: 'passenger@mindorotransit.com',
      pass: 'PASSENGER_PASSWORD_0000',
      badge: '👤 TRAVELER',
      icon: UserRound,
      desc: 'Live booking operations, seat selection & tracker',
      color: 'bg-emerald-600 text-white'
    }
  ];

  if (isStaffReg) {
    return (
      <div className="app-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="absolute inset-0 login-grid-backdrop opacity-40" />
        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
          <StaffAccountRegistration onBack={() => setIsStaffReg(false)} onComplete={() => setIsStaffReg(false)} />
        </div>
      </div>
    );
  }

  if (isRegistering) {
    return (
      <div className="app-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="absolute inset-0 login-grid-backdrop opacity-40" />
        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
          <AccountRegistration
            onBack={() => {
              setIsRegistering(false);
            }}
            onComplete={(acc) => {
              setUserAccount(acc);
              setIsRegistering(false);
              setCurrentRole('passenger');
              setIsAuthenticated(true);
              navigate('/dashboard');
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell relative min-h-screen bg-slate-50 dark:bg-[#07162c] text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto">
      {/* Background Orbs & Ambient Mesh */}
      <div className="absolute inset-0 login-grid-backdrop opacity-30 dark:opacity-20 pointer-events-none" />
      <div className="absolute left-[10%] top-[10%] h-[24rem] w-[24rem] rounded-full bg-[rgba(12,45,87,0.12)] dark:bg-[rgba(12,45,87,0.3)] blur-[120px] pointer-events-none" />
      <div className="absolute right-[10%] bottom-[10%] h-[22rem] w-[22rem] rounded-full bg-[rgba(244,163,59,0.1)] dark:bg-[rgba(244,163,59,0.18)] blur-[100px] pointer-events-none" />

      {/* Top Controls */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-3">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 shadow-xs transition-all hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 cursor-pointer"
          title="Toggle display theme"
        >
          {isDarkMode ? <i className="fa-solid fa-sun text-sm text-amber-500" /> : <i className="fa-solid fa-moon text-indigo-500" />}
        </button>
        <StatusChip tone={isOnline ? 'success' : 'danger'} dot className="h-10 sm:h-11 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-xs font-semibold">
          {isOnline ? 'Live Network' : 'Cached Mode'}
        </StatusChip>
      </div>

      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mt-4">
        {/* Left Column: Branding Description and Registration Handlers */}
        <div className="lg:col-span-5 flex flex-col space-y-6 text-center lg:text-left select-none">
          <div className="inline-flex self-center lg:self-start items-center gap-4 rounded-3xl shrink-0 px-6 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg transition-all">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0c2d57] text-white">
              <Waves size={24} className="animate-pulse" />
            </span>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500 leading-none">E-Konek Occi.Min</p>
              <h1 className="text-xl font-black text-slate-900 dark:text-white leading-none mt-1">MindoroTransit</h1>
            </div>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight sm:text-3xl leading-tight">
              Occidental Mindoro Transit Network
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-md mx-auto lg:mx-0">
              Montenegro Shipping Line & Mamburao Grand Terminal consolidated workspace. Join our online sea-to-land transit framework today.
            </p>
          </div>

          {/* Quick Registration Triggers */}
          <div className="flex flex-col space-y-3 max-w-md mx-auto lg:mx-0 w-full">
            <button
              onClick={() => setIsRegistering(true)}
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition-all group cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450">
                  <UserRound size={18} />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">Sign Up as Passenger</h3>
                  <p className="text-[10px] text-slate-450">Selfie capture, secure GPS pin, & real-time bookings</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-500 transition-all" />
            </button>

            <button
              onClick={() => setIsStaffReg(true)}
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-blue-500/50 hover:shadow-md transition-all group cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-450">
                  <Ship size={18} />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">Apply for Station Staff Account</h3>
                  <p className="text-[10px] text-slate-450">Abra Port & Mamburao Terminal terminal clearances</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 group-hover:text-blue-500 transition-all" />
            </button>
          </div>
        </div>

        {/* Right Column: Dynamic Login and Quick Demo Preset Panels */}
        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Main Credentials Sign-in Card (MD: 7/12 width) */}
          <div className="md:col-span-7">
            <div
              className={cn(
                'glass-panel rounded-[32px] p-6 sm:p-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl transition-all duration-300',
                successFlash && 'ring-2 ring-emerald-500/50 scale-102 border-emerald-500/30',
                errorShake && 'animate-shake ring-2 ring-rose-500/50 border-rose-500/30',
              )}
            >
              <div className="mb-6">
                <span className="inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] leading-none bg-[rgba(12,45,87,0.08)] text-[#0c2d57] mb-2 dark:bg-blue-950/40 dark:text-blue-300">
                  Secure Workspace Entry
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <LogIn size={20} className="text-amber-500" />
                  Sign In
                </h2>
                <p className="mt-1 text-xs text-slate-400 font-medium">
                  Provide your registered email & password properties.
                </p>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1.5 pl-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="Enter registered email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-semibold outline-hidden focus:border-[#0c2d57] dark:focus:border-amber-400 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1.5 pl-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-semibold outline-hidden focus:border-[#0c2d57] dark:focus:border-amber-400 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || successFlash}
                  className="w-full mt-4 py-3 bg-[#0c2d57] dark:bg-sky-600 hover:bg-[#153d6f] dark:hover:bg-sky-550 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/25 border-t-white rounded-full animate-spin" />
                      Authorizing key...
                    </>
                  ) : (
                    'Authenticate Account'
                  )}
                </button>
              </form>

              {/* Status/Error Messages */}
              <AnimatePresence>
                {errorMsg && !successFlash && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 rounded-xl border border-rose-200 dark:border-rose-950 bg-rose-50 dark:bg-rose-950/20 px-4 py-2.5 text-center text-xs font-semibold text-rose-600 dark:text-rose-450"
                  >
                    {errorMsg}
                  </motion.p>
                )}
                {successFlash && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 rounded-xl border border-emerald-200 dark:border-emerald-950 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-2.5 text-center text-xs font-bold text-emerald-700 dark:text-emerald-400"
                  >
                    Access approved! Loading terminal layout...
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Quick Demo Credentials Panel (MD: 5/12 width) */}
          <div className="md:col-span-5 space-y-3.5">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-left">
              <h3 className="text-xs font-black text-[#0c2d57] dark:text-amber-400 flex items-center gap-1.5 uppercase">
                <Sparkles size={13} className="text-amber-500" />
                Tester Demo Accounts
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                Select any pre-configured profile below to instantly pre-fill credentials and authorize.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {demoAccounts.map((account) => {
                const IconComp = account.icon;
                return (
                  <button
                    key={account.role}
                    onClick={() => handleDemoLogin(account.email, account.pass)}
                    disabled={loading || successFlash}
                    className="flex flex-col items-start p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-250/70 dark:border-slate-800 shadow-xs hover:border-amber-500/40 hover:bg-slate-50/50 dark:hover:bg-slate-850/80 cursor-pointer text-left transition duration-200 select-none disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2 w-full justify-between mb-1">
                      <span className="text-[10px] uppercase font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <IconComp size={12} className="text-amber-500" />
                        {account.role}
                      </span>
                      <span className={cn('text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md leading-none', account.color)}>
                        {account.badge}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium line-clamp-1">
                      {account.desc}
                    </p>
                    <span className="text-[8px] font-mono font-medium text-blue-600/70 dark:text-sky-400/70 mt-1 block">
                      {account.email}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
