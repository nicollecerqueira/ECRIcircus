import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../core/api.client';
import { type Board, boardSchema, type Station, stationSchema } from './station.model';

export function useStations() {
  return useQuery({
    queryKey: ['kds', 'stations'],
    queryFn: async () => {
      const { data } = await apiClient.get<Station[]>('/kds/stations');
      return stationSchema.array().parse(data);
    },
  });
}

export function useBoard(stationId: string) {
  return useQuery({
    queryKey: ['kds', stationId],
    queryFn: async () => {
      const { data } = await apiClient.get<Board>(`/kds/stations/${stationId}/board`);
      return boardSchema.parse(data);
    },
    // Socket events drive updates; this is a slow safety-net refetch.
    refetchInterval: 30000,
  });
}

export function useAdvanceItem(stationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, state }: { itemId: string; state: 'preparing' | 'ready' }) => {
      const { data } = await apiClient.patch(`/kds/items/${itemId}/state`, { state });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kds', stationId] }),
  });
}
