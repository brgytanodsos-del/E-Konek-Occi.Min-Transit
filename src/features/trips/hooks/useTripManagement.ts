import { useState, useCallback } from 'react';
import { useApp } from '../../../context/AppContext';
import { offlineQueue } from '../../../lib/offlineQueue';
import { Trip } from '../../../types/dataTypes';

export function useTripManagement() {
  const app = useApp();

  const {
    userAccount,
    currentRole,
    trips,
    persistTrip,
    updateTripStatus: persistTripStatus,
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
      role: currentRole as string,
      userId: userAccount?.id || 'unknown',
      payload: {
        ...tripData,
        createdAt: new Date(),
        status: 'scheduled',
      },
    };

    try {
      if (isOnline) {
        await persistTrip(tripData as any);
        setToastMessage("Trip created successfully");
      } else {
        await offlineQueue.add(operation);
        setToastMessage("Trip queued for sync when online");
      }
    } catch (error) {
      await offlineQueue.add(operation);
      setToastMessage("Trip saved offline");
    } finally {
      setIsCreating(false);
    }
  }, [persistTrip, isOnline, setToastMessage, currentRole, userAccount]);

  const updateTripStatus = useCallback(async (tripId: string, newStatus: string) => {
    const operation = {
      type: 'update' as const,
      collection: 'trips',
      docId: tripId,
      role: currentRole as string,
      userId: userAccount?.id || 'unknown',
      payload: { status: newStatus, changedAt: new Date() },
    };

    try {
      if (isOnline) {
        await persistTripStatus(tripId, newStatus as any);
        setToastMessage("Status updated");
      } else {
        await offlineQueue.add(operation);
        setToastMessage("Status change queued");
      }
    } catch (error) {
      await offlineQueue.add(operation);
      setToastMessage("Change saved offline");
    }
  }, [persistTripStatus, isOnline, setToastMessage, currentRole, userAccount]);

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
