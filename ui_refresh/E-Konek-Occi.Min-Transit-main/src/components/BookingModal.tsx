import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Ticket, UserRound, X } from 'lucide-react';

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
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPassengerCount(1);
      setPassengerName('');
      setError('');
    }
  }, [isOpen, tripData]);

  const totalPrice = useMemo(
    () => (type === 'ferry' ? tripData?.price * passengerCount * 1.1 : tripData?.price * passengerCount),
    [type, tripData, passengerCount],
  );

  if (!isOpen || !tripData) return null;

  const handleBook = () => {
    if (!passengerName.trim()) {
      setError('Please enter the passenger name before confirming the booking.');
      return;
    }
    setError('');
    onConfirm(passengerCount, passengerName.trim());
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
      <div className="glass-panel w-full max-w-xl overflow-hidden rounded-[30px] border border-white/60 bg-white/90 shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-gradient-to-r from-[rgba(12,45,87,0.96)] to-[rgba(15,69,102,0.96)] px-6 py-5 text-white sm:px-7">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/85">
              <Ticket size={14} />
              {type === 'ferry' ? 'Ferry reservation' : 'Land transit reservation'}
            </div>
            <div>
              <h3 className="text-2xl font-bold">Review your trip details</h3>
              <p className="mt-1 text-sm text-white/75">Confirm the passenger name and seat count before continuing.</p>
            </div>
          </div>
          <button onClick={onClose} className="tap-target rounded-2xl border border-white/12 bg-white/10 p-3 text-white/80 transition hover:bg-white/18 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 sm:px-7 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-5">
            <div className="surface-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Route</p>
                  <p className="mt-2 text-lg font-bold text-slate-950">{tripData.route}</p>
                  <p className="mt-1 text-sm text-slate-500">Departure {tripData.time}</p>
                </div>
                <div className="rounded-2xl bg-[rgba(15,139,102,0.1)] px-4 py-3 text-right text-[#0f8b66]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Base fare</p>
                  <p className="mt-1 text-2xl font-extrabold">₱{tripData.price}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Passenger name</label>
                <div className="relative">
                  <UserRound size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    className="form-control pl-11"
                    placeholder="Full legal name"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Passenger count</label>
                <div className="surface-card flex items-center justify-between gap-4 p-4">
                  <button
                    onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))}
                    className="tap-target flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                  >
                    <Minus size={18} />
                  </button>
                  <div className="text-center">
                    <p className="text-3xl font-extrabold text-slate-950">{passengerCount}</p>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">seat{passengerCount > 1 ? 's' : ''}</p>
                  </div>
                  <button
                    onClick={() => setPassengerCount(passengerCount + 1)}
                    className="tap-target flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="surface-card flex flex-col justify-between p-5">
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Booking summary</p>
                <h4 className="mt-2 text-xl font-bold text-slate-950">Ready for confirmation</h4>
              </div>
              <div className="space-y-3 rounded-[22px] bg-slate-50/80 p-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Travel type</span>
                  <span className="font-semibold text-slate-900">{type === 'ferry' ? 'Ferry voyage' : 'Van / bus trip'}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Passengers</span>
                  <span className="font-semibold text-slate-900">{passengerCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Passenger name</span>
                  <span className="max-w-[55%] truncate text-right font-semibold text-slate-900">{passengerName || 'Waiting for input'}</span>
                </div>
                {type === 'ferry' && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                    Total includes the 10% terminal fee applied to ferry transactions.
                  </div>
                )}
              </div>
              {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</p>}
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-[22px] bg-[rgba(12,45,87,0.06)] px-4 py-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Total amount</span>
                  <span className="text-3xl font-extrabold tracking-tight text-[#0c2d57]">₱{totalPrice.toFixed(2)}</span>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button onClick={onClose} className="btn-ghost tap-target">
                  Cancel
                </button>
                <button onClick={handleBook} className="btn-primary tap-target">
                  Confirm booking
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
