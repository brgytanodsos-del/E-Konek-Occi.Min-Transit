import React from 'react';
import { SurfaceCard } from '../../../components/ui';
import { Button } from '../../../components/ui/Button';

interface Props {
  trips: any[];
  selectedTrip: any;
  setSelectedTrip: (trip: any) => void;
  isCreating: boolean;
  createTrip: (data: any) => void;
  updateTripStatus: (id: string, status: string) => void;
}

export default function TripManagementView({
  trips,
  selectedTrip,
  setSelectedTrip,
  isCreating,
  createTrip,
  updateTripStatus,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Trip Management</h2>
        <Button onClick={() => createTrip({})} disabled={isCreating}>
          + New Trip
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SurfaceCard>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-800">Active Trips</h3>
            </div>
            <div>
              {/* Table rendering of trips */}
              <div className="space-y-2">
                {trips.map(trip => (
                    <div key={trip.id} onClick={() => setSelectedTrip(trip)} className="p-4 border rounded cursor-pointer hover:bg-slate-50 transition-colors">
                        {trip.route} - {trip.status}
                    </div>
                ))}
              </div>
            </div>
          </SurfaceCard>
        </div>

        {selectedTrip && (
          <SurfaceCard>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-800">Trip Details</h3>
            </div>
            <div>
              <p className="mb-4 text-slate-600">Route: {selectedTrip.route}</p>
              <Button onClick={() => updateTripStatus(selectedTrip.id, 'completed')}>Complete</Button>
            </div>
          </SurfaceCard>
        )}
      </div>
    </div>
  );
}
