import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  db,
  COLLECTIONS,
  subscribeCollection,
  fsSet,
  fsAdd,
  fsUpdate,
} from '../lib/firebase';

// ─── Constants ────────────────────────────────────────────────────────────────

export const COMMISSION_RATES = {
  ferry_regular: 50,
  ferry_student: 30,
  ferry_senior:  25,
  ferry_pwd:     25,
  van_per_seat:  20,
  bus_per_seat:  15,
};

export const getCommission = (
  type: 'Ferry' | 'Van' | 'Bus',
  ticketType: string,
  seats = 1
) => {
  if (type === 'Ferry') {
    const key = `ferry_${ticketType.toLowerCase()}` as keyof typeof COMMISSION_RATES;
    return COMMISSION_RATES[key] || COMMISSION_RATES.ferry_regular;
  }
  return type === 'Van'
    ? COMMISSION_RATES.van_per_seat * seats
    : COMMISSION_RATES.bus_per_seat * seats;
};

export const getGrossAmount = (
  type: 'Ferry' | 'Van' | 'Bus',
  ticketType: string,
  seats = 1
) => {
  if (type === 'Ferry') {
    if (ticketType === 'Student') return 350;
    if (ticketType === 'Senior' || ticketType === 'PWD') return 300;
    return 500;
  }
  return type === 'Van' ? 200 * seats : 150 * seats;
};

export const GPS_ROUTES: Record<string, [number, number][]> = {
  'Mamburao → Abra Port':   [[13.2167,120.5833],[13.25,120.59],[13.30,120.60],[13.35,120.61],[13.40,120.62],[13.45,120.63]],
  'Abra Port → Mamburao':   [[13.45,120.63],[13.40,120.62],[13.35,120.61],[13.30,120.60],[13.25,120.59],[13.2167,120.5833]],
  'Mamburao → San Jose':    [[13.2167,120.5833],[13.15,120.60],[13.05,120.65],[12.95,120.70],[12.85,120.75],[12.75,120.80]],
  'San Jose → Mamburao':    [[12.75,120.80],[12.85,120.75],[12.95,120.70],[13.05,120.65],[13.15,120.60],[13.2167,120.5833]],
  'Mamburao → Calintaan':   [[13.2167,120.5833],[13.20,120.55],[13.18,120.52],[13.16,120.49]],
  'Calintaan → Mamburao':   [[13.16,120.49],[13.18,120.52],[13.20,120.55],[13.2167,120.5833]],
  'Mamburao → Paluan':      [[13.2167,120.5833],[13.25,120.55],[13.30,120.52],[13.35,120.50],[13.40,120.48]],
  'Paluan → Mamburao':      [[13.40,120.48],[13.35,120.50],[13.30,120.52],[13.25,120.55],[13.2167,120.5833]],
  'Mamburao → Sablayan':    [[13.2167,120.5833],[13.15,120.55],[13.05,120.52],[12.95,120.50],[12.85,120.48]],
  'Sablayan → Mamburao':    [[12.85,120.48],[12.95,120.50],[13.05,120.52],[13.15,120.55],[13.2167,120.5833]],
  default:                  [[13.2167,120.5833],[13.22,120.585],[13.23,120.59]],
};

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_KEYS = {
  offlineQueue:    'ekonek_offlineQueue',
  sessionRole:     'ekonek_sessionRole',
  sessionToken:    'ekonek_sessionToken',
  weatherCache:    'ekonek_weatherCache',
};

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded — swallow gracefully
  }
}

function lsClear(key: string) {
  try {
    localStorage.removeItem(key);
  } catch { /* noop */ }
}

// ─── Seed data (used only if Firestore is empty on first load) ────────────────

const makeDep = (h: number) =>
  new Date(Date.now() + h * 3_600_000).toISOString();

