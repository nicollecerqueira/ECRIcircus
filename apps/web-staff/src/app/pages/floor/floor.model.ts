import { z } from 'zod';

/**
 * Mesa. Sobrevive apenas como LEITURA: a operação não trabalha mais por mesa
 * (a conta é da pessoa), mas pedidos criados antes da mudança ainda carregam
 * `tableId`, e o caixa precisa do número para rotulá-los.
 *
 * Os rótulos e cores de status saíram junto com o mapa de mesas — nada mais
 * desenha o estado de uma mesa na tela.
 */
export const tableSchema = z.object({
  id: z.string(),
  number: z.number(),
  seats: z.number(),
  status: z.enum(['open', 'occupied', 'dirty']),
  sessionId: z.string().optional(),
  qrToken: z.string(),
});
export type Table = z.infer<typeof tableSchema>;
