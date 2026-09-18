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
