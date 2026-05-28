import React, { useState } from 'react';
import { PanelHeader } from './common/PanelHeader';
import { Scan, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScanLog {
  id: string;
  timestamp: Date;
  result: 'success' | 'invalid';
  payload: string;
}

const playSound = (type: 'success' | 'invalid') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'success') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    } else {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
      oscillator.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    }
  } catch (e) {
    console.warn('Audio playback failed or not supported:', e);
  }
};

export const DiagnosticsPanel = () => {
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'invalid' | null>(null);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [selectedLogPayload, setSelectedLogPayload] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'success' | 'invalid'>('all');

  const simulateScan = (isValid: boolean) => {
    setScanResult(isValid ? 'success' : 'invalid');
    playSound(isValid ? 'success' : 'invalid');
    
    const newLog: ScanLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date(),
      result: isValid ? 'success' : 'invalid',
      payload: isValid ? '{"type": "TICKET_VALID", "role": "Passenger", "id": "TK-8483"}' : '{"type": "UNKNOWN_CODE", "raw": "148419241"}',
    };
    setLogs(prev => [newLog, ...prev]);

    setTimeout(() => {
      setScanResult(null);
      setIsQRModalOpen(false);
    }, 2000);
  };

  const totalScans = logs.length;
  const successScans = logs.filter(log => log.result === 'success').length;
  const errorScans = totalScans - successScans;

  const filteredLogs = logs.filter(log => {
    if (filterType === 'all') return true;
    return log.result === filterType;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 pb-[100px]">
      <PanelHeader
        title={<span className="text-[10px] uppercase font-black tracking-widest text-[#003580]/50 font-sans">Diagnostics</span>}
        className="bg-white/60 backdrop-blur-xl border-b border-slate-200"
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-[24px] p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2 flex items-center gap-2">
              <Scan className="w-5 h-5 text-indigo-500" />
              QR Code Scanner Capabilities
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">
              Manually trigger and test the QR code scanner validation logic without requiring physical hardware or camera access.
            </p>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsQRModalOpen(true)}
                className="bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Scan className="w-4 h-4" />
                Trigger Mock Scan
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Total Scans</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white">{totalScans}</span>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-emerald-200/50 dark:border-emerald-500/20 flex flex-col justify-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Successful</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{successScans}</span>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-rose-200/50 dark:border-rose-500/20 flex flex-col justify-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1">Failed</span>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{errorScans}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-[24px] p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-list-check text-emerald-500"></i>
                Recent Scan Logs
              </h3>
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl px-3 py-1.5 outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="all">All Results</option>
                <option value="success">Successful</option>
                <option value="invalid">Failed</option>
              </select>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
                <thead className="text-[10px] uppercase font-black text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Timestamp</th>
                    <th className="px-4 py-3">Result</th>
                    <th className="px-4 py-3 rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-400 font-medium text-xs">
                        No scan logs found.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => (
                      <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                          {log.timestamp.toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            log.result === 'success' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {log.result}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedLogPayload(log.payload)}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-3 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition-colors"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Persistent floating trigger button for easier access */}
      <div className="fixed bottom-24 right-6 z-40">
        <button
          onClick={() => setIsQRModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl hover:shadow-2xl transition-all active:scale-95 rounded-full px-5 py-4 flex items-center gap-3 group border border-indigo-500/50"
        >
          <Scan className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Trigger Mock Scan</span>
        </button>
      </div>

      <AnimatePresence>
        {isQRModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative"
            >
              <button
                onClick={() => {
                setIsQRModalOpen(false);
                setScanResult(null);
              }}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <i className="fa-solid fa-times"></i>
            </button>
            
            <div className="p-8 text-center border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white mb-1">
                Mock QR Scanner
              </h4>
              <p className="text-[10px] text-slate-500 font-medium">
                Testing environment for optical validation
              </p>
            </div>

            <div className="p-8 pb-10 space-y-4">
              {!scanResult ? (
                <>
                  <button
                    onClick={() => simulateScan(true)}
                    className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-black transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Simulate Valid Ticket
                  </button>
                  <button
                    onClick={() => simulateScan(false)}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-black transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Simulate Invalid Ticket
                  </button>
                </>
              ) : scanResult === 'success' ? (
                <div className="py-4 text-center animate-bg-pulse">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h5 className="font-black text-emerald-700 text-lg">Valid Ticket</h5>
                  <p className="text-xs text-emerald-600 font-bold mt-1 tracking-widest uppercase">Access Granted</p>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 animate-shake">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <h5 className="font-black text-rose-700 text-lg">Invalid Code</h5>
                  <p className="text-xs text-rose-600 font-bold mt-1 tracking-widest uppercase">Access Denied</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedLogPayload && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">
                  Mock Payload Data
                </h4>
                <button
                  onClick={() => setSelectedLogPayload(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-900">
                <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all">
                  {JSON.stringify(JSON.parse(selectedLogPayload), null, 2)}
                </pre>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
