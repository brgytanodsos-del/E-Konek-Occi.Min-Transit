import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

// --- SEED CONCEPTS & TYPES ---
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
  action: 'login' | 'logout';
}

export interface UserAccount {
  id: string;
  accountType: 'passenger' | 'driver';
  fullName: string;
  mobileNumber: string;
  address?: string;
  selfieUrl?: string;
  createdAt: string;
  bookingIds: string[];
}

export interface AdminAccount {
  id: string;
  fullName: string;
  role: 'port' | 'terminal';
  pin: string;
  createdAt: string;
  lastLogin: string;
  status: 'active' | 'suspended' | 'pending';
}

// GPS ROUTE GEOPATHS
export const GPS_ROUTES: Record<string, [number, number][]> = {
  'Mamburao → Abra Port':   [[13.25,120.59],[13.30,120.60],[13.35,120.61],[13.40,120.62],[13.45,120.63]],
  'Abra Port → Mamburao':   [[13.45,120.63],[13.40,120.62],[13.35,120.61],[13.30,120.60],[13.25,120.59]],
  'Mamburao → San Jose':    [[13.15,120.60],[13.05,120.65],[12.95,120.70],[12.85,120.75],[12.75,120.80]],
  'San Jose → Mamburao':    [[12.75,120.80],[12.85,120.75],[12.95,120.70],[13.05,120.65],[13.15,120.60]],
  'Mamburao → Calintaan':   [[13.20,120.55],[13.18,120.52],[13.16,120.49]],
  'Calintaan → Mamburao':   [[13.16,120.49],[13.18,120.52],[13.20,120.55]],
  'Mamburao → Paluan':      [[13.25,120.55],[13.30,120.52],[13.35,120.50],[13.40,120.48]],
  'Paluan → Mamburao':      [[13.40,120.48],[13.35,120.50],[13.30,120.52],[13.25,120.55]],
  'Mamburao → Sablayan':    [[13.15,120.55],[13.05,120.52],[12.95,120.50],[12.85,120.48]],
  'Sablayan → Mamburao':    [[12.85,120.48],[12.95,120.50],[13.05,120.52],[13.15,120.55]],
  'default':                [[13.2167,120.5833],[13.22,120.585],[13.23,120.59]]
};

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
  offlineQueue: any[];
  setOfflineQueue: React.Dispatch<React.SetStateAction<any[]>>;
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
  addTransaction: (booking: any, confirmedBy: 'Port Admin' | 'Terminal Admin') => Promise<void>;
  getTripLocation: (tripId: string, route: string) => [number, number];
  formatPST: (iso: string) => string;
  updateTransaction: (txId: string, updates: Partial<Transaction>) => Promise<void>;
  persistPayout: (amount: number, count: number) => Promise<void>;
  persistShip: (ship: Ship) => Promise<void>;
  persistTrip: (trip: Trip) => Promise<void>;
  persistAnnouncement: (ann: Announcement) => Promise<void>;
  persistFerryBooking: (booking: FerryBooking) => Promise<void>;
  persistVanBooking: (booking: VanBooking) => Promise<void>;
  updateShipStatus: (id: string, status: string) => Promise<void>;
  updateTripStatus: (id: string, status: string) => Promise<void>;
  updateBookingStatus: (id: string, type: 'ferry' | 'van', status: string) => Promise<void>;
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
  useEffect(() => {
    const gpsInterval = setInterval(() => {
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

    return () => clearInterval(gpsInterval);
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

  // Mock initial dataset builders
  const getMockSeed = (name: string): any[] => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    switch (name) {
      case 'ships':
        return [
          { id:'s1', name:'MV Maria Olive', route:'Abra Port → Batangas', depTime: new Date(now.getTime() + 2 * 3600 * 1000).toISOString(), arrTime: new Date(now.getTime() + 4.5 * 3600 * 1000).toISOString(), status:'Boarding', capacity:300, available:120, type:'RORO' },
          { id:'s2', name:'MV Reina Genoveva', route:'Abra Port → Puerto Galera', depTime: new Date(now.getTime() + 5 * 3600 * 1000).toISOString(), arrTime: new Date(now.getTime() + 6.5 * 3600 * 1000).toISOString(), status:'Scheduled', capacity:250, available:250, type:'Passenger Ferry' },
          { id:'s3', name:'MV Montenegro Star', route:'Batangas → Abra Port', depTime: new Date(now.getTime() + 8 * 3600 * 1000).toISOString(), arrTime: new Date(now.getTime() + 10.5 * 3600 * 1000).toISOString(), status:'Scheduled', capacity:200, available:200, type:'RORO' }
        ];
      case 'trips':
        return [
          { id:'t1', route:'Mamburao → Abra Port', depTime: new Date(now.getTime() + 30 * 60 * 1000).toISOString(), type:'Van', driver:'Kuya Jun Dela Rosa', capacity:14, available:6, status:'Boarding' },
          { id:'t2', route:'Abra Port → Mamburao', depTime: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), type:'Van', driver:'Ate Lorna Bautista', capacity:14, available:14, status:'Scheduled' },
          { id:'t3', route:'Mamburao → San Jose', depTime: new Date(now.getTime() + 120 * 60 * 1000).toISOString(), type:'Bus', driver:'Mang Cardo Villanueva', capacity:45, available:30, status:'Scheduled' },
          { id:'t4', route:'San Jose → Mamburao', depTime: new Date(now.getTime() + 180 * 60 * 1000).toISOString(), type:'Bus', driver:'Dodong Reyes', capacity:45, available:45, status:'Scheduled' },
          { id:'t5', route:'Mamburao → Calintaan', depTime: new Date(now.getTime() + 45 * 60 * 1000).toISOString(), type:'Van', driver:'Kuya Romy Santos', capacity:10, available:3, status:'Departed' },
          { id:'t6', route:'Calintaan → Mamburao', depTime: new Date(now.getTime() + 240 * 60 * 1000).toISOString(), type:'Van', driver:'Nanding Cruz', capacity:10, available:10, status:'Scheduled' }
        ];
      case 'ferryBookings':
        return [
          { id:'fb1', shipId:'s1', name:'Ligaya Reyes', contact:'09171234567', type:'Regular', status:'Pending' },
          { id:'fb2', shipId:'s1', name:'Crisanto Villanueva', contact:'09189876543', type:'Senior', status:'Confirmed' },
          { id:'fb3', shipId:'s2', name:'Nena Magtanggol', contact:'09201112233', type:'Student', status:'Pending' },
          { id:'fb4', shipId:'s2', name:'Bong Espiritu', contact:'09151234321', type:'PWD', status:'Confirmed' }
        ];
      case 'vanBookings':
        return [
          { id:'vb1', tripId:'t1', name:'Rosario Dalisay', contact:'09191112222', pickup:'Mamburao Grand Terminal', seats:2, status:'Confirmed' },
          { id:'vb2', tripId:'t3', name:'Ferdie Macaraeg', contact:'09209998888', pickup:'Mamburao Plaza', seats:1, status:'Pending' }
        ];
      case 'announcements':
        return [
          { id:'a1', text:'All trips are on schedule today. Passengers are reminded to arrive 30 minutes before departure. Present valid IDs at the counter.', date: now.toISOString(), author:'Abra Port Admin' },
          { id:'a2', text:'MV Montenegro Star arrival at Abra Port is expected at 10:30 AM. Van shuttles to Mamburao will depart immediately after docking.', date: new Date(now.getTime() - 3600 * 1000).toISOString(), author:'Terminal Admin' }
        ];
      case 'transactions':
        return [
          { id:'tx1', timestamp: yesterday.toISOString(), type:'Ferry', bookingId:'fb2', passengerName:'Crisanto Villanueva', route:'Abra Port → Batangas', ticketType:'Senior', grossAmount:300, commissionAmount:25, confirmedBy:'Port Admin', status:'Completed', paid:true },
          { id:'tx2', timestamp: yesterday.toISOString(), type:'Van', bookingId:'vb1', passengerName:'Rosario Dalisay', route:'Mamburao → Abra Port', ticketType:'2 seats', grossAmount:400, commissionAmount:40, confirmedBy:'Terminal Admin', status:'Completed', paid:true },
          { id:'tx3', timestamp: now.toISOString(), type:'Ferry', bookingId:'fb4', passengerName:'Bong Espiritu', route:'Abra Port → Puerto Galera', ticketType:'PWD', grossAmount:300, commissionAmount:25, confirmedBy:'Port Admin', status:'Completed', paid:false }
        ];
      case 'payoutHistory':
        return [
          { id:'ph1', date: threeDaysAgo.toISOString(), totalAmount:1250, transactionCount:8 },
          { id:'ph2', date: yesterday.toISOString(), totalAmount:890, transactionCount:5 }
        ];
      case 'auditLog':
        return [
          { id: 'al1', timestamp: new Date(now.getTime() - 3600 * 1000).toISOString(), role:'port', action:'login' },
          { id: 'al2', timestamp: new Date(now.getTime() - 2700 * 1000).toISOString(), role:'terminal', action:'login' },
          { id: 'al3', timestamp: new Date(now.getTime() - 1200 * 1000).toISOString(), role:'port', action:'logout' }
        ];
      case 'adminAccounts':
        return [
          { id: 'adm-port', fullName: 'Abra Ticketing lead', role: 'port', pin: '2001', createdAt: now.toISOString(), lastLogin: '', status: 'active' },
          { id: 'adm-terminal', fullName: 'Mamburao dispatcher', role: 'terminal', pin: '2002', createdAt: now.toISOString(), lastLogin: '', status: 'active' }
        ];
      default:
        return [];
    }
  };

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
