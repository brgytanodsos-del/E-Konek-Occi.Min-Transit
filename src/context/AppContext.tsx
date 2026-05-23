import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

// COMMISSION RATES
export const COMMISSION_RATES = {
  ferry_regular: 50,
  ferry_student: 30,
  ferry_senior:  25,
  ferry_pwd:     25,
  van_per_seat:  20,
  bus_per_seat:  15,
};

export const getCommission = (type: 'Ferry' | 'Van' | 'Bus', ticketType: string, seats: number = 1) => {
  if (type === 'Ferry') {
    const key = `ferry_${ticketType.toLowerCase()}` as keyof typeof COMMISSION_RATES;
    return COMMISSION_RATES[key] || COMMISSION_RATES.ferry_regular;
  } else if (type === 'Van') {
    return COMMISSION_RATES.van_per_seat * seats;
  } else {
    return COMMISSION_RATES.bus_per_seat * seats;
  }
};

export const getGrossAmount = (type: 'Ferry' | 'Van' | 'Bus', ticketType: string, seats: number = 1) => {
  if (type === 'Ferry') {
    if (ticketType === 'Student') return 350;
    if (ticketType === 'Senior' || ticketType === 'PWD') return 300;
    return 500; // Regular
  } else if (type === 'Van') {
    return 200 * seats;
  } else {
    return 150 * seats;
  }
};

// GPS ROUTES
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

  'default':                [[13.2167,120.5833],[13.22,120.585],[13.23,120.59]]
};

