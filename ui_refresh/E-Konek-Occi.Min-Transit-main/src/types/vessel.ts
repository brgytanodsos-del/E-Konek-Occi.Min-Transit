export type VesselStatus = 'Scheduled' | 'Boarding' | 'Departed' | 'Docked' | 'Maintenance' | 'Completed' | 'Cancelled' | 'Delayed';

export interface Vessel {
  id: string;
  name: string;
  route: string;
  depTime: string;
  arrTime?: string;
  capacity: number;
  available: number;
  type: 'RORO' | 'Passenger Ferry' | 'Van' | 'Bus';
  status: VesselStatus;
}
