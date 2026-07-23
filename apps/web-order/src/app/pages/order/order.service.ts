import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../../core/api.client';
import { realtime } from '../../core/realtime.service';
import { type CartLine, useSession } from '../../core/session.store';
import { type DinerOrder, type Menu, menuSchema, orderSchema } from './order.model';

/**
 * Cardápio público. O diner não tem JWT, então a API não consegue deduzir a
 * marca sozinha — e, por segurança, ela recusa devolver cardápio sem escopo em
 * vez de devolver o de todo mundo. Por isso passamos a unidade (após ler o QR)
 * ou o slug da marca (storefront de delivery).
 */
export function useMenu(scope: { locationId?: string | null; brandSlug?: string }) {
  const params = scope.locationId
    ? { location: scope.locationId }
    : scope.brandSlug
      ? { brand: scope.brandSlug }
      : undefined;
  return useQuery({
    queryKey: ['menu', params],
    enabled: !!params,
    queryFn: async () => {
      const { data } = await apiClient.get<Menu>('/menu', { params });
      return menuSchema.parse(data);
    },
  });
}

/** Resolve a scanned QR token → open/attach the table session (public). */
export function useResolveQr() {
  const setSession = useSession((s) => s.setSession);
  return useMutation({
    mutationFn: async (qrToken: string) => {
      const { data } = await apiClient.post<{
        dinerToken: string;
        sessionId: string;
        tableId: string;
        locationId: string;
      }>('/diner-sessions', { qrToken });
      return data;
    },
    onSuccess: (data) => setSession(data),
  });
}

/** Submit the cart: create a qr-channel order, then fire each line. */
export function useSubmitOrder() {
  const { tableId, setOrderId, clearCart } = useSession.getState();
  return useMutation({
    mutationFn: async (lines: CartLine[]) => {
      const { data: order } = await apiClient.post<{ id: string }>('/orders', {
        channel: 'qr',
        tableId: tableId ?? undefined,
      });
      for (const line of lines) {
        await apiClient.post(`/orders/${order.id}/items`, {
          menuItemId: line.menuItemId,
          qty: line.qty,
          notes: line.notes,
        });
      }
      return order;
    },
    onSuccess: (order) => {
      setOrderId(order.id);
      clearCart();
      realtime().followOrder(order.id);
    },
  });
}

export function useDinerOrder(orderId: string | null) {
  return useQuery({
    queryKey: ['order', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data } = await apiClient.get<DinerOrder>(`/orders/${orderId}`);
      return orderSchema.parse(data);
    },
  });
}
