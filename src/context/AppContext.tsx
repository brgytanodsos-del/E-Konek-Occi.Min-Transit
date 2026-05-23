import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Ship, Trip, FerryBooking, VanBooking, Announcement, WeatherData } from '../types';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/docs');
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/forms');
provider.addScope('https://www.googleapis.com/auth/tasks');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const generateId = () => Math.random().toString(36).substr(2, 9);

const MOCK_SHIPS: Ship[] = [
    { id: 's1', name: 'MV Maria Olive', route: 'Abra Port → Batangas', depTime: new Date(Date.now() + 3600000).toISOString(), arrTime: new Date(Date.now() + 10800000).toISOString(), status: 'Boarding', capacity: 300, available: 120, type: 'RORO' },
    { id: 's2', name: 'MV Reina Genoveva', route: 'Batangas → Abra Port', depTime: new Date(Date.now() + 7200000).toISOString(), arrTime: new Date(Date.now() + 14400000).toISOString(), status: 'Scheduled', capacity: 250, available: 250, type: 'Passenger Ferry' }
];

const MOCK_TRIPS: Trip[] = [
    { id: 't1', route: 'Mamburao → Abra Port', depTime: new Date(Date.now() + 1800000).toISOString(), type: 'Van', driver: 'Kuya Jun', capacity: 14, available: 4, status: 'Departed' },
    { id: 't2', route: 'Mamburao → San Jose', depTime: new Date(Date.now() + 5400000).toISOString(), type: 'Bus', driver: 'Mang Cardo', capacity: 45, available: 45, status: 'Boarding' }
];

const MOCK_FERRY_BOOKINGS: FerryBooking[] = [
    { id: 'fb1', shipId: 's1', name: 'Juan dela Cruz', contact: '09171234567', type: 'Regular', status: 'Pending' },
    { id: 'fb2', shipId: 's1', name: 'Maria Santos', contact: '09189876543', type: 'Senior', status: 'Confirmed' },
    { id: 'fb3', shipId: 's2', name: 'Andres Bonifacio', contact: '09201112233', type: 'Student', status: 'Pending' }
];

const MOCK_VAN_BOOKINGS: VanBooking[] = [
    { id: 'vb1', tripId: 't1', pickup: 'Mamburao Grand Terminal', name: 'Pedro Penduko', contact: '09191112222', seats: 2, status: 'Confirmed' }
];

const MOCK_ANNOUNCEMENTS: Announcement[] = [
    { id: 'a1', text: 'Please be advised that all trips are on schedule. Bring valid IDs for boarding.', date: new Date().toISOString(), author: 'Abra Port Admin' }
];

const GPS_ROUTES: Record<string, [number, number][]> = {
    'Mamburao → Abra Port': [
        [13.2167, 120.5833], [13.2500, 120.5900], [13.3000, 120.6000], 
        [13.3500, 120.6100], [13.4000, 120.6200], [13.4500, 120.6300]
    ],
    'Mamburao → San Jose': [
        [13.2167, 120.5833], [13.1500, 120.6000], [13.0500, 120.6500], 
        [12.9500, 120.7000], [12.8500, 120.7500], [12.7500, 120.8000]
    ],
    'default': [
        [13.2167, 120.5833], [13.2200, 120.5850], [13.2300, 120.5900]
    ]
};

export interface NetworkLog {
    id: string;
    type: string;
    path: string;
    method: string;
    status: number;
    time: string;
}

export interface AppContextType {
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
    networkLogs: NetworkLog[];
    setNetworkLogs: React.Dispatch<React.SetStateAction<NetworkLog[]>>;
    getTripLocation: (routeStr: string) => [number, number];
    abraWeather: WeatherData | null;
    mamburaoWeather: WeatherData | null;
    
