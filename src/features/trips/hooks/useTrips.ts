import { useCallback } from 'react';
import { useApp } from '../../../context/AppContext';
import { Ship, Trip } from '../../../types/dataTypes';

export function useTrips() {
  const { ships, setShips, trips, setTrips, persistShip, persistTrip, isOnline } = useApp();

  const createVoyage = useCallback(async (data: Ship) => {
    if (isOnline) {
      setShips(prev => [...prev, data]);
      await persistShip(data);
    } else {
      setShips(prev => [...prev, data]);
    }
  }, [isOnline, persistShip, setShips]);

  const updateVoyageStatus = useCallback(async (id: string, status: Ship['status'] | Trip['status'], type: 'ship' | 'trip') => {
    if (type === 'ship') {
      setShips(prev => prev.map(s => s.id === id ? { ...s, status: status as Ship['status'] } : s));
      const shipToUpdate = ships.find(s => s.id === id);
      if (shipToUpdate) {
        await persistShip({ ...shipToUpdate, status: status as Ship['status'] });
      }
    } else {
      setTrips(prev => prev.map(t => t.id === id ? { ...t, status: status as Trip['status'] } : t));
      const tripToUpdate = trips.find(t => t.id === id);
      if (tripToUpdate) {
        await persistTrip({ ...tripToUpdate, status: status as Trip['status'] });
      }
    }
  }, [ships, trips, setShips, setTrips, persistShip, persistTrip]);

  return {
    ships,
    trips,
    createVoyage,
    updateVoyageStatus
  };
}
