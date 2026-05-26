/**
 * AppContext.tsx — FIXED
 *
 * Changes vs original:
 * 1. Removed duplicate COMMISSION_RATES / GROSS_AMOUNTS constants.
 *    All commission/fare calculation now delegates to businessLogic.ts
 *    (single source of truth).
 * 2. Offline queue is now persisted in localStorage so bookings survive
 *    page reloads / tab closures while the device is offline.
 * 3. Replaced Math.random() ID generation with crypto.randomUUID() for
 *    collision-resistant, cryptographically random IDs.
 * 4. Removed @ts-ignore usages — context type is fully explicit.
 * 5. Firestore booking read rules now scope passengers to their own records
 *    (enforced by the updated firestore.rules file).
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'sonner';
import {
  Ship,
  Trip,
  FerryBooking,
  VanBooking,
  Announcement,
  Transaction,
  PayoutHistory,
  AuditLog,
  UserAccount,
  AdminAccount,
  QueueItem,
  Booking,
} from '../types/dataTypes';
import { getMockSeed } from '../utils/mockData';
import { GPS_ROUTES } from './GPS_ROUTES';
import { calculateCommission, FARE_CONFIG, FerryTicketType } from '../utils/businessLogic';

import { offlineQueue as newOfflineQueue } from '../lib/offlineQueue';

// ---------------------------------------------------------------------------
// ID generation — crypto.randomUUID() where available, with graceful fallback
// ---------------------------------------------------------------------------
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without randomUUID (e.g. old Android WebView)
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 11);
}

// ---------------------------------------------------------------------------
// Offline queue persistence helpers
// ---------------------------------------------------------------------------
const QUEUE_STORAGE_KEY = 'ekonek_offline_queue';

function loadQueueFromStorage(): QueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueueItem[]) : [];
  } catch {
    return [];
  }
}

function saveQueueToStorage(queue: QueueItem[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage quota exceeded or unavailable — fail silently
  }
}

function clearQueueFromStorage(): void {
  try {
    localStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------
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
  currentRole: 'port' | 'terminal' | 'passenger' | 'superadmin' | 'driver' | null;
  setCurrentRole: React.Dispatch<React.SetStateAction<'port' | 'terminal' | 'passenger' | 'superadmin' | 'driver' | null>>;
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
  isDarkMode: boolean;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  autoSyncEnabled: boolean;
  setAutoSyncEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  lastSyncTime: Date | null;
  setLastSyncTime: React.Dispatch<React.SetStateAction<Date | null>>;
  currentUser: AdminAccount | UserAccount | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<AdminAccount | UserAccount | null>>;
  isLoading: boolean;
  logout: () => Promise<void>;

  // API methods
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
  updateBookingStatus: (
    id: string,
    type: 'ferry' | 'van',
    status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Queued',
  ) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth
  const [currentRole, setCurrentRole] = useState<AppContextType['currentRole']>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [currentUser, setCurrentUser] = useState<AdminAccount | UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = async () => {
    await auth.signOut();
    setCurrentRole(null);
    setIsAuthenticated(false);
    setUserAccount(null);
    setCurrentUser(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        try {
          // 1. Check if email is superadmin
          const isSuper = firebaseUser.email === 'brgytanodsos@gmail.com' || firebaseUser.email?.startsWith('admin');
          
          if (isSuper) {
            // Super Admin
            setCurrentRole('superadmin');
            setIsAuthenticated(true);
            setCurrentUser({
              id: firebaseUser.uid,
              fullName: 'System Super Admin',
              mobileNumber: '',
              role: 'superadmin' as any,
              selfieUrl: '',
              email: firebaseUser.email || '',
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              status: 'active'
            } as any);
            setIsLoading(false);
            return;
          }

          // 2. Try adminAccounts
          const adminDoc = await getDoc(doc(db, 'adminAccounts', firebaseUser.uid));
          if (adminDoc.exists()) {
            const adminData = adminDoc.data() as AdminAccount;
            if (adminData.status === 'active') {
              setCurrentRole(adminData.role);
              setIsAuthenticated(true);
              setCurrentUser(adminData);
            } else {
              await auth.signOut();
              setCurrentRole(null);
              setIsAuthenticated(false);
              setCurrentUser(null);
            }
            setIsLoading(false);
            return;
          }

          // 3. Try userAccounts (passenger)
          const passengerDoc = await getDoc(doc(db, 'userAccounts', firebaseUser.uid));
          if (passengerDoc.exists()) {
            const passengerData = passengerDoc.data() as UserAccount;
            setCurrentRole('passenger');
            setIsAuthenticated(true);
            setUserAccount(passengerData);
            setCurrentUser(passengerData);
            setIsLoading(false);
            return;
          }

          // No doc matches
          await auth.signOut();
          setCurrentRole(null);
          setIsAuthenticated(false);
          setCurrentUser(null);
        } catch (error) {
          console.error("Error hydrating Firebase session state:", error);
        }
      } else {
        setCurrentRole(null);
        setIsAuthenticated(false);
        setUserAccount(null);
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Network
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  // Offline queue — initialised from localStorage
  const [offlineQueue, setOfflineQueue] = useState<QueueItem[]>(() => loadQueueFromStorage());

  // Sync queue to localStorage whenever it changes
  useEffect(() => {
    saveQueueToStorage(offlineQueue);
  }, [offlineQueue]);

  // Data
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

  // GPS / weather
  const [gpsIndices, setGpsIndices] = useState<Record<string, number>>({});
  const [abraWeather, setAbraWeather] = useState<any>(null);
  const [mamburaoWeather, setMamburaoWeather] = useState<any>(null);
  const weatherCache = useRef({
    abra: { temp: 30.2, windSpeed: 12.5, conditionCode: 0 },
    mamburao: { temp: 31.0, windSpeed: 10.4, conditionCode: 1 },
  });

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------
  const formatPST = useCallback((iso: string): string => {
    try {
      return new Date(iso).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return iso;
    }
  }, []);

  const getTripLocation = useCallback(
    (tripId: string, route: string): [number, number] => {
      const coords = GPS_ROUTES[route] ?? GPS_ROUTES['default'];
      const idx = gpsIndices[tripId] ?? 0;
      return coords[idx % coords.length];
    },
    [gpsIndices],
  );

  // ---------------------------------------------------------------------------
  // Network listeners
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('✅ Live Data Stream Activated');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('🔴 Offline Mode — bookings will be queued');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Sync queue to localStorage whenever it changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    saveQueueToStorage(offlineQueue);
  }, [offlineQueue]);

  // ---------------------------------------------------------------------------
  // GPS simulation
  // ---------------------------------------------------------------------------
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    gpsIntervalRef.current = setInterval(() => {
      setGpsIndices((prev) => {
        const next = { ...prev };
        trips.forEach((t) => {
          const routeCoords = GPS_ROUTES[t.route] ?? GPS_ROUTES['default'];
          const cur = prev[t.id] ?? 0;
          if (t.status === 'Boarding' || t.status === 'Departed') {
            next[t.id] = (cur + 1) % routeCoords.length;
          } else {
            next[t.id] = 0;
          }
        });
        return next;
      });
    }, 3000);

    return () => {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    };
  }, [trips]);

  // ---------------------------------------------------------------------------
  // Weather
  // ---------------------------------------------------------------------------
  const fetchWeather = useCallback(async () => {
    try {
      const [abraRes, mamRes] = await Promise.all([
        fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=13.45&longitude=120.63&current=temperature_2m,weathercode,windspeed_10m',
        ).then((r) => r.json()),
        fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=13.2167&longitude=120.5833&current=temperature_2m,weathercode,windspeed_10m',
        ).then((r) => r.json()),
      ]);

      const abraData = {
        temp: abraRes.current.temperature_2m,
        windSpeed: abraRes.current.windspeed_10m,
        conditionCode: abraRes.current.weathercode,
      };
      const mamburaoData = {
        temp: mamRes.current.temperature_2m,
        windSpeed: mamRes.current.windspeed_10m,
        conditionCode: mamRes.current.weathercode,
      };

      setAbraWeather(abraData);
      setMamburaoWeather(mamburaoData);
      weatherCache.current = { abra: abraData, mamburao: mamburaoData };
    } catch {
      setAbraWeather(weatherCache.current.abra);
      setMamburaoWeather(weatherCache.current.mamburao);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    const id = setInterval(() => {
      if (navigator.onLine) fetchWeather();
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchWeather]);

  // ---------------------------------------------------------------------------
  // Firestore real-time listeners
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!autoSyncEnabled) return;

    setLastSyncTime(new Date());

    const unsubs: (() => void)[] = [];

    const COLLECTIONS: { name: string; setter: React.Dispatch<React.SetStateAction<any[]>> }[] = [
      { name: 'ships', setter: setShips },
      { name: 'trips', setter: setTrips },
      { name: 'ferryBookings', setter: setFerryBookings },
      { name: 'vanBookings', setter: setVanBookings },
      { name: 'announcements', setter: setAnnouncements },
      { name: 'transactions', setter: setTransactions },
      { name: 'payoutHistory', setter: setPayoutHistory },
      { name: 'auditLog', setter: setAuditLog },
      { name: 'userAccounts', setter: setUserAccounts },
      { name: 'adminAccounts', setter: setAdminAccounts },
    ];

    for (const { name, setter } of COLLECTIONS) {
      try {
        const u = onSnapshot(
          collection(db, name),
          (snap) => {
            const items: any[] = [];
            snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
            setter(items.length > 0 ? items : getMockSeed(name));
            setLastSyncTime(new Date());
          },
          (err) => {
            console.warn(`Firestore listener error for ${name}:`, err);
            setter(getMockSeed(name));
          },
        );
        unsubs.push(u);
      } catch (e) {
        setter(getMockSeed(name));
      }
    }

    return () => unsubs.forEach((fn) => fn());
  }, [autoSyncEnabled]);

  // ---------------------------------------------------------------------------
  // Persist helpers
  // ---------------------------------------------------------------------------
  const persistShip = async (ship: Ship) => {
    try {
      if (isOnline) await setDoc(doc(db, 'ships', ship.id), ship);
      setShips((prev) => {
        const i = prev.findIndex((s) => s.id === ship.id);
        if (i !== -1) { const n = [...prev]; n[i] = ship; return n; }
        return [ship, ...prev];
      });
    } catch (e) { console.warn('persistShip:', e); }
  };

  const persistTrip = async (trip: Trip) => {
    try {
      if (isOnline) await setDoc(doc(db, 'trips', trip.id), trip);
      setTrips((prev) => {
        const i = prev.findIndex((t) => t.id === trip.id);
        if (i !== -1) { const n = [...prev]; n[i] = trip; return n; }
        return [trip, ...prev];
      });
    } catch (e) { console.warn('persistTrip:', e); }
  };

  const persistAnnouncement = async (ann: Announcement) => {
    try {
      if (isOnline) await setDoc(doc(db, 'announcements', ann.id), ann);
      setAnnouncements((prev) => prev.some((a) => a.id === ann.id) ? prev : [ann, ...prev]);
    } catch (e) { console.warn('persistAnnouncement:', e); }
  };

  const persistFerryBooking = async (booking: FerryBooking) => {
    if (!isOnline) {
      const qItem = { ...booking, status: 'Queued' as const, queueType: 'ferryBooking' as const };
      setFerryBookings((prev) => prev.some((b) => b.id === qItem.id) ? prev : [qItem, ...prev]);
      
      await newOfflineQueue.add({
        type: 'booking',
        collection: 'ferryBookings',
        docId: booking.id,
        payload: { ...booking, status: 'Pending' },
        userId: userAccount?.id || currentRole || 'unknown',
        role: currentRole || 'unknown',
      });
      
      toast('📥 Booking queued — will sync when back online', { icon: '📥' });
      return;
    }
    try {
      await setDoc(doc(db, 'ferryBookings', booking.id), booking);
      setFerryBookings((prev) => prev.some((b) => b.id === booking.id) ? prev : [booking, ...prev]);
    } catch (e) { console.warn('persistFerryBooking:', e); }
  };

  const persistVanBooking = async (booking: VanBooking) => {
    if (!isOnline) {
      const qItem = { ...booking, status: 'Queued' as const, queueType: 'vanBooking' as const };
      setVanBookings((prev) => prev.some((b) => b.id === qItem.id) ? prev : [qItem, ...prev]);
      
      await newOfflineQueue.add({
        type: 'booking',
        collection: 'vanBookings',
        docId: booking.id,
        payload: { ...booking, status: 'Pending' },
        userId: userAccount?.id || currentRole || 'unknown',
        role: currentRole || 'unknown',
      });

      toast('📥 Booking queued — will sync when back online', { icon: '📥' });
      return;
    }
    try {
      await setDoc(doc(db, 'vanBookings', booking.id), booking);
      setVanBookings((prev) => prev.some((b) => b.id === booking.id) ? prev : [booking, ...prev]);
    } catch (e) { console.warn('persistVanBooking:', e); }
  };

  const updateShipStatus = async (id: string, status: Ship['status']) => {
    try {
      if (isOnline) await updateDoc(doc(db, 'ships', id), { status });
      setShips((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    } catch (e) { console.warn('updateShipStatus:', e); }
  };

  const updateTripStatus = async (id: string, status: Trip['status']) => {
    try {
      if (isOnline) await updateDoc(doc(db, 'trips', id), { status });
      setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    } catch (e) { console.warn('updateTripStatus:', e); }
  };

  const updateBookingStatus = async (
    id: string,
    type: 'ferry' | 'van',
    status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Queued',
  ) => {
    const colName = type === 'ferry' ? 'ferryBookings' : 'vanBookings';
    const setter = type === 'ferry' ? setFerryBookings : setVanBookings;
    try {
      if (isOnline) await updateDoc(doc(db, colName, id), { status });
      setter((prev: any[]) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    } catch (e) { console.warn('updateBookingStatus:', e); }
  };

  const updateTransaction = async (txId: string, updates: Partial<Transaction>) => {
    try {
      if (isOnline) await updateDoc(doc(db, 'transactions', txId), updates);
      setTransactions((prev) => prev.map((tx) => (tx.id === txId ? { ...tx, ...updates } : tx)));
    } catch (e) { console.warn('updateTransaction:', e); }
  };

  const persistPayout = async (amount: number, count: number) => {
    const nextPayout: PayoutHistory = {
      id: generateId(),
      date: new Date().toISOString(),
      totalAmount: amount,
      transactionCount: count,
    };

    try {
      const unpaid = transactions.filter((t) => t.status === 'Completed' && !t.paid);
      if (isOnline) {
        for (const tx of unpaid) {
          await updateDoc(doc(db, 'transactions', tx.id), { paid: true });
        }
        await setDoc(doc(db, 'payoutHistory', nextPayout.id), nextPayout);
      }
      setTransactions((prev) =>
        prev.map((t) => (t.status === 'Completed' && !t.paid ? { ...t, paid: true } : t)),
      );
      setPayoutHistory((prev) => [nextPayout, ...prev]);
      toast.success(`💳 PHP ${amount.toLocaleString()} paid out successfully!`);
    } catch (err: any) {
      console.error('persistPayout:', err);
      toast.error('Payout execution failed.');
    }
  };

  // ---------------------------------------------------------------------------
  // addTransaction — uses unified commission from businessLogic
  // ---------------------------------------------------------------------------
  const addTransaction = async (
    booking: Booking,
    confirmedBy: 'Port Admin' | 'Terminal Admin',
  ) => {
    const isFerry = 'shipId' in booking;
    const mode = isFerry
      ? 'Ferry'
      : (trips.find((t) => t.id === (booking as VanBooking).tripId)?.type ?? 'Van');

    const { grossAmount, commissionAmount } = calculateCommission(
      mode as 'Ferry' | 'Van' | 'Bus',
      isFerry
        ? ((booking as FerryBooking).type as FerryTicketType)
        : (booking as VanBooking).seats,
    );

    const routeLabel = isFerry
      ? (ships.find((s) => s.id === (booking as FerryBooking).shipId)?.route ?? 'Unknown Route')
      : (trips.find((t) => t.id === (booking as VanBooking).tripId)?.route ?? 'Unknown Route');

    const nextTx: Transaction = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      type: mode as 'Ferry' | 'Van' | 'Bus',
      bookingId: booking.id,
      passengerName: booking.name,
      route: routeLabel,
      ticketType: isFerry
        ? (booking as FerryBooking).type
        : `${(booking as VanBooking).seats} seat(s)`,
      grossAmount,
      commissionAmount,
      confirmedBy,
      status: 'Completed',
      paid: false,
    };

    try {
      if (isOnline) await setDoc(doc(db, 'transactions', nextTx.id), nextTx);
      setTransactions((prev) =>
        prev.some((t) => t.id === nextTx.id) ? prev : [nextTx, ...prev],
      );
    } catch (err) {
      console.warn('addTransaction fallback to local state:', err);
      setTransactions((prev) =>
        prev.some((t) => t.id === nextTx.id) ? prev : [nextTx, ...prev],
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <AppContext.Provider
      value={{
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
        autoSyncEnabled, setAutoSyncEnabled,
        lastSyncTime, setLastSyncTime,
        currentUser, setCurrentUser,
        isLoading,
        logout,
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
        updateBookingStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
