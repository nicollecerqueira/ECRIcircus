import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from '../../common/events/domain-events';
import { effectivePriceCents } from '../catalog/domain/pricing';
import { currentTenantOrNull } from '../../common/tenant/tenant-context';
import { DEMO_LOCATION_ID, DEMO_TENANT_ID } from '../../stub/seed';
import { CatalogService } from '../catalog/catalog.service';
import {
  type ItemState,
  type Order,
  type OrderChannel,
  orderTotalCents,
  type PaymentMethod,
  paidCents,
} from './order.model';

// Order is the aggregate root of the core loop. Kitchen and Payment react to its
// events and call back into it; they never mutate order state directly elsewhere.
@Injectable()
export class OrderService {
  private orders = new Map<string, Order>();

  constructor(
    private readonly catalog: CatalogService,
    private readonly events: EventEmitter2,
  ) {}

  private scope() {
    const ctx = currentTenantOrNull();
    return {
      tenantId: ctx?.tenantId ?? DEMO_TENANT_ID,
      locationId: ctx?.locationId ?? DEMO_LOCATION_ID,
    };
  }

  list(): Order[] {
    const { locationId } = this.scope();
    return [...this.orders.values()].filter((o) => o.locationId === locationId);
  }

  get(id: string): Order {
    const order = this.orders.get(id);
    if (!order) {
      throw new NotFoundException(`Pedido ${id} não encontrado`);
    }
    return order;
  }

  /** Pedido de uma mesa que ainda aceita itens (não pago, não fechado). */
  findOpenByTable(tableId: string): Order | undefined {
    const { locationId } = this.scope();
    return [...this.orders.values()].find(
      (o) =>
        o.tableId === tableId &&
        o.locationId === locationId &&
        o.status !== 'paid' &&
        o.status !== 'closed' &&
        o.status !== 'cancelled',
    );
  }

  create(input: { channel: OrderChannel; tableId?: string }): Order {
    // UMA conta aberta por mesa. Garçom, cliente no QR e POS têm de cair todos no
    // MESMO pedido (business-rules.md: "os itens do QR entram no pedido que o
    // garçom vê"). Sem isto, cada chamada abriria outro pedido e a conta da mesa
    // se dividiria em silêncio — o caixa veria várias contas para a mesma mesa.
    if (input.tableId) {
      const existing = this.findOpenByTable(input.tableId);
      if (existing) {
        return existing;
      }
    }

    const { tenantId, locationId } = this.scope();
    const now = new Date().toISOString();
    const order: Order = {
      id: randomUUID(),
      tenantId,
      locationId,
      channel: input.channel,
      tableId: input.tableId,
      status: 'open',
      items: [],
      payments: [],
      createdAt: now,
      updatedAt: now,
    };
    this.orders.set(order.id, order);
    return order;
  }

  // Assíncrono desde a Fase 2: o cardápio agora vem do Postgres, não da memória.
  async addItem(
    orderId: string,
    input: { menuItemId: string; qty: number; notes?: string },
  ): Promise<Order> {
    const order = this.get(orderId);
    // Escopa pelo tenant DO PEDIDO: esta rota também serve o cliente do QR, que
    // não tem JWT nem contexto de tenant na requisição.
    const menuItem = await this.catalog.findItemForTenant(order.tenantId, input.menuItemId);
    if (!menuItem) {
      throw new NotFoundException(`Item ${input.menuItemId} não existe no cardápio`);
    }
    if (!menuItem.available) {
      throw new BadRequestException(`${menuItem.name} está indisponível`);
    }
    const item = {
      id: randomUUID(),
      menuItemId: menuItem.id,
      name: menuItem.name,
      // Congela o preço EFETIVO (promocional, se houver) no momento do lançamento:
      // encerrar a promoção depois não reescreve contas já abertas.
      unitPriceCents: effectivePriceCents(menuItem),
      qty: input.qty,
      stationId: menuItem.stationId,
      state: 'queued' as ItemState,
      notes: input.notes,
    };
    order.items.push(item);
    // First fired item moves the order into the kitchen.
    if (order.status === 'open') {
      order.status = 'in_kitchen';
    }
    this.touch(order);

    this.events.emit(DomainEvent.ItemFired, {
      tenantId: order.tenantId,
      locationId: order.locationId,
      stationId: item.stationId,
      orderId: order.id,
      itemId: item.id,
      name: item.name,
      qty: item.qty,
      notes: item.notes,
    });
    this.emitUpdated(order);
    return order;
  }