const SEED_SHIPS = [
  { id: 's1', name: 'MV Maria Olive',      route: 'Abra Port → Batangas',      depTime: makeDep(2),   arrTime: makeDep(4.5),  status: 'Boarding',   capacity: 300, available: 120, type: 'RORO' },
  { id: 's2', name: 'MV Reina Genoveva',   route: 'Abra Port → Puerto Galera', depTime: makeDep(5),   arrTime: makeDep(6.5),  status: 'Scheduled',  capacity: 250, available: 250, type: 'Passenger Ferry' },
  { id: 's3', name: 'MV Montenegro Star',  route: 'Batangas → Abra Port',      depTime: makeDep(8),   arrTime: makeDep(10.5), status: 'Scheduled',  capacity: 200, available: 200, type: 'RORO' },
];

const SEED_TRIPS = [
  { id: 't1', route: 'Mamburao → Abra Port', depTime: makeDep(0.5),  type: 'Van',  driver: 'Kuya Jun Dela Rosa',    capacity: 14, available: 6,  status: 'Boarding' },
  { id: 't2', route: 'Abra Port → Mamburao', depTime: makeDep(1),    type: 'Van',  driver: 'Ate Lorna Bautista',    capacity: 14, available: 14, status: 'Scheduled' },
  { id: 't3', route: 'Mamburao → San Jose',  depTime: makeDep(2),    type: 'Bus',  driver: 'Mang Cardo Villanueva', capacity: 45, available: 30, status: 'Scheduled' },
  { id: 't4', route: 'San Jose → Mamburao',  depTime: makeDep(3),    type: 'Bus',  driver: 'Dodong Reyes',          capacity: 45, available: 45, status: 'Scheduled' },
  { id: 't5', route: 'Mamburao → Calintaan', depTime: makeDep(0.75), type: 'Van',  driver: 'Kuya Romy Santos',      capacity: 10, available: 3,  status: 'Departed' },
  { id: 't6', route: 'Calintaan → Mamburao', depTime: makeDep(4),    type: 'Van',  driver: 'Nanding Cruz',          capacity: 10, available: 10, status: 'Scheduled' },
];

const SEED_FERRY_BOOKINGS = [
  { id: 'fb1', shipId: 's1', name: 'Ligaya Reyes',       contact: '09171234567', type: 'Regular', status: 'Pending' },
  { id: 'fb2', shipId: 's1', name: 'Crisanto Villanueva',contact: '09189876543', type: 'Senior',  status: 'Confirmed' },
  { id: 'fb3', shipId: 's2', name: 'Nena Magtanggol',    contact: '09201112233', type: 'Student', status: 'Pending' },
  { id: 'fb4', shipId: 's2', name: 'Bong Espiritu',      contact: '09151234321', type: 'PWD',     status: 'Confirmed' },
];

const SEED_VAN_BOOKINGS = [
  { id: 'vb1', tripId: 't1', name: 'Rosario Dalisay', contact: '09191112222', pickup: 'Mamburao Grand Terminal', seats: 2, status: 'Confirmed' },
  { id: 'vb2', tripId: 't3', name: 'Ferdie Macaraeg', contact: '09209998888', pickup: 'Mamburao Plaza',          seats: 1, status: 'Pending' },
];

const SEED_ANNOUNCEMENTS = [
  { id: 'a1', text: 'All trips are on schedule today. Passengers are reminded to arrive 30 minutes before departure.', date: makeDep(0),  author: 'Abra Port Admin' },
  { id: 'a2', text: 'MV Montenegro Star arrival expected at 10:30 AM. Van shuttles to Mamburao depart immediately after.', date: makeDep(-1), author: 'Terminal Admin' },
];

// ─── Context types ────────────────────────────────────────────────────────────

