import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../core/api.client';
import { type Table, tableSchema } from './floor.model';

// Data-access service for the floor feature: exposes React Query hooks.
export function useTables() {
  return useQuery({
    queryKey: ['floor'],
    queryFn: async () => {
      const { data } = await apiClient.get<Table[]>('/tables');
      return tableSchema.array().parse(data);
    },
    refetchInterval: 15000,
  });
}

export function useOpenSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tableId: string) => {
      const { data } = await apiClient.post<{ id: string }>('/sessions', { tableId });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['floor'] }),
  });
}

export function useCloseSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tableId: string) => {
      const { data } = await apiClient.post(`/sessions/${tableId}/close`, {});
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['floor'] }),
  });
}
