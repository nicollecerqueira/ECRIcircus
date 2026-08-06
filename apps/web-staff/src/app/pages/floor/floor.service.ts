import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../core/api.client';
import { type Table, tableSchema } from './floor.model';

/**
 * Leitura das mesas.
 *
 * Sobrou só isto do que era o serviço do salão: abrir e fechar sessão de mesa
 * saiu junto com a tela de mesas — a conta agora é da pessoa, não do lugar. O
 * que resta serve para rotular pedidos ANTIGOS, criados quando ainda havia
 * mesa, no caixa e na tela de pedido.
 */
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
