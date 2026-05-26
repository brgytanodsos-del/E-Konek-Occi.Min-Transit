export interface Ship {
  id: string;
  name: string;
  route: string;
  depTime: string;
  arrTime: string;
  status: 'Scheduled' | 'Boarding' | 'Departed' | 'Delayed' | 'Cancelled';
  capacity: number;
  available: number;
  type: 'RORO' | 'Passenger Ferry';
}

export interface Trip {
  id: string;
  route: string;
  depTime: string;
  type: 'Van' | 'Bus';
  driver: string;
  capacity: number;
  available: number;
  status: 'Scheduled' | 'Boarding' | 'Departed' | 'Completed' | 'Cancelled';
}

export interface FerryBooking {
  id: string;
  shipId: string;
  name: string;
  contact: string;
  type: 'Regular' | 'Student' | 'Senior' | 'PWD';
  status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Queued';
  accountId?: string;
  queueType?: 'ferryBooking';
}

export interface VanBooking {
  id: string;
  tripId: string;
  pickup: string;
  name: string;
  contact: string;
  seats: number;
  status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Queued';
  accountId?: string;
  queueType?: 'vanBooking';
}

export interface Announcement {
  id: string;
  text: string;
  date: string;
  author: string;
}

export interface Transaction {
  id: string;
  timestamp: string;
  type: 'Ferry' | 'Van' | 'Bus';
  bookingId: string;
  passengerName: string;
  route: string;
  ticketType: string;
  grossAmount: number;
  commissionAmount: number;
  confirmedBy: 'Port Admin' | 'Terminal Admin';
  status: 'Completed' | 'Refunded';
  paid: boolean;
}

export interface PayoutHistory {
  id: string;
  date: string;
  totalAmount: number;
  transactionCount: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  role: string;
  action: string;
}

export interface UserAccount {
  id: string;
  accountType: 'passenger';
  fullName: string;
  mobileNumber: string;
  selfieUrl: string;
  gpsLocation: { lat: number; lng: number; formattedAddress: string };
  email: string;
  createdAt: string;
  bookingIds: string[];
  status: 'active';
}

export interface AdminAccount {
  id: string;
  fullName: string;
  mobileNumber?: string;
  role: 'port' | 'terminal' | 'driver' | 'superadmin';
  workId?: string;           // port staff only
  terminalMemberId?: string; // terminal staff or driver
  selfieUrl?: string;
  email?: string;
  pin?: string;
  createdAt: string;
  lastLogin: string;
  status: 'active' | 'suspended' | 'pending';
}

export type QueueItem = FerryBooking | VanBooking | Transaction;
export type Booking = FerryBooking | VanBooking;

