import { z } from 'zod';

export const tableSchema = z.object({
  id: z.string(),
  number: z.number(),
  seats: z.number(),
  status: z.enum(['open', 'occupied', 'dirty']),
  sessionId: z.string().optional(),
  qrToken: z.string(),
});
export type Table = z.infer<typeof tableSchema>;

export const STATUS_LABEL: Record<Table['status'], string> = {
  open: 'Livre',
  occupied: 'Ocupada',
  dirty: 'A limpar',
};

/**
 * Cor = atenção. Mesa livre é o estado de repouso: fica neutra e some do campo
 * visual. O grafite da marca marca a mesa OCUPADA (a que tem trabalho em curso)
 * e o dourado marca a que precisa de ação (limpar). Não usamos verde `success`
 * aqui — verde nesta UI significa "item pronto", e só isso.
 */
export const STATUS_TONE: Record<Table['status'], string> = {
  open: 'neutral',
  occupied: 'primary',
  dirty: 'accent',
};
