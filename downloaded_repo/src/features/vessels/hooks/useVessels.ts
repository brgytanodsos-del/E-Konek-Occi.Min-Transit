import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api/client';
import { Vessel } from '../../../types/vessel';

export function useVessels() {
  return useQuery({
    queryKey: ['vessels'],
    queryFn: () => api<Vessel[]>('/api/ships'),
  });
}