  voidItem(orderId: string, itemId: string, reason: string): Order {
    const order = this.get(orderId);
    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Item não encontrado no pedido');
    }
    if (!reason) {
      throw new BadRequestException('Void exige um motivo (auditado)');
    }
    item.state = 'voided';
    item.voidReason = reason;
    this.recomputeReady(order);
    this.touch(order);
    this.emitUpdated(order);
    return order;
  }

  /** Called by the Kitchen context when a cook advances an item. */
  markItemState(itemId: string, next: 'preparing' | 'ready'): Order {
    const order = [...this.orders.values()].find((o) => o.items.some((i) => i.id === itemId));
    if (!order) {
      throw new NotFoundException('Item não encontrado');
    }
    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Item não encontrado');
    }
    if (next === 'ready' && item.state !== 'preparing') {
      throw new BadRequestException('Um item não pode ficar "ready" antes de "preparing"');
    }
    item.state = next;
    this.recomputeReady(order);
    this.touch(order);

    const evt = next === 'preparing' ? DomainEvent.ItemPreparing : DomainEvent.ItemReady;
    this.events.emit(evt, {
      tenantId: order.tenantId,
      locationId: order.locationId,
      stationId: item.stationId,
      orderId: order.id,
      itemId: item.id,
    });
    this.emitUpdated(order);
    return order;
  }

  requestPayment(orderId: string): Order {
    const order = this.get(orderId);
    order.status = 'awaiting_payment';
    this.touch(order);
    this.emitUpdated(order);
    return order;
  }

  addPayment(
    orderId: string,
    input: { method: PaymentMethod; amountCents: number; note?: string },
  ): Order {
    const order = this.get(orderId);
    if (order.status !== 'awaiting_payment' && order.status !== 'partially_paid') {
      throw new BadRequestException('Pedido não está aguardando pagamento');
    }
    const total = orderTotalCents(order);
    const already = paidCents(order);
    if (already + input.amountCents > total) {
      throw new BadRequestException(
        'Pagamento excede o total (troco não é registrado como pagamento)',
      );
    }
    order.payments.push({
      id: randomUUID(),
      method: input.method,
      amountCents: input.amountCents,
      note: input.note,
      createdAt: new Date().toISOString(),
    });
    if (paidCents(order) === total) {
      order.status = 'paid';
      this.touch(order);
      this.events.emit(DomainEvent.OrderPaid, {
        tenantId: order.tenantId,
        locationId: order.locationId,
        orderId: order.id,
      });
    } else {
      order.status = 'partially_paid';
      this.touch(order);
    }
    this.emitUpdated(order);
    return order;
  }

  close(orderId: string): Order {
    const order = this.get(orderId);
    if (order.status !== 'paid') {
      throw new BadRequestException('Só é possível fechar um pedido pago');
    }
    order.status = 'closed';
    this.touch(order);
    this.emitUpdated(order);
    return order;
  }

  private recomputeReady(order: Order) {
    const active = order.items.filter((i) => i.state !== 'voided');
    if (active.length > 0 && active.every((i) => i.state === 'ready' || i.state === 'served')) {
      if (order.status === 'in_kitchen') {
        order.status = 'ready';
      }
    }
  }

  private touch(order: Order) {
    order.updatedAt = new Date().toISOString();
  }

  private emitUpdated(order: Order) {
    this.events.emit(DomainEvent.OrderUpdated, {
      tenantId: order.tenantId,
      locationId: order.locationId,
      orderId: order.id,
      status: order.status,
    });
  }
}