export interface AppContextType {
  ships:           any[];
  setShips:        React.Dispatch<React.SetStateAction<any[]>>;
  trips:           any[];
  setTrips:        React.Dispatch<React.SetStateAction<any[]>>;
  ferryBookings:   any[];
  setFerryBookings:React.Dispatch<React.SetStateAction<any[]>>;
  vanBookings:     any[];
  setVanBookings:  React.Dispatch<React.SetStateAction<any[]>>;
  announcements:   any[];
  setAnnouncements:React.Dispatch<React.SetStateAction<any[]>>;
  transactions:    any[];
  setTransactions: React.Dispatch<React.SetStateAction<any[]>>;
  offlineQueue:    any[];
  setOfflineQueue: React.Dispatch<React.SetStateAction<any[]>>;
  isOnline:        boolean;
  firestoreReady:  boolean;
  gpsIndices:      Record<string, number>;
  abraWeather:     any;
  setAbraWeather:  React.Dispatch<React.SetStateAction<any>>;
  mamburaoWeather: any;
  setMamburaoWeather: React.Dispatch<React.SetStateAction<any>>;
  auditLog:        any[];
  setAuditLog:     React.Dispatch<React.SetStateAction<any[]>>;
  payoutHistory:   any[];
  setPayoutHistory:React.Dispatch<React.SetStateAction<any[]>>;
  currentRole:     'port' | 'terminal' | 'passenger' | 'superadmin' | null;
  setCurrentRole:  (role: 'port' | 'terminal' | 'passenger' | 'superadmin' | null) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  sessionToken:    string | null;
  setSessionToken: (t: string | null) => void;
  addTransaction:  (bookingData: any, confirmedBy: 'Port Admin' | 'Terminal Admin') => void;
  getTripLocation: (tripId: string, routeStr: string) => [number, number];
  formatPST:       (iso: string) => string;
  toastMessage:    string | null;
  setToastMessage: (msg: string | null) => void;
  // Firestore-wired write helpers exposed to panels
  persistShip:        (ship: any) => Promise<void>;
  persistTrip:        (trip: any) => Promise<void>;
  persistFerryBooking:(booking: any) => Promise<void>;
  persistVanBooking:  (booking: any) => Promise<void>;
  persistAnnouncement:(ann: any) => Promise<void>;
  updateShipStatus:   (id: string, status: string) => Promise<void>;
  updateTripStatus:   (id: string, status: string) => Promise<void>;
  updateBookingStatus:(collection: 'ferryBookings' | 'vanBookings', id: string, status: string) => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export const AppProvider = ({ children }: { children: React.ReactNode }) => {

  // ── Auth state (persisted to localStorage) ──────────────────────────────
  const [currentRole, _setCurrentRole] = useState<AppContextType['currentRole']>(
    () => lsGet<AppContextType['currentRole']>(LS_KEYS.sessionRole, null)
  );
  const [isAuthenticated, _setIsAuthenticated] = useState<boolean>(
    () => !!lsGet<string | null>(LS_KEYS.sessionToken, null)
  );
  const [sessionToken, _setSessionToken] = useState<string | null>(
    () => lsGet<string | null>(LS_KEYS.sessionToken, null)
  );

  const setCurrentRole = (role: AppContextType['currentRole']) => {
    _setCurrentRole(role);
    role ? lsSet(LS_KEYS.sessionRole, role) : lsClear(LS_KEYS.sessionRole);
  };

  const setIsAuthenticated = (auth: boolean) => {
    _setIsAuthenticated(auth);
    if (!auth) {
      lsClear(LS_KEYS.sessionToken);
      lsClear(LS_KEYS.sessionRole);
    }
  };

  const setSessionToken = (t: string | null) => {
    _setSessionToken(t);
    t ? lsSet(LS_KEYS.sessionToken, t) : lsClear(LS_KEYS.sessionToken);
  };

  // ── Firestore readiness flag ─────────────────────────────────────────────
  const [firestoreReady, setFirestoreReady] = useState(false);

  // ── Core data state ──────────────────────────────────────────────────────
  const [ships,           setShips]           = useState<any[]>([]);
  const [trips,           setTrips]           = useState<any[]>([]);
  const [ferryBookings,   setFerryBookings]   = useState<any[]>([]);
  const [vanBookings,     setVanBookings]     = useState<any[]>([]);
  const [announcements,   setAnnouncements]   = useState<any[]>([]);
  const [transactions,    setTransactions]    = useState<any[]>([]);
  const [auditLog,        setAuditLog]        = useState<any[]>([]);
  const [payoutHistory,   setPayoutHistory]   = useState<any[]>([]);
  const [toastMessage,    setToastMessage]    = useState<string | null>(null);
  const [isOnline,        setIsOnline]        = useState(navigator.onLine);
  const [gpsIndices,      setGpsIndices]      = useState<Record<string, number>>({});
  const [abraWeather,     setAbraWeather]     = useState<any>(null);
  const [mamburaoWeather, setMamburaoWeather] = useState<any>(null);

  // ── Offline queue — persisted to localStorage ────────────────────────────
  const [offlineQueue, _setOfflineQueue] = useState<any[]>(
    () => lsGet<any[]>(LS_KEYS.offlineQueue, [])
  );
  const setOfflineQueue: React.Dispatch<React.SetStateAction<any[]>> = (action) => {
    _setOfflineQueue(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      lsSet(LS_KEYS.offlineQueue, next);
      return next;
    });
  };

