import { FerryBooking, VanBooking, Transaction } from '@/types';

export const calculateCommission = (
  type: 'Ferry' | 'Van',
  baseAmount: number,
  passengerType: 'Regular' | 'Student' | 'Senior' | 'PWD'
) => {
  const rates = {
    Ferry: { Regular: 0.12, Student: 0.08, Senior: 0.06, PWD: 0.05 },
    Van: { Regular: 0.10, Student: 0.07, Senior: 0.05, PWD: 0.04 }
  };

  const rate = rates[type][passengerType];
  const commission = Math.round(baseAmount * rate * 100) / 100;

  return { commission, net: baseAmount - commission };
};

export const createTransactionRecord = (
  booking: FerryBooking | VanBooking,
  grossAmount: number,
  confirmedBy: string
): Transaction => {
  const type = 'shipId' in booking ? 'Ferry' : 'Van';
  const { commission } = calculateCommission(
    type as 'Ferry' | 'Van',
    grossAmount,
    booking.type as any
  );

  return {
    id: `tx_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: type as 'Ferry' | 'Van',
    bookingId: booking.id,
    passengerName: booking.name,
    route: 'shipId' in booking ? 'Abra-Batangas' : 'Mamburao Route',
    ticketType: booking.type,
    grossAmount,
    commissionAmount: commission,
    confirmedBy: confirmedBy as any,
    status: 'Completed',
    paid: true
  };
};
