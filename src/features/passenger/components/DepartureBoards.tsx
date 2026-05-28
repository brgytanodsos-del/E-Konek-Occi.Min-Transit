import React from 'react';
import { Ship, Trip } from '../../../types/dataTypes';
import { calculateDynamicPrice } from '../../../lib/pricingEngine';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  ships: Ship[];
  trips: Trip[];
  formatPST: (time: string | undefined) => string;
  pulseActive: boolean;
  refreshTimer: number;
  refreshing: boolean;
  manualRefresh: () => void;
}

export const DepartureBoards: React.FC<Props> = ({
  ships,
  trips,
  formatPST,
  pulseActive,
  refreshTimer,
  refreshing,
  manualRefresh
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-100 p-5 rounded-3xl shadow-sm gap-4">
        <div>
          <h3 className="font-extrabold text-base text-slate-800 tracking-tight flex items-center gap-1.5">
            <span><i className="fa-solid fa-clock-rotate-left text-slate-400"></i></span>
            Integrated Sea-to-Land Departures Terminal Board
          </h3>
          <p className="text-xs text-slate-400 font-semibold">Departure estimates synchronized under Philippine Standard Time (PST)</p>
        </div>
        <div className="bg-slate-50 border border-slate-150 py-1.5 px-4 rounded-2xl flex items-center gap-3 shrink-0 self-stretch sm:self-auto text-center">
          <button 
              onClick={manualRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-xl transition text-[10px] font-bold tracking-wider cursor-pointer"
          >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'REFRESHING...' : 'REFRESH PRICES'}
          </button>
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF8800]"></span>
          </div>
          <span className="text-xs font-black text-slate-755 font-mono">
            Schedules refresh in <b className="text-[#FF8800]">{refreshTimer}s</b>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Montenegro Ferry Crossings Board */}
        <div className={`bg-white rounded-3xl p-6 border border-slate-100 shadow-sm transition-all duration-300 ${pulseActive ? 'ring-2 ring-[#009E49]' : ''}`}>
          <div className="flex justify-between items-center border-b border-slate-50 pb-3 mb-4">
            <h4 className="font-black text-xs sm:text-sm text-[#003087] uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-[#009E49]"><i className="fa-solid fa-ship"></i></span> 
              Montenegro Marine Voyages
            </h4>
            <span className="text-[10px] font-black uppercase text-[#009E49] px-2 py-0.5 bg-[#009E49]/15 rounded-full">Abra Pier Dock</span>
          </div>
          <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
            <AnimatePresence mode="popLayout">
            {ships.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-8 flex flex-col items-center justify-center text-center opacity-60"
              >
                <i className="fa-solid fa-ship text-3xl text-slate-300 mb-2"></i>
                <p className="text-slate-500 font-bold text-sm">No scheduled sailings</p>
                <p className="text-[10px] text-slate-400">Please check back later.</p>
              </motion.div>
            ) : ships.map((s) => (
              <motion.div 
                key={s.id} 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex justify-between items-center bg-slate-50/30 p-3 rounded-2xl border border-slate-100/30 hover:bg-slate-50/80 transition-all duration-150"
              >
                <div className="space-y-1">
                  <span className="font-black text-slate-800 text-sm block">{s.name}</span>
                  <span className="text-xs text-[#003087] font-semibold flex items-center gap-1">
                    <i className="fa-solid fa-map-pin text-[10px] text-slate-400"></i> {s.route}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-slate-400 block">{formatPST(s.depTime)}</span>
                  <div className="flex items-center gap-2 mt-1">
                      <span className="text-emerald-600 font-black text-xs">
                        ₱{s.pricingMode === 'automatic' ? calculateDynamicPrice(s) : (s.currentPrice || s.basePrice || 500)}
                      </span>
                      {s.pricingMode === 'automatic' && (
                        <span className="text-[9px] text-[#003087] flex items-center gap-1 mt-0.5 font-bold bg-[#003087]/10 px-1 py-0.5 rounded border border-[#003087]/20">
                          🔄 Auto-adjusted
                        </span>
                      )}
                      {s.pricingMode !== 'automatic' && s.currentPrice !== s.basePrice && (
                        <span className="text-slate-400 line-through text-[10px]">₱{s.basePrice}</span>
                      )}
                      {s.priceAdjustmentReason && (
                        <span className="text-[9px] text-amber-600 italic">* {s.priceAdjustmentReason}</span>
                      )}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1.5">
                  {s.available <= 0 ? (
                    <span className="bg-[#FF8800] text-white font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-widest">SOLD OUT</span>
                  ) : (
                    <span className="text-xs text-[#009E49] font-black">{s.available} / {s.capacity} Slots</span>
                  )}

                  <motion.span 
                    key={s.status}
                    initial={{ opacity: 0.5, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                      s.status === 'Boarding' ? 'bg-[#003087]/15 text-[#003087] border-[#003087]/20 animate-pulse' :
                      s.status === 'Delayed' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                      'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}
                  >
                    {s.status}
                  </motion.span>
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Shuttle departure board */}
        <div className={`bg-white rounded-3xl p-6 border border-slate-100 shadow-sm transition-all duration-300 ${pulseActive ? 'ring-2 ring-[#FF8800]' : ''}`}>
          <div className="flex justify-between items-center border-b border-slate-50 pb-3 mb-4">
            <h4 className="font-black text-xs sm:text-sm text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-[#FF8800]"><i className="fa-solid fa-truck-moving"></i></span> 
              Grand Terminal Dispatches
            </h4>
            <span className="text-[10px] font-black uppercase text-amber-600 px-2 py-0.5 bg-amber-100/80 rounded-full">Shuttle / Bus</span>
          </div>
          <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
            <AnimatePresence mode="popLayout">
            {trips.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-8 flex flex-col items-center justify-center text-center opacity-60"
              >
                <i className="fa-solid fa-bus text-3xl text-slate-300 mb-2"></i>
                <p className="text-slate-500 font-bold text-sm">No active dispatch schedules</p>
                <p className="text-[10px] text-slate-400">Please check back later.</p>
              </motion.div>
            ) : trips.map((t) => (
              <motion.div 
                key={t.id} 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex justify-between items-center bg-slate-50/30 p-3 rounded-2xl border border-slate-100/30 hover:bg-slate-50/80 transition-all duration-150"
              >
                <div className="space-y-1">
                  <span className="font-black text-slate-800 text-sm block">{t.driver}</span>
                  <span className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                    <i className="fa-solid fa-location-arrow text-[10px] text-slate-400"></i> {t.route}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-slate-400 block">{formatPST(t.depTime)}</span>
                  <div className="flex items-center gap-2 mt-1">
                      <span className="text-emerald-600 font-black text-xs">
                        ₱{t.pricingMode === 'automatic' ? calculateDynamicPrice(t) : (t.currentPrice || t.basePrice || 200)}
                      </span>
                      {t.pricingMode === 'automatic' && (
                        <span className="text-[9px] text-[#FF8800] flex items-center gap-1 mt-0.5 font-bold bg-[#FF8800]/10 px-1 py-0.5 rounded border border-[#FF8800]/20">
                          🔄 Auto-adjusted
                        </span>
                      )}
                      {t.pricingMode !== 'automatic' && t.currentPrice !== t.basePrice && (
                        <span className="text-slate-400 line-through text-[10px]">₱{t.basePrice}</span>
                      )}
                      {t.priceAdjustmentReason && (
                        <span className="text-[9px] text-amber-600 italic">* {t.priceAdjustmentReason}</span>
                      )}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1.5">
                  {t.available <= 0 ? (
                    <span className="bg-[#FF8800] text-white font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-widest">FULL VEHICLE</span>
                  ) : (
                    <span className="text-xs text-slate-600 font-extrabold">{t.available} Available</span>
                  )}

                  <motion.span 
                    key={t.status}
                    initial={{ opacity: 0.5, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                      t.status === 'Boarding' ? 'bg-[#003087]/15 text-[#003087] border-[#003087]/20 animate-pulse' :
                      t.status === 'Departed' ? 'bg-amber-100 text-[#FF8800] border-amber-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}
                  >
                    {t.status}
                  </motion.span>
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
};
