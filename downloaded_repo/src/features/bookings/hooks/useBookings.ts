import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../api/client';
import { FerryBooking, VanBooking } from '../../../types/booking';

export function useBookings() {
  const queryClient = useQueryClient();

  const ferryBookings = useQuery({
    queryKey: ['ferryBookings'],
    queryFn: () => api<FerryBooking[]>('/api/bookings/ferry'),
  });

  const vanBookings = useQuery({
    queryKey: ['vanBookings'],
    queryFn: () => api<VanBooking[]>('/api/bookings/van'),
  });

  const createFerryBooking = useMutation({
    mutationFn: (newBooking: Omit<FerryBooking, 'id'>) => 
        api<FerryBooking>('/api/bookings/ferry', {
        method: 'POST',
        body: JSON.stringify(newBooking),
    }),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['ferryBookings'] });
    }
  });

  return { ferryBookings, vanBookings, createFerryBooking };
}