  // Weather cache ref for offline fallback
  const weatherCache = useRef<{ abra: any; mamburao: any; lastFetched: string | null }>(
    lsGet(LS_KEYS.weatherCache, { abra: null, mamburao: null, lastFetched: null })
  );

  // ── Firestore subscription helper ────────────────────────────────────────
  // Seeds Firestore with default data if the collection returns empty on first listen.
  const firestoreInitialised = useRef<Record<string, boolean>>({});

  const seedIfEmpty = useCallback(
    async (col: string, seeds: any[]) => {
      if (firestoreInitialised.current[col]) return;
      firestoreInitialised.current[col] = true;
      // Seeds are written once; subsequent loads just use the live snapshot.
      for (const item of seeds) {
        await fsSet(col, item.id, item).catch(() => {/* ignore permission errors in anon mode */});
      }
    },
    []
  );

  // ── Attach Firestore listeners ───────────────────────────────────────────
  useEffect(() => {
    let readyCount = 0;
    const TOTAL = 6; // number of collections we wait for

    const markReady = () => {
      readyCount++;
      if (readyCount >= TOTAL) setFirestoreReady(true);
    };

    const unsubs = [
      subscribeCollection<any>(COLLECTIONS.ships, (docs) => {
        if (docs.length === 0) seedIfEmpty(COLLECTIONS.ships, SEED_SHIPS);
        else setShips(docs);
        markReady();
      }),
      subscribeCollection<any>(COLLECTIONS.trips, (docs) => {
        if (docs.length === 0) seedIfEmpty(COLLECTIONS.trips, SEED_TRIPS);
        else setTrips(docs);
        markReady();
      }),
      subscribeCollection<any>(COLLECTIONS.ferryBookings, (docs) => {
        if (docs.length === 0) seedIfEmpty(COLLECTIONS.ferryBookings, SEED_FERRY_BOOKINGS);
        else setFerryBookings(docs);
        markReady();
      }),
      subscribeCollection<any>(COLLECTIONS.vanBookings, (docs) => {
        if (docs.length === 0) seedIfEmpty(COLLECTIONS.vanBookings, SEED_VAN_BOOKINGS);
        else setVanBookings(docs);
        markReady();
      }),
      subscribeCollection<any>(COLLECTIONS.announcements, (docs) => {
        if (docs.length === 0) seedIfEmpty(COLLECTIONS.announcements, SEED_ANNOUNCEMENTS);
        else setAnnouncements(docs);
        markReady();
      }),
      subscribeCollection<any>(COLLECTIONS.transactions, (docs) => {
        setTransactions(docs);
        markReady();
      }, 'createdAt'),
      subscribeCollection<any>(COLLECTIONS.auditLog, (docs) => {
        setAuditLog(docs);
      }, 'createdAt'),
      subscribeCollection<any>(COLLECTIONS.payoutHistory, (docs) => {
        setPayoutHistory(docs);
      }, 'createdAt'),
    ];

    return () => unsubs.forEach(u => u());
  }, [seedIfEmpty]);

