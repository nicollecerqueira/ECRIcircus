import { Injectable } from '@nestjs/common';
import { STATIONS } from '../../stub/seed';
import { OrderService } from '../order/order.service';

// Kitchen (KDS) context. Listens for fired items (via the order read model) and
// drives per-item cook state. State transitions are applied on the Order aggregate.
@Injectable()
export class KitchenService {
  constructor(private readonly orders: OrderService) {}

  stations() {
    return STATIONS.map(({ id, name, kind }) => ({ id, name, kind }));
  }

  /** Board for one station: items still to cook, oldest first (for color aging). */
  board(stationId: string) {
    const tickets = this.orders
      .list()
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
    return { stationId, tickets };
  }

  advance(itemId: string, next: 'preparing' | 'ready') {
    return this.orders.markItemState(itemId, next);
  }
}
