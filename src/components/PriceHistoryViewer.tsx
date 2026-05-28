import React, { useState } from 'react';
import { SurfaceCard } from './ui';
import { History } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { usePriceHistory } from '../hooks/usePriceHistory';
import { DataErrorBoundary } from './common/DataErrorBoundary';

export const PriceHistoryViewer: React.FC = () => {
  const { ships, trips } = useApp();
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'ship' | 'trip'>('ship');

  const { data: history, loading, error } = usePriceHistory(selectedRouteId, selectedType);


  const handleSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setSelectedRouteId('');
      return;
    }
    const [type, id] = val.split('|');
    setSelectedType(type as 'ship' | 'trip');
    setSelectedRouteId(id);
  };

  return (
    <SurfaceCard className="p-8 mt-6">
      <DataErrorBoundary>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <History className="w-7 h-7 text-amber-400" />
            <h2 className="text-2xl font-bold text-slate-100">Price Change History</h2>
          </div>
        </div>

        <select 
          value={selectedRouteId ? `${selectedType}|${selectedRouteId}` : ''} 
          onChange={handleSelection}
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-6 text-slate-100"
        >
          <option value="">Select a route to view price history</option>
          <optgroup label="Sea Voyages">
            {ships.map((ship) => (
              <option key={`ship|${ship.id}`} value={`ship|${ship.id}`}>
                {ship.name} ({ship.route}) — ₱{ship.currentPrice || ship.basePrice} ({ship.pricingMode || 'manual'})
              </option>
            ))}
          </optgroup>
          <optgroup label="Land Shuttles">
            {trips.map((trip) => (
              <option key={`trip|${trip.id}`} value={`trip|${trip.id}`}>
                {trip.route} — ₱{trip.currentPrice || trip.basePrice} ({trip.pricingMode || 'manual'})
              </option>
            ))}
          </optgroup>
        </select>

        {selectedRouteId && (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {loading ? (
              <p className="text-slate-400">Loading history...</p>
            ) : history.length === 0 ? (
              <p className="text-slate-400 py-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                No price changes recorded for this route yet.
              </p>
            ) : (
              history.map((entry) => (
                <div key={entry.id} className="bg-slate-950/80 p-6 rounded-2xl border-l-4 border-amber-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xl font-semibold text-slate-200">
                        <span className="line-through text-slate-500 mr-2">₱{entry.previousPrice}</span>
                        <span className="text-emerald-400">₱{entry.newPrice}</span>
                      </p>
                      <p className="text-sm text-slate-400 mt-1">{entry.reason || 'No reason provided'}</p>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      {new Date(entry.changedAt).toLocaleString()}<br />
                      <span className="font-medium text-slate-400">by {entry.changedBy}</span>
                    </div>
                  </div>
                  {entry.multiplier && entry.multiplier !== 1 && (
                    <p className="text-xs text-purple-400 mt-3 font-medium bg-purple-500/10 px-2 py-1 rounded inline-block border border-purple-500/20">
                      Multiplier Applied: {entry.multiplier}x
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </DataErrorBoundary>
    </SurfaceCard>
  );
};
