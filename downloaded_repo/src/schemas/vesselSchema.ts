import { z } from 'zod';

export const vesselSchema = z.object({
  name: z.string().min(2),
  route: z.string(),
  capacity: z.number().min(1),
  available: z.number().min(0),
  type: z.enum(['RORO', 'Passenger Ferry', 'Van', 'Bus']),
  status: z.enum(['Scheduled', 'Boarding', 'Departed', 'Docked', 'Maintenance', 'Completed', 'Cancelled', 'Delayed'])
});

export type VesselInput = z.infer<typeof vesselSchema>;
