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

export function useBoard() {
  return useQuery({
    queryKey: ['kds', 'board'],
    queryFn: async () => {
      const { data } = await apiClient.get<Board>('/kds/board');
      return boardSchema.parse(data);
    },
    // Rede de segurança para quando o socket cair. `InBackground` é essencial
    // aqui: por padrão o React Query PAUSA o refetch periódico com a janela
    // fora de foco, e a TV da cozinha nunca está em foco — sem isto, socket
    // caído significa painel congelado até alguém tocar na tela.
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });
}

export function useAdvanceItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, state }: { itemId: string; state: 'preparing' | 'ready' }) => {
      const { data } = await apiClient.patch(`/kds/items/${itemId}/state`, { state });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kds', 'board'] }),
  });
}
