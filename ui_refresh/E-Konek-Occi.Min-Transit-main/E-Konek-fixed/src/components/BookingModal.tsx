import { useState } from 'react';
import { X } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripData: any;
  type: 'ferry' | 'van';
  onConfirm: (passengers: number, name: string) => void;
}

export const BookingModal = ({ isOpen, onClose, tripData, type, onConfirm }: BookingModalProps) => {
  const [passengerCount, setPassengerCount] = useState(1);
  const [passengerName, setPassengerName] = useState('');

  if (!isOpen || !tripData) return null;

  const totalPrice = type === 'ferry' 
    ? tripData.price * passengerCount * 1.1 
    : tripData.price * passengerCount;

  const handleBook = () => {
    if (!passengerName.trim()) {
      alert("Please enter a passenger name.");
      return;
    }
    onConfirm(passengerCount, passengerName);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="glass w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl bg-white border border-gray-200">
        <div className="flex justify-between items-center border-b p-6 bg-white">
          <h3 className="text-2xl font-bold text-primary">Book Ticket</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 tap-target cursor-pointer">
            <X size={28} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl">
            <p className="font-semibold text-lg text-gray-800">{tripData.route}</p>
            <p className="text-sm text-gray-500">Departure: {tripData.time}</p>
            <p className="text-2xl font-bold text-primary mt-2">₱{tripData.price}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Passenger Name</label>
            <input
              type="text"
              value={passengerName}
              onChange={(e) => setPassengerName(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent outline-none bg-white font-medium shadow-sm transition-all text-gray-800 tap-target"
              placeholder="Full Name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Number of Passengers</label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))}
                className="w-12 h-12 rounded-2xl bg-white border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 focus:outline-none transition-colors tap-target cursor-pointer flex items-center justify-center text-xl"
              >
                −
              </button>
              <span className="text-3xl font-bold w-12 text-center text-gray-800">{passengerCount}</span>
              <button
                onClick={() => setPassengerCount(passengerCount + 1)}
                className="w-12 h-12 rounded-2xl bg-white border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 focus:outline-none transition-colors tap-target cursor-pointer flex items-center justify-center text-xl"
              >
                +
              </button>
            </div>
          </div>

          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
            <div className="flex justify-between text-lg text-gray-800">
              <span className="font-medium">Total Amount</span>
              <span className="font-bold text-primary">₱{totalPrice.toFixed(2)}</span>
            </div>
            {type === 'ferry' && <p className="text-xs text-gray-500 mt-1">Inclusive of 10% terminal fee</p>}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 border border-gray-300 bg-white text-gray-700 rounded-2xl font-medium hover:bg-gray-50 transition-colors tap-target cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleBook}
            className="flex-1 bg-accent hover:bg-green-700 text-white py-4 rounded-2xl font-bold transition-colors tap-target cursor-pointer shadow-md"
          >
            Confirm Booking
          </button>
        </div>
      </div>
    </div>
  );
};