export interface AppContextType {
  ships: any[];
  setShips: React.Dispatch<React.SetStateAction<any[]>>;
  trips: any[];
  setTrips: React.Dispatch<React.SetStateAction<any[]>>;
  ferryBookings: any[];
  setFerryBookings: React.Dispatch<React.SetStateAction<any[]>>;
  vanBookings: any[];
  setVanBookings: React.Dispatch<React.SetStateAction<any[]>>;
  announcements: any[];
  setAnnouncements: React.Dispatch<React.SetStateAction<any[]>>;
  transactions: any[];
  setTransactions: React.Dispatch<React.SetStateAction<any[]>>;
  offlineQueue: any[];
  setOfflineQueue: React.Dispatch<React.SetStateAction<any[]>>;
  isOnline: boolean;
  gpsIndices: Record<string, number>;
  abraWeather: any;
  setAbraWeather: React.Dispatch<React.SetStateAction<any>>;
  mamburaoWeather: any;
  setMamburaoWeather: React.Dispatch<React.SetStateAction<any>>;
  auditLog: any[];
  setAuditLog: React.Dispatch<React.SetStateAction<any[]>>;
  payoutHistory: any[];
  setPayoutHistory: React.Dispatch<React.SetStateAction<any[]>>;
  currentRole: 'port' | 'terminal' | 'passenger' | 'superadmin' | null;
  setCurrentRole: (role: 'port' | 'terminal' | 'passenger' | 'superadmin' | null) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  addTransaction: (bookingData: any, confirmedBy: 'Port Admin' | 'Terminal Admin') => void;
  getTripLocation: (tripId: string, routeStr: string) => [number, number];
  formatPST: (iso: string) => string;
  toastMessage: string | null;
  setToastMessage: (msg: string | null) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentRole, setCurrentRole] = useState<'port' | 'terminal' | 'passenger' | 'superadmin' | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // TOAST state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // SEED DATA TIMES
  const now = new Date();
  const makeDeparture = (hoursAhead: number) => new Date(now.getTime() + hoursAhead * 60 * 60 * 1000).toISOString();
  
  // SHIPS (3 entries)
  const [ships, setShips] = useState<any[]>([
    { id: 's1', name: 'MV Maria Olive', route: 'Abra Port → Batangas', depTime: makeDeparture(2), arrTime: makeDeparture(4.5), status: 'Boarding', capacity: 300, available: 120, type: 'RORO' },
    { id: 's2', name: 'MV Reina Genoveva', route: 'Abra Port → Puerto Galera', depTime: makeDeparture(5), arrTime: makeDeparture(6.5), status: 'Scheduled', capacity: 250, available: 250, type: 'Passenger Ferry' },
    { id: 's3', name: 'MV Montenegro Star', route: 'Batangas → Abra Port', depTime: makeDeparture(8), arrTime: makeDeparture(10.5), status: 'Scheduled', capacity: 200, available: 200, type: 'RORO' }
  ]);

  // TRIPS (6 entries)
  const [trips, setTrips] = useState<any[]>([
    { id: 't1', route: 'Mamburao → Abra Port', depTime: makeDeparture(0.5), type: 'Van', driver: 'Kuya Jun Dela Rosa', capacity: 14, available: 6, status: 'Boarding' },
    { id: 't2', route: 'Abra Port → Mamburao', depTime: makeDeparture(1), type: 'Van', driver: 'Ate Lorna Bautista', capacity: 14, available: 14, status: 'Scheduled' },
    { id: 't3', route: 'Mamburao → San Jose', depTime: makeDeparture(2), type: 'Bus', driver: 'Mang Cardo Villanueva', capacity: 45, available: 30, status: 'Scheduled' },
    { id: 't4', route: 'San Jose → Mamburao', depTime: makeDeparture(3), type: 'Bus', driver: 'Dodong Reyes', capacity: 45, available: 45, status: 'Scheduled' },
    { id: 't5', route: 'Mamburao → Calintaan', depTime: makeDeparture(0.75), type: 'Van', driver: 'Kuya Romy Santos', capacity: 10, available: 3, status: 'Departed' },
    { id: 't6', route: 'Calintaan → Mamburao', depTime: makeDeparture(4), type: 'Van', driver: 'Nanding Cruz', capacity: 10, available: 10, status: 'Scheduled' }
  ]);

  // FERRY BOOKINGS (4 entries)
  const [ferryBookings, setFerryBookings] = useState<any[]>([
    { id: 'fb1', shipId: 's1', name: 'Ligaya Reyes', contact: '09171234567', type: 'Regular', status: 'Pending' },
    { id: 'fb2', shipId: 's1', name: 'Crisanto Villanueva', contact: '09189876543', type: 'Senior', status: 'Confirmed' },
    { id: 'fb3', shipId: 's2', name: 'Nena Magtanggol', contact: '09201112233', type: 'Student', status: 'Pending' },
    { id: 'fb4', shipId: 's2', name: 'Bong Espiritu', contact: '09151234321', type: 'PWD', status: 'Confirmed' }
  ]);

  // VAN BOOKINGS (2 entries)
  const [vanBookings, setVanBookings] = useState<any[]>([
    { id: 'vb1', tripId: 't1', name: 'Rosario Dalisay', contact: '09191112222', pickup: 'Mamburao Grand Terminal', seats: 2, status: 'Confirmed' },
    { id: 'vb2', tripId: 't3', name: 'Ferdie Macaraeg', contact: '09209998888', pickup: 'Mamburao Plaza', seats: 1, status: 'Pending' }
  ]);

  // ANNOUNCEMENTS (2 entries)
  const [announcements, setAnnouncements] = useState<any[]>([
    { id: 'a1', text: 'All trips are on schedule today. Passengers are reminded to arrive 30 minutes before departure. Present valid IDs at the counter.', date: makeDeparture(0), author: 'Abra Port Admin' },
    { id: 'a2', text: 'MV Montenegro Star arrival at Abra Port is expected at 10:30 AM. Van shuttles to Mamburao will depart immediately after docking.', date: makeDeparture(-1), author: 'Terminal Admin' }
  ]);

  // TRANSACTIONS (3 entries)
  const [transactions, setTransactions] = useState<any[]>([
    { id: 'tx1', timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), type: 'Ferry', bookingId: 'fb2', passengerName: 'Crisanto Villanueva', route: 'Abra Port → Batangas', ticketType: 'Senior', grossAmount: 300, commissionAmount: 25, confirmedBy: 'Port Admin', status: 'Completed', paid: true },
    { id: 'tx2', timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() , type: 'Van', bookingId: 'vb1', passengerName: 'Rosario Dalisay', route: 'Mamburao → Abra Port', ticketType: '2 seats', grossAmount: 400, commissionAmount: 40, confirmedBy: 'Terminal Admin', status: 'Completed', paid: true },
    { id: 'tx3', timestamp: makeDeparture(0), type: 'Ferry', bookingId: 'fb4', passengerName: 'Bong Espiritu', route: 'Abra Port → Puerto Galera', ticketType: 'PWD', grossAmount: 300, commissionAmount: 25, confirmedBy: 'Port Admin', status: 'Completed', paid: false }
  ]);

  // PAYOUT HISTORY (2 entries)
  const [payoutHistory, setPayoutHistory] = useState<any[]>([
    { id: 'ph1', date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), totalAmount: 1250, transactionCount: 8 },
    { id: 'ph2', date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), totalAmount: 890, transactionCount: 5 }
  ]);

  // AUDIT LOG (3 entries)
  const [auditLog, setAuditLog] = useState<any[]>([
    { timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), role: 'port', action: 'login' },
    { timestamp: new Date(now.getTime() - 45 * 60 * 1000).toISOString(), role: 'terminal', action: 'login' },
    { timestamp: new Date(now.getTime() - 20 * 60 * 1000).toISOString(), role: 'port', action: 'logout' }
  ]);

  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [gpsIndices, setGpsIndices] = useState<Record<string, number>>({});
  const [abraWeather, setAbraWeather] = useState<any>(null);
  const [mamburaoWeather, setMamburaoWeather] = useState<any>(null);

  // Weather Cache Ref for offline support
  const weatherCache = useRef<{ abra: any, mamburao: any, lastFetched: string | null }>({
    abra: null,
    mamburao: null,
    lastFetched: null
  });

  const getTripLocation = (tripId: string, routeStr: string): [number, number] => {
    const route = GPS_ROUTES[routeStr] || GPS_ROUTES['default'];
    const idx = gpsIndices[tripId] || 0;
    return route[idx % route.length];
  };

  const formatPST = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return isoStr;
    }
  };

  // GPS Index Loop
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

  // Network State Listener & Synergy Sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      fetchWeather();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync Offline Queue on reconnect
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      const count = offlineQueue.length;
      offlineQueue.forEach(item => {
        if (item.bookingType === 'ferry') {
          setFerryBookings(prev => [...prev, { ...item, status: 'Pending' }]);
        } else {
          setVanBookings(prev => [...prev, { ...item, status: 'Pending' }]);
        }
      });
      setOfflineQueue([]);
      setToastMessage(`✅ ${count} bookings synced successfully`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, [isOnline, offlineQueue]);

  // Weather Fetch Method
  const fetchWeather = async () => {
    const abraLat = 13.45, abraLon = 120.63;
    const mamLat = 13.2167, mamLon = 120.5833;
    const urlAbra = `https://api.open-meteo.com/v1/forecast?latitude=${abraLat}&longitude=${abraLon}&current=temperature_2m,weathercode,windspeed_10m`;
    const urlMam = `https://api.open-meteo.com/v1/forecast?latitude=${mamLat}&longitude=${mamLon}&current=temperature_2m,weathercode,windspeed_10m`;

    try {
      const [resAbra, resMam] = await Promise.all([
        fetch(urlAbra).then(r => r.json()),
        fetch(urlMam).then(r => r.json())
      ]);

      const timeNow = new Date().toISOString();

      const formatData = (apiRes: any) => {
        if (apiRes && apiRes.current) {
          return {
            temperature_2m: apiRes.current.temperature_2m,
            weathercode: apiRes.current.weathercode,
            windspeed_10m: apiRes.current.windspeed_10m,
            lastUpdated: timeNow
          };
        }
        return null;
      };

      const abraData = formatData(resAbra);
      const mamData = formatData(resMam);

      if (abraData && mamData) {
        setAbraWeather(abraData);
        setMamburaoWeather(mamData);
        weatherCache.current = {
          abra: abraData,
          mamburao: mamData,
          lastFetched: timeNow
        };
      }
    } catch (e) {
      console.warn("Weather API Fetch failed, loading from cache fallback...");
      if (weatherCache.current.lastFetched) {
        setAbraWeather(weatherCache.current.abra);
        setMamburaoWeather(weatherCache.current.mamburao);
      } else {
        // Ultimate static offline seeds
        const backupTime = new Date().toISOString();
        const abraStatic = { temperature_2m: 29.5, weathercode: 1, windspeed_10m: 12.4, lastUpdated: backupTime };
        const mamStatic = { temperature_2m: 31.2, weathercode: 0, windspeed_10m: 8.5, lastUpdated: backupTime };
        setAbraWeather(abraStatic);
        setMamburaoWeather(mamStatic);
      }
    }
  };

  // Poll Weather every 5 minutes
  useEffect(() => {
    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 5 * 60 * 1000);
    return () => clearInterval(weatherInterval);
  }, []);

  // addTransaction implementation
  const addTransaction = (bookingData: any, confirmedBy: 'Port Admin' | 'Terminal Admin') => {
    const isFerry = bookingData.shipId !== undefined;
    const bookingTypeObj = isFerry ? 'Ferry' : (trips.find(t => t.id === bookingData.tripId)?.type || 'Van');
    
    let routeDesc = bookingData.route || '';
    if (!routeDesc) {
      if (isFerry) {
        routeDesc = ships.find(s => s.id === bookingData.shipId)?.route || 'Abra Port → Batangas';
      } else {
        routeDesc = trips.find(t => t.id === bookingData.tripId)?.route || 'Mamburao → Abra Port';
      }
    }

    const tType = isFerry ? bookingData.type : `${bookingData.seats} seat${bookingData.seats > 1 ? 's' : ''}`;
    const seatsCount = isFerry ? 1 : Number(bookingData.seats || 1);
    const grossAmount = getGrossAmount(bookingTypeObj as any, bookingData.type, seatsCount);
    const commissionAmount = getCommission(bookingTypeObj as any, bookingData.type, seatsCount);

    const newTransaction = {
      id: 'tx-' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      type: bookingTypeObj,
      bookingId: bookingData.id,
      passengerName: bookingData.name,
      route: routeDesc,
      ticketType: tType,
      grossAmount,
      commissionAmount,
      confirmedBy,
      status: 'Completed',
      paid: false
    };

    setTransactions(prev => [newTransaction, ...prev]);
  };

  const value = {
    ships,
    setShips,
    trips,
    setTrips,
    ferryBookings,
    setFerryBookings,
    vanBookings,
    setVanBookings,
    announcements,
    setAnnouncements,
    transactions,
    setTransactions,
    offlineQueue,
    setOfflineQueue,
    isOnline,
    gpsIndices,
    abraWeather,
    setAbraWeather,
    mamburaoWeather,
    setMamburaoWeather,
    auditLog,
    setAuditLog,
    payoutHistory,
    setPayoutHistory,
    currentRole,
    setCurrentRole,
    isAuthenticated,
    setIsAuthenticated,
    addTransaction,
    getTripLocation,
    formatPST,
    toastMessage,
    setToastMessage
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
