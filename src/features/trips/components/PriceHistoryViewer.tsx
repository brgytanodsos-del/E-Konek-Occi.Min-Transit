import { SurfaceCard } from '../../../components/ui';
import { usePriceHistory } from '../hooks/usePriceHistory';
import { DataErrorBoundary } from '../../../components/common/DataErrorBoundary';

interface Props {
  tripId: string;
}

export default function PriceHistoryViewer({ tripId }: Props) {
  const { data: history = [], loading, error } = usePriceHistory(tripId);

  return (
    <DataErrorBoundary>
      <SurfaceCard>
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Price History</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 bg-slate-50">{history.length} changes</span>
          </div>
        </div>
        <div>
          {loading ? (
            <div className="py-8 text-center text-slate-400 font-medium">Loading history...</div>
          ) : history.length === 0 ? (
            <p className="text-slate-400 font-medium py-8">No price adjustments recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => (
                <div key={entry.id} className="flex justify-between items-center border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div>
                    <div className="font-bold text-slate-800">₱{entry.price.toFixed(2)}</div>
                    {entry.reason && <div className="text-sm text-slate-500 font-medium">{entry.reason}</div>}
                  </div>
                  <div className="text-right text-xs text-slate-400 font-bold tracking-wider">
                    {entry.changedAt.toLocaleDateString()}<br />
                    {entry.changedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SurfaceCard>
    </DataErrorBoundary>
  );
}
