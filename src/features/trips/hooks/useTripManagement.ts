import { useState, useCallback } from 'react';
import { useApp } from '../../../context/AppContext';
import { offlineQueue } from '../../../lib/offlineQueue';
import { Trip } from '../../../types/dataTypes';

export function useTripManagement() {
  const app = useApp();

  const {
    trips,
    setTrips,
    persistTrip,
    updateBookingStatus,
    setToastMessage,
    isOnline,
  } = app;

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const createTrip = useCallback(async (tripData: Partial<Trip>) => {
    setIsCreating(true);

    const operation = {
      type: 'create' as const,
      collection: 'trips',
      payload: {
        ...tripData,
        createdAt: new Date(),
        status: 'scheduled',
      },
    };

    try {
      if (isOnline) {
        await persistTrip(tripData);
        setToastMessage("Trip created successfully", "success");
      } else {
        await offlineQueue.add(operation);
        setToastMessage("Trip queued for sync when online", "info");
      }
    } catch (error) {
      await offlineQueue.add(operation);
      setToastMessage("Trip saved offline", "warning");
    } finally {
      setIsCreating(false);
    }
  }, [persistTrip, isOnline, setToastMessage]);

  const updateTripStatus = useCallback(async (tripId: string, newStatus: string) => {
    const operation = {
      type: 'update' as const,
      collection: 'trips',
      docId: tripId,
      payload: { status: newStatus, changedAt: new Date() },
    };

    try {
      if (isOnline) {
        await updateBookingStatus(tripId, newStatus);
        setToastMessage("Status updated", "success");
      } else {
        await offlineQueue.add(operation);
        setToastMessage("Status change queued", "info");
      }
    } catch (error) {
      await offlineQueue.add(operation);
      setToastMessage("Change saved offline", "warning");
    }
  }, [updateBookingStatus, isOnline, setToastMessage]);

  return {
    trips,
    selectedTrip,
    setSelectedTrip,
    isCreating,
    createTrip,
    updateTripStatus,
    pendingQueueCount: 0,
  };
}
