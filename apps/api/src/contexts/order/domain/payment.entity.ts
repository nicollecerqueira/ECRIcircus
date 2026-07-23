import { randomUUID } from 'node:crypto';
import { Entity, Filter, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { TENANT_FILTER, tenantFilterCond } from '../../../common/tenant/tenant.filter';
import { Brand } from '../../tenancy/domain/brand.entity';
import type { PaymentMethod } from '../order.model';
import { Order } from './order.entity';

/**
 * Pagamento registrado numa conta (v1: só registro — sem gateway, sem fiscal).
 * A soma dos pagamentos nunca pode passar do total do pedido (regra no service).
 */
@Entity({ tableName: 'payments' })
@Filter({ name: TENANT_FILTER, cond: tenantFilterCond, default: true })
export class Payment {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Brand, { fieldName: 'tenant_id', deleteRule: 'cascade', index: true })
  tenant!: Brand;

  @ManyToOne(() => Order, { fieldName: 'order_id', deleteRule: 'cascade', index: true })
  order!: Order;

  @Property({ length: 16 })
  method!: PaymentMethod;

  @Property()
  amountCents!: number;

  @Property({ length: 240, nullable: true })
  note?: string;

  @Property({ type: 'timestamptz', defaultRaw: 'now()' })
  createdAt: Date = new Date();
}
