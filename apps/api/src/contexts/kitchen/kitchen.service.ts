import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { OrderService } from '../order/order.service';
import { SessionService } from '../table-session/session.service';
import { Station } from './domain/station.entity';

// Kitchen (KDS) context. Listens for fired items (via the order read model) and
// drives per-item cook state. State transitions are applied on the Order aggregate.
@Injectable()
export class KitchenService {
  constructor(
    private readonly em: EntityManager,
    private readonly orders: OrderService,
    private readonly sessions: SessionService,
  ) {}

  /** Estações da marca atual. Expõe `code` como `id`: é o identificador estável
   *  que cardápio, pedidos e salas do KDS já usam. */
  async stations() {
    const stations = await this.em.find(Station, {}, { orderBy: { sortOrder: 'asc' } });
    return stations.map((s) => ({ id: s.code, name: s.name, kind: s.kind }));
  }

  /** Board único da cozinha: pedidos com itens ainda a preparar, oldest first. */
  async board() {
    const orders = await this.orders.list();
    const tickets = orders
      .flatMap((order) =>
        order.items
          .filter((i) => i.state === 'queued' || i.state === 'preparing')
          .map((i) => ({
            orderId: order.id,
            tableId: order.tableId,
            channel: order.channel,
            // Quem entrega lê a comanda: sem nome e sala, o prato fica pronto
            // sem ninguém saber para onde levá-lo.
            customerName: order.customerName,
            deliveryRoom: order.deliveryRoom,
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
    const byOrder = new Map<string, (typeof withLabel)[number][]>();
    for (const ticket of withLabel) {
      byOrder.set(ticket.orderId, [...(byOrder.get(ticket.orderId) ?? []), ticket]);
    }

    return {
      orders: [...byOrder.entries()].map(([orderId, orderTickets]) => {
        const first = orderTickets[0];
        return {
          orderId,
          tableId: first.tableId,
          tableLabel: first.tableLabel,
          customerName: first.customerName,
          deliveryRoom: first.deliveryRoom,
          channel: first.channel,
          firedAt: first.firedAt,
          tickets: orderTickets,
        };
      }),
    };
  }

  advance(itemId: string, next: 'preparing' | 'ready') {
    return this.orders.markItemState(itemId, next);
  }
}
