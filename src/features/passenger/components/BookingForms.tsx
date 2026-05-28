import React from 'react';
import { Ship, Trip } from '../../../types/dataTypes';

interface BookingFormsProps {
  ships: Ship[];
  trips: Trip[];
  voyageId: string; setVoyageId: (v: string) => void;
  ferryName: string; setFerryName: (v: string) => void;
  ferryContact: string; setFerryContact: (v: string) => void;
  ticketType: string; setTicketType: (v: string) => void;
  tripId: string; setTripId: (v: string) => void;
  pickupPoint: string; setPickupPoint: (v: string) => void;
  shuttleName: string; setShuttleName: (v: string) => void;
  shuttleContact: string; setShuttleContact: (v: string) => void;
  seatsCount: string; setSeatsCount: (v: string) => void;
  handleFerryBookingSubmit: (e: React.FormEvent) => void;
  handleLandBookingSubmit: (e: React.FormEvent) => void;
  isOnline: boolean;
}

export const BookingForms: React.FC<BookingFormsProps> = (props) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ferry Form */}
        <div className="bg-white dark:bg-[#111a2e] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#009E49]" />
          <h3 className="font-extrabold text-base text-[#003087] dark:text-sky-400 tracking-tight flex items-center gap-2">
            <span className="text-[#009E49]"><i className="fa-solid fa-ship"></i></span>
            Montenegro Marine Voyage Reservation
          </h3>
          <form onSubmit={props.handleFerryBookingSubmit} className="space-y-4 pt-4 text-xs font-semibold">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1 font-bold uppercase tracking-wider text-[10px]">Select Available Vessel & Voyage</label>
              <select
                value={props.voyageId}
                onChange={(e) => props.setVoyageId(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-xl border border-slate-250 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:border-[#009E49] focus:ring-1 focus:ring-[#009E49] transition-all"
              >
                <option value="">-- Choose Marine Voyage --</option>
                {props.ships.map(ship => (
                  <option key={ship.id} value={ship.id}>
                    🚢 {ship.name} — {ship.route} ({ship.available} seats left)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-bold uppercase tracking-wider text-[10px]">Passenger Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Juan De Cruz"
                  value={props.ferryName}
                  onChange={(e) => props.setFerryName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-250 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:border-[#009E49] focus:ring-1 focus:ring-[#009E49] transition-all"
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-bold uppercase tracking-wider text-[10px]">Mobile Contact</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 09171234567"
                  value={props.ferryContact}
                  onChange={(e) => props.setFerryContact(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-250 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:border-[#009E49] focus:ring-1 focus:ring-[#009E49] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1 font-bold uppercase tracking-wider text-[10px]">Fare Tier / Classification</label>
              <select
                value={props.ticketType}
                onChange={(e) => props.setTicketType(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-250 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:border-[#009E49] focus:ring-1 focus:ring-[#009E49] transition-all"
              >
                <option value="Regular">🎫 Regular Single Fare</option>
                <option value="Student">🎓 Student Privilege (20% off)</option>
                <option value="Senior">👵 Senior Citizen / PWD (20% off)</option>
                <option value="Child">👶 Infant / Minor</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full h-12 mt-2 bg-[#009E49] hover:bg-[#008f42] text-white font-black uppercase tracking-widest text-[11px] rounded-xl shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-anchor"></i>
              Book Seat on Montenegro Direct
            </button>
          </form>
        </div>
        
        {/* Land Form */}
        <div className="bg-white dark:bg-[#111a2e] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#FF8800]" />
          <h3 className="font-extrabold text-base text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <span className="text-[#FF8800]"><i className="fa-solid fa-bus"></i></span>
            Mamburao Hub Shuttle Seat Reservation
          </h3>
          <form onSubmit={props.handleLandBookingSubmit} className="space-y-4 pt-4 text-xs font-semibold">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1 font-bold uppercase tracking-wider text-[10px]">Select Shuttle Service Route</label>
              <select
                value={props.tripId}
                onChange={(e) => props.setTripId(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-xl border border-slate-250 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:border-[#FF8800] focus:ring-1 focus:ring-[#FF8800] transition-all"
              >
                <option value="">-- Choose Overland Shuttles --</option>
                {props.trips.map(trip => (
                  <option key={trip.id} value={trip.id}>
                    🚐 {trip.type} (Driver: {trip.driver}) — {trip.route} ({trip.available} slots left)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-bold uppercase tracking-wider text-[10px]">Passenger Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Juan De Cruz"
                  value={props.shuttleName}
                  onChange={(e) => props.setShuttleName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-250 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:border-[#FF8800] focus:ring-1 focus:ring-[#FF8800] transition-all"
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-bold uppercase tracking-wider text-[10px]">Mobile Contact</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 09171234567"
                  value={props.shuttleContact}
                  onChange={(e) => props.setShuttleContact(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-250 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:border-[#FF8800] focus:ring-1 focus:ring-[#FF8800] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-bold uppercase tracking-wider text-[10px]">Boarding Point / Landmark</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abra Port Terminal Gate"
                  value={props.pickupPoint}
                  onChange={(e) => props.setPickupPoint(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-250 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:border-[#FF8800] focus:ring-1 focus:ring-[#FF8800] transition-all"
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-bold uppercase tracking-wider text-[10px]">Seats Count</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="10"
                  placeholder="1"
                  value={props.seatsCount}
                  onChange={(e) => props.setSeatsCount(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-250 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:border-[#FF8800] focus:ring-1 focus:ring-[#FF8800] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-12 mt-2 bg-[#FF8800] hover:bg-[#e07700] text-white font-black uppercase tracking-widest text-[11px] rounded-xl shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-van-shuttle"></i>
              Book Seat on Overland Shuttle
            </button>
          </form>
        </div>
    </div>
  );
};
