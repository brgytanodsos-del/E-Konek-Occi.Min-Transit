import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SurfaceCard } from './ui';
import { Compass, Ship, Bus, RefreshCw, Radio, MapPin, Gauge, ShieldCheck, Navigation } from 'lucide-react';
import { toast } from 'sonner';

export const LiveTracking: React.FC = () => {
  const { ships, trips } = useApp();
  const [radialSweep, setRadialSweep] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Radar sweep animation hook
  useEffect(() => {
    const handle = setInterval(() => {
      setRadialSweep((prev) => (prev + 3) % 360);
    }, 40);
    return () => clearInterval(handle);
  }, []);

  const handleRefresh = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      toast.success('Radar telemetry feed recalculated and synced!');
    }, 1200);
  };

  // Get active items to track
  const activeShips = ships.filter(s => s.status === 'Boarding' || s.status === 'Departed');
  const activeTrips = trips.filter(t => t.status === 'Boarding' || t.status === 'Departed');

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 text-slate-200">
      
      {/* 1. RADAR SWEPT CONSOLE */}
      <SurfaceCard className="xl:col-span-1 bg-slate-950/90 border border-slate-800/80 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[380px]">
        {/* Glowing Background Glows */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
              <span className="text-xs font-black uppercase tracking-widest text-[#00E5FF] font-mono">
                PST Active Sweep Radar
              </span>
            </div>
            <button
              onClick={handleRefresh}
              className={`text-slate-400 hover:text-white p-1 hover:bg-slate-800/50 rounded-lg transition-all ${
                isSyncing ? 'animate-spin' : ''
              }`}
            >
              <RefreshCw size={13} />
            </button>
          </div>

          {/* Actual Radar Graphic Circle */}
          <div className="relative w-48 h-48 mx-auto rounded-full border border-emerald-500/20 bg-emerald-950/20 flex items-center justify-center">
            {/* Concentric grid rings */}
            <div className="absolute w-36 h-36 rounded-full border border-emerald-500/10" />
            <div className="absolute w-24 h-24 rounded-full border border-emerald-500/10" />
            <div className="absolute w-12 h-12 rounded-full border border-emerald-500/5" />
            
            {/* Crosshairs */}
            <div className="absolute w-full h-[1px] bg-emerald-500/10" />
            <div className="absolute h-full w-[1px] bg-emerald-500/10" />

            {/* Sweep Line */}
            <div
              className="absolute w-1/2 h-1/2 origin-bottom-right bottom-1/2 right-1/2 bg-gradient-to-tr from-transparent to-emerald-500/25 border-r border-emerald-500/30 filter blur-[0.5px]"
              style={{ transform: `rotate(${radialSweep}deg)` }}
            />

            {/* Vessel Pulses */}
            {activeShips.map((ship, idx) => (
              <div
                key={ship.id}
                className="absolute w-2.5 h-2.5 bg-cyan-400 rounded-full border-2 border-slate-950 cursor-pointer animate-ping"
                style={{
                  top: `${30 + idx * 25}%`,
                  left: `${40 + idx * 18}%`,
                }}
                title={`${ship.name} (${ship.route})`}
              />
            ))}

            {/* Shuttle Pulses */}
            {activeTrips.map((trip, idx) => (
              <div
                key={trip.id}
                className="absolute w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950 cursor-pointer animate-pulse"
                style={{
                  top: `${65 - idx * 20}%`,
                  left: `${20 + idx * 30}%`,
                }}
                title={`Shuttle: ${trip.route}`}
              />
            ))}

            <Compass className="w-5 h-5 text-emerald-400/30 animate-spin-slow shrink-0" />
          </div>
        </div>

        <div className="relative z-10 mt-6 border-t border-slate-900 pt-3">
          <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 font-mono">
            <span>Range: 50 NM</span>
            <span>Freq: 156.8 MHz</span>
          </div>
          <div className="text-[10px] text-slate-500 font-bold mt-1.5 leading-normal">
            Covers Batangas Strait maritime corridors & Occidental Mindoro highways.
          </div>
        </div>

      </SurfaceCard>

      {/* 2. LIVE DESPATCH / TELEMETRY STATUS LIST */}
      <SurfaceCard className="xl:col-span-2 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-black text-white font-sans flex items-center gap-2">
                <Navigation size={18} className="text-emerald-500 animate-pulse shrink-0" /> Fleet Telemetry Dashboard
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Real-time GPS transit coordinate locks for batched routes.</p>
            </div>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded px-2.5 py-1 uppercase font-mono shrink-0">
              {activeShips.length + activeTrips.length} active locks
            </span>
          </div>

          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
            {activeShips.length === 0 && activeTrips.length === 0 ? (
              <div className="text-center py-12 bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl text-slate-550">
                <ShieldCheck size={32} className="mx-auto text-slate-600 mb-1.5" />
                <p className="text-xs font-bold font-sans">All vessels and shuttles securely docked</p>
                <p className="text-[9px] opacity-60 font-medium">No live boarding/departed dispatches to track at this timestamp</p>
              </div>
            ) : (
              <>
                {/* Vessels */}
                {activeShips.map(ship => (
                  <div key={ship.id} className="bg-slate-950/40 border border-slate-850 p-3.5 rounded-2xl flex items-center justify-between gap-4 group hover:bg-slate-950/70 transition-all duration-350">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 shrink-0">
                        <Ship className="w-4 h-4 animate-bounce" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-white truncate">{ship.name}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{ship.route}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 font-mono text-[10px] font-bold">
                      <div className="text-right hidden sm:block">
                        <p className="text-slate-500 uppercase text-[9px] font-bold">Locks</p>
                        <p className="text-slate-350">13.56°N, 120.61°E</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500 uppercase text-[9px] font-bold">Speed</p>
                        <p className="text-blue-400">14.2 kts</p>
                      </div>
                      <span className="text-[9px] font-black uppercase text-amber-400 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                        {ship.status}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Shuttles */}
                {activeTrips.map(trip => (
                  <div key={trip.id} className="bg-slate-950/40 border border-slate-850 p-3.5 rounded-2xl flex items-center justify-between gap-4 group hover:bg-slate-950/70 transition-all duration-350">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
                        <Bus className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-white truncate">{trip.route}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">Crew: {trip.driver || 'Staff Shuttle'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 font-mono text-[10px] font-bold">
                      <div className="text-right hidden sm:block">
                        <p className="text-slate-500 uppercase text-[9px] font-bold">Locks</p>
                        <p className="text-slate-350">13.21°N, 120.58°E</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500 uppercase text-[9px] font-bold">Speed</p>
                        <p className="text-emerald-400">65 km/h</p>
                      </div>
                      <span className="text-[9px] font-black uppercase text-amber-400 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                        {trip.status}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="text-[10px] text-slate-500 font-bold bg-slate-950/30 px-4 py-2.5 rounded-xl border border-slate-900 mt-4 text-center">
          🛰️ Core GPS locks utilize real-time satellite telemetry synced with transit driver terminals.
        </div>
      </SurfaceCard>

    </div>
  );
};
export default LiveTracking;
