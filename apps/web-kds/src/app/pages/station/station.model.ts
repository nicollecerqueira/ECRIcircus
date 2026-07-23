import { z } from 'zod';

export const stationSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
});
export type Station = z.infer<typeof stationSchema>;

export const ticketSchema = z.object({
  orderId: z.string(),
  tableId: z.string().optional(),
  channel: z.string(),
  itemId: z.string(),
  name: z.string(),
  qty: z.number(),
  notes: z.string().optional(),
  state: z.enum(['queued', 'preparing']),
  firedAt: z.string(),
});
export type Ticket = z.infer<typeof ticketSchema>;

export const boardSchema = z.object({
  stationId: z.string(),
  tickets: ticketSchema.array(),
});
export type Board = z.infer<typeof boardSchema>;
