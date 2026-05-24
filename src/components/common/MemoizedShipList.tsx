import React from 'react';
import { Ship } from '@/types';
import { Card } from '@/components/ui';

export const MemoizedShipList: React.FC<{ ships: Ship[] }> = React.memo(({ ships }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ships.map(ship => (
        <Card key={ship.id} title={ship.name} subtitle={ship.route}>
          <div className="text-sm space-y-1 mt-2">
            <p>Departure: {new Date(ship.depTime).toLocaleTimeString()}</p>
            <p>Status: {ship.status}</p>
            <p>Capacity: {ship.available} / {ship.capacity}</p>
          </div>
        </Card>
      ))}
    </div>
  );
});
MemoizedShipList.displayName = 'MemoizedShipList';
