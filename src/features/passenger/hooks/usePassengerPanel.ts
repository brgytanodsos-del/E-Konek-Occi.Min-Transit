import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../../context/AppContext';
import { speakAnnouncement } from '../../../utils/speech';
import { offlineQueue } from '../../../lib/offlineQueue';
import { Ship, Trip } from '../../../types/dataTypes';

export function usePassengerPanel() {
  const app = useApp();

  const {
    trips,
    ships,
    ferryBookings,
    vanBookings,
    announcements,
    isOnline,
    userAccount,
    getTripLocation,
    persistFerryBooking,
    persistVanBooking,
    persistTrip,
    persistShip,
    setShips,
    setTrips,
    setToastMessage,
  } = app;

  const [trackedTripId, setTrackedTripId] = useState<string | null>(null);
  const [etaSeconds, setEtaSeconds] = useState(15 * 60);
  const [refreshTimer, setRefreshTimer] = useState(30);
  const [pulseActive, setPulseActive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      const count = await offlineQueue.getPendingCount();
      setPendingQueueCount(count);
    };
    updateCount();
    const handler = () => updateCount();
    window.addEventListener('offlineQueueUpdated', handler);
    return () => window.removeEventListener('offlineQueueUpdated', handler);
  }, []);

  const [voyageId, setVoyageId] = useState('');
  const [ferryName, setFerryName] = useState(userAccount?.fullName || '');
  const [ferryContact, setFerryContact] = useState(userAccount?.mobileNumber || '');
  const [ticketType, setTicketType] = useState('Regular');

  const [tripId, setTripId] = useState('');
  const [pickupPoint, setPickupPoint] = useState('');
  const [shuttleName, setShuttleName] = useState(userAccount?.fullName || '');
  const [shuttleContact, setShuttleContact] = useState(userAccount?.mobileNumber || '');
  const [seatsCount, setSeatsCount] = useState('1');

  useEffect(() => {
    if (userAccount) {
      setFerryName(userAccount.fullName || '');
      setFerryContact(userAccount.mobileNumber || '');
      setShuttleName(userAccount.fullName || '');
      setShuttleContact(userAccount.mobileNumber || '');
    }
  }, [userAccount]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshTimer(prev => {
        if (prev <= 1) {
          setPulseActive(true);
          setTimeout(() => setPulseActive(false), 1500);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const manualRefresh = useCallback(async () => {
    setRefreshing(true);
    setPulseActive(true);
    setRefreshTimer(30);
    if (isOnline) {
       await offlineQueue.processQueue();
    }
    setTimeout(() => {
      setRefreshing(false);
      setPulseActive(false);
    }, 800);
  }, [isOnline]);

  const announce = useCallback((text: string) => {
    speakAnnouncement(text);
  }, []);

  const safePersistFerryBooking = useCallback(async (bookingData: any) => {
    const operation = {
      type: 'booking' as const,
      collection: 'ferryBookings',
      payload: { ...bookingData, createdAt: new Date(), status: 'pending', createdBy: userAccount?.uid },
    };
    try {
      if (isOnline) {
        await persistFerryBooking(bookingData);
        setToastMessage("Ferry booking confirmed", "success");
      } else {
        await offlineQueue.add(operation);
        setToastMessage(`Booking queued (${pendingQueueCount + 1} pending)`, "info");
      }
    } catch (error) {
      await offlineQueue.add(operation);
      setToastMessage("Booking saved offline. Will sync when online.", "warning");
    }
  }, [isOnline, userAccount, pendingQueueCount, persistFerryBooking, setToastMessage]);

  const safePersistVanBooking = useCallback(async (bookingData: any) => {
    const operation = {
      type: 'booking' as const,
      collection: 'vanBookings',
      payload: { ...bookingData, createdAt: new Date() },
    };
    try {
      if (isOnline) {
        await persistVanBooking(bookingData);
        setToastMessage("Shuttle booking confirmed", "success");
      } else {
        await offlineQueue.add(operation);
        setToastMessage("Shuttle booking queued for sync", "info");
      }
    } catch (error) {
      await offlineQueue.add(operation);
      setToastMessage("Saved offline", "warning");
    }
  }, [isOnline, persistVanBooking, setToastMessage]);

  const safeCreateTrip = useCallback(async (tripData: any) => {
    const operation = {
      type: 'create' as const,
      collection: 'trips',
      payload: tripData,
    };
    try {
      if (isOnline) {
        await persistTrip(tripData);
        setToastMessage("Trip created successfully", "success");
      } else {
        await offlineQueue.add(operation);
        setToastMessage("Trip queued for creation", "info");
      }
    } catch (error) {
      await offlineQueue.add(operation);
      setToastMessage("Trip saved offline", "warning");
    }
  }, [isOnline, persistTrip, setToastMessage]);

  return {
    trips,
    ships,
    ferryBookings,
    vanBookings,
    announcements,
    isOnline,
    getTripLocation,
    userAccount,
    trackedTripId,
    setTrackedTripId,
    etaSeconds,
    refreshTimer,
    pulseActive,
    refreshing,
    pendingQueueCount,
    voyageId, setVoyageId,
    ferryName, setFerryName,
    ferryContact, setFerryContact,
    ticketType, setTicketType,
    tripId, setTripId,
    pickupPoint, setPickupPoint,
    shuttleName, setShuttleName,
    shuttleContact, setShuttleContact,
    seatsCount, setSeatsCount,
    manualRefresh,
    announce,
    safePersistFerryBooking,
    safePersistVanBooking,
    safeCreateTrip,
    persistFerryBooking,
    persistVanBooking,
    persistTrip,
    persistShip,
    setShips,
    setTrips,
    setToastMessage,
  };
}
