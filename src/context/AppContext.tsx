import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AppContextType {
  currentRole: 'port' | 'terminal' | 'passenger' | 'superadmin' | null;
  setCurrentRole: (role: 'port' | 'terminal' | 'passenger' | 'superadmin' | null) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  shipBookings: any[];
  setShipBookings: (bookings: any[]) => void;
  transactions: any[];
  setTransactions: (transactions: any[]) => void;
  isOnline: boolean;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentRole, setCurrentRole] = useState<'port' | 'terminal' | 'passenger' | 'superadmin' | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [shipBookings, setShipBookings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  const value = {
    currentRole,
    setCurrentRole,
    isAuthenticated,
    setIsAuthenticated,
    shipBookings,
    setShipBookings,
    transactions,
    setTransactions,
    isOnline
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
