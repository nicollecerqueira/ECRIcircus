/** Order + item state machines (business-rules.md). Money is integer cents. */

export type OrderStatus =
  | 'draft'
  | 'open'
  | 'in_kitchen'
  | 'ready'
  | 'served'
  | 'awaiting_payment'
  | 'partially_paid'
  | 'paid'
  | 'closed'
  | 'cancelled';

export type ItemState = 'queued' | 'preparing' | 'ready' | 'served' | 'voided';

/**
 * `counter` = pedido feito pelo próprio cliente no app, sem mesa e sem garçom
 * (o fluxo do ECRI Circus). Difere de `pos`, que é o caixa lançando pelo
 * balcão, e de `qr`, que exige sessão de mesa.
 */
export type OrderChannel = 'waiter' | 'qr' | 'pos' | 'delivery' | 'counter';

export type PaymentMethod = 'cash' | 'card' | 'pix';

/**
 * Forma de pagamento DECLARADA pelo cliente no app — intenção, não pagamento.
 * Quem registra o pagamento de fato é o caixa (`Payment`).
 *
 * `account` ("colocar na conta") é a única que não se resolve no balcão na hora:
 * o pedido fica em aberto na conta da pessoa até o acerto.
 */
export type PaymentIntent = 'pix' | 'cash' | 'card' | 'account';

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  unitPriceCents: number;
  qty: number;
  stationId: string;
  state: ItemState;
  notes?: string;
  voidReason?: string;
  /** Instante do lançamento. É por ele que a cozinha separa um pedido do outro. */
  createdAt: string;
}

export interface Payment {
  id: string;
  method: PaymentMethod;
  amountCents: number;
  note?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  tenantId: string;
  locationId: string;
  channel: OrderChannel;
  tableId?: string;
  /** Nome de quem fez o pedido — identifica a conta quando não há mesa. */
  customerName?: string;
  /** Equipe a que a pessoa pertence. */
  teamName?: string;
  /** Como o cliente declarou que vai pagar (ver `PaymentIntent`). */
  paymentIntent?: PaymentIntent;
  /** Em dinheiro, informa se o cliente pediu troco. */
  cashNeedsChange?: boolean;
  /** Valor para o qual o cliente precisa de troco, em centavos. */
  cashChangeForCents?: number;
  status: OrderStatus;
  items: OrderItem[];
  payments: Payment[];
  createdAt: string;
  updatedAt: string;
}

export function orderTotalCents(order: Order): number {
  return order.items
    .filter((i) => i.state !== 'voided')
    .reduce((sum, i) => sum + i.unitPriceCents * i.qty, 0);
}

export function paidCents(order: Order): number {
  return order.payments.reduce((sum, p) => sum + p.amountCents, 0);
}
