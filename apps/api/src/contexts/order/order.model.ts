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

export type OrderChannel = 'waiter' | 'qr' | 'pos' | 'delivery';

export type PaymentMethod = 'cash' | 'card' | 'pix' | 'voucher' | 'other';

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
