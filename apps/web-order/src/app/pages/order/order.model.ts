import { z } from 'zod';

const optionalText = z
  .string()
  .nullish()
  .transform((v) => v ?? undefined);

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
          isCombo: z.boolean().default(false),
          comboItems: optionalText,
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
  customerName: optionalText,
  teamName: optionalText,
  deliveryRoom: optionalText,
  paymentIntent: z.enum(['pix', 'cash', 'card', 'account']).optional(),
  cashNeedsChange: z.boolean().nullish().transform((v) => v ?? undefined),
  cashChangeForCents: z.number().nullish().transform((v) => v ?? undefined),
  status: z.string(),
  items: z
    .object({
      id: z.string(),
      name: z.string(),
      qty: z.number(),
      /** Preço congelado no lançamento — é dele que sai o total do relatório. */
      unitPriceCents: z.number(),
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
