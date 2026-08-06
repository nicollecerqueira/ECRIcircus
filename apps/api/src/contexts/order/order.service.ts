import { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from '../../common/events/domain-events';
import { currentTenantOrNull } from '../../common/tenant/tenant-context';
import { DEMO_LOCATION_ID, DEMO_TENANT_ID } from '../../stub/seed';
import { CatalogService } from '../catalog/catalog.service';
import { effectivePriceCents } from '../catalog/domain/pricing';
import { Brand } from '../tenancy/domain/brand.entity';
import { Location } from '../tenancy/domain/location.entity';
import { Order as OrderEntity } from './domain/order.entity';
import { OrderItem as OrderItemEntity } from './domain/order-item.entity';
import { Payment as PaymentEntity } from './domain/payment.entity';
import type { Order, OrderChannel, PaymentIntent, PaymentMethod } from './order.model';

export interface CreateOrderInput {
  channel: OrderChannel;
  tableId?: string;
  customerName?: string;
  teamName?: string;
  deliveryRoom?: string;
  paymentIntent?: PaymentIntent;
  cashNeedsChange?: boolean;
  cashChangeForCents?: number;
}

/**
 * Entidade → view (o formato plano que Cozinha, Pagamento e os fronts consomem).
 *
 * Todo campo opcional passa por `?? undefined`: colunas anuláveis voltam do
 * MikroORM como `null`, e `null` sai no JSON como `null` — mas o contrato aqui
 * (e os schemas Zod dos fronts) declara `campo?: string`, que é `undefined`.
 * Sem a normalização o front rejeita a resposta inteira no parse e a tela fica
 * muda. `undefined` some do JSON.stringify, que é exatamente o que "opcional"
 * significa do outro lado.
 */
function toOrderView(o: OrderEntity): Order {
  return {
    id: o.id,
    tenantId: o.tenant.id,
    locationId: o.location.id,
    channel: o.channel,
    tableId: o.tableId ?? undefined,
    customerName: o.customerName ?? undefined,
    teamName: o.teamName ?? undefined,
    deliveryRoom: o.deliveryRoom ?? undefined,
    paymentIntent: o.paymentIntent ?? undefined,
    cashNeedsChange: o.cashNeedsChange ?? undefined,
    cashChangeForCents: o.cashChangeForCents ?? undefined,
    status: o.status,
    items: o.items
      .getItems()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((i) => ({
        id: i.id,
        menuItemId: i.menuItemId,
        name: i.name,
        unitPriceCents: i.unitPriceCents,
        qty: i.qty,
        stationId: i.stationId,
        state: i.state,
        notes: i.notes ?? undefined,
        voidReason: i.voidReason ?? undefined,
      })),
    payments: o.payments
      .getItems()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((p) => ({
        id: p.id,
        method: p.method,
        amountCents: p.amountCents,
        note: p.note ?? undefined,
        createdAt: p.createdAt.toISOString(),
      })),
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

// Order é o agregado raiz do loop. Kitchen e Payment reagem aos seus eventos e
// chamam de volta estes métodos; nunca mutam o estado do pedido em outro lugar.
@Injectable()
export class OrderService {
  constructor(
    private readonly em: EntityManager,
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

  /**
   * As rotas do QR são públicas (diner sem JWT, logo sem contexto de tenant). Só
   * aplicamos o filtro global quando HÁ contexto (staff): assim o staff continua
   * isolado por marca, e o diner acessa o próprio pedido pela posse do id (UUID
   * inadivinhável), sem o filtro fechar a consulta.
   */
  private accessFilters(): boolean {
    return currentTenantOrNull() !== undefined;
  }

  async list(): Promise<Order[]> {
    const { locationId } = this.scope();
    const orders = await this.em.find(
      OrderEntity,
      { location: locationId },
      { populate: ['items', 'payments'], orderBy: { createdAt: 'asc' } },
    );
    return orders.map(toOrderView);
  }

  async get(id: string): Promise<Order> {
    return toOrderView(await this.getEntity(id));
  }

  create(input: CreateOrderInput): Promise<Order> {
    return this.doCreate(input);
  }

  private async doCreate(input: CreateOrderInput): Promise<Order> {
    if (input.paymentIntent === 'cash' && input.cashNeedsChange && !input.cashChangeForCents) {
      throw new BadRequestException('Informe o valor para troco');
    }

    // UMA conta aberta por mesa. Garçom, cliente no QR e POS têm de cair todos no
    // MESMO pedido (business-rules.md). Sem isto, a conta da mesa se dividiria.
    if (input.tableId) {
      const existing = await this.findOpenEntityByTable(input.tableId);
      if (existing) {
        return this.viewOf(existing);
      }
    }

    // E UMA conta aberta por PESSOA. Cada pedido de quem já tem conta aberta cai
    // nela, seja qual for a forma de pagamento declarada: a conta é da pessoa,
    // não da compra. Sem isto, cada pedido nasce como uma conta nova com o mesmo
    // nome e o caixa acaba cobrando pedaços soltos em vez da conta inteira.
    const name = input.customerName?.trim();
    if (name) {
      const existing = await this.findOpenAccountByCustomer(name);
      if (existing) {
        // A última declaração vale: se a pessoa pagou pix no primeiro pedido e
        // agora pediu para pôr na conta, o caixa precisa ver o estado atual.
        if (input.paymentIntent) {
          existing.paymentIntent = input.paymentIntent;
          existing.cashNeedsChange =
            input.paymentIntent === 'cash' ? input.cashNeedsChange : undefined;
          existing.cashChangeForCents =
            input.paymentIntent === 'cash' && input.cashNeedsChange
              ? input.cashChangeForCents
              : undefined;
        }
        // Idem para a sala: a pessoa circula, e a entrega tem de ir para onde
        // ela está AGORA, não para onde estava no primeiro pedido.
        if (input.deliveryRoom?.trim()) {
          existing.deliveryRoom = input.deliveryRoom.trim();
        }
        // Equipe informada depois preenche a que faltava, mas nunca sobrescreve
        // uma já registrada — quem abriu a conta é quem sabe.
        existing.teamName ??= input.teamName?.trim() || undefined;
        this.touch(existing);
        await this.em.flush();
        // Este caminho era MUDO: a sala e a forma de pagamento mudavam no banco
        // e nenhuma tela ficava sabendo até o próximo refetch. É o caso mais
        // comum de todos — a pessoa já tem conta aberta e pede de novo pelo app.
        this.emitUpdated(existing);
        return this.viewOf(existing);
      }
    }

    const { tenantId, locationId } = this.scope();
    const order = this.em.create(OrderEntity, {
      tenant: this.em.getReference(Brand, tenantId),
      location: this.em.getReference(Location, locationId),
      channel: input.channel,
      tableId: input.tableId,
      customerName: name || undefined,
      teamName: input.teamName?.trim() || undefined,
      deliveryRoom: input.deliveryRoom?.trim() || undefined,
      paymentIntent: input.paymentIntent,
      cashNeedsChange: input.paymentIntent === 'cash' ? input.cashNeedsChange : undefined,
      cashChangeForCents:
        input.paymentIntent === 'cash' && input.cashNeedsChange
          ? input.cashChangeForCents
          : undefined,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await this.em.flush();
    return this.viewOf(order);
  }

  // Assíncrono desde a Fase 2: o cardápio vem do Postgres.
  async addItem(
    orderId: string,
    input: { menuItemId: string; qty: number; notes?: string },
  ): Promise<Order> {
    const order = await this.em.findOne(
      OrderEntity,
      { id: orderId },
      { filters: this.accessFilters(), populate: ['items', 'payments'] },
    );
    if (!order) {
      throw new NotFoundException(`Pedido ${orderId} não encontrado`);
    }
    // Escopa pelo tenant DO PEDIDO: esta rota também serve o cliente do QR, que
    // não tem JWT nem contexto de tenant na requisição.
    const menuItem = await this.catalog.findItemForTenant(order.tenant.id, input.menuItemId);
    if (!menuItem) {
      throw new NotFoundException(`Item ${input.menuItemId} não existe no cardápio`);
    }
    if (!menuItem.available) {
      throw new BadRequestException(`${menuItem.name} está indisponível`);
    }
    const item = this.em.create(OrderItemEntity, {
      tenant: order.tenant,
      order,
      menuItemId: menuItem.id,
      name: menuItem.name,
      // Congela o preço EFETIVO (promocional, se houver) no momento do lançamento.
      unitPriceCents: effectivePriceCents(menuItem),
      qty: input.qty,
      stationId: menuItem.stationId,
      state: 'queued',
      notes: input.notes,
      createdAt: new Date(),
    });
    order.items.add(item);
    // O primeiro item disparado leva o pedido para a cozinha.
    if (order.status === 'open') {
      order.status = 'in_kitchen';
    }
    this.touch(order);
    await this.em.flush();

    this.events.emit(DomainEvent.ItemFired, {
      tenantId: order.tenant.id,
      locationId: order.location.id,
      stationId: item.stationId,
      orderId: order.id,
      itemId: item.id,
      name: item.name,
      qty: item.qty,
      notes: item.notes,
    });
    this.emitUpdated(order);
    return this.viewOf(order);
  }

  async voidItem(orderId: string, itemId: string, reason: string): Promise<Order> {
    const order = await this.getEntity(orderId);
    const item = order.items.getItems().find((i) => i.id === itemId);
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
    await this.em.flush();
    this.emitUpdated(order);
    return this.viewOf(order);
  }

  /** Chamado pelo contexto Kitchen quando o cozinheiro avança um item. */
  async markItemState(itemId: string, next: 'preparing' | 'ready'): Promise<Order> {
    const item = await this.em.findOne(OrderItemEntity, { id: itemId }, { populate: ['order'] });
    if (!item) {
      throw new NotFoundException('Item não encontrado');
    }
    if (next === 'ready' && item.state !== 'preparing') {
      throw new BadRequestException('Um item não pode ficar "ready" antes de "preparing"');
    }
    item.state = next;
    const order = item.order;
    await this.em.populate(order, ['items', 'payments']);
    this.recomputeReady(order);
    this.touch(order);
    await this.em.flush();

    const evt = next === 'preparing' ? DomainEvent.ItemPreparing : DomainEvent.ItemReady;
    this.events.emit(evt, {
      tenantId: order.tenant.id,
      locationId: order.location.id,
      stationId: item.stationId,
      orderId: order.id,
      itemId: item.id,
    });
    this.emitUpdated(order);
    return this.viewOf(order);
  }

  async requestPayment(orderId: string): Promise<Order> {
    const order = await this.getEntity(orderId);
    order.status = 'awaiting_payment';
    this.touch(order);
    await this.em.flush();
    this.emitUpdated(order);
    return this.viewOf(order);
  }

  async addPayment(
    orderId: string,
    input: { method: PaymentMethod; amountCents: number; note?: string },
  ): Promise<Order> {
    const order = await this.getEntity(orderId);
    if (order.status !== 'awaiting_payment' && order.status !== 'partially_paid') {
      throw new BadRequestException('Pedido não está aguardando pagamento');
    }
    const total = this.orderTotal(order);
    if (this.paid(order) + input.amountCents > total) {
      throw new BadRequestException(
        'Pagamento excede o total (troco não é registrado como pagamento)',
      );
    }
    const payment = this.em.create(PaymentEntity, {
      tenant: order.tenant,
      order,
      method: input.method,
      amountCents: input.amountCents,
      note: input.note,
      createdAt: new Date(),
    });
    order.payments.add(payment);

    if (this.paid(order) === total) {
      order.status = 'paid';
      this.touch(order);
      await this.em.flush();
      this.events.emit(DomainEvent.OrderPaid, {
        tenantId: order.tenant.id,
        locationId: order.location.id,
        orderId: order.id,
      });
    } else {
      order.status = 'partially_paid';
      this.touch(order);
      await this.em.flush();
    }
    this.emitUpdated(order);
    return this.viewOf(order);
  }

  async close(orderId: string): Promise<Order> {
    const order = await this.getEntity(orderId);
    if (order.status !== 'paid') {
      throw new BadRequestException('Só é possível fechar um pedido pago');
    }
    order.status = 'closed';
    this.touch(order);
    await this.em.flush();
    this.emitUpdated(order);
    return this.viewOf(order);
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private async getEntity(id: string): Promise<OrderEntity> {
    const order = await this.em.findOne(
      OrderEntity,
      { id },
      { filters: this.accessFilters(), populate: ['items', 'payments'] },
    );
    if (!order) {
      throw new NotFoundException(`Pedido ${id} não encontrado`);
    }
    return order;
  }

  /** Pedido de uma mesa que ainda aceita itens (não pago, não fechado). */
  private findOpenEntityByTable(tableId: string): Promise<OrderEntity | null> {
    const { locationId } = this.scope();
    return this.em.findOne(
      OrderEntity,
      { tableId, location: locationId, status: { $nin: ['paid', 'closed', 'cancelled'] } },
      { filters: this.accessFilters(), populate: ['items', 'payments'] },
    );
  }

  /**
   * Conta em aberto da pessoa — o alvo em que cada pedido dela cai.
   *
   * A comparação é case-insensitive e sem espaços nas pontas porque o nome é
   * digitado à mão a cada pedido: "nicolle cerqueira " e "Nicolle Cerqueira"
   * são a mesma pessoa, e tratá-las como contas diferentes derrotaria o
   * propósito de acumular na mesma conta.
   *
   * Ordena pela MAIS ANTIGA: se por qualquer motivo houver duplicatas (contas
   * criadas antes desta regra), os pedidos novos convergem todos para a mesma,
   * em vez de saltar entre elas conforme a data muda.
   */
  private findOpenAccountByCustomer(customerName: string): Promise<OrderEntity | null> {
    const { locationId } = this.scope();
    return this.em.findOne(
      OrderEntity,
      {
        location: locationId,
        customerName: { $ilike: customerName },
        status: { $nin: ['paid', 'closed', 'cancelled'] },
      },
      {
        filters: this.accessFilters(),
        populate: ['items', 'payments'],
        orderBy: { createdAt: 'asc' },
      },
    );
  }

  private recomputeReady(order: OrderEntity) {
    const active = order.items.getItems().filter((i) => i.state !== 'voided');
    if (active.length > 0 && active.every((i) => i.state === 'ready' || i.state === 'served')) {
      if (order.status === 'in_kitchen') {
        order.status = 'ready';
      }
    }
  }

  private orderTotal(order: OrderEntity): number {
    return order.items
      .getItems()
      .filter((i) => i.state !== 'voided')
      .reduce((sum, i) => sum + i.unitPriceCents * i.qty, 0);
  }

  private paid(order: OrderEntity): number {
    return order.payments.getItems().reduce((sum, p) => sum + p.amountCents, 0);
  }

  private touch(order: OrderEntity) {
    order.updatedAt = new Date();
  }

  private emitUpdated(order: OrderEntity) {
    this.events.emit(DomainEvent.OrderUpdated, {
      tenantId: order.tenant.id,
      locationId: order.location.id,
      orderId: order.id,
      status: order.status,
    });
  }

  private async viewOf(order: OrderEntity): Promise<Order> {
    if (!order.items.isInitialized()) {
      await order.items.init();
    }
    if (!order.payments.isInitialized()) {
      await order.payments.init();
    }
    return toOrderView(order);
  }
}
