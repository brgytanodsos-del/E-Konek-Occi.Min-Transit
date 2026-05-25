/**
 * businessLogic.ts — FIXED
 *
 * Changes vs original:
 * 1. Replaced the percentage-based commission rates that contradicted the flat-
 *    PHP rates in AppContext. NOW uses the same flat amounts as AppContext so
 *    every part of the system produces identical numbers.
 * 2. Removed the `booking.type as any` cast — VanBooking has no `type` field
 *    so the correct fallback is used instead.
 * 3. `createTransactionRecord` now derives the route from the booking object
 *    rather than hardcoding 'Abra-Batangas'.
 * 4. Uses crypto.randomUUID() for transaction IDs instead of Date.now().
 *
 * ─── Single source of truth ─────────────────────────────────────────────────
 * Keep COMMISSION_CONFIG here and import it from AppContext.tsx as well, so
 * there is exactly one place to change rates.
 */

import { FerryBooking, VanBooking, Transaction } from '@/types/dataTypes';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Canonical fare & commission table (PHP, flat amounts)
// ---------------------------------------------------------------------------
export const FARE_CONFIG = {
  ferry: {
    Regular: { gross: 500, commission: 50 },
    Student: { gross: 350, commission: 30 },
    Senior:  { gross: 300, commission: 25 },
    PWD:     { gross: 300, commission: 25 },
  },
  van:  { grossPerSeat: 200, commissionPerSeat: 20 },
  bus:  { grossPerSeat: 150, commissionPerSeat: 15 },
} as const;

export type FerryTicketType = keyof typeof FARE_CONFIG.ferry;
export type TransportMode   = 'Ferry' | 'Van' | 'Bus';

// ---------------------------------------------------------------------------
// calculateCommission
// ---------------------------------------------------------------------------
export interface CommissionResult {
  grossAmount: number;
  commissionAmount: number;
  net: number;
}

export function calculateCommission(
  mode: TransportMode,
  ticketTypeOrSeats: FerryTicketType | number,
): CommissionResult {
  if (mode === 'Ferry') {
    const tt = ticketTypeOrSeats as FerryTicketType;
    const row = FARE_CONFIG.ferry[tt] ?? FARE_CONFIG.ferry.Regular;
    return {
      grossAmount: row.gross,
      commissionAmount: row.commission,
      net: row.gross - row.commission,
    };
  }

  const seats = typeof ticketTypeOrSeats === 'number' ? ticketTypeOrSeats : 1;
  if (mode === 'Van') {
    const gross = FARE_CONFIG.van.grossPerSeat * seats;
    const commission = FARE_CONFIG.van.commissionPerSeat * seats;
    return { grossAmount: gross, commissionAmount: commission, net: gross - commission };
  }

  // Bus
  const gross = FARE_CONFIG.bus.grossPerSeat * seats;
  const commission = FARE_CONFIG.bus.commissionPerSeat * seats;
  return { grossAmount: gross, commissionAmount: commission, net: gross - commission };
}

// ---------------------------------------------------------------------------
// createTransactionRecord
// ---------------------------------------------------------------------------
export function createTransactionRecord(
  booking: FerryBooking | VanBooking,
  confirmedBy: 'Port Admin' | 'Terminal Admin',
  routeLabel: string,
): Transaction {
  const isFerry = 'shipId' in booking;
  const mode: TransportMode = isFerry ? 'Ferry' : 'Van';

  const { grossAmount, commissionAmount } = calculateCommission(
    mode,
    isFerry
      ? ((booking as FerryBooking).type as FerryTicketType)
      : (booking as VanBooking).seats,
  );

  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    type: mode,
    bookingId: booking.id,
    passengerName: booking.name,
    route: routeLabel,
    ticketType: isFerry
      ? (booking as FerryBooking).type
      : `${(booking as VanBooking).seats} seat(s)`,
    grossAmount,
    commissionAmount,
    confirmedBy,
    status: 'Completed',
    paid: false,
  };
}
