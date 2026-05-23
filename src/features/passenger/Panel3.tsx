import { useState, useEffect } from 'react';
import { MapPin, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'sonner';

interface Panel3Props { isSuperAdmin: boolean; }

export const Panel3 = ({ isSuperAdmin }: Panel3Props) => {
  const [vanPosition, setVanPosition] = useState<[number, number]>([12.45, 121.10]); // Mamburao area

  // Simulate real-time GPS movement for Mamburao Grand Terminal vans
  useEffect(() => {
    const interval = setInterval(() => {
      setVanPosition(prev => [
        prev[0] + (Math.random() - 0.5) * 0.005,
        prev[1] + (Math.random() - 0.5) * 0.005
      ]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const trips = [
    { id: 1, type: "Ferry", route: "San Jose → Batangas", time: "08:30", price: 850, status: "Available" },
    { id: 2, type: "Van", route: "Mamburao Grand Terminal → Abra de Ilog", time: "09:15", price: 280, status: "On Trip" },
  ];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-[#003087]">👤 Passenger Portal</h2>
        <p className="text-gray-600">Real-time Tracking • Mamburao Grand Terminal</p>
      </div>

      <div className="rounded-3xl overflow-hidden shadow-xl border">
        <div className="bg-[#003087] text-white p-4 flex items-center gap-3">
          <MapPin className="animate-pulse" />
          <div>
            <p className="font-semibold">LIVE GPS TRACKING</p>
            <p className="text-sm opacity-90">Mamburao Grand Terminal Vans</p>
          </div>
        </div>
        
        <MapContainer center={[12.45, 121.10]} zoom={13} style={{ height: '420px', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={vanPosition}>
            <Popup>
              <strong>Van NJK-4321</strong><br />
              Mamburao Grand Terminal → Abra de Ilog<br />
              Speed: 45 km/h • On Trip
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      <div>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Users /> Available Trips
        </h3>
        {trips.map(trip => (
          <div key={trip.id} className="bg-white p-6 rounded-3xl shadow-sm mb-4 border flex justify-between items-center">
            <div>
              <p className="font-bold text-lg">{trip.route}</p>
              <p className="text-sm text-gray-500">Departure: {trip.time}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-[#003087]">₱{trip.price}</p>
              <button
                onClick={() => toast.info("Booking functionality would open here.")}
                className="mt-3 bg-[#00A651] hover:bg-green-700 text-white px-8 py-3 rounded-2xl"
              >
                Book Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
