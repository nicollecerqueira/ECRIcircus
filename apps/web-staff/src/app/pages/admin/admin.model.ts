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
  isCombo: z.boolean(),
  comboItems: z.string().optional(),
  /** Marcado = ficha/crédito: entra na conta sem virar comanda na cozinha.
      O formulário pergunta pela NEGATIVA porque o normal é passar pela
      cozinha — a exceção é que merece um clique consciente. */
  semPreparo: z.boolean(),
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
  { id: 'st-lanches', name: 'Lanches' },
  { id: 'st-bebidas', name: 'Bebidas' },
  { id: 'st-doces', name: 'Doces' },
];
