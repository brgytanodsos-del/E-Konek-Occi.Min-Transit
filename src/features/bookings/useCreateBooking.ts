import { useMutation, useQueryClient } from '@tanstack/react-query';
import { offlineQueue } from '../../lib/offlineQueue';
import { useSyncStore } from '../../context/syncStore';
import { toast } from 'sonner';

// Sample mock user for demonstration
const currentUser = {
  uid: 'user-123',
  role: 'passenger',
};

export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  const { isOnline } = useSyncStore();

  return useMutation({
    mutationFn: async (data: any) => {
      if (!isOnline) {
        await offlineQueue.add({
          type: 'booking',
          collection: 'bookings',
          payload: { ...data, status: 'pending' },
          userId: currentUser.uid,
          role: currentUser.role,
        });
        return { queued: true };
      }
      // Normal online Firebase call would go here
      return { queued: false };
    },
    onSuccess: (_, variables, context: any) => {
      toast.success(isOnline ? "Booking confirmed" : "Booking queued");
      // queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });
};
