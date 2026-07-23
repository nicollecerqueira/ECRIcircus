import { z } from 'zod';

export const menuSchema = z.object({
  categories: z
    .object({
      id: z.string(),
      name: z.string(),
      items: z
        .object({
          id: z.string(),
          name: z.string(),
          /** Preço de tabela (o "de"). */
          priceCents: z.number(),
          /** Preço que o cliente paga agora (o "por") — já considera promoção ativa. */
          effectivePriceCents: z.number(),
          onPromo: z.boolean(),
          available: z.boolean(),
          stationId: z.string(),
        })
        .array(),
    })
    .array(),
});
export type Menu = z.infer<typeof menuSchema>;

export const orderSchema = z.object({
  id: z.string(),
  status: z.string(),
  items: z
    .object({
      id: z.string(),
      name: z.string(),
      qty: z.number(),
      state: z.enum(['queued', 'preparing', 'ready', 'served', 'voided']),
    })
    .array(),
});
export type DinerOrder = z.infer<typeof orderSchema>;

export const STATE_LABEL: Record<string, string> = {
  queued: 'Na fila',
  preparing: 'Preparando 👨‍🍳',
  ready: 'Pronto ✓',
  served: 'Servido',
  voided: 'Cancelado',
};
