export interface Ship {
  id: string;
  name: string;
  route: string;
  depTime: string;
  arrTime: string;
  status: string;
  capacity: number;
  available: number;
  type: string;
}

export interface Trip {
  id: string;
  route: string;
  depTime: string;
  type: string;
  driver: string;
  capacity: number;
  available: number;
  status: string;
}

export interface FerryBooking {
  id: string;
  shipId: string;
  name: string;
  contact: string;
  type: string;
  status: string;
}

export interface VanBooking {
  id: string;
  tripId: string;
  pickup: string;
  name: string;
  contact: string;
  seats: number;
  status: string;
}

export interface Announcement {
  id: string;
  text: string;
  date: string;
  author: string;
}

export interface UserAccount {
  id: string;
  accountType: 'passenger' | 'driver';
  fullName: string;
  mobileNumber: string;
  address: string;
  addressCoords: { lat: number; lng: number } | null;
  selfieDataUrl: string;
  createdAt: string;
  bookingIds: string[];
}

export interface AdminAccount {
  id: string;
  fullName: string;
  role: 'port' | 'terminal';
  pin: string;
  createdAt: string;
  lastLogin?: string;
  status: 'active' | 'suspended' | 'pending';
}

export interface WeatherData {
  temperature_2m: number;
  weathercode: number;
  windspeed_10m: number;
  lastUpdated: string;
}
