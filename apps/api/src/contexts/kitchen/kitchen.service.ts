import { Injectable } from '@nestjs/common';
import { STATIONS } from '../../stub/seed';
import { OrderService } from '../order/order.service';
import { SessionService } from '../table-session/session.service';

// Kitchen (KDS) context. Listens for fired items (via the order read model) and
// drives per-item cook state. State transitions are applied on the Order aggregate.
@Injectable()
export class KitchenService {
  constructor(
    private readonly orders: OrderService,
    private readonly sessions: SessionService,
  ) {}

  stations() {
    return STATIONS.map(({ id, name, kind }) => ({ id, name, kind }));
  }

  /** Board for one station: items still to cook, oldest first (for color aging). */
  async board(stationId: string) {
    const orders = await this.orders.list();
    const tickets = orders
      .flatMap((order) =>
        order.items
          .filter(
            (i) => i.stationId === stationId && (i.state === 'queued' || i.state === 'preparing'),
          )
          .map((i) => ({
            orderId: order.id,
            tableId: order.tableId,
            channel: order.channel,
            itemId: i.id,
            name: i.name,
            qty: i.qty,
            notes: i.notes,
            state: i.state,
            firedAt: order.createdAt,
          })),
      )
      .sort((a, b) => a.firedAt.localeCompare(b.firedAt));

    // Rótulo humano da mesa resolvido aqui: o KDS não acessa /tables. O id é UUID.
    const tableIds = [...new Set(tickets.flatMap((t) => (t.tableId ? [t.tableId] : [])))];
    const numbers = await this.sessions.tableNumbers(tableIds);
    const withLabel = tickets.map((t) => ({
      ...t,
      tableLabel: t.tableId ? `Mesa ${numbers.get(t.tableId) ?? '?'}` : undefined,
    }));
    return { stationId, tickets: withLabel };
  }

  advance(itemId: string, next: 'preparing' | 'ready') {
    return this.orders.markItemState(itemId, next);
  }
}
