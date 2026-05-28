import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui';
import { Badge } from '../../../components/ui';
import { usePriceHistory } from '../hooks/usePriceHistory';
import { DataErrorBoundary } from '../../../components/common/DataErrorBoundary';

interface Props {
  tripId: string;
}

export default function PriceHistoryViewer({ tripId }: Props) {
  const { data: history = [], isLoading, error } = usePriceHistory(tripId);

  return (
    <DataErrorBoundary>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Price History
            <Badge variant="outline">{history.length} changes</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading history...</div>
          ) : history.length === 0 ? (
            <p className="text-muted-foreground py-8">No price adjustments recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => (
                <div key={entry.id} className="flex justify-between items-center border-b pb-3 last:border-0">
                  <div>
                    <div className="font-semibold">₱{entry.price.toFixed(2)}</div>
                    {entry.reason && <div className="text-sm text-muted-foreground">{entry.reason}</div>}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {entry.changedAt.toLocaleDateString()}<br />
                    {entry.changedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DataErrorBoundary>
  );
}
