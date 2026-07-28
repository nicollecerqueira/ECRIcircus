import { randomUUID } from 'node:crypto';
import {
  Collection,
  Entity,
  Filter,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { TENANT_FILTER, tenantFilterCond } from '../../../common/tenant/tenant.filter';
import { Brand } from '../../tenancy/domain/brand.entity';
import { Location } from '../../tenancy/domain/location.entity';
import type { OrderChannel, OrderStatus } from '../order.model';
import { OrderItem } from './order-item.entity';
import { Payment } from './payment.entity';

/**
 * Agregado raiz do loop (Fase 4, Postgres). Cozinha e Pagamento reagem aos seus
 * eventos e chamam de volta os métodos do OrderService — nunca mutam o estado
 * diretamente. Escopado por marca (tenant) e unidade.
 */
@Entity({ tableName: 'orders' })
@Filter({ name: TENANT_FILTER, cond: tenantFilterCond, default: true })
export class Order {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Brand, { fieldName: 'tenant_id', deleteRule: 'cascade', index: true })
  tenant!: Brand;

  @ManyToOne(() => Location, { fieldName: 'location_id', deleteRule: 'cascade', index: true })
  location!: Location;

  @Property({ length: 20 })
  channel!: OrderChannel;

  /** Mesa (quando canal waiter/qr). String por enquanto — FK pra sessão fica pra depois. */
  @Property({ length: 40, nullable: true })
  tableId?: string;

  @Property({ length: 24 })
  status: OrderStatus = 'open';

  @OneToMany(
    () => OrderItem,
    (i) => i.order,
  )
  items = new Collection<OrderItem>(this);

  @OneToMany(
    () => Payment,
    (p) => p.order,
  )
  payments = new Collection<Payment>(this);

  @Property({ type: 'timestamptz', defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', defaultRaw: 'now()' })
  updatedAt: Date = new Date();
}
