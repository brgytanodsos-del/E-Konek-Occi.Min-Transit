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
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#009E49]" />
          <h3 className="font-extrabold text-base text-[#003087] tracking-tight flex items-center gap-2">
            <span className="text-[#009E49]"><i className="fa-solid fa-ship"></i></span>
            Montenegro Marine Voyage Reservation
          </h3>
          <form onSubmit={props.handleFerryBookingSubmit} className="space-y-4 pt-4">
            {/* Fields... */}
            <button type="submit" className="w-full bg-[#009E49] ...">Book Ferry</button>
          </form>
        </div>
        
        {/* Land Form */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#FF8800]" />
          <h3 className="font-extrabold text-base text-slate-800 tracking-tight flex items-center gap-2">
            <span className="text-[#FF8800]"><i className="fa-solid fa-bus"></i></span>
            Mamburao Hub Shuttle Seat Reservation
          </h3>
          <form onSubmit={props.handleLandBookingSubmit} className="space-y-4 pt-4">
             {/* Fields... */}
             <button type="submit" className="w-full bg-[#FF8800] ...">Book Shuttle</button>
          </form>
        </div>
    </div>
  );
};
