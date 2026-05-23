import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface Panel1Props { isSuperAdmin: boolean; }

export const Panel1 = ({ isSuperAdmin }: Panel1Props) => {
  const [vessels, setVessels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { ferryBookings } = useApp();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "vessels"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVessels(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const addNewVessel = async () => {
    try {
      await addDoc(collection(db, "vessels"), {
        name: "MV New Vessel",
        route: "San Jose → Batangas",
        departure: "15:00",
        status: "Scheduled",
        seatsLeft: 60,
        timestamp: new Date()
      });
      toast.success("New vessel added successfully");
    } catch (error) {
      toast.error("Failed to add vessel");
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-[#003087]">🚢 Montenegro Shipping</h2>
          <p className="text-gray-600">Real-time Ferry Operations</p>
        </div>
        {isSuperAdmin && (
          <button 
            onClick={addNewVessel}
            className="flex items-center gap-2 bg-[#00A651] text-white px-6 py-3 rounded-2xl hover:bg-green-700"
          >
            <Plus size={20} /> Add New Vessel
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border">
          <p className="text-sm text-gray-500">Active Vessels</p>
          <p className="text-4xl font-bold">{vessels.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border">
          <p className="text-sm text-gray-500">Total Bookings</p>
          <p className="text-4xl font-bold text-[#00A651]">{ferryBookings.length}</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p>Loading vessels...</p>
        ) : (
          vessels.map((v: any) => (
            <div key={v.id} className="bg-gray-50 rounded-3xl p-6 shadow-sm border">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-bold text-xl">{v.name}</h3>
                  <p className="text-gray-600">{v.route}</p>
                </div>
                <div className="flex gap-8">
                  <div>
                    <p className="text-sm text-gray-500">Departure</p>
                    <p className="font-semibold">{v.departure}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className={`font-medium ${v.status === 'Delayed' ? 'text-orange-500' : 'text-green-600'}`}>
                      {v.status}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
