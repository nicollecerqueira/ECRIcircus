import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../core/api.client';
import { type Order, orderSchema } from '../order/order.model';

// A leitura da lista de pedidos vive em `order.service.ts` (Order é o agregado
// raiz); o caixa a consome de lá para compartilhar a mesma chave de cache.

export function useRequestPayment(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<Order>(`/orders/${orderId}/request-payment`, {});
      return orderSchema.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order', orderId] }),
  });
}

export function useRegisterPayment(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { method: string; amountCents: number; note?: string }) => {
      const { data } = await apiClient.post(`/orders/${orderId}/payments`, input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order', orderId] }),
  });
}

export function useCloseOrder(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post(`/orders/${orderId}/close`, {});
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['floor'] });
    },
  });
}

export function useSplitEvenly(orderId: string, parts: number) {
  return useQuery({
    queryKey: ['split', orderId, parts],
    enabled: parts > 0,
    queryFn: async () => {
      const { data } = await apiClient.get<{ totalCents: number; parts: number; shares: number[] }>(
        `/orders/${orderId}/payments/split?parts=${parts}`,
      );
      return data;
    },
  });
}
