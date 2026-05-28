import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../../context/AppContext';
import { speakAnnouncement } from '../../../utils/speech';
import { offlineQueue } from '../../../lib/offlineQueue';
import { Ship, Trip } from '../../../types/dataTypes';
import { auth } from '../../../lib/firebase';

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
    const bookingId = 'fb-' + Math.random().toString(36).substring(2, 11);
    const finalBooking = {
      id: bookingId,
      shipId: bookingData.voyageId || '',
      name: bookingData.ferryName || userAccount?.fullName || 'Guest Passenger',
      contact: bookingData.ferryContact || userAccount?.mobileNumber || '',
      type: (bookingData.ticketType || 'Regular') as any,
      status: 'Pending' as const,
      accountId: userAccount?.id || auth.currentUser?.uid || 'passenger-guest',
    };

    const operation = {
      type: 'booking' as const,
      collection: 'ferryBookings',
      userId: userAccount?.id || auth.currentUser?.uid || 'unknown',
      role: 'passenger',
      docId: bookingId,
      payload: finalBooking,
    };
    try {
      if (isOnline) {
        await persistFerryBooking(finalBooking);
        setToastMessage("Ferry booking confirmed");
      } else {
        await offlineQueue.add(operation);
        setToastMessage(`Booking queued (${pendingQueueCount + 1} pending)`);
      }
    } catch (error) {
      await offlineQueue.add(operation);
      setToastMessage("Booking saved offline. Will sync when online.");
    }
  }, [isOnline, userAccount, pendingQueueCount, persistFerryBooking, setToastMessage]);

  const safePersistVanBooking = useCallback(async (bookingData: any) => {
    const bookingId = 'vb-' + Math.random().toString(36).substring(2, 11);
    const finalBooking = {
      id: bookingId,
      tripId: bookingData.tripId || '',
      pickup: bookingData.pickupPoint || '',
      name: bookingData.shuttleName || userAccount?.fullName || 'Guest Passenger',
      contact: bookingData.shuttleContact || userAccount?.mobileNumber || '',
      seats: Number(bookingData.seatsCount) || 1,
      status: 'Pending' as const,
      accountId: userAccount?.id || auth.currentUser?.uid || 'passenger-guest',
    };

    const operation = {
      type: 'booking' as const,
      collection: 'vanBookings',
      userId: userAccount?.id || auth.currentUser?.uid || 'unknown',
      role: 'passenger',
      docId: bookingId,
      payload: finalBooking,
    };
    try {
      if (isOnline) {
        await persistVanBooking(finalBooking);
        setToastMessage("Shuttle booking confirmed");
      } else {
        await offlineQueue.add(operation);
        setToastMessage("Shuttle booking queued for sync");
      }
    } catch (error) {
      await offlineQueue.add(operation);
      setToastMessage("Saved offline");
    }
  }, [isOnline, persistVanBooking, setToastMessage, userAccount, pendingQueueCount]);

  const safeCreateTrip = useCallback(async (tripData: any) => {
    const operation = {
      type: 'create' as const,
      collection: 'trips',
      userId: userAccount?.id || 'unknown',
      role: 'passenger',
      payload: tripData,
    };
    try {
      if (isOnline) {
        await persistTrip(tripData);
        setToastMessage("Trip created successfully");
      } else {
        await offlineQueue.add(operation);
        setToastMessage("Trip queued for creation");
      }
    } catch (error) {
      await offlineQueue.add(operation);
      setToastMessage("Trip saved offline");
    }
  }, [isOnline, persistTrip, setToastMessage, userAccount]);

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
