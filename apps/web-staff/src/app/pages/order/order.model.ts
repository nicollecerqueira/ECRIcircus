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
  /** Nome de quem pediu — é o que dá nome à conta, já que não há mesa. */
  customerName: optionalText,
  /** Equipe da pessoa (ARCO-ÍRIS, BANDINHA, …). */
  teamName: optionalText,
  /** Sala onde a pessoa está — destino da entrega. */
  deliveryRoom: optionalText,
  /** Forma de pagamento declarada pelo cliente no app. */
  paymentIntent: z.enum(['pix', 'cash', 'card', 'account']).optional(),
  /** Em dinheiro, informa se o cliente pediu troco. */
  cashNeedsChange: z
    .boolean()
    .nullish()
    .transform((v) => v ?? undefined),
  /** Valor para o qual o cliente precisa de troco, em centavos. */
  cashChangeForCents: z
    .number()
    .nullish()
    .transform((v) => v ?? undefined),
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
  isCombo: z.boolean().default(false),
  comboItems: optionalText,
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

/** Status da conta em português — o que vai no selo das telas. */
export const ORDER_STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho',
  open: 'Aberta',
  in_kitchen: 'Na cozinha',
  ready: 'Pronta',
  served: 'Servida',
  awaiting_payment: 'Aguardando pagamento',
  partially_paid: 'Paga em parte',
  paid: 'Paga',
  closed: 'Fechada',
  cancelled: 'Cancelada',
};

/** Nunca devolve vazio: a linha da equipe some se a conta não tiver uma, e uma
    conta sem equipe visível parece conta sem equipe cadastrada. */
export function teamLabel(order: Pick<Order, 'teamName'>): string {
  return order.teamName?.trim() || 'Equipe não informada';
}

/** Destino da entrega. Também nunca vazio — quem leva precisa saber que a
    informação FALTA, e não achar que a linha simplesmente não existe. */
export function roomLabel(order: Pick<Order, 'deliveryRoom'>): string {
  return order.deliveryRoom?.trim() || 'Sala não informada';
}

export const PAYMENT_INTENT_LABEL: Record<string, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  card: 'Cartão',
  account: 'Na conta',
};

/** Pedido que o cliente deixou para acertar depois — não se cobra no ato. */
export function isOnAccount(order: Pick<Order, 'paymentIntent'>): boolean {
  return order.paymentIntent === 'account';
}

/**
 * Como a conta se chama na tela: "Nicolle Cerqueira", o nome e mais nada.
 *
 * Sem mesa, a conta é da PESSOA — o nome vem do que o cliente digitou no app ou
 * do que o balcão informou ao abrir. Sem o prefixo "Conta": a tela já se chama
 * "Contas abertas" e cada cartão é visivelmente uma conta, então repeti-lo em
 * toda linha só roubava largura de quem identifica de fato, que é o nome.
 *
 * O rótulo vive aqui, e não em cada tela, para o salão, o caixa e o detalhe do
 * pedido chamarem a mesma conta pelo mesmo nome.
 *
 * A conta SEM nome mantém o "Conta": sozinho, "#a1b2c3d4" não se lê como nada —
 * ali a palavra é o que torna o id legível, e é o único identificador que o
 * balcão tem para casar a conta com quem está esperando.
 */
export function accountLabel(order: Pick<Order, 'id' | 'customerName'>): string {
  const name = order.customerName?.trim();
  return name ? name : `Conta #${order.id.slice(0, 8)}`;
}

export function orderTotalCents(order: Order): number {
  return order.items
    .filter((i) => i.state !== 'voided')
    .reduce((sum, i) => sum + i.unitPriceCents * i.qty, 0);
}
