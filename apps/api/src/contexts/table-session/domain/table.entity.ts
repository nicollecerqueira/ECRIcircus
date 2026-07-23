import { randomUUID } from 'node:crypto';
import { Entity, Filter, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { TENANT_FILTER, tenantFilterCond } from '../../../common/tenant/tenant.filter';
import { Brand } from '../../tenancy/domain/brand.entity';
import { Location } from '../../tenancy/domain/location.entity';

export type TableStatus = 'open' | 'occupied' | 'dirty';

/**
 * Mesa física do salão. Escopada por marca (tenant) e unidade (location).
 *
 * O `status` mora aqui — é o estado corrente que o mapa de mesas mostra. O
 * histórico de quem sentou/quando fica nas TableSession. O `qrToken` é único
 * global de propósito: o cliente do QR resolve a mesa SEM contexto de tenant.
 */
@Entity({ tableName: 'tables' })
@Filter({ name: TENANT_FILTER, cond: tenantFilterCond, default: true })
export class Table {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Brand, { fieldName: 'tenant_id', deleteRule: 'cascade', index: true })
  tenant!: Brand;

  @ManyToOne(() => Location, { fieldName: 'location_id', deleteRule: 'cascade', index: true })
  location!: Location;

  @Property()
  number!: number;

  @Property()
  seats!: number;

  @Property({ length: 80, unique: true })
  qrToken!: string;

  @Property({ length: 12, default: 'open' })
  status: TableStatus = 'open';

  @Property({ type: 'timestamptz', defaultRaw: 'now()' })
  createdAt: Date = new Date();
}
