import React from 'react';
import PassengerPanelManager from './components/PassengerPanelManager';

interface Panel3Props {
  isSuperAdmin: boolean;
}

export const Panel3 = ({ isSuperAdmin }: Panel3Props) => {
  return <PassengerPanelManager isSuperAdmin={isSuperAdmin} />;
};
