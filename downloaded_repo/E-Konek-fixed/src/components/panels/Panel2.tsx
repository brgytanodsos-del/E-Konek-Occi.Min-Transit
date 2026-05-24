import { useState } from 'react';
import { Plus, Clock, Users, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface Panel2Props {
  isSuperAdmin: boolean;
}

export const Panel2 = ({ isSuperAdmin }: Panel2Props) => {
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const { bookings } = useAppStore();

  const trips = [
    { 
      id: 1, 
      route: "San Jose → Mamburao", 
      vehicle: "Toyota Hiace - NJK 4321", 
      departure: "07:45", 
      status: "On Trip", 
      booked: 14, 
      capacity: 18 
    },
    { 
      id: 2, 
      route: "Mamburao → Abra de Ilog", 
      vehicle: "Bus - ABV 7654", 
      departure: "09:30", 
      status: "Waiting", 
      booked: 22, 
      capacity: 45 
    },
    { 
      id: 3, 
      route: "Sablayan → San Jose", 
      vehicle: "Van - TRV 9988", 
      departure: "14:00", 
      status: "Scheduled", 
      booked: 7, 
      capacity: 15 
    },
  ];

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-primary">🚐 Van & Bus Operations</h2>
          <p className="text-gray-600">Land Transport Management</p>
        </div>
        {isSuperAdmin && (
          <button className="flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-2xl hover:bg-green-700 cursor-pointer transition-colors">
            <Plus size={20} /> Add New Trip
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass p-6 rounded-3xl">
          <p className="text-sm text-gray-500">Active Vehicles</p>
          <p className="text-4xl font-bold text-primary">23</p>
        </div>
        <div className="glass p-6 rounded-3xl">
          <p className="text-sm text-gray-500">Passengers Today</p>
          <p className="text-4xl font-bold">{bookings.length + 289}</p>
        </div>
        <div className="glass p-6 rounded-3xl">
          <p className="text-sm text-gray-500">On Time Rate</p>
          <p className="text-4xl font-bold text-green-600">91%</p>
        </div>
        <div className="glass p-6 rounded-3xl">
          <p className="text-sm text-gray-500">Delayed</p>
          <p className="text-4xl font-bold text-orange-500">2</p>
        </div>
      </div>

      {/* Trips List */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between">
          <h3 className="font-semibold text-lg text-gray-800">Today's Land Trips</h3>
          <span className="text-sm text-gray-500">{trips.length} scheduled</span>
        </div>

        <div className="divide-y divide-gray-100">
          {trips.map((trip) => (
            <div key={trip.id} className="p-6 hover:bg-gray-50 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1">
                  <p className="font-bold text-lg text-gray-800">{trip.route}</p>
                  <p className="text-gray-600">{trip.vehicle}</p>
                </div>

                <div className="flex flex-wrap items-center gap-8">
                  <div className="text-center">
                    <Clock className="mx-auto text-gray-400 mb-1" size={20} />
                    <p className="font-semibold">{trip.departure}</p>
                  </div>

                  <div className="text-center">
                    <Users className="mx-auto text-gray-400 mb-1" size={20} />
                    <p className="font-semibold">{trip.booked}/{trip.capacity}</p>
                    <p className="text-xs text-gray-500">seats</p>
                  </div>

                  <div className={`px-6 py-2 rounded-full text-sm font-medium ${
                    trip.status === 'On Trip' ? 'bg-blue-100 text-blue-700' :
                    trip.status === 'Waiting' ? 'bg-green-100 text-green-700' : 
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {trip.status}
                  </div>

                  <button 
                    onClick={() => setSelectedTrip(trip)}
                    className="bg-primary hover:bg-blue-800 transition-colors text-white px-7 py-3 rounded-2xl text-sm font-medium tap-target cursor-pointer shadow-sm"
                  >
                    Manage
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Super Admin Controls */}
      {isSuperAdmin && (
        <div className="bg-primary/5 border border-primary/30 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="text-primary" />
            <p className="font-semibold text-primary">Super Admin Controls</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="border border-primary text-primary px-6 py-3 rounded-2xl hover:bg-primary/10 transition-colors cursor-pointer tap-target">Broadcast Delay Alert</button>
            <button className="border border-primary text-primary px-6 py-3 rounded-2xl hover:bg-primary/10 transition-colors cursor-pointer tap-target">View All Bookings</button>
            <button className="border border-primary text-primary px-6 py-3 rounded-2xl hover:bg-primary/10 transition-colors cursor-pointer tap-target">Generate Report</button>
          </div>
        </div>
      )}
    </div>
  );
};
