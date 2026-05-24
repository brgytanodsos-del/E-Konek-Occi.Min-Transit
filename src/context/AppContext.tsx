import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { Ship, Trip, FerryBooking, VanBooking, Announcement, Transaction, PayoutHistory, AuditLog, UserAccount, AdminAccount, QueueItem, Booking } from '../types/dataTypes';
import { getMockSeed } from '../utils/mockData';
import { GPS_ROUTES } from './GPS_ROUTES';


// COMMISSION_RATES and other stuff follows
const COMMISSION_RATES = {
  ferry_regular: 50,
  ferry_student: 30,
  ferry_senior:  25,
  ferry_pwd:     25,
  van_per_seat:  20,
  bus_per_seat:  15,
};

const GROSS_AMOUNTS = {
  ferry_regular: 500,
  ferry_student: 350,
  ferry_senior:  300,
  ferry_pwd:     300,
  van_per_seat:  200,
  bus_per_seat:  150,
};

// HELPER ID GENERATION
const generateId = () => Math.random().toString(36).substring(2, 11);

// HELPER COMMISSION & GROSS
const getCommission = (type: 'Ferry' | 'Van' | 'Bus', ticketType: string, seats: number = 1): number => {
  if (type === 'Ferry') {
    const key = `ferry_${ticketType.toLowerCase()}` as keyof typeof COMMISSION_RATES;
    return COMMISSION_RATES[key] || COMMISSION_RATES.ferry_regular;
  } else if (type === 'Van') {
    return COMMISSION_RATES.van_per_seat * seats;
  } else {
    return COMMISSION_RATES.bus_per_seat * seats;
  }
};

const getGrossAmount = (type: 'Ferry' | 'Van' | 'Bus', ticketType: string, seats: number = 1): number => {
  if (type === 'Ferry') {
    const key = `ferry_${ticketType.toLowerCase()}` as keyof typeof GROSS_AMOUNTS;
    return GROSS_AMOUNTS[key] || GROSS_AMOUNTS.ferry_regular;
  } else if (type === 'Van') {
    return GROSS_AMOUNTS.van_per_seat * seats;
  } else {
    return GROSS_AMOUNTS.bus_per_seat * seats;
  }
};

interface AppContextType {
  ships: Ship[];
  setShips: React.Dispatch<React.SetStateAction<Ship[]>>;
  trips: Trip[];
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
  ferryBookings: FerryBooking[];
  setFerryBookings: React.Dispatch<React.SetStateAction<FerryBooking[]>>;
  vanBookings: VanBooking[];
  setVanBookings: React.Dispatch<React.SetStateAction<VanBooking[]>>;
  announcements: Announcement[];
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  offlineQueue: QueueItem[];
  setOfflineQueue: React.Dispatch<React.SetStateAction<QueueItem[]>>;
  isOnline: boolean;
  gpsIndices: Record<string, number>;
  setGpsIndices: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  abraWeather: any;
  setAbraWeather: React.Dispatch<React.SetStateAction<any>>;
  mamburaoWeather: any;
  setMamburaoWeather: React.Dispatch<React.SetStateAction<any>>;
  auditLog: AuditLog[];
  setAuditLog: React.Dispatch<React.SetStateAction<AuditLog[]>>;
  payoutHistory: PayoutHistory[];
  setPayoutHistory: React.Dispatch<React.SetStateAction<PayoutHistory[]>>;
  currentRole: 'port' | 'terminal' | 'passenger' | 'superadmin' | null;
  setCurrentRole: React.Dispatch<React.SetStateAction<'port' | 'terminal' | 'passenger' | 'superadmin' | null>>;
  isAuthenticated: boolean;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  sessionToken: string | null;
  setSessionToken: React.Dispatch<React.SetStateAction<string | null>>;
  toastMessage: string | null;
  setToastMessage: React.Dispatch<React.SetStateAction<string | null>>;
  userAccount: UserAccount | null;
  setUserAccount: React.Dispatch<React.SetStateAction<UserAccount | null>>;
  userAccounts: UserAccount[];
  setUserAccounts: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  adminAccounts: AdminAccount[];
  setAdminAccounts: React.Dispatch<React.SetStateAction<AdminAccount[]>>;
  
