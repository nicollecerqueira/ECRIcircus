import { z } from 'zod';

/**
 * Texto opcional vindo da API. Aceita ausente E `null`: coluna anulável no
 * Postgres chega como `null`, e `z.string().optional()` rejeita null — o parse
 * falharia no objeto inteiro e a tela ficaria vazia sem erro visível.
 */
const optionalText = z
  .string()
  .nullish()
  .transform((v) => v ?? undefined);

export const itemStateSchema = z.enum(['queued', 'preparing', 'ready', 'served', 'voided']);
export type ItemState = z.infer<typeof itemStateSchema>;

export const orderItemSchema = z.object({
  id: z.string(),
  menuItemId: z.string(),
  name: z.string(),
  unitPriceCents: z.number(),
  qty: z.number(),
  stationId: z.string(),
  state: itemStateSchema,
  notes: optionalText,
  voidReason: optionalText,
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderSchema = z.object({
  id: z.string(),
  channel: z.enum(['waiter', 'qr', 'pos', 'delivery', 'counter']),
  tableId: optionalText,
  status: z.string(),
  items: orderItemSchema.array(),
  payments: z.object({ id: z.string(), method: z.string(), amountCents: z.number() }).array(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Order = z.infer<typeof orderSchema>;

export const menuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Preço de tabela (o "de"). */
  priceCents: z.number(),
  /** Preço que o cliente paga agora (o "por") — já considera promoção ativa. */
  effectivePriceCents: z.number(),
  promoPriceCents: z.number().nullable(),
  promoStartsAt: z.string().nullable(),
  promoEndsAt: z.string().nullable(),
  onPromo: z.boolean(),
  available: z.boolean(),
  stationId: z.string(),
  categoryId: z.string().optional(),
});
export type MenuItem = z.infer<typeof menuItemSchema>;

export const menuSchema = z.object({
  categories: z
    .object({
      id: z.string(),
      name: z.string(),
      items: menuItemSchema.array(),
    })
    .array(),
});
export type Menu = z.infer<typeof menuSchema>;

export const ITEM_STATE_LABEL: Record<ItemState, string> = {
  queued: 'Na fila',
  preparing: 'Preparando',
  ready: 'Pronto',
  served: 'Servido',
  voided: 'Cancelado',
};

/** `ready` é o único verde: é o estado que exige ação do garçom. `served` já foi
 *  resolvido, então volta a ser neutro em vez de disputar atenção com ele. */
export const ITEM_STATE_TONE: Record<ItemState, string> = {
  queued: 'neutral',
  preparing: 'accent',
  ready: 'success',
  served: 'neutral',
  voided: 'danger',
};

/** Pedido ainda vivo: aparece no salão e no caixa até ser fechado ou cancelado. */
export function isActiveOrder(order: Pick<Order, 'status'>): boolean {
  return order.status !== 'closed' && order.status !== 'cancelled';
}

/** Aceita novos itens (já pago não aceita — a conta foi encerrada). */
export function acceptsItems(order: Pick<Order, 'status'>): boolean {
  return isActiveOrder(order) && order.status !== 'paid';
}

export function orderTotalCents(order: Order): number {
  return order.items
    .filter((i) => i.state !== 'voided')
    .reduce((sum, i) => sum + i.unitPriceCents * i.qty, 0);
}
