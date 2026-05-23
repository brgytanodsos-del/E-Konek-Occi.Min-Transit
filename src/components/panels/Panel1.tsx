import { useState } from 'react';
import { Plus, AlertTriangle, Users } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface Panel1Props { isSuperAdmin: boolean; }

export const Panel1 = ({ isSuperAdmin }: Panel1Props) => {
  const [showNewTrip, setShowNewTrip] = useState(false);
  const { bookings } = useAppStore();

  const vessels = [
    { id: 1, name: "MV Maria Gloria", route: "San Jose → Batangas", departure: "08:30", status: "On Time", seatsLeft: 45, booked: 78 },
    { id: 2, name: "MV Occidental", route: "Mamburao → Batangas", departure: "10:15", status: "Delayed", seatsLeft: 12, booked: 65 },
    { id: 3, name: "MV Lady of Grace", route: "Sablayan → Batangas", departure: "13:00", status: "Boarding", seatsLeft: 8, booked: 95 },
  ];

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-primary">🚢 Montenegro Shipping</h2>
          <p className="text-gray-600">Ferry Operations & Ticketing</p>
        </div>
        <button 
          onClick={() => setShowNewTrip(true)}
          className="flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-2xl hover:bg-green-700 cursor-pointer transition-colors"
        >
          <Plus size={20} /> New Schedule
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass p-6 rounded-3xl">
          <p className="text-sm text-gray-500">Today’s Trips</p>
          <p className="text-4xl font-bold">14</p>
        </div>
        <div className="glass p-6 rounded-3xl">
          <p className="text-sm text-gray-500">Total Booked</p>
          <p className="text-4xl font-bold text-accent">{bookings.length + 234}</p>
        </div>
        <div className="glass p-6 rounded-3xl">
          <p className="text-sm text-gray-500">On Time Rate</p>
          <p className="text-4xl font-bold text-green-600">89%</p>
        </div>
        <div className="glass p-6 rounded-3xl">
          <p className="text-sm text-gray-500">Delayed</p>
          <p className="text-4xl font-bold text-orange-500">2</p>
        </div>
      </div>

      {/* Vessels */}
      <div className="space-y-4">
        {vessels.map(v => (
          <div key={v.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="flex-1">
                <h3 className="font-bold text-xl">{v.name}</h3>
                <p className="text-gray-600">{v.route}</p>
              </div>
              <div className="flex flex-wrap items-center gap-10">
                <div>
                  <p className="text-sm text-gray-500">Departure</p>
                  <p className="font-semibold text-lg">{v.departure}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className={`font-medium ${v.status === 'Delayed' ? 'text-orange-500' : 'text-green-600'}`}>{v.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Seats Left</p>
                  <p className="font-bold text-lg">{v.seatsLeft}</p>
                </div>
                <button className="bg-primary hover:bg-blue-800 text-white px-8 py-3 rounded-2xl transition-colors cursor-pointer tap-target">Manage</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isSuperAdmin && (
        <div className="bg-amber-50 border border-amber-300 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="text-amber-500" />
            <p className="font-semibold text-amber-900">Super Admin Controls</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="border border-amber-400 text-amber-700 px-6 py-3 rounded-2xl hover:bg-amber-100 transition-colors tap-target cursor-pointer">Broadcast Alert</button>
            <button className="border border-amber-400 text-amber-700 px-6 py-3 rounded-2xl hover:bg-amber-100 transition-colors tap-target cursor-pointer">View Full Manifest</button>
          </div>
        </div>
      )}
    </div>
  );
};