  // Custom API Functions
  addTransaction: (booking: Booking, confirmedBy: 'Port Admin' | 'Terminal Admin') => Promise<void>;
  getTripLocation: (tripId: string, route: string) => [number, number];
  formatPST: (iso: string) => string;
  updateTransaction: (txId: string, updates: Partial<Transaction>) => Promise<void>;
  persistPayout: (amount: number, count: number) => Promise<void>;
  persistShip: (ship: Ship) => Promise<void>;
  persistTrip: (trip: Trip) => Promise<void>;
  persistAnnouncement: (ann: Announcement) => Promise<void>;
  persistFerryBooking: (booking: FerryBooking) => Promise<void>;
  persistVanBooking: (booking: VanBooking) => Promise<void>;
  updateShipStatus: (id: string, status: Ship['status']) => Promise<void>;
  updateTripStatus: (id: string, status: Trip['status']) => Promise<void>;
  updateBookingStatus: (id: string, type: 'ferry' | 'van', status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Queued') => Promise<void>;
  isDarkMode: boolean;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Session Access Rules
  const [currentRole, setCurrentRole] = useState<'port' | 'terminal' | 'passenger' | 'superadmin' | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);

  // Dark Mode Setting with robust local cache & media preference detection
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  }, [isDarkMode]);

  // Network State
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);

  // State Declarations
  const [ships, setShips] = useState<Ship[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [ferryBookings, setFerryBookings] = useState<FerryBooking[]>([]);
  const [vanBookings, setVanBookings] = useState<VanBooking[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistory[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);

  // GPS and Weather State
  const [gpsIndices, setGpsIndices] = useState<Record<string, number>>({});
  const [abraWeather, setAbraWeather] = useState<any>(null);
  const [mamburaoWeather, setMamburaoWeather] = useState<any>(null);

  // Local storage cache for weather fallback (non-blocking)
  const weatherCache = useRef<{ abra: any; mamburao: any; time: string }>({
    abra: { temp: 30.2, windSpeed: 12.5, conditionCode: 0 },
    mamburao: { temp: 31.0, windSpeed: 10.4, conditionCode: 1 },
    time: new Date().toLocaleTimeString()
  });

  // Timezone PST Formatter
  const formatPST = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return iso;
    }
  };

  // GPS marker lookup
  const getTripLocation = (tripId: string, route: string): [number, number] => {
    const coords = GPS_ROUTES[route] || GPS_ROUTES['default'];
    const idx = gpsIndices[tripId] ?? 0;
    return coords[idx % coords.length];
  };

  // Network Listener Setup
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      setToastMessage("📶 Back ONLINE — Synced live services");
      toast.success("✅ Live Data Stream Activated");
    };

    const handleOffline = () => {
      setIsOnline(false);
      setToastMessage("📵 OFFLINE — Cached logs in usage");
      toast.error("🔴 Offline Mode Entered");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync Offline Booking Queue
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      const runSync = async () => {
        const count = offlineQueue.length;
        const currentFerry = [...ferryBookings];
        const currentVan = [...vanBookings];

        for (const item of offlineQueue) {
          try {
            if (item.queueType === 'ferryBooking') {
              const cleaned = { ...item, status: 'Pending' as const };
              delete cleaned.queueType;
              const docRef = doc(db, 'ferryBookings', item.id);
              await setDoc(docRef, cleaned);
              // Update local state status to Pending
              const idx = currentFerry.findIndex(b => b.id === cleaned.id);
              if (idx !== -1) {
                currentFerry[idx].status = 'Pending';
              } else {
                currentFerry.push(cleaned);
              }
            } else if (item.queueType === 'vanBooking') {
              const cleaned = { ...item, status: 'Pending' as const };
              delete cleaned.queueType;
              const docRef = doc(db, 'vanBookings', item.id);
              await setDoc(docRef, cleaned);
              // Update local state status to Pending
              const idx = currentVan.findIndex(b => b.id === cleaned.id);
              if (idx !== -1) {
                currentVan[idx].status = 'Pending';
              } else {
                currentVan.push(cleaned);
              }
            }
          } catch (err) {
            console.error("Failed to sync queue element:", err);
          }
        }

        setFerryBookings(currentFerry);
        setVanBookings(currentVan);
        setOfflineQueue([]);
        setToastMessage(`✅ ${count} offline bookings synced successfully!`);
        toast.success(`✅ ${count} offline bookings synced successfully!`);
        fetchWeather();
      };

      runSync();
    }
  }, [isOnline, offlineQueue]);

  // GPS Live simulation (non-blocking, updates indices every 3 seconds)
  const gpsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    gpsIntervalRef.current = setInterval(() => {
      setGpsIndices(prev => {
        const next = { ...prev };
        trips.forEach(t => {
          const routeCoords = GPS_ROUTES[t.route] || GPS_ROUTES['default'];
          const currentIdx = prev[t.id] ?? 0;
          
          if (t.status === 'Boarding' || t.status === 'Departed') {
            next[t.id] = (currentIdx + 1) % routeCoords.length;
          } else {
            next[t.id] = 0; // Stationary
          }
        });
        return next;
      });
    }, 3000);

    return () => {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    };
  }, [trips]);

  // Weather fetch routine
  const fetchWeather = async () => {
    try {
      const abraUrl = `https://api.open-meteo.com/v1/forecast?latitude=13.45&longitude=120.63&current=temperature_2m,weathercode,windspeed_10m`;
      const mamburaoUrl = `https://api.open-meteo.com/v1/forecast?latitude=13.2167&longitude=120.5833&current=temperature_2m,weathercode,windspeed_10m`;

      const [abraRes, mamRes] = await Promise.all([
        fetch(abraUrl).then(r => r.json()),
        fetch(mamburaoUrl).then(r => r.json())
      ]);

      const abraData = {
        temp: abraRes.current.temperature_2m,
        windSpeed: abraRes.current.windspeed_10m,
        conditionCode: abraRes.current.weathercode
      };

      const mamburaoData = {
        temp: mamRes.current.temperature_2m,
        windSpeed: mamRes.current.windspeed_10m,
        conditionCode: mamRes.current.weathercode
      };

      setAbraWeather(abraData);
      setMamburaoWeather(mamburaoData);

      // Save cache
      weatherCache.current = {
        abra: abraData,
        mamburao: mamburaoData,
        time: new Date().toLocaleTimeString()
      };
    } catch {
      // Offline fallback
      setAbraWeather(weatherCache.current.abra);
      setMamburaoWeather(weatherCache.current.mamburao);
    }
  };

  // Weather Period Routine
  useEffect(() => {
    fetchWeather();
    const interval = setInterval(() => {
      if (navigator.onLine) fetchWeather();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Listen / Subscribe to Firestore live collections
  useEffect(() => {
    // If we have an issue connecting to firestore or rules block, catch and use mock data
    const unsubcribers: (() => void)[] = [];

    const initializeDataWithLiveListeners = () => {
      const collections = [
        { name: 'ships', setter: setShips, isShip: true },
        { name: 'trips', setter: setTrips, isTrip: true },
        { name: 'ferryBookings', setter: setFerryBookings },
        { name: 'vanBookings', setter: setVanBookings },
        { name: 'announcements', setter: setAnnouncements },
        { name: 'transactions', setter: setTransactions },
        { name: 'payoutHistory', setter: setPayoutHistory },
        { name: 'auditLog', setter: setAuditLog },
        { name: 'userAccounts', setter: setUserAccounts },
        { name: 'adminAccounts', setter: setAdminAccounts }
      ];

      collections.forEach(({ name, setter, isShip, isTrip }) => {
        try {
          const u = onSnapshot(collection(db, name), 
            (snapshot) => {
              const items: any[] = [];
              snapshot.forEach(docSnap => {
                items.push({ id: docSnap.id, ...docSnap.data() });
              });

              if (items.length > 0) {
                setter(items);
              } else {
                // Seeding Fallback
                setter(getMockSeed(name));
              }
            },
            (error) => {
              console.warn(`Firestore collection subscription to ${name} failed:`, error);
              // Gracefully use local mock seed data
              setter(getMockSeed(name));
            }
          );
          unsubcribers.push(u);
        } catch (e) {
          console.warn(`Could not register real-time listener for ${name}. Fallback to mock data:`, e);
          setter(getMockSeed(name));
        }
      });
    };

    initializeDataWithLiveListeners();

    return () => {
      unsubcribers.forEach(fn => fn());
    };
  }, []);

  // API METHODS WRAPPED FOR OFFLINE SYNC SUPPORT

  const persistShip = async (ship: Ship) => {
    try {
      if (isOnline) {
        await setDoc(doc(db, 'ships', ship.id), ship);
      }
      setShips(prev => {
        const idx = prev.findIndex(s => s.id === ship.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = ship;
          return next;
        }
        return [ship, ...prev];
      });
    } catch (e) {
      console.warn("persistShip Fallback:", e);
    }
  };

  const persistTrip = async (trip: Trip) => {
    try {
      if (isOnline) {
        await setDoc(doc(db, 'trips', trip.id), trip);
      }
      setTrips(prev => {
        const idx = prev.findIndex(t => t.id === trip.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = trip;
          return next;
        }
        return [trip, ...prev];
      });
    } catch (e) {
      console.warn("persistTrip Fallback:", e);
    }
  };

  const persistAnnouncement = async (ann: Announcement) => {
    try {
      if (isOnline) {
        await setDoc(doc(db, 'announcements', ann.id), ann);
      }
      setAnnouncements(prev => {
        if (prev.some(a => a.id === ann.id)) return prev;
        return [ann, ...prev];
      });
    } catch (e) {
      console.warn("persistAnnouncement Fallback:", e);
    }
  };

  const persistFerryBooking = async (booking: FerryBooking) => {
    if (!isOnline) {
      const qItem = { ...booking, status: 'Queued' as const, queueType: 'ferryBooking' };
      setOfflineQueue(prev => [...prev, qItem]);
      setFerryBookings(prev => {
        if (prev.some(b => b.id === qItem.id)) return prev;
        return [qItem, ...prev];
      });
      toast('📥 Booking queued in offline storage', { icon: '📥' });
      return;
    }

    try {
      await setDoc(doc(db, 'ferryBookings', booking.id), booking);
      setFerryBookings(prev => {
        if (prev.some(b => b.id === booking.id)) return prev;
        return [booking, ...prev];
      });
    } catch (e) {
      console.warn("persistFerryBooking Error:", e);
    }
  };

  const persistVanBooking = async (booking: VanBooking) => {
    if (!isOnline) {
      const qItem = { ...booking, status: 'Queued' as const, queueType: 'vanBooking' };
      setOfflineQueue(prev => [...prev, qItem]);
      setVanBookings(prev => {
        if (prev.some(b => b.id === qItem.id)) return prev;
        return [qItem, ...prev];
      });
      toast('📥 Booking queued in offline storage', { icon: '📥' });
      return;
    }

    try {
      await setDoc(doc(db, 'vanBookings', booking.id), booking);
      setVanBookings(prev => {
        if (prev.some(b => b.id === booking.id)) return prev;
        return [booking, ...prev];
      });
    } catch (e) {
      console.warn("persistVanBooking Error:", e);
    }
  };

  const updateShipStatus = async (id: string, status: string) => {
    try {
      if (isOnline) {
        await updateDoc(doc(db, 'ships', id), { status });
      }
      setShips(prev => prev.map(s => s.id === id ? { ...s, status: status as any } : s));
    } catch (e) {
      console.warn("updateShipStatus Error:", e);
    }
  };

  const updateTripStatus = async (id: string, status: string) => {
    try {
      if (isOnline) {
        await updateDoc(doc(db, 'trips', id), { status });
      }
      setTrips(prev => prev.map(t => t.id === id ? { ...t, status: status as any } : t));
    } catch (e) {
      console.warn("updateTripStatus Error:", e);
    }
  };

  const updateBookingStatus = async (id: string, type: 'ferry' | 'van', status: string) => {
    const colName = type === 'ferry' ? 'ferryBookings' : 'vanBookings';
    const setter = type === 'ferry' ? setFerryBookings : setVanBookings;

    try {
      if (isOnline) {
        await updateDoc(doc(db, colName, id), { status });
      }
      setter((prev: any[]) => prev.map(b => b.id === id ? { ...b, status: status as any } : b));
    } catch (e) {
      console.warn("updateBookingStatus Error:", e);
    }
  };

  const updateTransaction = async (txId: string, updates: Partial<Transaction>) => {
    try {
      if (isOnline) {
        await updateDoc(doc(db, 'transactions', txId), updates);
      }
      setTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, ...updates } : tx));
    } catch (e) {
      console.warn("updateTransaction Error:", e);
    }
  };

  const persistPayout = async (amount: number, count: number) => {
    const nextPayout: PayoutHistory = {
      id: generateId(),
      date: new Date().toISOString(),
      totalAmount: amount,
      transactionCount: count
    };

    try {
      // 1. Mark Transactions as Paid
      const completedUnpaid = transactions.filter(t => t.status === 'Completed' && !t.paid);
      for (const tx of completedUnpaid) {
        if (isOnline) {
          await updateDoc(doc(db, 'transactions', tx.id), { paid: true });
        }
      }

      // 2. Save Payout Entry
      if (isOnline) {
        await setDoc(doc(db, 'payoutHistory', nextPayout.id), nextPayout);
      }

      setTransactions(prev => prev.map(t => (t.status === 'Completed' && !t.paid) ? { ...t, paid: true } : t));
      setPayoutHistory(prev => [nextPayout, ...prev]);
      toast.success(`💳 PHP ${amount} paid out successfully!`);
    } catch (err: any) {
      console.error(err);
      toast.error("payout execution failed.");
    }
  };

  const addTransaction = async (booking: any, confirmedBy: 'Port Admin' | 'Terminal Admin') => {
    const id = generateId();
    const type = 'seats' in booking ? (trips.find(t => t.id === booking.tripId)?.type || 'Van') : 'Ferry';
    
    // Calculate values
    const grossAmount = 'seats' in booking 
      ? getGrossAmount(type, '', booking.seats) 
      : getGrossAmount('Ferry', booking.type, 1);

    const commissionAmount = 'seats' in booking 
      ? getCommission(type, '', booking.seats) 
      : getCommission('Ferry', booking.type, 1);

    const nextTx: Transaction = {
      id,
      timestamp: new Date().toISOString(),
      type,
      bookingId: booking.id,
      passengerName: booking.name,
      route: 'seats' in booking 
        ? (trips.find(t => t.id === booking.tripId)?.route || 'Default') 
        : (ships.find(s => s.id === booking.shipId)?.route || 'Default'),
      ticketType: 'seats' in booking ? `${booking.seats} seats` : booking.type,
      grossAmount,
      commissionAmount,
      confirmedBy,
      status: 'Completed' as const,
      paid: false
    };

    try {
      if (isOnline) {
        await setDoc(doc(db, 'transactions', id), nextTx);
      }
      setTransactions(prev => {
        if (prev.some(t => t.id === nextTx.id)) return prev;
        return [nextTx, ...prev];
      });
    } catch (err) {
      console.warn("addTransaction Cache write fallback:", err);
      setTransactions(prev => {
        if (prev.some(t => t.id === nextTx.id)) return prev;
        return [nextTx, ...prev];
      });
    }
  };

  return (
    <AppContext.Provider value={{
      ships, setShips,
      trips, setTrips,
      ferryBookings, setFerryBookings,
      vanBookings, setVanBookings,
      announcements, setAnnouncements,
      transactions, setTransactions,
      offlineQueue, setOfflineQueue,
      isOnline,
      gpsIndices, setGpsIndices,
      abraWeather, setAbraWeather,
      mamburaoWeather, setMamburaoWeather,
      auditLog, setAuditLog,
      payoutHistory, setPayoutHistory,
      currentRole, setCurrentRole,
      isAuthenticated, setIsAuthenticated,
      sessionToken, setSessionToken,
      toastMessage, setToastMessage,
      userAccount, setUserAccount,
      userAccounts, setUserAccounts,
      adminAccounts, setAdminAccounts,
      isDarkMode, setIsDarkMode,
      
      // Functions
      addTransaction,
      getTripLocation,
      formatPST,
      updateTransaction,
      persistPayout,
      persistShip,
      persistTrip,
      persistAnnouncement,
      persistFerryBooking,
      persistVanBooking,
      updateShipStatus,
      updateTripStatus,
      updateBookingStatus
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
};
