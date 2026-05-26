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

import { AdminReportSectionPanel4 } from './AdminReportSectionPanel4';

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

  // In-line Super Admin logouts confirmations
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  // Super Admin voice assistant modal
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);

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

      {/* Adjust container padding-top for the 28px height status bar */}
      <div className="pt-[28px] flex-1 flex flex-col">
        
            {/* VIEW SCHEME: PORT STAFF */}
        {currentRole === 'port' && (
          <div className="flex-1 flex flex-col">
            <PanelHeader title="Abra Port Station">
                <button
                  onClick={handleLogoutAction}
                  className="flex h-10 items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs px-5 rounded-2xl transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                >
                  Logout 🚢
                </button>
            </PanelHeader>
            <div className="flex-1">
              <Panel1 isSuperAdmin={false} />
            </div>
          </div>
        )}

        {/* VIEW SCHEME: TERMINAL STAFF */}
        {currentRole === 'terminal' && (
          <div className="flex-1 flex flex-col">
            <PanelHeader title="Mamburao dispatch Panel">
                <button
                  onClick={handleLogoutAction}
                  className="flex h-10 items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs px-5 rounded-2xl transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                >
                  Logout 🚐
                </button>
            </PanelHeader>
            <div className="flex-1">
              <Panel2 isSuperAdmin={false} />
            </div>
          </div>
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
            <header className="dashboard-header bg-white/80 border-b border-slate-200/70 py-4 px-6 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-2">
                <span className="bg-[#FF6B00] text-white font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded">ADMIN MODE</span>
                <span className="font-bold text-sm text-gray-500 font-sans">E-Transit Hub</span>
              </div>

              {/* Secure Confirm Logout */}
              <div className="flex items-center gap-3">
                {/* Auto Sync Toggle */}
                <div className="flex items-center gap-2 mr-2 bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/50">
                  <div className="flex flex-col items-end mr-1">
                     <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Sync {autoSyncEnabled ? 'On' : 'Off'}</span>
                     <span className="text-[8px] text-slate-400 whitespace-nowrap">
                        {lastSyncTime ? `Last: ${lastSyncTime.toLocaleTimeString()}` : 'Never'}
                     </span>
                  </div>
                  <button
                    onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoSyncEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    role="switch"
                    aria-checked={autoSyncEnabled}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoSyncEnabled ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </button>
                </div>

                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/75 text-slate-700 dark:border-slate-700/50 dark:bg-slate-800/80 dark:text-slate-200 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm backdrop-blur-md"
                  title="Toggle visual theme"
                >
                  {isDarkMode ? <i className="fa-solid fa-sun text-sm text-amber-500" /> : <i className="fa-solid fa-moon text-sm text-[#003580]" />}
                </button>
                {!showConfirmLogout ? (
                  <button
                    onClick={() => setShowConfirmLogout(true)}
                    className="flex h-10 items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs px-5 rounded-2xl transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                  >
                    🔐 Logout
                  </button>
                ) : (
                  <div className="flex items-center h-10 gap-2 bg-red-50 p-1 rounded-2xl border border-red-200 shadow-xs">
                    <span className="text-[10px] font-black text-red-700 font-mono pl-3 py-1">Are you sure?</span>
                    <button
                      onClick={handleLogoutAction}
                      className="bg-red-600 text-white font-bold text-[10px] px-3 h-8 rounded-xl hover:bg-red-700 cursor-pointer transition-colors active:scale-95"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setShowConfirmLogout(false)}
                      className="bg-gray-200 text-gray-700 font-bold text-[10px] px-3 h-8 rounded-xl hover:bg-gray-300 cursor-pointer transition-colors active:scale-95"
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
                </motion.div>
              </AnimatePresence>
            </div>

            {/* FIXED BOTTOM NAV BAR (z-index 50) */}
            <nav className="dashboard-nav fixed bottom-0 sm:bottom-6 left-0 sm:left-1/2 right-0 sm:right-auto sm:-translate-x-1/2 bg-white/90 backdrop-blur-xl border border-slate-200/50 sm:rounded-[24px] rounded-t-[24px] h-[76px] z-50 flex justify-around items-center px-6 shadow-2xl sm:min-w-[420px] transition-all overflow-hidden flex-nowrap">
              {[
                { id: 0, label: 'Port', icon: 'fa-ship', color: 'text-blue-600', activeBg: 'bg-blue-50' },
                { id: 1, label: 'Hub', icon: 'fa-bus', color: 'text-orange-500', activeBg: 'bg-orange-50' },
                { id: 2, label: 'Booking', icon: 'fa-user-check', color: 'text-emerald-500', activeBg: 'bg-emerald-50' },
                { id: 3, label: 'Admin', icon: 'fa-shield-halved', color: 'text-indigo-600', activeBg: 'bg-indigo-50' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setAdminActiveTab(tab.id)}
                  className={`relative flex-1 flex flex-col items-center justify-center h-full px-2 cursor-pointer transition-all duration-300 ease-out group ${
                    adminActiveTab === tab.id ? 'text-slate-900 scale-105' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${adminActiveTab === tab.id ? tab.activeBg : 'bg-transparent group-hover:bg-slate-50'}`}>
                    <i className={`fa-solid ${tab.icon} text-lg mb-1 transition-transform ${adminActiveTab === tab.id ? `${tab.color} drop-shadow-sm` : ''}`}></i>
                    <span className={`text-[9px] font-black uppercase tracking-widest font-sans transition-all ${adminActiveTab === tab.id ? tab.color : ''}`}>{tab.label}</span>
                  </div>
                  {adminActiveTab === tab.id && (
                    <motion.div layoutId="nav-indicator" className={`absolute -bottom-1 w-8 h-1.5 rounded-full ${tab.color.replace('text-', 'bg-')} shadow-sm`} />
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