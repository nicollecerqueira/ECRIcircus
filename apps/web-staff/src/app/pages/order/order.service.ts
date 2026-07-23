import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../core/api.client';
import { realtime } from '../../core/realtime.service';
import { type Menu, menuSchema, type Order, orderSchema } from './order.model';

export function useMenu() {
  return useQuery({
    queryKey: ['menu'],
    queryFn: async () => {
      const { data } = await apiClient.get<Menu>('/menu');
      return menuSchema.parse(data);
    },
  });
}

/**
 * Lista de pedidos da location. Vive aqui (feature `order`) porque Order é o
 * agregado raiz — salão e caixa consomem esta mesma leitura, sob a mesma
 * chave de cache, em vez de cada um buscar por conta própria.
 */
export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data } = await apiClient.get<Order[]>('/orders');
      return orderSchema.array().parse(data);
    },
    refetchInterval: 15000,
  });
}

export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ['order', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data } = await apiClient.get<Order>(`/orders/${orderId}`);
      return orderSchema.parse(data);
    },
  });
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: async (input: { channel: Order['channel']; tableId?: string }) => {
      const { data } = await apiClient.post<Order>('/orders', input);
      return orderSchema.parse(data);
    },
    onSuccess: (order) => realtime().subscribe('order', order.id),
  });
}

export function useAddItem(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { menuItemId: string; qty: number; notes?: string }) => {
      // Fires item.fired on the server → KDS picks it up via socket.
      const { data } = await apiClient.post<Order>(`/orders/${orderId}/items`, input);
      return orderSchema.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order', orderId] }),
  });
}

export function useVoidItem(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, reason }: { itemId: string; reason: string }) => {
      const { data } = await apiClient.patch<Order>(`/orders/${orderId}/items/${itemId}/void`, {
        reason,
      });
      return orderSchema.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order', orderId] }),
  });
}
