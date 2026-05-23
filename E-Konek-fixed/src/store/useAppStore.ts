import { create } from 'zustand';

interface Booking {
  id: string;
  route: string;
  type: 'ferry' | 'van';
  price: number;
  passengers: number;
  date: string;
}

interface AppStore {
  bookings: Booking[];
  currentUser: { name: string; role: string } | null;
  addBooking: (booking: Booking) => void;
  setCurrentUser: (user: { name: string; role: string } | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  bookings: [],
  currentUser: { name: "Super Admin", role: "superadmin" },
  addBooking: (booking) => set((state) => ({ 
    bookings: [...state.bookings, booking] 
  })),
  setCurrentUser: (user) => set({ currentUser: user }),
}));