  // ── Firestore-wired write helpers ────────────────────────────────────────

  const persistShip = useCallback(async (ship: any) => {
    await fsSet(COLLECTIONS.ships, ship.id, ship);
  }, []);

  const persistTrip = useCallback(async (trip: any) => {
    await fsSet(COLLECTIONS.trips, trip.id, trip);
  }, []);

  const persistFerryBooking = useCallback(async (booking: any) => {
    await fsSet(COLLECTIONS.ferryBookings, booking.id, booking);
  }, []);

  const persistVanBooking = useCallback(async (booking: any) => {
    await fsSet(COLLECTIONS.vanBookings, booking.id, booking);
  }, []);

  const persistAnnouncement = useCallback(async (ann: any) => {
    await fsSet(COLLECTIONS.announcements, ann.id, ann);
  }, []);

  const updateShipStatus = useCallback(async (id: string, status: string) => {
    await fsUpdate(COLLECTIONS.ships, id, { status });
  }, []);

  const updateTripStatus = useCallback(async (id: string, status: string) => {
    await fsUpdate(COLLECTIONS.trips, id, { status });
  }, []);

  const updateBookingStatus = useCallback(
    async (col: 'ferryBookings' | 'vanBookings', id: string, status: string) => {
      await fsUpdate(COLLECTIONS[col], id, { status });
    },
    []
  );

  // ── addTransaction ───────────────────────────────────────────────────────
  const addTransaction = useCallback(
    (bookingData: any, confirmedBy: 'Port Admin' | 'Terminal Admin') => {
      const isFerry = bookingData.shipId !== undefined;
      const bookingTypeObj = isFerry
        ? 'Ferry'
        : (trips.find(t => t.id === bookingData.tripId)?.type || 'Van');

      let routeDesc = bookingData.route || '';
      if (!routeDesc) {
        routeDesc = isFerry
          ? (ships.find(s => s.id === bookingData.shipId)?.route || 'Abra Port → Batangas')
          : (trips.find(t => t.id === bookingData.tripId)?.route || 'Mamburao → Abra Port');
      }

      const seatsCount  = isFerry ? 1 : Number(bookingData.seats || 1);
      const grossAmount = getGrossAmount(bookingTypeObj as any, bookingData.type, seatsCount);
      const commissionAmount = getCommission(bookingTypeObj as any, bookingData.type, seatsCount);

      const newTx = {
        id:               'tx-' + Math.random().toString(36).substr(2, 9),
        timestamp:        new Date().toISOString(),
        type:             bookingTypeObj,
        bookingId:        bookingData.id,
        passengerName:    bookingData.name,
        route:            routeDesc,
        ticketType:       isFerry ? bookingData.type : `${seatsCount} seat${seatsCount > 1 ? 's' : ''}`,
        grossAmount,
        commissionAmount,
        confirmedBy,
        status:           'Completed',
        paid:             false,
      };

      // Optimistic local update + Firestore write
      setTransactions(prev => [newTx, ...prev]);
      fsSet(COLLECTIONS.transactions, newTx.id, newTx).catch(console.error);
    },
    [ships, trips]
  );

