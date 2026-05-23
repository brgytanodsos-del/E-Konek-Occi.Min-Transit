import { useState } from 'react';
import { Plus, Users, Clock } from 'lucide-react';

interface Panel2Props {
  isSuperAdmin: boolean;
}

export const Panel2 = ({ isSuperAdmin }: Panel2Props) => {
  const [showAddModal, setShowAddModal] = useState(false);

  const trips = [
    { id: 1, route: "San Jose → Mamburao", vehicle: "Toyota Hiace - NJK 4321", departure: "07:45", status: "On Trip", booked: 12, capacity: 18 },
    { id: 2, route: "Mamburao → Abra de Ilog", vehicle: "Bus - ABV 7654", departure: "09:30", status: "Waiting", booked: 8, capacity: 45 },
    { id: 3, route: "Sablayan → San Jose", vehicle: "Van - TRV 9988", departure: "14:00", status: "Scheduled", booked: 3, capacity: 15 },
  ];

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-primary">🚐 Van & Bus Operations</h2>
          <p className="text-gray-600">Land Transport Management System</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-accent hover:bg-green-700 text-white px-6 py-3 rounded-2xl cursor-pointer"
          >
            <Plus size={20} /> Add New Trip
          </button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass p-6 rounded-3xl">
          <p className="text-sm text-gray-500">Active Vehicles</p>
          <p className="text-4xl font-bold">18</p>
        </div>
        <div className="glass p-6 rounded-3xl">
          <p className="text-sm text-gray-500">Passengers Today</p>
          <p className="text-4xl font-bold text-accent">347</p>
        </div>
        <div className="glass p-6 rounded-3xl">
          <p className="text-sm text-gray-500">On Time</p>
          <p className="text-4xl font-bold text-green-600">92%</p>
        </div>
        <div className="glass p-6 rounded-3xl">
          <p className="text-sm text-gray-500">Avg. Delay</p>
          <p className="text-4xl font-bold">12 min</p>
        </div>
      </div>

      {/* Trips List */}
      <div className="bg-white rounded-3xl shadow">
        <div className="p-6 border-b">
          <h3 className="font-semibold text-lg">Today's Trips</h3>
        </div>
        <div className="divide-y">
          {trips.map((trip) => (
            <div key={trip.id} className="p-6 flex flex-col md:flex-row md:items-center gap-6 hover:bg-gray-50">
              <div className="flex-1">
                <p className="font-semibold text-lg">{trip.route}</p>
                <p className="text-gray-600 text-sm">{trip.vehicle}</p>
              </div>

              <div className="flex flex-wrap items-center gap-8">
                <div className="text-center">
                  <Clock className="mx-auto mb-1 text-gray-400" />
                  <p className="font-medium">{trip.departure}</p>
                </div>

                <div className="text-center">
                  <Users className="mx-auto mb-1 text-gray-400" />
                  <p className="font-medium">{trip.booked}/{trip.capacity}</p>
                </div>

                <div className={`px-5 py-2 rounded-full text-sm font-medium ${
                  trip.status === 'On Trip' ? 'bg-blue-100 text-blue-700' :
                  trip.status === 'Waiting' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {trip.status}
                </div>

                <button className="bg-primary text-white px-7 py-3 rounded-2xl text-sm transition-colors hover:bg-blue-800 cursor-pointer">Manage</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isSuperAdmin && (
        <div className="p-6 bg-primary/5 border border-primary/20 rounded-3xl">
          <p className="font-medium text-primary mb-2">Super Admin Controls</p>
          <div className="flex flex-wrap gap-3">
            <button className="border border-primary text-primary px-5 py-3 rounded-2xl hover:bg-primary/10 transition-colors cursor-pointer">Broadcast Announcement</button>
            <button className="border border-primary text-primary px-5 py-3 rounded-2xl hover:bg-primary/10 transition-colors cursor-pointer">View All Vehicles</button>
            <button className="border border-primary text-primary px-5 py-3 rounded-2xl hover:bg-primary/10 transition-colors cursor-pointer">Generate Daily Report</button>
          </div>
        </div>
      )}
    </div>
  );
};
