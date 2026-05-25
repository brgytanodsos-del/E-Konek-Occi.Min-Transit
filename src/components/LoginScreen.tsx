import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Bus,
  ChevronRight,
  LogIn,
  ShieldCheck,
  Ship,
  Smartphone,
  UserRound,
  Waves,
  Mail,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AccountRegistration } from './AccountRegistration';
import { StaffAccountRegistration } from './StaffAccountRegistration';
import { PanelHero, StatusChip, SurfaceCard, cn } from './ui';
import { 
  auth, 
  db, 
  signInWithEmailAndPassword 
} from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const roleOptions = [
  {
    value: 'port',
    label: 'Port staff',
    shortLabel: 'Abra Port',
    desc: 'Manage Montenegro sailings, validate ferry bookings, and issue boarding access.',
    icon: Ship,
    accent: 'navy' as const,
  },
  {
    value: 'terminal',
    label: 'Terminal staff',
    shortLabel: 'Mamburao Hub',
    desc: 'Coordinate dispatch operations, land-trip schedules, and shuttle confirmations.',
    icon: Bus,
    accent: 'amber' as const,
  },
  {
    value: 'passenger',
    label: 'Passenger',
    shortLabel: 'Public portal',
    desc: 'Book ferry or shuttle tickets, monitor trips, and keep travel details in one place.',
    icon: UserRound,
    accent: 'emerald' as const,
  },
  {
    value: 'superadmin',
    label: 'Super admin',
    shortLabel: 'Operations control',
    desc: 'Oversee stations, staff access, reports, payouts, and network-wide operations.',
    icon: ShieldCheck,
    accent: 'navy' as const,
  },
];

const roleAccentStyles = {
  navy: {
    iconWrap: 'bg-[rgba(12,45,87,0.1)] text-[#0c2d57]',
    border: 'hover:border-[rgba(12,45,87,0.28)] hover:shadow-[0_18px_30px_rgba(12,45,87,0.08)]',
    badge: 'bg-[rgba(12,45,87,0.08)] text-[#0c2d57]',
    focusColor: 'focus:border-[#0c2d57]',
  },
  emerald: {
    iconWrap: 'bg-[rgba(15,139,102,0.12)] text-[#0f8b66]',
    border: 'hover:border-[rgba(15,139,102,0.28)] hover:shadow-[0_18px_30px_rgba(15,139,102,0.08)]',
    badge: 'bg-[rgba(15,139,102,0.1)] text-[#0f8b66]',
    focusColor: 'focus:border-[#0f8b66]',
  },
  amber: {
    iconWrap: 'bg-[rgba(244,163,59,0.16)] text-[#b96d0e]',
    border: 'hover:border-[rgba(244,163,59,0.32)] hover:shadow-[0_18px_30px_rgba(244,163,59,0.1)]',
    badge: 'bg-[rgba(244,163,59,0.16)] text-[#b96d0e]',
    focusColor: 'focus:border-orange-500',
  },
};

