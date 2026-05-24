import React, { useMemo } from 'react';
import { FerryBooking, VanBooking } from '@/types';
import { Card } from '@/components/ui';

const BookingRow = React.memo(({ booking }: { booking: FerryBooking | VanBooking }) => (
  <tr className="border-b border-zinc-800 hover:bg-zinc-800/50">
    <td className="p-4">{booking.name}</td>
    <td className="p-4">{booking.contact}</td>
    <td className="p-4">{'type' in booking ? booking.type : booking.seats}</td>
    <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${booking.status === 'Confirmed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{booking.status}</span></td>
  </tr>
));

BookingRow.displayName = 'BookingRow';

export const MemoizedBookingTable: React.FC<{ bookings: (FerryBooking | VanBooking)[] }> = React.memo(({ bookings }) => {
  return (
    <Card padding="none">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-700 text-left text-sm text-zinc-400">
            <th className="p-4">Passenger</th>
            <th className="p-4">Contact</th>
            <th className="p-4">Type/Seats</th>
            <th className="p-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map(book => <BookingRow key={book.id} booking={book} />)}
        </tbody>
      </table>
    </Card>
  );
});
