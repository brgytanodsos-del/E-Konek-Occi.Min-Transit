import React, { useState, useEffect, Suspense, lazy } from 'react';
const Panel1 = lazy(() => import('../features/montenegro/Panel1').then(m => ({ default: m.Panel1 })));
const Panel2 = lazy(() => import('../features/land/Panel2').then(m => ({ default: m.Panel2 })));
const Panel3 = lazy(() => import('../features/passenger/Panel3').then(m => ({ default: m.Panel3 })));
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mic } from 'lucide-react';
import { VoiceAssistantPanel } from './VoiceAssistantPanel';
import { PanelHeader } from './common/PanelHeader';
import { toast } from 'sonner';

import { AdminReportSectionPanel4 } from './AdminReportSectionPanel4';
import { PendingApprovalsPanel } from './PendingApprovalsPanel';
import { StaffLayout } from './StaffLayout';
import { AnnouncementsPanel } from './AnnouncementsPanel';
import { LiveTracking } from './LiveTracking';
import { NotificationsPanel } from './NotificationsPanel';
import { DiagnosticsPanel } from './DiagnosticsPanel';

export const SuperAdminDashboard = () => {
  const {
    currentRole,
    setCurrentRole,
    isAuthenticated,
    setIsAuthenticated,
    isOnline,
    toastMessage,
    setToastMessage,
    transactions,
    setTransactions,
    payoutHistory,
    setPayoutHistory,
    auditLog,
    setAuditLog,
    formatPST,
    updateTransaction,
    persistPayout,
    setUserAccount,
    isDarkMode,
    setIsDarkMode,
    autoSyncEnabled,
    setAutoSyncEnabled,
    lastSyncTime
  } = useApp();

  const navigate = useNavigate();

  // Super Admin panel selection
  const [adminActiveTab, setAdminActiveTab] = useState<number>(0);

  // Notifications bell visibility
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // In-line Super Admin logouts confirmations
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  // Super Admin voice assistant modal
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);

  // Toggle auto-sync with feedback
  const handleToggleAutoSync = () => {
    const nextState = !autoSyncEnabled;
    setAutoSyncEnabled(nextState);
    if (nextState) {
      toast.success('🔄 Live Database Auto-Sync Enabled');
    } else {
      toast.warning('🚫 Background Database Sync Paused');
    }
  };

  // Background Voice Listener
  useEffect(() => {
    if (isVoicePanelOpen) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-PH';

    recognition.onresult = (event: any) => {
      const command = event.results[event.results.length - 1][0].transcript.toLowerCase();
      if (command.includes("book") || command.includes("ferry") || command.includes("shuttle")) {
        setIsVoicePanelOpen(true);
      }
    };

    try {
        recognition.start();
    } catch (e) {
        console.warn("Background voice listener start failed", e);
    }

    return () => {
        try { recognition.stop(); } catch(e) {}
    };
  }, [isVoicePanelOpen]);

  // Redirect if unauthorized
  useEffect(() => {
    if (!isAuthenticated || !currentRole) {
      navigate('/');
    }
  }, [isAuthenticated, currentRole, navigate]);

  // Toast Auto-Dismiss Trigger
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, setToastMessage]);

  const handleLogoutAction = () => {
    // Record audit logout log
    setAuditLog(prev => [{
      id: 'al-' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      role: currentRole as any,
      action: 'logout'
    }, ...prev]);

    // Reset session states
    setCurrentRole(null);
    setIsAuthenticated(false);
    setUserAccount(null);
    navigate('/');
  };

  if (!isAuthenticated || !currentRole) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#FF8800]/20 border-t-[#FF8800] rounded-full animate-spin" />
        <div>
          <p className="text-white font-black text-sm uppercase tracking-widest">Verifying Security Session</p>
          <p className="text-white/40 text-[10px] font-semibold mt-1">Establishing encrypted tunnel to MindoroTransit Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell min-h-screen bg-transparent flex flex-col relative pb-[76px] sm:pb-0">
      
      {/* Subtle Mamburao, Occidental Mindoro Flag Background Watermark */}
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.07] select-none">
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/e/e6/Flag_of_Mamburao%2C_Occidental_Mindoro.png" 
          alt="Mamburao, Occidental Mindoro Flag" 
          className="w-full max-w-4xl max-h-[80vh] object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
      
      {/* 1. PERSISTENT TOP STATUS BAR (28px) */}
      <div
        className={`dashboard-statusbar fixed top-0 left-0 right-0 h-[32px] z-[100] text-white text-xs font-semibold leading-[32px] text-center transition-colors duration-500 shadow-sm ${
          isOnline ? 'bg-emerald-600' : 'bg-red-600 animate-pulse'
        }`}
      >
        {isOnline ? '🟢 Online — Live Data' : '🔴 Offline — Cached Mode'}
      </div>

      {/* Adjust container padding-top for the 32px height status bar */}
      <div className="pt-[32px] flex-1 flex flex-col">
        
        {/* VIEW SCHEME: PORT STAFF */}
        {currentRole === 'port' && (
          <StaffLayout title="Port Operations" subtitle="Abra Port Station">
            <Panel1 isSuperAdmin={false} />
          </StaffLayout>
        )}

        {/* VIEW SCHEME: TERMINAL STAFF */}
        {currentRole === 'terminal' && (
          <StaffLayout title="Terminal Operations" subtitle="Mamburao Grand Terminal">
            <Panel2 isSuperAdmin={false} />
          </StaffLayout>
        )}

        {/* VIEW SCHEME: DRIVER PANEL */}
        {currentRole === 'driver' && (
          <StaffLayout title="Driver Operations" subtitle="Mamburao Transit Fleet">
            <Panel2 isSuperAdmin={false} />
          </StaffLayout>
        )}

        {/* VIEW SCHEME: PASSENGER PORTAL */}
        {currentRole === 'passenger' && (
          <div className="flex-1 flex flex-col">
            <PanelHeader 
                title={<span className="text-[10px] uppercase font-black tracking-widest text-[#003580]/50 font-sans">Public Station Access</span>}
                className="rounded-b-[24px] bg-white/65 z-10"
            >
                <button
                  onClick={handleLogoutAction}
                  className="flex h-10 items-center justify-center px-4 text-xs text-[#003580] dark:text-indigo-400 font-black hover:text-red-500 transition-all cursor-pointer hover:bg-white/40 rounded-2xl active:scale-95"
                >
                  Exit Portal
                </button>
            </PanelHeader>
            <div className="flex-1">
              <Panel3 isSuperAdmin={false} />
            </div>
          </div>
        )}

        {/* VIEW SCHEME: SUPER ADMIN ROUTER */}
        {currentRole === 'superadmin' && (
          <div className="flex-1 flex flex-col">
            
            {/* Topbar for Admin */}
            <header className="dashboard-header bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/70 dark:border-slate-800/80 py-3 sm:py-4 px-3 sm:px-6 flex justify-between items-center shadow-sm relative backdrop-blur-md">
              <div className="flex items-center gap-2 shrink-0">
                <span className="bg-[#FF6B00] text-white font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded">ADMIN MODE</span>
                <span className="font-bold text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-sans hidden sm:inline">E-Transit Hub</span>
              </div>

              {/* Secure Confirm Logout */}
              <div className="flex items-center gap-1.5 sm:gap-3">
                {/* Auto Sync Toggle */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/50 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-750">
                  <div className="hidden md:flex flex-col items-end mr-1">
                     <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sync {autoSyncEnabled ? 'On' : 'Off'}</span>
                     <span className="text-[8px] text-slate-400 dark:text-slate-500 whitespace-nowrap font-mono">
                        {lastSyncTime ? `Last: ${lastSyncTime.toLocaleTimeString()}` : 'Never'}
                     </span>
                  </div>
                  <div className="hidden min-[380px]:flex md:hidden flex-col items-center pl-0.5">
                     <span className="text-[8px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-widest">Sync</span>
                  </div>
                  <button
                    id="super-admin-auto-sync-toggle"
                    onClick={handleToggleAutoSync}
                    className={`relative inline-flex h-4 w-7 sm:h-5 sm:w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoSyncEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    role="switch"
                    aria-checked={autoSyncEnabled}
                    title="Toggle background database syncing on or off"
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoSyncEnabled ? 'translate-x-3 sm:translate-x-4' : 'translate-x-0'}`}
                    />
                  </button>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    type="button"
                    className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white/75 text-slate-700 dark:border-slate-700/50 dark:bg-slate-800/80 dark:text-slate-200 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm backdrop-blur-md relative"
                    title="View dynamic command alerts"
                  >
                    <i className="fa-solid fa-bell text-xs sm:text-sm text-[#003580] dark:text-indigo-400" />
                    <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-rose-500 animate-pulse" />
                  </button>

                  <AnimatePresence>
                    {isNotificationsOpen && (
                      <div className="absolute right-0 mt-3.5 w-[280px] sm:w-[380px] z-[60] shadow-2xl rounded-3xl overflow-hidden animate-fade-in">
                        <NotificationsPanel onClose={() => setIsNotificationsOpen(false)} />
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white/75 text-slate-700 dark:border-slate-700/50 dark:bg-slate-800/80 dark:text-slate-200 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm backdrop-blur-md"
                  title="Toggle visual theme"
                >
                  {isDarkMode ? <i className="fa-solid fa-sun text-xs sm:text-sm text-amber-500" /> : <i className="fa-solid fa-moon text-xs sm:text-sm text-[#003580]" />}
                </button>
                {!showConfirmLogout ? (
                  <button
                    onClick={() => setShowConfirmLogout(true)}
                    className="flex h-9 sm:h-10 items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-[10px] sm:text-xs px-2.5 sm:px-4 rounded-xl sm:rounded-2xl transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                  >
                    🔐 <span className="hidden sm:inline ml-1">Logout</span>
                  </button>
                ) : (
                  <div className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 flex items-center h-10 gap-1.5 bg-white/95 dark:bg-slate-850 border border-red-200 dark:border-red-900/40 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl shadow-xl z-50 animate-fade-in text-slate-900 dark:text-white">
                    <span className="text-[10px] font-black text-red-700 dark:text-red-400 font-mono pl-2 sm:pl-3">Logout?</span>
                    <button
                      onClick={handleLogoutAction}
                      className="bg-red-600 text-white font-bold text-[9px] sm:text-[10px] px-2.5 sm:px-3 h-7 sm:h-8 rounded-lg hover:bg-red-700 cursor-pointer transition-colors active:scale-95"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setShowConfirmLogout(false)}
                      className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-705 dark:hover:bg-slate-650 text-gray-700 dark:text-gray-300 font-bold text-[9px] sm:text-[10px] px-2.5 sm:px-3 h-7 sm:h-8 rounded-lg cursor-pointer transition-colors active:scale-95"
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
            </header>

            {/* Active Switcher Section */}
            <div className="flex-1 pb-[64px] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={adminActiveTab}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="w-full h-full"
                >
                  {adminActiveTab === 0 && <Panel1 isSuperAdmin={true} />}
                  {adminActiveTab === 1 && <Panel2 isSuperAdmin={true} />}
                  {adminActiveTab === 2 && <Panel3 isSuperAdmin={true} />}
                  {adminActiveTab === 3 && <AdminReportSectionPanel4 />}
                  {adminActiveTab === 4 && <PendingApprovalsPanel />}
                  {adminActiveTab === 5 && <AnnouncementsPanel />}
                  {adminActiveTab === 6 && <LiveTracking />}
                  {adminActiveTab === 7 && <DiagnosticsPanel />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* FIXED BOTTOM NAV BAR (z-index 50) */}
            <nav 
              className="dashboard-nav fixed bottom-0 sm:bottom-6 left-0 sm:left-1/2 right-0 sm:right-auto sm:-translate-x-1/2 bg-white/90 backdrop-blur-xl border border-slate-200/50 sm:rounded-[24px] rounded-t-[24px] h-[76px] z-50 flex justify-start sm:justify-around items-center px-4 sm:px-6 shadow-2xl w-full sm:min-w-[620px] transition-all overflow-x-auto sm:overflow-x-visible flex-row flex-nowrap gap-2 sm:gap-1 scrollbar-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {[
                { id: 0, label: 'Port', icon: 'fa-ship', color: 'text-blue-600', activeBg: 'bg-blue-50' },
                { id: 1, label: 'Hub', icon: 'fa-bus', color: 'text-orange-500', activeBg: 'bg-orange-50' },
                { id: 2, label: 'Booking', icon: 'fa-user-check', color: 'text-emerald-500', activeBg: 'bg-emerald-50' },
                { id: 3, label: 'Admin', icon: 'fa-shield-halved', color: 'text-[#003580]', activeBg: 'bg-blue-50' },
                { id: 4, label: 'Pending', icon: 'fa-user-clock', color: 'text-amber-600', activeBg: 'bg-amber-50' },
                { id: 5, label: 'Circulars', icon: 'fa-bullhorn', color: 'text-rose-600', activeBg: 'bg-rose-50' },
                { id: 6, label: 'Radar', icon: 'fa-tower-broadcast', color: 'text-emerald-600', activeBg: 'bg-emerald-50' },
                { id: 7, label: 'Tests', icon: 'fa-stethoscope', color: 'text-indigo-500', activeBg: 'bg-indigo-50' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setAdminActiveTab(tab.id)}
                  className={`relative shrink-0 flex-none flex flex-col items-center justify-center h-full w-[72px] sm:w-[76px] cursor-pointer transition-all duration-300 ease-out group ${
                    adminActiveTab === tab.id ? 'text-slate-900 scale-102 font-bold' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl transition-all duration-200 ${adminActiveTab === tab.id ? tab.activeBg : 'bg-transparent group-hover:bg-slate-50'}`}>
                    <i className={`fa-solid ${tab.icon} text-sm sm:text-base mb-1 transition-transform group-hover:scale-105 duration-200 ${adminActiveTab === tab.id ? `${tab.color} drop-shadow-xs` : ''}`}></i>
                    <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider font-sans transition-all ${adminActiveTab === tab.id ? `${tab.color} font-black` : ''}`}>{tab.label}</span>
                  </div>
                  {adminActiveTab === tab.id && (
                    <motion.div layoutId="nav-indicator" className={`absolute bottom-0 w-8 h-1 rounded-full ${tab.color.replace('text-', 'bg-')} shadow-xs`} />
                  )}
                </button>
              ))}
            </nav>

          </div>
        )}

      </div>

      {/* Voice Assistant Trigger FAB (Super Admin Exclusive) */}
      {currentRole === 'superadmin' && (
        <button
          onClick={() => setIsVoicePanelOpen(true)}
          type="button"
          className="fixed bottom-[96px] right-4 sm:bottom-6 sm:right-1/2 sm:-mr-[256px] bg-gradient-to-br from-[#FF6B00] to-red-500 text-white w-14 h-14 rounded-full shadow-2xl active:scale-95 transition-all flex items-center justify-center border-4 border-white dark:border-slate-800 z-50 cursor-pointer hover:scale-105"
          title="Super Admin Voice Assistant"
          id="superadmin-voice-fab"
        >
          <Mic className="w-6 h-6 animate-pulse" />
        </button>
      )}

      {/* Voice Assistant Overlay Panel */}
      <VoiceAssistantPanel isOpen={isVoicePanelOpen} onClose={() => setIsVoicePanelOpen(false)} />

      {/* TOAST PANEL (appears bottom-center, slides up) */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-[20px] border border-emerald-300 bg-white/92 px-6 py-3.5 text-emerald-700 shadow-[0_18px_36px_rgba(15,139,102,0.22)] z-[9999] flex items-center justify-center gap-2.5 animate-slide-up backdrop-blur-md">
          <span className="text-sm">🔔</span>
          <span className="text-xs uppercase tracking-wider">{toastMessage}</span>
        </div>
      )}

    </div>
  );
};