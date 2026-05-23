import { useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';

interface Panel1Props { isSuperAdmin?: boolean; }

export const Panel1 = ({ isSuperAdmin }: Panel1Props) => {
  const [showBookingModal, setShowBookingModal] = useState(false);

  const vessels = [
    { id: 1, name: "MV Maria Gloria", route: "San Jose → Batangas", departure: "08:30", status: "On Time", seats: 45 },
    { id: 2, name: "MV Occidental", route: "Mamburao → Batangas", departure: "10:15", status: "Delayed", seats: 12 },
  ];

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-primary">🚢 Montenegro Shipping</h2>
          <p className="text-gray-600">Ferry Ticketing & Operations</p>
        </div>
        {isSuperAdmin && (
          <button 
            onClick={() => setShowBookingModal(true)}
            className="flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-2xl hover:bg-green-700 cursor-pointer"
          >
            <Plus size={20} /> New Trip
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Trips", value: "12", color: "text-primary" },
          { label: "Passengers", value: "1,284", color: "" },
          { label: "On Time", value: "87%", color: "text-green-600" },
          { label: "Alerts", value: "3", color: "text-warning" },
        ].map((stat, i) => (
          <div key={i} className="glass p-6 rounded-3xl">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-4xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Vessel Cards */}
      <div className="space-y-4">
        {vessels.map(v => (
          <div key={v.id} className="bg-white rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center gap-6 border border-gray-100">
            <div className="flex-1">
              <h3 className="font-bold text-lg">{v.name}</h3>
              <p className="text-gray-600">{v.route}</p>
            </div>
            <div className="flex flex-wrap items-center gap-8">
              <div>
                <p className="text-sm text-gray-500">Departure</p>
                <p className="font-semibold">{v.departure}</p>
              </div>
              <div>
                <p className={`font-medium ${v.status === 'Delayed' ? 'text-orange-500' : 'text-green-600'}`}>
                  {v.status}
                </p>
                <p className="text-sm text-gray-500">{v.seats} seats left</p>
              </div>
              <button className="bg-primary hover:bg-blue-800 text-white px-8 py-3 rounded-2xl transition-colors cursor-pointer">Manage</button>
            </div>
          </div>
        ))}
      </div>

      {isSuperAdmin && (
        <div className="bg-orange-50 border border-orange-200 p-6 rounded-3xl flex items-center gap-4">
          <AlertTriangle className="text-orange-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-orange-900">Super Admin Mode Active</p>
            <p className="text-sm text-orange-700">You can create, edit, and cancel trips across all operators.</p>
          </div>
        </div>
      )}
    </div>
  );
};