export const LoginScreen = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
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
    userAccount, 
    setUserAccount, 
    isDarkMode, 
    setIsDarkMode 
  } = useApp();
  
  const navigate = useNavigate();

  const activeRoleObj = useMemo(() => roleOptions.find((role) => role.value === selectedRole) ?? null, [selectedRole]);

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    setEmail('');
    setPassword('');
    setErrorShake(false);
    setErrorMsg('');
    setSuccessFlash(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || loading || successFlash) return;

    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Firebase Auth Sign-In
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Read custom user scopes
      if (selectedRole === 'superadmin') {
        const idTokenResult = await user.getIdTokenResult(true);
        const isSuperAdmin = idTokenResult.claims.role === 'superadmin';
        
        if (isSuperAdmin) {
          setSuccessFlash(true);
          setAuditLog((prev) => [
            {
              timestamp: new Date().toISOString(),
              role: 'superadmin',
              action: 'login',
            },
            ...prev,
          ]);

          setTimeout(() => {
            setCurrentRole('superadmin');
            setIsAuthenticated(true);
            navigate('/dashboard');
          }, 700);
        } else {
          throw new Error('This account is not designated as a Super Admin in current custom claims. Contact site support.');
        }
      } else if (selectedRole === 'passenger') {
        // Read Firestore document
        const userDocRef = doc(db, 'userAccounts', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.accountType === 'passenger') {
            setUserAccount(userData as any);
            setSuccessFlash(true);
            setAuditLog((prev) => [
              {
                timestamp: new Date().toISOString(),
                role: 'passenger',
                action: 'login',
              },
              ...prev,
            ]);

            setTimeout(() => {
              setCurrentRole('passenger');
              setIsAuthenticated(true);
              navigate('/dashboard');
            }, 700);
          } else {
            throw new Error('This account key is registered to a staff/driver. Click staff portal.');
          }
        } else {
          throw new Error('Passenger record not found in system storage.');
        }
      } else {
        // Port or Terminal Staff Login
        const staffDocRef = doc(db, 'adminAccounts', user.uid);
        const staffDocSnap = await getDoc(staffDocRef);

        if (staffDocSnap.exists()) {
          const staffData = staffDocSnap.data();
          // Check role alignment
          const roleMatches = (selectedRole === 'port' && staffData.role === 'port') ||
                              (selectedRole === 'terminal' && (staffData.role === 'terminal' || staffData.role === 'driver'));

          if (roleMatches) {
            if (staffData.status === 'pending') {
              throw new Error('Your account is still pending Super Admin approval.');
            } else if (staffData.status === 'suspended') {
              throw new Error('Your account has been suspended. Contact the administrator.');
            } else if (staffData.status === 'active') {
              setSuccessFlash(true);
              setAuditLog((prev) => [
                {
                  timestamp: new Date().toISOString(),
                  role: selectedRole as any,
                  action: 'login',
                },
                ...prev,
              ]);

              setTimeout(() => {
                setCurrentRole(selectedRole as any);
                setIsAuthenticated(true);
                navigate('/dashboard');
              }, 700);
            } else {
              throw new Error('Internal account error: status is invalid.');
            }
          } else {
            throw new Error(`This account cannot log in as a ${selectedRole === 'port' ? 'Port Ticketing Agent' : 'Terminal Operator'}.`);
          }
        } else {
          throw new Error('No staff credentials match this email address.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorShake(true);
      setErrorMsg(err.message || 'Incorrect email or password. Try again.');
      if (navigator.vibrate) navigator.vibrate(100);
      setTimeout(() => {
        setErrorShake(false);
      }, 1200);
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 140, damping: 18 } },
  };

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
              // Handle passenger login transition since they are auto-logged in upon successful signup
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
    <div className="app-shell min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0 login-grid-backdrop opacity-40" />
      <div className="absolute left-[-12%] top-[-10%] h-[22rem] w-[22rem] rounded-full bg-[rgba(12,45,87,0.18)] blur-[110px]" />
      <div className="absolute bottom-[-8%] right-[-8%] h-[20rem] w-[20rem] rounded-full bg-[rgba(244,163,59,0.14)] blur-[100px]" />
      <div className="absolute inset-y-0 right-0 hidden w-[34%] bg-gradient-to-l from-white/30 to-transparent lg:block" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col gap-6 lg:flex-row lg:items-stretch">
        <div className="flex flex-1 flex-col gap-6 lg:max-w-[46rem]">
          <div className="flex items-center justify-between">
            <div className="glass-panel inline-flex items-center gap-4 rounded-2xl px-5 h-12 text-sm text-slate-700 bg-white shadow-sm border border-slate-100">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Waves size={18} />
              </span>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">E-Konek Occi.Min Transit</p>
                <p className="text-xs font-black text-slate-900 leading-none mt-0.5">MindoroTransit Operations</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-700 border border-slate-100 shadow-sm transition-all hover:bg-slate-50 active:scale-95 cursor-pointer"
                title="Toggle visual theme"
              >
                {isDarkMode ? <i className="fa-solid fa-sun text-sm text-amber-500" /> : <i className="fa-solid fa-moon text-sm text-indigo-600" />}
              </button>
              <StatusChip tone={isOnline ? 'success' : 'danger'} dot className="h-12 px-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
                {isOnline ? 'Live network' : 'Cached mode'}
              </StatusChip>
            </div>
          </div>

          <PanelHero
            eyebrow="Modernong interface ng transportasyon"
            title="A cleaner, more professional control room for Occi.Min transit"
            description="Isang mas malinis, mas propesyonal na sistema at isang madaling gamitin na Web app para sa Occi.Min transit —kaya ang platform ay isang tunay na produkto ng transportasyon."
            badges={
              <>
                <span className="brand-pill"><Ship size={14} /> Maritime operations</span>
                <span className="brand-pill"><Bus size={14} /> Terminal dispatch</span>
                <span className="brand-pill"><Smartphone size={14} /> Passenger self-service</span>
              </>
            }
            aside={
              <div className="rounded-[28px] border border-white/10 bg-[#07162c]/80 p-5 text-white shadow-xl backdrop-blur-md">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70 animate-pulse-fast">System overview</p>
                    <h3 className="mt-2 text-xl font-bold text-white font-display">Unified sea and land transit workspace</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    {[
                      ['Port station', 'Abra de Ilog'],
                      ['Terminal hub', 'Mamburao'],
                      ['Control mode', 'Staff-secured'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-white/12 bg-white/10 px-4 py-3 hover:bg-white/15 transition-all">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">{label}</p>
                        <p className="mt-1 text-sm font-bold text-white font-sans">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            }
          />

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Refined hierarchy',
                text: 'Sharper spacing, calmer typography, and better emphasis across key actions.',
                icon: ShieldCheck,
              },
              {
                title: 'Regional character',
                text: 'Maritime cues and local transit identity without looking overly decorative.',
                icon: Waves,
              },
              {
                title: 'Operations clarity',
                text: 'Staff roles, login security, and passenger access now read more clearly at a glance.',
                icon: LogIn,
              },
            ].map(({ title, text, icon: Icon }) => (
              <SurfaceCard key={title} className="p-5">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(15,139,102,0.1)] text-[#0f8b66]">
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
                  </div>
                </div>
              </SurfaceCard>
            ))}
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center lg:justify-end">
          <AnimatePresence mode="wait">
            {!selectedRole ? (
              <motion.div
                key="role-selection"
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: -16 }}
                variants={containerVariants}
                className="w-full max-w-2xl"
              >
                <SurfaceCard className="glass-panel p-6 sm:p-7">
                  <motion.div variants={itemVariants} className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2">
                      <StatusChip tone="navy">Secure role selection</StatusChip>
                      <div>
                        <h2 className="text-2xl font-extrabold text-slate-950 sm:text-[2rem]">Choose your access portal</h2>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                          Select the workspace that matches your role. Complete secure authorization via email and passwords.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsStaffReg(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[rgba(15,139,102,0.28)] hover:text-[#0f8b66]"
                    >
                      Staff registration
                      <ChevronRight size={16} />
                    </button>
                  </motion.div>

                  <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2">
                    {roleOptions.map((role) => {
                      const Icon = role.icon;
                      const styles = roleAccentStyles[role.accent === 'amber' ? 'amber' : role.accent === 'emerald' ? 'emerald' : 'navy'];

                      return (
                        <motion.button
                           key={role.value}
                           onClick={() => handleRoleSelect(role.value)}
                           whileHover={{ y: -3 }}
                           whileTap={{ scale: 0.98 }}
                           className={cn(
                             'group flex min-h-[11rem] cursor-pointer flex-col rounded-[26px] border border-slate-200 bg-white p-5 text-left transition-all duration-200',
                             styles.border,
                           )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <span className={cn('flex h-14 w-14 items-center justify-center rounded-2xl', styles.iconWrap)}>
                              <Icon size={26} />
                            </span>
                            <span className={cn('rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]', styles.badge)}>
                              {role.shortLabel}
                            </span>
                          </div>
                          <div className="mt-5 space-y-2">
                            <h3 className="text-lg font-bold text-slate-950">{role.label}</h3>
                            <p className="text-sm leading-6 text-slate-500">{role.desc}</p>
                          </div>
                          <div className="mt-auto pt-5 text-sm font-semibold text-slate-400 transition group-hover:text-slate-700">
                            Open portal
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </SurfaceCard>
              </motion.div>
            ) : (
              <motion.div
                key="password-entry"
                initial={{ opacity: 0, scale: 0.96, y: 18 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', bounce: 0.18 }}
                className="w-full max-w-sm"
              >
                <div
                  className={cn(
                    'glass-panel overflow-hidden rounded-[30px] p-6 sm:p-7 bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 shadow-2xl',
                    successFlash && 'ring-1 ring-emerald-400/40',
                    errorShake && 'animate-shake ring-1 ring-rose-400/40',
                  )}
                >
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <StatusChip tone={successFlash ? 'success' : errorShake ? 'danger' : activeRoleObj?.accent === 'amber' ? 'amber' : activeRoleObj?.accent === 'emerald' ? 'success' : 'navy'}>
                        {activeRoleObj?.shortLabel} Secure Portal
                      </StatusChip>
                      <div>
                        <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">Account Login</h2>
                        <p className="mt-1 text-xs leading-4 text-slate-500">
                          Provide your registered email and secure password below.
                        </p>
                      </div>
                    </div>
                    <span className={cn('flex h-14 w-14 items-center justify-center rounded-2xl shrink-0', activeRoleObj ? roleAccentStyles[activeRoleObj.accent === 'amber' ? 'amber' : activeRoleObj.accent === 'emerald' ? 'emerald' : 'navy'].iconWrap : '')}>
                      {activeRoleObj && <activeRoleObj.icon size={26} />}
                    </span>
                  </div>

                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1 pl-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          required
                          placeholder="name@domain.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={cn(
                            "w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl text-sm font-semibold outline-hidden transition",
                            activeRoleObj ? roleAccentStyles[activeRoleObj.accent === 'amber' ? 'amber' : activeRoleObj.accent === 'emerald' ? 'emerald' : 'navy'].focusColor : ''
                          )}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider pl-1">
                          Password
                        </label>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={cn(
                            "w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl text-sm font-semibold outline-hidden transition",
                            activeRoleObj ? roleAccentStyles[activeRoleObj.accent === 'amber' ? 'amber' : activeRoleObj.accent === 'emerald' ? 'emerald' : 'navy'].focusColor : ''
                          )}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || successFlash}
                      className="w-full mt-2 py-3 bg-[#0c2d57] hover:bg-[#1a3d6d] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50"
                    >
                      {loading ? 'Authorizing account...' : 'Sign In'}
                    </button>
                  </form>

                  {/* Register link for passenger or staff */}
                  <div className="mt-5 text-center text-xs">
                    {selectedRole === 'passenger' && (
                      <button
                        onClick={() => setIsRegistering(true)}
                        className="text-emerald-600 hover:text-emerald-700 font-bold underline"
                      >
                        Don’t have a passenger account? Register here
                      </button>
                    )}
                    {(selectedRole === 'port' || selectedRole === 'terminal') && (
                      <button
                        onClick={() => setIsStaffReg(true)}
                        className="text-amber-600 hover:text-amber-700 font-bold underline"
                      >
                        Need station credentials? Request Staff Access
                      </button>
                    )}
                    {selectedRole === 'superadmin' && (
                      <span className="text-slate-400 font-medium">
                        Super Admin credentials managed securely by Server Config.
                      </span>
                    )}
                  </div>

                  <AnimatePresence>
                    {errorMsg && !successFlash && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-center text-xs font-semibold text-rose-600"
                      >
                        {errorMsg}
                      </motion.p>
                    )}
                    {successFlash && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center text-xs font-semibold text-emerald-700"
                      >
                        Verification successful. Booting dashboard…
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={() => setSelectedRole(null)}
                    disabled={loading}
                    className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-slate-800 disabled:opacity-55"
                  >
                    <ArrowLeft size={14} />
                    Back to portal selections
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
