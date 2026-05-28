import React from 'react';
import { useTripManagement } from '../hooks/useTripManagement';
import TripManagementView from './TripManagementView';
import { DataErrorBoundary } from '../../../components/common/DataErrorBoundary';

export default function TripManagementManager() {
  const tripData = useTripManagement();

  return (
    <DataErrorBoundary>
      <TripManagementView {...tripData} />
    </DataErrorBoundary>
  );
}
