import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../../core/api.client';
import { LOCATION_ID } from '../../core/config';
import { realtime } from '../../core/realtime.service';
import { type CartLine, useSession } from '../../core/session.store';
import { parseMoneyToCents } from '../../shared/utils/money';
import { type DinerOrder, type Menu, menuSchema, orderSchema } from './order.model';

/**
 * Cardápio público. O cliente não tem JWT, então a API não consegue deduzir a
 * marca sozinha — e, por segurança, ela recusa devolver cardápio sem escopo em
 * vez de entregar o de qualquer marca. Sem QR de mesa, o escopo vem da config
 * (`LOCATION_ID`); a vitrine de delivery continua passando o slug da marca.
 */
export function useMenu(scope?: { brandSlug?: string }) {
  const params = scope?.brandSlug ? { brand: scope.brandSlug } : { location: LOCATION_ID };
  return useQuery({
    queryKey: ['menu', params],
    queryFn: async () => {
      const { data } = await apiClient.get<Menu>('/menu', { params });
      return menuSchema.parse(data);
    },
  });
}

/**
 * Envia o carrinho: cria um pedido de balcão e dispara cada linha.
 *
 * `channel: 'counter'` é o pedido que o próprio cliente faz pelo app, sem mesa
 * e sem garçom. A API aceita este POST sem autenticação e, sem contexto de
 * tenant, atribui o pedido à unidade padrão — por isso não vai `tableId`.
 */
export function useSubmitOrder() {
  const { setOrderId, clearCart } = useSession.getState();
  return useMutation({
    mutationFn: async (lines: CartLine[]) => {
      // Nome e forma de pagamento vão junto na criação: o nome identifica a
      // conta no salão (sem mesa, não haveria como se referir ao pedido a não
      // ser pelo id), e `paymentIntent: 'account'` faz a API somar este pedido
      // à conta que a pessoa já tem aberta em vez de abrir outra.
      const {
        customerName,
        teamName,
        deliveryRoom,
        paymentChoice,
        cashNeedsChange,
        cashChangeFor,
      } = useSession.getState();
      const cashChangeForCents = parseMoneyToCents(cashChangeFor);
      const { data: order } = await apiClient.post<{ id: string }>('/orders', {
        channel: 'counter',
        customerName: customerName.trim() || undefined,
        teamName: teamName || undefined,
        deliveryRoom: deliveryRoom.trim() || undefined,
        paymentIntent: paymentChoice,
        cashNeedsChange: paymentChoice === 'cash' ? cashNeedsChange : undefined,
        cashChangeForCents:
          paymentChoice === 'cash' && cashNeedsChange ? (cashChangeForCents ?? undefined) : undefined,
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
