import { randomUUID } from 'node:crypto';
import { Entity, Filter, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { TENANT_FILTER, tenantFilterCond } from '../../../common/tenant/tenant.filter';
import { Brand } from '../../tenancy/domain/brand.entity';
import type { ItemState } from '../order.model';
import { Order } from './order.entity';

/**
 * Item lançado num pedido. Congela o preço EFETIVO no instante do lançamento
 * (`unitPriceCents`) — encerrar uma promoção depois não reescreve contas abertas.
 * Tem `tenant_id` próprio (como MenuItem) para busca direta e isolamento.
 */
@Entity({ tableName: 'order_items' })
@Filter({ name: TENANT_FILTER, cond: tenantFilterCond, default: true })
export class OrderItem {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Brand, { fieldName: 'tenant_id', deleteRule: 'cascade', index: true })
  tenant!: Brand;

  @ManyToOne(() => Order, { fieldName: 'order_id', deleteRule: 'cascade', index: true })
  order!: Order;

  @Property({ length: 40 })
  menuItemId!: string;

  @Property({ length: 160 })
  name!: string;

  @Property()
  unitPriceCents!: number;

  @Property()
  qty!: number;

  @Property({ length: 60 })
  stationId!: string;

  @Property({ length: 16 })
  state: ItemState = 'queued';

  @Property({ length: 240, nullable: true })
  notes?: string;

  @Property({ length: 240, nullable: true })
  voidReason?: string;

  /**
   * Sala de entrega no instante do lançamento. A pessoa circula e a sala da
   * CONTA muda com ela; sem esta cópia, o pedido que já está na cozinha passaria
   * a apontar para onde ela está agora. Nulo nos itens anteriores a esta regra.
   */
  @Property({ length: 120, nullable: true })
  deliveryRoom?: string;

  @Property({ type: 'timestamptz', defaultRaw: 'now()' })
  createdAt: Date = new Date();
}