  // ── Online/Offline detection + queue sync ───────────────────────────────
  useEffect(() => {
    const handleOnline  = () => { setIsOnline(true); fetchWeather(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Flush offline queue when connectivity returns
  useEffect(() => {
    if (!isOnline || offlineQueue.length === 0) return;

    const count = offlineQueue.length;
    offlineQueue.forEach(item => {
      if (item.bookingType === 'ferry') {
        const booking = { ...item, status: 'Pending' };
        setFerryBookings(prev => [...prev, booking]);
        persistFerryBooking(booking).catch(console.error);
      } else {
        const booking = { ...item, status: 'Pending' };
        setVanBookings(prev => [...prev, booking]);
        persistVanBooking(booking).catch(console.error);
      }
    });

    setOfflineQueue([]);
    setToastMessage(`✅ ${count} booking${count !== 1 ? 's' : ''} synced successfully`);
    setTimeout(() => setToastMessage(null), 3000);
  }, [isOnline]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── GPS index loop ───────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setGpsIndices(prev => {
        const next = { ...prev };
        trips.forEach(t => {
          if (t.status === 'Boarding' || t.status === 'Departed') {
            const route = GPS_ROUTES[t.route] || GPS_ROUTES['default'];
            next[t.id] = ((prev[t.id] || 0) + 1) % route.length;
          }
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [trips]);

  // ── Weather fetch ────────────────────────────────────────────────────────
  const fetchWeather = useCallback(async () => {
    const url = (lat: number, lon: number) =>
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m`;

    try {
      const [resAbra, resMam] = await Promise.all([
        fetch(url(13.45, 120.63)).then(r => r.json()),
        fetch(url(13.2167, 120.5833)).then(r => r.json()),
      ]);

      const fmt = (res: any) => res?.current
        ? { temperature_2m: res.current.temperature_2m, weathercode: res.current.weathercode, windspeed_10m: res.current.windspeed_10m, lastUpdated: new Date().toISOString() }
        : null;

      const abraData = fmt(resAbra);
      const mamData  = fmt(resMam);

      if (abraData && mamData) {
        setAbraWeather(abraData);
        setMamburaoWeather(mamData);
        weatherCache.current = { abra: abraData, mamburao: mamData, lastFetched: new Date().toISOString() };
        lsSet(LS_KEYS.weatherCache, weatherCache.current);
      }
    } catch {
      // Use cached data if available
      if (weatherCache.current.lastFetched) {
        setAbraWeather(weatherCache.current.abra);
        setMamburaoWeather(weatherCache.current.mamburao);
      } else {
        const now = new Date().toISOString();
        setAbraWeather({ temperature_2m: 29.5, weathercode: 1, windspeed_10m: 12.4, lastUpdated: now });
        setMamburaoWeather({ temperature_2m: 31.2, weathercode: 0, windspeed_10m: 8.5, lastUpdated: now });
      }
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    const id = setInterval(fetchWeather, 5 * 60_000);
    return () => clearInterval(id);
  }, [fetchWeather]);

  // ── Utils ────────────────────────────────────────────────────────────────

  const getTripLocation = (tripId: string, routeStr: string): [number, number] => {
    const route = GPS_ROUTES[routeStr] || GPS_ROUTES['default'];
    return route[(gpsIndices[tripId] || 0) % route.length];
  };

  const formatPST = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  // ── Context value ────────────────────────────────────────────────────────

  const value: AppContextType = {
    ships, setShips,
    trips, setTrips,
    ferryBookings, setFerryBookings,
    vanBookings, setVanBookings,
    announcements, setAnnouncements,
    transactions, setTransactions,
    offlineQueue, setOfflineQueue,
    isOnline, firestoreReady,
    gpsIndices,
    abraWeather, setAbraWeather,
    mamburaoWeather, setMamburaoWeather,
    auditLog, setAuditLog,
    payoutHistory, setPayoutHistory,
    currentRole, setCurrentRole,
    isAuthenticated, setIsAuthenticated,
    sessionToken, setSessionToken,
    addTransaction,
    getTripLocation,
    formatPST,
    toastMessage, setToastMessage,
    persistShip, persistTrip,
    persistFerryBooking, persistVanBooking, persistAnnouncement,
    updateShipStatus, updateTripStatus, updateBookingStatus,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
};
