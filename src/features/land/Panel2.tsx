import { useState, useEffect } from 'react';
import { Plus, Clock, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface Panel2Props { isSuperAdmin: boolean; }

export const Panel2 = ({ isSuperAdmin }: Panel2Props) => {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { vanBookings } = useApp();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "land_trips"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTrips(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addNewTrip = async () => {
    try {
      await addDoc(collection(db, "land_trips"), {
        route: "Mamburao Grand Terminal → Abra de Ilog",
        vehicle: "Van - NJK 4321",
        departure: "10:30",
        status: "Scheduled",
        booked: 5,
        capacity: 18,
        timestamp: new Date()
      });
      toast.success("New land trip added");
    } catch (error) {
      toast.error("Failed to add trip");
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-[#003087]">🚐 Van & Bus Operations</h2>
          <p className="text-gray-600">Real-time Land Transport</p>
        </div>
        {isSuperAdmin && (
          <button 
            onClick={addNewTrip}
            className="flex items-center gap-2 bg-[#00A651] text-white px-6 py-3 rounded-2xl hover:bg-green-700"
          >
            <Plus size={20} /> New Land Trip
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border">
          <p className="text-sm text-gray-500">Active Vehicles</p>
          <p className="text-4xl font-bold">{trips.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border">
          <p className="text-sm text-gray-500">Passengers Today</p>
          <p className="text-4xl font-bold text-[#00A651]">{vanBookings.length + 156}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="font-semibold">Land Transport Trips</h3>
        </div>
        {loading ? <p className="p-6">Loading trips...</p> : (
          <div className="divide-y">
            {trips.map((trip: any) => (
              <div key={trip.id} className="p-6 flex flex-col md:flex-row justify-between gap-6">
                <div>
                  <p className="font-bold">{trip.route}</p>
                  <p className="text-gray-600">{trip.vehicle}</p>
                </div>
                <div className="flex items-center gap-8">
                  <div>
                    <Clock className="text-gray-400" />
                    <p className="font-medium">{trip.departure}</p>
                  </div>
                  <div>
                    <Users className="text-gray-400" />
                    <p className="font-medium">{trip.booked}/{trip.capacity}</p>
                  </div>
                  <div className={`px-6 py-2 rounded-full text-sm ${trip.status === 'On Trip' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {trip.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
