import { z } from 'zod';

/** Texto opcional da API: ausente OU `null` (coluna anulável) viram `undefined`. */
const optionalText = z
  .string()
  .nullish()
  .transform((v) => v ?? undefined);

export const stationSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
});
export type Station = z.infer<typeof stationSchema>;

export const ticketSchema = z.object({
  orderId: z.string(),
  tableId: optionalText,
  /** Rótulo humano já resolvido pelo servidor (ex.: "Mesa 3"). */
  tableLabel: optionalText,
  channel: z.string(),
  itemId: z.string(),
  name: z.string(),
  qty: z.number(),
  notes: optionalText,
  state: z.enum(['queued', 'preparing']),
  firedAt: z.string(),
});
export type Ticket = z.infer<typeof ticketSchema>;

export const boardSchema = z.object({
  stationId: z.string(),
  tickets: ticketSchema.array(),
});
export type Board = z.infer<typeof boardSchema>;
