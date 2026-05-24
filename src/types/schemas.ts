import { z } from 'zod';

export const FerryBookingSchema = z.object({
  id: z.string(),
  shipId: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  contact: z.string().regex(/^09\d{9}$/, "Invalid Philippine mobile number"),
  type: z.enum(['Regular', 'Student', 'Senior', 'PWD']),
  status: z.enum(['Pending', 'Confirmed', 'Cancelled', 'Queued']),
  accountId: z.string().optional(),
});

export const VanBookingSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  name: z.string().min(2),
  contact: z.string().regex(/^09\d{9}$/),
  seats: z.number().min(1).max(20),
  pickup: z.string(),
  status: z.enum(['Pending', 'Confirmed', 'Cancelled', 'Queued']),
});

export const validateFerryBooking = (data: unknown) => FerryBookingSchema.parse(data);
export const validateVanBooking = (data: unknown) => VanBookingSchema.parse(data);
