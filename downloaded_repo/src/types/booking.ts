export type BookingStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Refunded' | 'Cancelled';

export type TicketType = 'Regular' | 'Student' | 'Senior' | 'PWD';

export interface FerryBooking {
  id: string;
  shipId: string;
  name: string;
  contact: string;
  type: TicketType;
  status: BookingStatus;
}

export interface VanBooking {
  id: string;
  tripId: string;
  pickup: string;
  name: string;
  contact: string;
  seats: number;
  status: BookingStatus;
}
