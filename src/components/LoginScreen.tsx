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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AccountRegistration } from './AccountRegistration';
import { StaffAccountRegistration } from './StaffAccountRegistration';
import { PanelHero, StatusChip, SurfaceCard, cn } from './ui';

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
    pin: 'bg-[#0c2d57] border-[#0c2d57] shadow-[0_12px_24px_rgba(12,45,87,0.18)]',
  },
  emerald: {
    iconWrap: 'bg-[rgba(15,139,102,0.12)] text-[#0f8b66]',
    border: 'hover:border-[rgba(15,139,102,0.28)] hover:shadow-[0_18px_30px_rgba(15,139,102,0.08)]',
    badge: 'bg-[rgba(15,139,102,0.1)] text-[#0f8b66]',
    pin: 'bg-[#0f8b66] border-[#0f8b66] shadow-[0_12px_24px_rgba(15,139,102,0.2)]',
  },
  amber: {
    iconWrap: 'bg-[rgba(244,163,59,0.16)] text-[#b96d0e]',
    border: 'hover:border-[rgba(244,163,59,0.32)] hover:shadow-[0_18px_30px_rgba(244,163,59,0.1)]',
    badge: 'bg-[rgba(244,163,59,0.16)] text-[#b96d0e]',
    pin: 'bg-[#f4a33b] border-[#f4a33b] shadow-[0_12px_24px_rgba(244,163,59,0.22)]',
  },
};

