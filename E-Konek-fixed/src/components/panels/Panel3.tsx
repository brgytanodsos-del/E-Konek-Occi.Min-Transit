import { useState, useContext } from 'react';
import { Search, MapPin, Bell } from 'lucide-react';
import { BookingModal } from '../BookingModal';
import { useAppStore } from '../../store/useAppStore';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AppContext } from '../../context/AppContext';

interface Panel3Props {
  isSuperAdmin?: boolean;
}

export const Panel3 = ({ isSuperAdmin }: Panel3Props) => {
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { addBooking, bookings } = useAppStore();

  const availableTrips = [
    { id: 1, type: "Ferry", route: "San Jose → Batangas", time: "08:30", price: 850, status: "Available" },
    { id: 2, type: "Van", route: "San Jose → Mamburao", time: "09:15", price: 320, status: "Filling Fast" },
    { id: 3, type: "Ferry", route: "Mamburao → Batangas", time: "11:45", price: 920, status: "Available" },
  ];

  const handleBook = (trip: any) => {
    setSelectedTrip(trip);
    setModalOpen(true);
  };

  const confirmBooking = (passengers: number, name: string) => {
    const newBooking = {
      id: Date.now().toString(),
      route: selectedTrip.route,
      type: selectedTrip.type.toLowerCase() as 'ferry' | 'van',
      price: selectedTrip.price,
      passengers,
      date: new Date().toISOString(),
    };
    addBooking(newBooking);
    alert(`✅ Booking Successful for ${name}!`);
    setModalOpen(false);
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto pb-20">
      <div>
        <h2 className="text-3xl font-bold text-primary">👤 Passenger Portal</h2>
        <p className="text-gray-600 font-medium">Book • Track • Travel with Confidence</p>
      </div>

      {/* Search */}
      <div className="glass p-6 rounded-3xl bg-white border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Search className="text-primary" />
          <h3 className="font-semibold text-gray-800">Search Your Trip</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="text" placeholder="From (San Jose)" className="px-5 py-4 rounded-2xl border border-gray-200 outline-none focus:ring-1 focus:ring-accent tap-target shadow-sm" />
          <input type="text" placeholder="To (Batangas)" className="px-5 py-4 rounded-2xl border border-gray-200 outline-none focus:ring-1 focus:ring-accent tap-target shadow-sm" />
          <button className="bg-accent hover:bg-green-700 text-white py-4 rounded-2xl font-bold shadow-md transition-all tap-target cursor-pointer">Search</button>
        </div>
      </div>

      {/* Live Alerts */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-5">
          <Bell className="text-orange-500" />
          <h3 className="font-semibold text-gray-800">Live Alerts</h3>
        </div>
        <div className="space-y-3 text-sm">
          <div className="p-4 bg-orange-50 border-l-4 border-orange-500 text-orange-900 rounded-r-2xl font-medium">MV Maria Gloria - 45 mins delay due to weather</div>
          <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-900 rounded-r-2xl font-medium">Van services from San Jose are on schedule</div>
        </div>
      </div>

      {/* Available Trips */}
      <div>
        <h3 className="font-semibold mb-4 text-gray-800 text-lg">Available Trips</h3>
        <div className="space-y-4">
          {availableTrips.map((trip) => (
            <div key={trip.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-4xl">{trip.type === "Ferry" ? "🚢" : "🚐"}</span>
                <div>
                  <p className="font-bold text-gray-800 text-lg">{trip.route}</p>
                  <p className="text-sm font-medium text-gray-500">Departs at {trip.time}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">₱{trip.price}</p>
                <button 
                  onClick={() => handleBook(trip)}
                  className="mt-3 bg-primary hover:bg-blue-800 transition-colors text-white px-8 py-3 rounded-2xl text-sm font-bold shadow-sm tap-target cursor-pointer"
                >
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Map */}
      <div className="rounded-3xl overflow-hidden shadow-sm border border-gray-200">
        <div className="bg-primary text-white p-4">
          <p className="font-bold flex items-center gap-2 tracking-wide">
            <MapPin /> Live Transit Map
          </p>
        </div>
        <MapContainer center={[12.35, 121.15]} zoom={10} style={{ height: '420px', width: '100%' }} className="z-10">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[12.35, 121.15]}>
            <Popup>San Jose Port • Ferry Terminal</Popup>
          </Marker>
          <Marker position={[13.75, 121.05]}>
            <Popup>Batangas Port • MV Maria Gloria (Delayed)</Popup>
          </Marker>
        </MapContainer>
      </div>

      {isSuperAdmin && (
        <div className="text-center text-xs font-medium text-gray-500 py-6 border-t border-gray-200">
          Super Admin Mode • You have full visibility across all roles
        </div>
      )}

      <BookingModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        tripData={selectedTrip} 
        type={selectedTrip?.type?.toLowerCase() || 'ferry'}
        onConfirm={confirmBooking}
      />
    </div>
  );
};