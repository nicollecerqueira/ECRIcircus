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

/**
 * Baixa o relatório de vendas.
 *
 * Não dá para usar um `<a href>` simples: a rota exige o JWT, que vive só na
 * memória do app e não vai num clique de link. Então busca-se pelo apiClient
 * (que injeta o token), e o arquivo é entregue ao navegador por um link
 * temporário criado na hora.
 */
export function useDownloadSalesReport() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.get<Blob>('/reports/sales.csv', { responseType: 'blob' });
      return data;
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Data no nome: o relatório é tirado mais de uma vez (meio do evento, fim),
      // e três arquivos "vendas.csv" na pasta de downloads não se distinguem.
      link.download = `vendas-ecri-circus-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      // Revogar no mesmo instante do clique cancela o download em alguns
      // navegadores — a URL precisa sobreviver até o download começar.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
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
