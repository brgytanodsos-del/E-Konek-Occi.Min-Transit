import React, { useEffect, useRef, useState } from 'react';
import { Trip } from '../../../types/dataTypes';

interface Props {
  trackedTripId: string | null;
  trips: Trip[];
  getTripLocation: (tripId: string, routeName: string) => [number, number];
  onClose: () => void;
}

export const LiveTrackingView: React.FC<Props> = ({ trackedTripId, trips, getTripLocation, onClose }) => {
  const [etaSeconds, setEtaSeconds] = useState(15 * 60);
  const trackMapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Simulating ETA countdown
  useEffect(() => {
    if (!trackedTripId) return;

    const etaInterval = setInterval(() => {
      setEtaSeconds(prev => {
        const next = prev - 5;
        return next > 0 ? next : 0;
      });
    }, 3000);

    return () => clearInterval(etaInterval);
  }, [trackedTripId]);

  // Leaflet map init
  useEffect(() => {
    if (!trackedTripId || !trackMapRef.current) {
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch (e) {}
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    const L = (window as any).L;
    if (!L) return;

    const activeTrip = trips.find(t => t.id === trackedTripId);
    if (!activeTrip) return;

    const initialPos = getTripLocation(activeTrip.id, activeTrip.route);

    if (!mapInstanceRef.current) {
      if (trackMapRef.current) {
        delete (trackMapRef.current as any)._leaflet_id;
      }
      const mapInstance = L.map(trackMapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false
      }).setView(initialPos, 12);
      mapInstanceRef.current = mapInstance;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance);

      const orangeDotIcon = L.divIcon({
        className: 'custom-gps-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute h-8 w-8 rounded-full bg-orange-500/30 animate-ping"></div>
            <div class="h-5 w-5 bg-[#FF6B00] rounded-full border-2 border-white shadow-lg"></div>
          </div>
        `,
        iconSize: [24, 24]
      });

      markerRef.current = L.marker(initialPos, { icon: orangeDotIcon }).addTo(mapInstance);

      let alive = true;
      const invalidateMapSize = () => {
        if (alive && mapInstance && (mapInstance as any)._mapPane) {
          try { mapInstance.invalidateSize({ animate: false }); } catch (e) {}
        }
      };

      const resizeObserver = new window.ResizeObserver(() => invalidateMapSize());
      if (trackMapRef.current) resizeObserver.observe(trackMapRef.current);

      const timeouts = [10, 50, 100, 200, 500, 1000, 2000].map(delay => setTimeout(invalidateMapSize, delay));
      mapInstance.whenReady(() => setTimeout(invalidateMapSize, 10));

      return () => {
        alive = false;
        resizeObserver.disconnect();
        timeouts.forEach(clearTimeout);

        if (mapInstanceRef.current) {
          try { mapInstanceRef.current.remove(); } catch (e) {}
          mapInstanceRef.current = null;
          markerRef.current = null;
        }
      };
    }
  }, [trackedTripId, getTripLocation, trips]);

  // Marker updates
  useEffect(() => {
    if (!trackedTripId || !mapInstanceRef.current || !markerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const activeTrip = trips.find(t => t.id === trackedTripId);
    if (!activeTrip) return;

    const currentPos = getTripLocation(activeTrip.id, activeTrip.route);
    if (markerRef.current) {
      markerRef.current.setLatLng(currentPos);
      mapInstanceRef.current.panTo(currentPos);
      markerRef.current.bindPopup(`
        <div class="text-xs font-semibold p-1">
          <b>${activeTrip.driver}</b><br/>
          Route: ${activeTrip.route}<br/>
          Status: <span class="text-orange-600 font-bold">${activeTrip.status}</span>
        </div>
      `).openPopup();
    }
  }, [trackedTripId, trips, getTripLocation]);

  const formatETA = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s remaining`;
  };

  if (!trackedTripId) return null;
  const tripObj = trips.find(t => t.id === trackedTripId);

  return (
    <div className="panel-page min-h-[calc(100vh-80px)] bg-slate-50/70 backdrop-blur-[2px] flex flex-col animate-fade-in relative text-slate-850">
      <div className="bg-[#003087] text-white p-4 flex items-center justify-between shadow-md border-b-2 border-[#FF8800]">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-white/10 rounded-xl text-yellow-300 animate-pulse text-sm">
            <i className="fa-solid fa-satellite-dish"></i>
          </span>
          <div>
            <p className="font-black text-xs sm:text-sm uppercase tracking-wider">Active GPS Vehicle Telemetry</p>
            <p className="text-[10px] text-white/70 font-semibold">Centennial Highway Real-time Coordinates Feed</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer"
        >
          <i className="fa-solid fa-circle-xmark mr-1"></i> Close Tracker
        </button>
      </div>

      <div ref={trackMapRef} className="flex-1 w-full bg-slate-200" style={{ minHeight: '350px' }} />

      {tripObj && (
        <div className="bg-white border-t-4 border-[#FF8800] p-6 rounded-t-3xl shadow-2xl space-y-4 max-w-lg mx-auto w-full absolute bottom-0 left-0 right-0 z-[1000] animate-slide-up">
          <div className="flex justify-between items-start">
            <div>
              <span className="bg-[#003087]/10 text-[#003087] border border-[#003087]/20 text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full">
                {tripObj.type} Class Network
              </span>
              <h4 className="font-black text-slate-800 text-base mt-2 flex items-center gap-1.5">
                <span className="text-[#FF8800]"><i className="fa-solid fa-route"></i></span>
                {tripObj.route}
              </h4>
            </div>
            <div className="bg-orange-50/80 border border-orange-200/50 px-3 py-1.5 rounded-2xl text-right">
              <span className="text-[9px] font-black text-slate-500 block uppercase font-mono tracking-wider">Estimated Transit</span>
              <span className="text-xs sm:text-sm font-black text-[#FF8800] font-mono">{formatETA(etaSeconds)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs border-t border-dashed border-slate-100 pt-3">
            <div className="bg-slate-50 p-3 rounded-xl">
              <p className="font-black text-slate-400 uppercase tracking-wider text-[9px]">Assigned Driver</p>
              <p className="font-black text-slate-700 mt-1 flex items-center gap-1">
                <span className="text-slate-400"><i className="fa-solid fa-user-circle"></i></span>
                {tripObj.driver}
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <p className="font-black text-slate-400 uppercase tracking-wider text-[9px]">Seats Capacity</p>
              <p className="font-black text-[#009E49] mt-1 flex items-center gap-1 animate-pulse">
                <span><i className="fa-solid fa-chair text-emerald-500"></i></span>
                {tripObj.available} / {tripObj.capacity} Open
              </p>
            </div>
          </div>
          
          <p className="text-[10px] text-slate-400 text-center leading-normal font-medium bg-slate-50 py-1.5 rounded-lg border border-slate-100 uppercase tracking-wider">
            🟢 Telematic map coordinate markers auto-refreshing every 3.0s
          </p>
        </div>
      )}
    </div>
  );
};
