export type ConflictStrategy = 'last-write-wins' | 'admin-override' | 'manual-review' | 'business-rule';

export interface ConflictContext {
  localData: any;
  serverData: any;
  operationType: string;
  userRole: string;
}

export const resolveConflict = (context: ConflictContext): any => {
  const { localData, serverData, userRole, operationType } = context;

  // Strategy 1: Super Admin always wins
  if (userRole === 'superadmin') return localData;

  // Strategy 2: Booking conflicts - protect seat inventory
  if (operationType === 'booking') {
    if (serverData.status === 'booked' && localData.status === 'pending') {
      throw new Error('Seat already taken - please choose another');
    }
  }

  // Strategy 3: Timestamp-based (with role weighting)
  const localTime = localData.updatedAt?.seconds || 0;
  const serverTime = serverData.updatedAt?.seconds || 0;

  if (localTime > serverTime) return localData;
  return serverData;
};
