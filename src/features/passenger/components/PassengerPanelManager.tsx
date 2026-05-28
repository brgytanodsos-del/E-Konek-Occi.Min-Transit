// src/features/passenger/components/PassengerPanelManager.tsx
import React from 'react';
import { usePassengerPanel } from '../hooks/usePassengerPanel';
import PassengerPanelView from './PassengerPanelView';
import { DataErrorBoundary } from '../../../components/common/DataErrorBoundary';

interface PassengerPanelManagerProps {
  isSuperAdmin?: boolean;
}

export default function PassengerPanelManager({ isSuperAdmin = false }: PassengerPanelManagerProps) {
  const panelData = usePassengerPanel();

  return (
    <DataErrorBoundary>
      <PassengerPanelView 
        {...panelData} 
        isSuperAdmin={isSuperAdmin}
      />
    </DataErrorBoundary>
  );
}
