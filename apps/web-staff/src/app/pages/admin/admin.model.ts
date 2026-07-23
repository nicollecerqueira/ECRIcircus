import { z } from 'zod';

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number().optional(),
});
export type Category = z.infer<typeof categorySchema>;

export const menuItemFormSchema = z.object({
  name: z.string().min(2, 'Informe o nome do item'),
  // O usuário digita em reais; convertemos para centavos antes de enviar.
  price: z
    .string()
    .min(1, 'Informe o preço')
    .refine((v) => !Number.isNaN(Number(v.replace(',', '.'))), 'Preço inválido'),
  categoryId: z.string().min(1, 'Escolha uma categoria'),
  stationId: z.string().min(1, 'Escolha a estação'),
});
export type MenuItemForm = z.infer<typeof menuItemFormSchema>;

export function priceToCents(price: string): number {
  return Math.round(Number(price.replace(',', '.')) * 100);
}

/** Centavos -> string editável em reais ("3200" -> "32,00"). */
export function centsToPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

/**
 * Estações ainda são constantes: o contexto Kitchen só ganha tabela própria numa
 * fase posterior. Quando ganhar, isto vira um fetch de /kds/stations.
 */
export const STATIONS = [
  { id: 'st-grill', name: 'Grelha' },
  { id: 'st-bar', name: 'Bar' },
  { id: 'st-dessert', name: 'Sobremesas' },
];