    // Auth
    user: User | null;
    accessToken: string | null;
    needsAuth: boolean;
    login: () => Promise<void>;
    logout: () => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const [ships, setShips] = useState<Ship[]>(MOCK_SHIPS);
    const [trips, setTrips] = useState<Trip[]>(MOCK_TRIPS);
    const [ferryBookings, setFerryBookings] = useState<FerryBooking[]>(MOCK_FERRY_BOOKINGS);
    const [vanBookings, setVanBookings] = useState<VanBooking[]>(MOCK_VAN_BOOKINGS);
    const [announcements, setAnnouncements] = useState<Announcement[]>(MOCK_ANNOUNCEMENTS);
    const [networkLogs, setNetworkLogs] = useState<NetworkLog[]>([]);

    // GPS Tick is kept isolated to the interval to prevent entire app re-rendering.
    // However, the location fetching uses it. To prevent constant re-renders across the
    // whole context, we move the GPS tick to a ref, and let components asking for position
    // handle their own local tick state if they want animated updates, or we just keep it
    // simple for context and update a small state. Given the constraints, we will keep the tick here
    // but pass it functionally so we only compute it when needed, preventing all components from
    // re-rendering unless they actively query it.
    
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [needsAuth, setNeedsAuth] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                if (cachedAccessToken) {
                    setUser(currentUser);
                    setAccessToken(cachedAccessToken);
                    setNeedsAuth(false);
                } else if (!isSigningIn) {
                    cachedAccessToken = null;
                    setUser(null);
                    setAccessToken(null);
                    setNeedsAuth(true);
                }
            } else {
                cachedAccessToken = null;
                setUser(null);
                setAccessToken(null);
                setNeedsAuth(true);
            }
        });
        return () => unsubscribe();
    }, []);

    const login = async () => {
        try {
            isSigningIn = true;
            const result = await signInWithPopup(auth, provider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential?.accessToken) {
                cachedAccessToken = credential.accessToken;
                setAccessToken(credential.accessToken);
            }
            setUser(result.user);
            setNeedsAuth(false);
        } catch (error) {
            console.error('Sign in error:', error);
        } finally {
            isSigningIn = false;
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        cachedAccessToken = null;
        setAccessToken(null);
        setUser(null);
        setNeedsAuth(true);
    };

    const gpsTick = React.useRef(0);

    useEffect(() => {
        const interval = setInterval(() => {
            gpsTick.current += 1;
            // Note: We don't dispatch state here to avoid global re-render every 3s.
            // MapView internally hooks to its own interval to fetch updated locations to prevent
            // flashing and global re-renders.
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const [abraWeather, setAbraWeather] = useState<WeatherData | null>(null);
    const [mamburaoWeather, setMamburaoWeather] = useState<WeatherData | null>(null);

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                const [abraRes, mamburaoRes] = await Promise.all([
                    fetch(`https://api.open-meteo.com/v1/forecast?latitude=13.45&longitude=120.63&current=temperature_2m,weathercode,windspeed_10m`),
                    fetch(`https://api.open-meteo.com/v1/forecast?latitude=13.2167&longitude=120.5833&current=temperature_2m,weathercode,windspeed_10m`)
                ]);
                const abraData = await abraRes.json();
                const mamburaoData = await mamburaoRes.json();
                setAbraWeather(abraData.current);
                setMamburaoWeather(mamburaoData.current);
            } catch (err) {
                console.error("Weather fetch failed", err);
            }
        };
        fetchWeather();
        const interval = setInterval(fetchWeather, 300000); // 5 mins
        return () => clearInterval(interval);
    }, []);

    const getTripLocation = (routeStr: string): [number, number] => {
        const route = GPS_ROUTES[routeStr] || GPS_ROUTES['default'];
        return route[gpsTick.current % route.length];
    };

    const value: AppContextType = {
        ships, setShips,
        trips, setTrips,
        ferryBookings, setFerryBookings,
        vanBookings, setVanBookings,
        announcements, setAnnouncements,
        networkLogs, setNetworkLogs,
        getTripLocation,
        abraWeather, mamburaoWeather,
        user, accessToken, needsAuth, login, logout: handleLogout
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
