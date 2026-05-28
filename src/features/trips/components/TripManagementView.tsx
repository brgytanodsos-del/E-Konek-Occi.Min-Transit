import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui';
import { Button } from '../../../components/ui';

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
          <Card>
            <CardHeader>
              <CardTitle>Active Trips</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Table rendering of trips */}
              <div className="space-y-2">
                {trips.map(trip => (
                    <div key={trip.id} onClick={() => setSelectedTrip(trip)} className="p-4 border rounded cursor-pointer hover:bg-slate-50">
                        {trip.route} - {trip.status}
                    </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedTrip && (
          <Card>
            <CardHeader>
              <CardTitle>Trip Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Route: {selectedTrip.route}</p>
              <Button onClick={() => updateTripStatus(selectedTrip.id, 'completed')}>Complete</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
