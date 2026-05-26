import { Ship, Trip } from '../types/dataTypes';

export const calculateDynamicPrice = (vehicle: Ship | Trip): number => {
  if (vehicle.pricingMode === 'manual') {
    return vehicle.currentPrice || vehicle.basePrice || 0;
  }

  let multiplier = 1.0;
  const now = new Date();
  const departureTime = 'depTime' in vehicle ? vehicle.depTime : new Date().toISOString(); 
  // Wait, depTime is a string, assuming it's parsable or ISO format
  const departure = new Date(departureTime); 
  const currentHour = now.getHours();
  // We can use current date for dayOfWeek
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

  const rules = vehicle.autoRules || {
    peakHours: ["07:00-10:00", "16:00-19:00"],
    weekendMultiplier: 1.25,
    lowSeatThreshold: 0.3,
    lowSeatMultiplier: 1.35,
  };

  // 1. Time-based Peak Hour Surge
  const peakHours = rules.peakHours || [];
  const isPeakHour = peakHours.some((range: string) => {
    const parts = range.split('-');
    if (parts.length === 2) {
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      if (!isNaN(start) && !isNaN(end)) {
        return currentHour >= start && currentHour < end;
      }
    }
    return false;
  });

  if (isPeakHour) {
    multiplier *= 1.25;
  }

  // 2. Weekend Surge
  const weekendMult = rules.weekendMultiplier || 1.25;
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    multiplier *= weekendMult;
  }

  // 3. Low Seat Demand Surge
  const lowSeatThreshold = rules.lowSeatThreshold || 0.3;
  const lowSeatMult = rules.lowSeatMultiplier || 1.35;
  
  const capacity = vehicle.capacity;
  const available = vehicle.available;
  const booked = capacity - available;
  const seatOccupancy = capacity > 0 ? booked / capacity : 0;

  if (seatOccupancy > (1 - lowSeatThreshold)) {
    multiplier *= lowSeatMult;
  }

  // Cap multiplier at 1.8x
  multiplier = Math.min(multiplier, 1.8);

  const base = vehicle.basePrice || ('type' in vehicle && vehicle.type === 'RORO' ? 500 : 200); // defaults
  const finalPrice = Math.round(base * multiplier);

  return finalPrice;
};
