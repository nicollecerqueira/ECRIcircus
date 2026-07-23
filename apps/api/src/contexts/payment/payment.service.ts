import { Injectable } from '@nestjs/common';
import { orderTotalCents, type PaymentMethod, paidCents } from '../order/order.model';
import { OrderService } from '../order/order.service';

// Payment context (v1: registration only — no gateway, no fiscal). Extends the
// Order aggregate through its addPayment method; gateway/fiscal are future ports.
@Injectable()
export class PaymentService {
  constructor(private readonly orders: OrderService) {}

  register(orderId: string, input: { method: PaymentMethod; amountCents: number; note?: string }) {
    const order = this.orders.addPayment(orderId, input);
    const total = orderTotalCents(order);
    const paid = paidCents(order);
    return { order, totalCents: total, paidCents: paid, remainingCents: total - paid };
  }

  /** Even split preview (total ÷ N), remainder distributed to the first shares. */
  splitEvenly(orderId: string, parts: number) {
    const order = this.orders.get(orderId);
    const total = orderTotalCents(order);
    const base = Math.floor(total / parts);
    const remainder = total - base * parts;
    const shares = Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
    return { totalCents: total, parts, shares };
  }

  /** Non-fiscal receipt payload. Explicitly NOT a tax document. */
  receipt(orderId: string) {
    const order = this.orders.get(orderId);
    return {
      fiscal: false,
      orderId: order.id,
      tableId: order.tableId,
      items: order.items
        .filter((i) => i.state !== 'voided')
        .map((i) => ({ name: i.name, qty: i.qty, unitPriceCents: i.unitPriceCents })),
      totalCents: orderTotalCents(order),
      payments: order.payments.map((p) => ({ method: p.method, amountCents: p.amountCents })),
      issuedAt: new Date().toISOString(),
    };
  }
}
