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

  /**
   * Board único da cozinha.
   *
   * Inclui o que está PRONTO, e não só o que falta preparar: antes o pedido
   * sumia da tela no instante em que o último item ficava pronto, e a cozinha
   * perdia de vista justamente o que alguém ainda tem de ir buscar e entregar.
   * Ele sai da tela quando a conta é fechada ou cancelada no caixa — aí sim
   * acabou.
   *
   * `served` fica de fora: é o estado das fichas, que não passam pela cozinha.
   */
  async board() {
    const orders = (await this.orders.list()).filter(
      (o) => o.status !== 'closed' && o.status !== 'cancelled',
    );
    const tickets = orders
      .flatMap((order) =>
        order.items
          .filter((i) => i.state === 'queued' || i.state === 'preparing' || i.state === 'ready')
          .map((i) => ({
            orderId: order.id,
            tableId: order.tableId,
            channel: order.channel,
            // Quem entrega lê a comanda: sem nome e sala, o prato fica pronto
            // sem ninguém saber para onde levá-lo.
            customerName: order.customerName,
            // A sala do ITEM (capturada no lançamento) manda; a da conta é só
            // reserva para itens antigos, anteriores a essa captura.
            deliveryRoom: i.deliveryRoom ?? order.deliveryRoom,
            itemId: i.id,
            name: i.name,
            qty: i.qty,
            notes: i.notes,
            state: i.state,
            // O instante do ITEM, não o da conta: é a idade DESTE pedido que a
            // cozinha precisa ver, não há quanto tempo a pessoa abriu a conta.
            firedAt: i.createdAt,
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

    const lotes = this.agruparEmPedidos(withLabel);
    return {
      orders: lotes.map((loteTickets, i) => {
        const first = loteTickets[0];
        return {
          // Chave do LOTE, não da conta: a mesma conta rende vários boxes.
          batchId: `${first.orderId}:${first.firedAt}:${i}`,
          orderId: first.orderId,
          tableId: first.tableId,
          tableLabel: first.tableLabel,
          customerName: first.customerName,
          deliveryRoom: first.deliveryRoom,
          channel: first.channel,
          firedAt: first.firedAt,
          tickets: loteTickets,
        };
      }),
    };
  }

  /**
   * Quebra os itens de cada conta em PEDIDOS distintos — um box por vez que a
   * pessoa pediu, e não um box gigante com tudo que ela consumiu no evento.
   *
   * Não existe "id do pedido" no banco: a conta é uma só e cada item entra por
   * uma chamada separada. O que separa um pedido do outro é o intervalo — os
   * itens de um mesmo carrinho entram em sequência, em segundos; o pedido
   * seguinte vem minutos depois. Uma troca de sala também abre lote novo, ainda
   * que colada no tempo: destino diferente é entrega diferente.
   */
  private agruparEmPedidos<T extends { orderId: string; firedAt: string; deliveryRoom?: string }>(
    tickets: T[],
  ): T[][] {
    /** Silêncio que encerra um pedido. Acima disto, o próximo item é outro. */
    const INTERVALO_MS = 90_000;
    const lotes: T[][] = [];

    for (const conta of new Set(tickets.map((t) => t.orderId))) {
      const daConta = tickets.filter((t) => t.orderId === conta);
      let atual: T[] = [];
      for (const ticket of daConta) {
        const anterior = atual.at(-1);
        const distante =
          anterior !== undefined &&
          new Date(ticket.firedAt).getTime() - new Date(anterior.firedAt).getTime() > INTERVALO_MS;
        const outraSala = anterior !== undefined && anterior.deliveryRoom !== ticket.deliveryRoom;
        if (anterior !== undefined && (distante || outraSala)) {
          lotes.push(atual);
          atual = [];
        }
        atual.push(ticket);
      }
      if (atual.length > 0) {
        lotes.push(atual);
      }
    }
    return lotes.sort((a, b) => a[0].firedAt.localeCompare(b[0].firedAt));
  }

  advance(itemId: string, next: 'preparing' | 'ready') {
    return this.orders.markItemState(itemId, next);
  }
}