export const LoginScreen = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorShake, setErrorShake] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successFlash, setSuccessFlash] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isStaffReg, setIsStaffReg] = useState(false);
  const [prefillType, setPrefillType] = useState<'passenger' | 'driver' | undefined>();

  const { setCurrentRole, setIsAuthenticated, setSessionToken, setAuditLog, isOnline, userAccount, setUserAccount } = useApp();
  const navigate = useNavigate();

  const activeRoleObj = useMemo(() => roleOptions.find((role) => role.value === selectedRole) ?? null, [selectedRole]);

  const handlePassengerLogin = () => {
    setSessionToken(null);
    setCurrentRole('passenger');
    setIsAuthenticated(true);
    setAuditLog((prev) => [
      {
        timestamp: new Date().toISOString(),
        role: 'passenger',
        action: 'login',
      },
      ...prev,
    ]);
    navigate('/dashboard');
  };

  const handleRoleSelect = (role: string) => {
    if (role === 'passenger') {
      if (userAccount && userAccount.accountType === 'passenger') {
        handlePassengerLogin();
      } else {
        setPrefillType('passenger');
        setIsRegistering(true);
      }
      return;
    }

    setSelectedRole(role);
    setPin('');
    setErrorShake(false);
    setErrorMsg('');
    setSuccessFlash(false);
  };

  const pinLength = 4;

  const handlePinDigitTap = (digit: number) => {
    if (pin.length < pinLength && !successFlash && !loading) {
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0 && !successFlash && !loading) {
      setPin((prev) => prev.slice(0, -1));
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length < pinLength || loading || successFlash) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole, pin }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessFlash(true);
        setSessionToken(data.sessionToken ?? null);
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
        setErrorShake(true);
        setErrorMsg(data.message || 'Incorrect PIN. Try again.');
        if (navigator.vibrate) navigator.vibrate(100);
        setPin('');
        setTimeout(() => {
          setErrorShake(false);
          setErrorMsg('');
        }, 1200);
      }
    } catch {
      setErrorShake(true);
      setErrorMsg('Cannot reach server. Check connection.');
      setPin('');
      setTimeout(() => {
        setErrorShake(false);
        setErrorMsg('');
      }, 1500);
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
      <AccountRegistration
        prefillType={prefillType}
        onBack={() => {
          setIsRegistering(false);
          setPrefillType(undefined);
        }}
        onComplete={(acc) => {
          setUserAccount(acc);
          setIsRegistering(false);
          if (acc.accountType === 'passenger') {
            handlePassengerLogin();
          } else if (acc.accountType === 'driver') {
            setCurrentRole('terminal');
            setIsAuthenticated(true);
            navigate('/dashboard');
          }
        }}
      />
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
            <div className="glass-panel inline-flex items-center gap-3 rounded-full px-4 py-2 text-sm text-slate-700">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(12,45,87,0.12)] text-[#0c2d57]">
                <Waves size={18} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">E-Konek Occi.Min Transit</p>
                <p className="text-sm font-bold text-slate-900">MindoroTransit operations portal</p>
              </div>
            </div>
            <StatusChip tone={isOnline ? 'success' : 'danger'} dot>
              {isOnline ? 'Live network' : 'Cached mode'}
            </StatusChip>
          </div>

          <PanelHero
            eyebrow="Modern Filipino transit interface"
            title="A cleaner, more professional control room for Occi.Min transit"
            description="Built around a navy, emerald, and warm amber palette with a maritime feel—so the platform feels like a real transport product, not just a quick prototype."
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
                          Select the workspace that matches your role. Staff access stays PIN-protected, while passengers can continue to booking and trip tracking.
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
                      const styles = roleAccentStyles[role.accent];

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
                key="pin-entry"
                initial={{ opacity: 0, scale: 0.96, y: 18 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', bounce: 0.18 }}
                className="w-full max-w-md"
              >
                <div
                  className={cn(
                    'glass-panel overflow-hidden rounded-[30px] p-6 sm:p-7',
                    successFlash && 'ring-1 ring-emerald-400/40',
                    errorShake && 'animate-shake ring-1 ring-rose-400/40',
                  )}
                >
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <StatusChip tone={successFlash ? 'success' : errorShake ? 'danger' : activeRoleObj?.accent === 'amber' ? 'amber' : activeRoleObj?.accent === 'emerald' ? 'success' : 'navy'}>
                        {activeRoleObj?.shortLabel}
                      </StatusChip>
                      <div>
                        <h2 className="text-2xl font-extrabold text-slate-950">Enter security PIN</h2>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {activeRoleObj?.label} access is protected before entering the live dispatch environment.
                        </p>
                      </div>
                    </div>
                    <span className={cn('flex h-14 w-14 items-center justify-center rounded-2xl', activeRoleObj ? roleAccentStyles[activeRoleObj.accent].iconWrap : '')}>
                      {activeRoleObj && <activeRoleObj.icon size={26} />}
                    </span>
                  </div>

                  <div className="mb-7 flex items-center justify-center gap-3">
                    {[...Array(pinLength)].map((_, index) => (
                      <motion.div
                        key={index}
                        animate={pin.length > index ? { scale: [1, 1.18, 1.05] } : { scale: 1 }}
                        className={cn(
                          'h-4 w-4 rounded-full border-2 border-slate-300 bg-white transition-all',
                          pin.length > index && activeRoleObj ? roleAccentStyles[activeRoleObj.accent].pin : '',
                          successFlash && 'border-emerald-500 bg-emerald-500',
                          errorShake && 'border-rose-500 bg-rose-500',
                        )}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                      <motion.button
                        key={digit}
                        onClick={() => handlePinDigitTap(digit)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        disabled={loading}
                        className="tap-target rounded-2xl border border-slate-200 bg-white py-4 text-xl font-bold text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-55"
                      >
                        {digit}
                      </motion.button>
                    ))}
                    <motion.button
                      onClick={handleBackspace}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={loading}
                      className="tap-target flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 py-4 text-slate-700 transition hover:bg-slate-200 disabled:opacity-55"
                    >
                      <ArrowLeft size={18} />
                    </motion.button>
                    <motion.button
                      onClick={() => handlePinDigitTap(0)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={loading}
                      className="tap-target rounded-2xl border border-slate-200 bg-white py-4 text-xl font-bold text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-55"
                    >
                      0
                    </motion.button>
                    <motion.button
                      onClick={handlePinSubmit}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={loading || pin.length < pinLength}
                      className="tap-target rounded-2xl bg-gradient-to-r from-[#0f8b66] to-[#0b6b72] px-3 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white shadow-[0_16px_30px_rgba(15,139,102,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {loading ? '...' : 'Enter'}
                    </motion.button>
                  </div>

                  <AnimatePresence>
                    {errorMsg && !successFlash && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-semibold text-rose-600"
                      >
                        {errorMsg}
                      </motion.p>
                    )}
                    {successFlash && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700"
                      >
                        PIN verified. Loading dashboard…
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={() => setSelectedRole(null)}
                    disabled={loading}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-800 disabled:opacity-55"
                  >
                    <ArrowLeft size={16} />
                    Back to role selection
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
