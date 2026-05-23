import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';

export interface AppContextType {
  currentRole: 'port' | 'terminal' | 'passenger' | 'superadmin' | null;
  setCurrentRole: (role: 'port' | 'terminal' | 'passenger' | 'superadmin' | null) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  user: User | null;
  ships: any[];
  setShips: (ships: any[]) => void;
  trips: any[];
  setTrips: (trips: any[]) => void;
  ferryBookings: any[];
  setFerryBookings: (bookings: any[]) => void;
  vanBookings: any[];
  setVanBookings: (bookings: any[]) => void;
  announcements: any[];
  setAnnouncements: (announcements: any[]) => void;
  transactions: any[];
  setTransactions: (transactions: any[]) => void;
  offlineQueue: any[];
  setOfflineQueue: (queue: any[]) => void;
  isOnline: boolean;
  gpsIndices: Record<string, number>;
  abraWeather: any;
  mamburaoWeather: any;
  auditLog: any[];
  setAuditLog: (log: any[]) => void;
  addTransaction: (bookingData: any, confirmedBy: 'Port Admin' | 'Terminal Admin') => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentRole, setCurrentRole] = useState<'port' | 'terminal' | 'passenger' | 'superadmin' | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [ships, setShips] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [ferryBookings, setFerryBookings] = useState<any[]>([]);
  const [vanBookings, setVanBookings] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const gpsIndices = useRef<Record<string, number>>({});
  const [abraWeather, setAbraWeather] = useState<any>(null);
  const [mamburaoWeather, setMamburaoWeather] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addTransaction = (bookingData: any, confirmedBy: 'Port Admin' | 'Terminal Admin') => {
    const newTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      type: bookingData.type,
      bookingId: bookingData.id,
      passengerName: bookingData.passengerName,
      route: bookingData.route,
      ticketType: bookingData.ticketType,
      grossAmount: Number(bookingData.grossAmount),
      commissionAmount: Number(bookingData.commissionAmount),
      confirmedBy,
      status: 'Completed',
      paid: false
    };
    setTransactions(prev => [...prev, newTransaction]);
  };

  const value = {
    currentRole,
    setCurrentRole,
    isAuthenticated,
    setIsAuthenticated,
    user,
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
    gpsIndices: gpsIndices.current,
    abraWeather,
    mamburaoWeather,
    auditLog,
    setAuditLog,
    addTransaction
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
